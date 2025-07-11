import {
  EquipmentDatabase,
  EquipmentDatabaseService,
} from "./equipment-database.service";

import { DriverManager } from "../indi";
import { exec as execCallback } from "child_process";
import path from "path";
import { promisify } from "util";

const exec = promisify(execCallback);

export interface DetectedDevice {
  id: string;
  name: string;
  type:
    | "mount"
    | "camera"
    | "focuser"
    | "filter-wheel"
    | "guide-camera"
    | "dome"
    | "weather"
    | "aux"
    | "unknown";
  manufacturer: string;
  model: string;
  connection: "usb" | "serial" | "network";
  usbInfo?: {
    vendorId: string;
    productId: string;
    bus: string;
    device: string;
  };
  serialInfo?: {
    port: string;
    baudRate: number;
  };
  driverName?: string;
  driverStatus: "not-found" | "found" | "installed" | "running";
  autoInstallable: boolean;
  confidence: number; // 0-100 score de confiance de la détection
}

export class EquipmentDetectorService {
  private driverManager: DriverManager;
  private equipmentDatabase: EquipmentDatabaseService;
  private detectionCache: Map<string, DetectedDevice[]> = new Map();
  private readonly CACHE_DURATION = 5000; // 5 secondes

  constructor(
    driverManager: DriverManager,
    equipmentDatabase: EquipmentDatabaseService
  ) {
    this.driverManager = driverManager;
    this.equipmentDatabase = equipmentDatabase;
  }

  async detectAllEquipment(): Promise<DetectedDevice[]> {
    const cacheKey = "all-equipment";
    const cached = this.detectionCache.get(cacheKey);

    if (cached && this.isCacheValid(cacheKey)) {
      return cached;
    }

    console.log("🔍 Début de la détection d'équipements...");

    const devices: DetectedDevice[] = [];

    try {
      // ÉTAPE 1: Utiliser INDI comme source primaire
      console.log("📡 Récupération des équipements via INDI...");
      const indiDevices = await this.detectIndiDevices();
      devices.push(...indiDevices);

      // ÉTAPE 2: Compléter avec la détection manuelle pour les équipements non détectés par INDI
      console.log("🔍 Détection manuelle des équipements supplémentaires...");

      // Détecter les appareils USB
      const usbDevices = await this.detectUsbDevices();
      devices.push(...usbDevices);

      // Détecter les appareils série
      const serialDevices = await this.detectSerialDevices();
      devices.push(...serialDevices);

      // Détecter les appareils réseau
      const networkDevices = await this.detectNetworkDevices();
      devices.push(...networkDevices);

      // Éliminer les doublons basés sur l'ID
      const uniqueDevices = this.removeDuplicateDevices(devices);

      console.log(
        `✅ Détection terminée: ${uniqueDevices.length} appareils trouvés (${
          indiDevices.length
        } via INDI, ${
          uniqueDevices.length - indiDevices.length
        } via détection manuelle)`
      );

      // Mettre à jour le cache
      this.detectionCache.set(cacheKey, uniqueDevices);

      return uniqueDevices;
    } catch (error) {
      console.error("❌ Erreur lors de la détection d'équipements:", error);
      return [];
    }
  }

  /**
   * Détecter les équipements via INDI (source primaire)
   */
  private async detectIndiDevices(): Promise<DetectedDevice[]> {
    const devices: DetectedDevice[] = [];

    try {
      // Récupérer les équipements connectés via INDI
      const indiDevices = await this.driverManager.listConnectedEquipment();

      for (const indiDevice of indiDevices) {
        // Déterminer le type d'équipement
        const deviceType = this.mapIndiTypeToDetectedType(indiDevice.type);

        // Convertir l'IndiDevice en DetectedDevice
        const detectedDevice: DetectedDevice = {
          id: `indi-${indiDevice.name}`,
          name: indiDevice.label || indiDevice.name,
          type: this.determineEquipmentType(indiDevice, deviceType),
          manufacturer: indiDevice.brand || "Unknown",
          model: indiDevice.model || indiDevice.name,
          connection: "usb", // La plupart des équipements INDI sont USB
          driverName: indiDevice.driver,
          driverStatus: indiDevice.connected ? "running" : "installed",
          autoInstallable: false, // Déjà géré par INDI
          confidence: 95, // Confiance élevée pour les équipements INDI
        };

        devices.push(detectedDevice);
        console.log(
          `📡 Équipement INDI détecté: ${detectedDevice.name} (${detectedDevice.type})`
        );
      }

      return devices;
    } catch (error) {
      console.error("❌ Erreur lors de la détection via INDI:", error);
      return [];
    }
  }

  /**
   * Mapper les types INDI vers les types DetectedDevice
   */
  private mapIndiTypeToDetectedType(indiType: string): DetectedDevice["type"] {
    switch (indiType.toLowerCase()) {
      case "camera":
      case "ccd":
        return "camera";
      case "telescope":
      case "mount":
        return "mount";
      case "focuser":
        return "focuser";
      case "filterwheel":
      case "filter":
        return "filter-wheel";
      case "dome":
        return "dome";
      case "weather":
        return "weather";
      case "aux":
        return "aux";
      default:
        return "unknown";
    }
  }

  /**
   * Déterminer le type d'équipement en tenant compte des spécificités (caméra de guidage)
   */
  private determineEquipmentType(
    indiDevice: any,
    baseType: DetectedDevice["type"]
  ): DetectedDevice["type"] {
    // Si c'est une caméra, vérifier si c'est une caméra de guidage
    if (baseType === "camera") {
      const deviceName = (indiDevice.name || "").toLowerCase();
      const deviceModel = (indiDevice.model || "").toLowerCase();

      // Indices qui suggèrent une caméra de guidage
      const guideIndicators = [
        "guide",
        "guider",
        "guidage",
        "120",
        "130",
        "174",
        "178",
        "290",
        "385",
        "462",
        "533",
        "183",
        "224",
        "385",
        "462",
        "533",
        "585",
        "678",
        "715",
        "120mm",
        "130mm",
        "174mm",
        "178mm",
        "290mm",
        "385mm",
        "462mm",
        "533mm",
        "585mm",
        "678mm",
        "715mm",
      ];

      // Vérifier si le nom ou le modèle contient des indices de guidage
      if (
        guideIndicators.some(
          (indicator) =>
            deviceName.includes(indicator) || deviceModel.includes(indicator)
        )
      ) {
        return "guide-camera";
      }
    }

    return baseType;
  }

  /**
   * Éliminer les doublons basés sur l'ID et prioriser les équipements INDI
   */
  private removeDuplicateDevices(devices: DetectedDevice[]): DetectedDevice[] {
    const uniqueDevices = new Map<string, DetectedDevice>();

    for (const device of devices) {
      const key = device.id;

      // Si on a déjà un équipement avec ce nom/modèle, prioriser celui d'INDI
      if (!uniqueDevices.has(key)) {
        uniqueDevices.set(key, device);
      } else {
        const existing = uniqueDevices.get(key)!;
        // Prioriser les équipements INDI (ceux avec un ID qui commence par "indi-")
        if (device.id.startsWith("indi-") && !existing.id.startsWith("indi-")) {
          uniqueDevices.set(key, device);
        }
      }
    }

    return Array.from(uniqueDevices.values());
  }

  private async detectUsbDevices(): Promise<DetectedDevice[]> {
    const devices: DetectedDevice[] = [];

    try {
      const { stdout } = await exec(
        'lsusb -v 2>/dev/null | grep -E "(idVendor|idProduct|iProduct|iManufacturer)" || lsusb'
      );
      const usbDevices = await this.driverManager.listUsbDevices();

      for (const usbDevice of usbDevices) {
        const device = await this.identifyUsbDevice(usbDevice);
        if (device) {
          devices.push(device);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la détection USB:", error);
    }

    return devices;
  }

  private async identifyUsbDevice(
    usbDevice: any
  ): Promise<DetectedDevice | null> {
    const vendorProduct = usbDevice.id.toLowerCase();
    const [vendorId, productId] = vendorProduct.split(":");

    // Recherche dans la base de données dynamique
    let deviceInfo = this.equipmentDatabase.findEquipmentByUsbId(
      vendorId,
      productId
    );

    // Recherche par nom/description si pas trouvé
    if (!deviceInfo) {
      const searchResults = this.equipmentDatabase.findEquipmentByName(
        usbDevice.description
      );
      if (searchResults.length > 0) {
        deviceInfo = searchResults[0];
      }
    }

    if (!deviceInfo) {
      // Appareil inconnu mais potentiellement utile
      return this.createUnknownDevice(usbDevice);
    }

    // Vérifier le statut du driver
    const driverStatus = await this.checkDriverStatus(deviceInfo.driverName);

    const device: DetectedDevice = {
      id: `usb-${usbDevice.id}`,
      name: deviceInfo.name,
      type: deviceInfo.type,
      manufacturer: deviceInfo.manufacturer,
      model: deviceInfo.model,
      connection: "usb",
      usbInfo: {
        vendorId: usbDevice.id.split(":")[0],
        productId: usbDevice.id.split(":")[1],
        bus: usbDevice.bus,
        device: usbDevice.device,
      },
      driverName: deviceInfo.driverName,
      driverStatus,
      autoInstallable: deviceInfo.autoInstallable,
      confidence: 95,
    };

    return device;
  }

  private findDeviceByDescription(
    description: string
  ): EquipmentDatabase[string] | null {
    const lowerDesc = description.toLowerCase();

    const results = this.equipmentDatabase.findEquipmentByName(lowerDesc);
    return results.length > 0 ? results[0] : null;
  }

  private createUnknownDevice(usbDevice: any): DetectedDevice {
    // Tentative d'identification du type basée sur la description
    const desc = usbDevice.description.toLowerCase();
    let type: DetectedDevice["type"] = "unknown";
    let confidence = 20;

    // Filtrer les appareils qui sont clairement des contrôleurs/hubs ou des composants système
    if (
      desc.includes("hub") ||
      desc.includes("controller") ||
      desc.includes("bridge") ||
      desc.includes("adapter") ||
      desc.includes("wireless") ||
      desc.includes("bluetooth") ||
      desc.includes("usb-serial") ||
      desc.includes("cp210") ||
      desc.includes("ftdi") ||
      desc.includes("ch340") ||
      desc.includes("pl2303") ||
      desc.includes("usb2.0") ||
      desc.includes("root hub") ||
      desc.includes("host controller") ||
      desc.includes("mass storage") ||
      desc.includes("card reader") ||
      desc.includes("keyboard") ||
      desc.includes("mouse") ||
      desc.includes("audio") ||
      desc.includes("sound")
    ) {
      confidence = 5; // Confiance très faible pour ces appareils génériques
    } else if (
      desc.includes("camera") ||
      desc.includes("cam") ||
      desc.includes("ccd")
    ) {
      type = "camera";
      confidence = 60;
    } else if (
      desc.includes("mount") ||
      desc.includes("telescope") ||
      desc.includes("eq")
    ) {
      type = "mount";
      confidence = 60;
    } else if (desc.includes("focuser") || desc.includes("focus")) {
      type = "focuser";
      confidence = 60;
    } else if (desc.includes("filter") || desc.includes("wheel")) {
      type = "filter-wheel";
      confidence = 60;
    } else if (desc.includes("guider") || desc.includes("guide")) {
      type = "guide-camera";
      confidence = 60;
    } else if (desc.includes("dome")) {
      type = "dome";
      confidence = 60;
    } else if (desc.includes("weather") || desc.includes("sensor")) {
      type = "weather";
      confidence = 60;
    }

    return {
      id: `usb-${usbDevice.id}`,
      name: usbDevice.description,
      type,
      manufacturer: "Unknown",
      model: "Unknown",
      connection: "usb",
      usbInfo: {
        vendorId: usbDevice.id.split(":")[0],
        productId: usbDevice.id.split(":")[1],
        bus: usbDevice.bus,
        device: usbDevice.device,
      },
      driverStatus: "not-found",
      autoInstallable: false,
      confidence,
    };
  }

  private async detectSerialDevices(): Promise<DetectedDevice[]> {
    const devices: DetectedDevice[] = [];

    try {
      // Lister les ports série
      const serialPorts = await this.listSerialPorts();

      for (const port of serialPorts) {
        const device = await this.identifySerialDevice(port);
        if (device) {
          devices.push(device);
        }
      }
    } catch (error) {
      console.error("Erreur lors de la détection série:", error);
    }

    return devices;
  }

  private async listSerialPorts(): Promise<string[]> {
    try {
      const { stdout } = await exec(
        "ls /dev/tty{USB,ACM}* 2>/dev/null || true"
      );
      return stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim());
    } catch {
      return [];
    }
  }

  private async identifySerialDevice(
    port: string
  ): Promise<DetectedDevice | null> {
    // Pour les appareils série, nous devons essayer de communiquer
    // Ceci est plus complexe et nécessiterait une implémentation spécifique
    // Pour l'instant, nous retournons un appareil générique avec confiance très faible
    // pour qu'il soit filtré par défaut

    return {
      id: `serial-${port.replace(/\//g, "-")}`,
      name: `Serial Device (${port})`,
      type: "unknown",
      manufacturer: "Unknown",
      model: "Unknown",
      connection: "serial",
      serialInfo: {
        port,
        baudRate: 9600,
      },
      driverStatus: "not-found",
      autoInstallable: false,
      confidence: 10, // Confiance très faible pour filtrer ces appareils
    };
  }

  private async detectNetworkDevices(): Promise<DetectedDevice[]> {
    const devices: DetectedDevice[] = [];

    try {
      // Recherche d'appareils réseau via mDNS/Bonjour
      // Cette implémentation est simplifiée

      // Recherche de serveurs INDI sur le réseau
      const indiServers = await this.findIndiServers();
      devices.push(...indiServers);
    } catch (error) {
      console.error("Erreur lors de la détection réseau:", error);
    }

    return devices;
  }

  private async findIndiServers(): Promise<DetectedDevice[]> {
    // Implémentation simplifiée - pourrait être étendue avec une vraie découverte mDNS
    return [];
  }

  private async checkDriverStatus(
    driverName: string
  ): Promise<DetectedDevice["driverStatus"]> {
    try {
      const installedDrivers = await this.driverManager.getInstalledDrivers();
      const runningDrivers = this.driverManager.listRunningDrivers();

      if (runningDrivers.includes(driverName)) {
        return "running";
      } else if (installedDrivers.includes(driverName)) {
        return "installed";
      } else {
        // Vérifier si le driver est disponible pour installation
        const availableDrivers = await this.driverManager.getAvailableDrivers();
        if (availableDrivers.includes(driverName)) {
          return "found";
        } else {
          return "not-found";
        }
      }
    } catch (error) {
      console.error(
        "Erreur lors de la vérification du statut du driver:",
        error
      );
      return "not-found";
    }
  }

  async autoInstallDriver(device: DetectedDevice): Promise<boolean> {
    if (!device.autoInstallable || !device.driverName) {
      return false;
    }

    try {
      console.log(
        `🔧 Installation automatique du driver ${device.driverName} pour ${device.name}...`
      );

      await this.driverManager.installDriver(device.driverName);

      // Mettre à jour le statut du device
      device.driverStatus = "installed";

      console.log(`✅ Driver ${device.driverName} installé avec succès`);

      return true;
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'installation du driver ${device.driverName}:`,
        error
      );
      return false;
    }
  }

  async autoStartDriver(device: DetectedDevice): Promise<boolean> {
    if (!device.driverName || device.driverStatus !== "installed") {
      return false;
    }

    try {
      console.log(
        `🚀 Démarrage automatique du driver ${device.driverName} pour ${device.name}...`
      );

      await this.driverManager.startDriver(device.driverName);

      // Mettre à jour le statut du device
      device.driverStatus = "running";

      console.log(`✅ Driver ${device.driverName} démarré avec succès`);

      return true;
    } catch (error) {
      console.error(
        `❌ Erreur lors du démarrage du driver ${device.driverName}:`,
        error
      );
      return false;
    }
  }

  async setupDevice(device: DetectedDevice): Promise<boolean> {
    try {
      console.log(`🔧 Configuration automatique de ${device.name}...`);

      // Installer le driver si nécessaire
      if (device.driverStatus === "found" && device.autoInstallable) {
        const installed = await this.autoInstallDriver(device);
        if (!installed) {
          return false;
        }
      }

      // Démarrer le driver si nécessaire
      if (device.driverStatus === "installed") {
        const started = await this.autoStartDriver(device);
        if (!started) {
          return false;
        }
      }

      console.log(`✅ ${device.name} configuré avec succès`);
      return true;
    } catch (error) {
      console.error(
        `❌ Erreur lors de la configuration de ${device.name}:`,
        error
      );
      return false;
    }
  }

  async setupAllDevices(): Promise<{
    success: DetectedDevice[];
    failed: DetectedDevice[];
  }> {
    const devices = await this.detectAllEquipment();
    const success: DetectedDevice[] = [];
    const failed: DetectedDevice[] = [];

    for (const device of devices) {
      if (device.autoInstallable && device.driverStatus !== "running") {
        const setupResult = await this.setupDevice(device);
        if (setupResult) {
          success.push(device);
        } else {
          failed.push(device);
        }
      }
    }

    return { success, failed };
  }

  async autoConfigureASIDrivers(): Promise<boolean> {
    try {
      console.log("🔧 Configuration automatique des drivers ASI...");

      // Vérifier si des caméras ASI sont connectées
      const devices = await this.detectAllEquipment();
      const asiDevices = devices.filter(
        (device) =>
          device.manufacturer === "ZWO" && device.type === "guide-camera"
      );

      if (asiDevices.length === 0) {
        console.log(
          "Aucune caméra ASI détectée, skip de la configuration automatique"
        );
        return false;
      }

      console.log(`${asiDevices.length} caméra(s) ASI détectée(s)`);

      // Vérifier si le driver est installé
      const installedDrivers = await this.driverManager.getInstalledDrivers();
      const asiDriverInstalled = installedDrivers.some(
        (driver) => driver.includes("indi_asi") || driver.includes("asi")
      );

      if (!asiDriverInstalled) {
        console.log(
          "Driver ASI non installé, lancement de l'installation automatique..."
        );

        // Exécuter le script d'auto-installation
        const { exec } = require("child_process");
        const { promisify } = require("util");
        const execAsync = promisify(exec);

        const scriptPath = path.join(
          __dirname,
          "../..",
          "scripts",
          "auto-install-asi.sh"
        );

        try {
          await execAsync(`bash ${scriptPath}`);
          console.log("✅ Installation automatique des drivers ASI terminée");

          // Invalider le cache pour forcer une nouvelle détection
          this.detectionCache.clear();

          return true;
        } catch (error) {
          console.error("❌ Erreur lors de l'installation automatique:", error);
          return false;
        }
      } else {
        console.log("✅ Driver ASI déjà installé");
        return true;
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de la configuration automatique des drivers ASI:",
        error
      );
      return false;
    }
  }

  private isCacheValid(cacheKey: string): boolean {
    // Implémentation simplifiée du cache
    return false; // Toujours revalider pour l'instant
  }

  clearCache(): void {
    this.detectionCache.clear();
  }
}

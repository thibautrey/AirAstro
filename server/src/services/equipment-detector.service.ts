import {
  EquipmentDatabase,
  EquipmentDatabaseService,
} from "./equipment-database.service";

import { DriverManager } from "../indi";

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

    console.log("🔍 Début de la détection d'équipements via INDI...");

    try {
      // Utiliser INDI comme source unique et source de vérité
      console.log("� Récupération des équipements via INDI...");
      const devices = await this.detectIndiDevices();

      console.log(
        `✅ Détection terminée: ${devices.length} appareils trouvés via INDI`
      );

      // Mettre à jour le cache
      this.detectionCache.set(cacheKey, devices);

      return devices;
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
   * Éliminer les doublons basés sur l'ID (simplifié car on n'utilise que INDI)
   */
  private removeDuplicateDevices(devices: DetectedDevice[]): DetectedDevice[] {
    const uniqueDevices = new Map<string, DetectedDevice>();

    for (const device of devices) {
      const key = device.id;
      if (!uniqueDevices.has(key)) {
        uniqueDevices.set(key, device);
      }
    }

    return Array.from(uniqueDevices.values());
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
      console.log(`🔧 Configuration de l'équipement INDI: ${device.name}...`);

      // Pour les équipements INDI, ils sont déjà gérés par le serveur INDI
      // Nous nous contentons de vérifier le statut
      if (device.driverStatus === "running") {
        console.log(`✅ ${device.name} est déjà connecté et fonctionnel`);
        return true;
      }

      // Si le driver n'est pas en cours d'exécution, essayer de le démarrer
      if (device.driverName) {
        console.log(
          `🚀 Tentative de démarrage du driver ${device.driverName}...`
        );
        const started = await this.autoStartDriver(device);
        if (started) {
          console.log(`✅ ${device.name} configuré avec succès`);
          return true;
        }
      }

      console.log(
        `⚠️ ${device.name} ne peut pas être configuré automatiquement`
      );
      return false;
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
      if (device.driverStatus !== "running") {
        const setupResult = await this.setupDevice(device);
        if (setupResult) {
          success.push(device);
        } else {
          failed.push(device);
        }
      } else {
        // Équipement déjà configuré et fonctionnel
        success.push(device);
      }
    }

    return { success, failed };
  }

  async autoConfigureASIDrivers(): Promise<boolean> {
    try {
      console.log("🔧 Configuration automatique des drivers ASI...");

      // Vérifier si des caméras ASI sont connectées via INDI
      const devices = await this.detectAllEquipment();
      const asiDevices = devices.filter(
        (device) =>
          device.manufacturer === "ZWO" || device.manufacturer === "ASI"
      );

      if (asiDevices.length === 0) {
        console.log(
          "Aucune caméra ASI détectée via INDI, skip de la configuration automatique"
        );
        return false;
      }

      console.log(`${asiDevices.length} caméra(s) ASI détectée(s) via INDI`);

      // Vérifier si le driver est déjà en cours d'exécution
      const runningDrivers = this.driverManager.listRunningDrivers();
      const asiDriverRunning = runningDrivers.some(
        (driver) => driver.includes("indi_asi") || driver.includes("asi")
      );

      if (asiDriverRunning) {
        console.log("✅ Driver ASI déjà en cours d'exécution");
        return true;
      }

      // Si les appareils sont détectés par INDI, cela signifie que les drivers sont déjà configurés
      console.log("✅ Drivers ASI configurés correctement (détectés via INDI)");
      return true;
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

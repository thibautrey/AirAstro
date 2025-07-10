import { DriverManager } from "../indi";
import { exec as execCallback } from "child_process";
import { promises as fs } from "fs";
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

export interface DeviceDatabase {
  [key: string]: {
    name: string;
    type: DetectedDevice["type"];
    manufacturer: string;
    model: string;
    driverName: string;
    autoInstallable: boolean;
    aliases: string[];
  };
}

export class EquipmentDetectorService {
  private driverManager: DriverManager;
  private deviceDatabase: DeviceDatabase;
  private detectionCache: Map<string, DetectedDevice[]> = new Map();
  private readonly CACHE_DURATION = 5000; // 5 secondes

  constructor(driverManager: DriverManager) {
    this.driverManager = driverManager;
    this.deviceDatabase = this.loadDeviceDatabase();
  }

  private loadDeviceDatabase(): DeviceDatabase {
    return {
      // ZWO Cameras
      "03c3:120a": {
        name: "ASI120MC",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI120MC",
        driverName: "indi_asi_ccd",
        autoInstallable: true,
        aliases: ["asi120mc", "zwo asi120mc"],
      },
      "03c3:120b": {
        name: "ASI120MM",
        type: "guide-camera",
        manufacturer: "ZWO",
        model: "ASI120MM",
        driverName: "indi_asi_ccd",
        autoInstallable: true,
        aliases: ["asi120mm", "zwo asi120mm"],
      },
      "03c3:178a": {
        name: "ASI178MC",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI178MC",
        driverName: "indi_asi_ccd",
        autoInstallable: true,
        aliases: ["asi178mc", "zwo asi178mc"],
      },
      "03c3:178b": {
        name: "ASI178MM",
        type: "guide-camera",
        manufacturer: "ZWO",
        model: "ASI178MM",
        driverName: "indi_asi_ccd",
        autoInstallable: true,
        aliases: ["asi178mm", "zwo asi178mm"],
      },
      "03c3:294a": {
        name: "ASI294MC Pro",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI294MC Pro",
        driverName: "indi_asi_ccd",
        autoInstallable: true,
        aliases: ["asi294mc", "zwo asi294mc pro"],
      },
      "03c3:2600": {
        name: "ASI2600MC Pro",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI2600MC Pro",
        driverName: "indi_asi_ccd",
        autoInstallable: true,
        aliases: ["asi2600mc", "zwo asi2600mc pro"],
      },
      // Celestron Mounts
      "0403:6001": {
        name: "Celestron Mount",
        type: "mount",
        manufacturer: "Celestron",
        model: "CGX/CGX-L/CGEM II",
        driverName: "indi_celestron_gps",
        autoInstallable: true,
        aliases: ["celestron", "cgx", "cgem"],
      },
      // Sky-Watcher Mounts
      "067b:2303": {
        name: "Sky-Watcher Mount",
        type: "mount",
        manufacturer: "Sky-Watcher",
        model: "EQ6-R/HEQ5 Pro",
        driverName: "indi_eqmod_telescope",
        autoInstallable: true,
        aliases: ["skywatcher", "eq6r", "heq5"],
      },
      // QHY Cameras
      "1618:0901": {
        name: "QHY5III-290M",
        type: "guide-camera",
        manufacturer: "QHYCCD",
        model: "QHY5III-290M",
        driverName: "indi_qhy_ccd",
        autoInstallable: true,
        aliases: ["qhy5iii", "qhy5iii-290m"],
      },
      // Canon DSLRs
      "04a9:*": {
        name: "Canon DSLR",
        type: "camera",
        manufacturer: "Canon",
        model: "DSLR",
        driverName: "indi_canon_ccd",
        autoInstallable: true,
        aliases: ["canon", "dslr"],
      },
      // Nikon DSLRs
      "04b0:*": {
        name: "Nikon DSLR",
        type: "camera",
        manufacturer: "Nikon",
        model: "DSLR",
        driverName: "indi_nikon_ccd",
        autoInstallable: true,
        aliases: ["nikon", "dslr"],
      },
    };
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
      // Détecter les appareils USB
      const usbDevices = await this.detectUsbDevices();
      devices.push(...usbDevices);

      // Détecter les appareils série
      const serialDevices = await this.detectSerialDevices();
      devices.push(...serialDevices);

      // Détecter les appareils réseau
      const networkDevices = await this.detectNetworkDevices();
      devices.push(...networkDevices);

      console.log(`✅ Détection terminée: ${devices.length} appareils trouvés`);

      // Mettre à jour le cache
      this.detectionCache.set(cacheKey, devices);

      return devices;
    } catch (error) {
      console.error("❌ Erreur lors de la détection d'équipements:", error);
      return [];
    }
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

    // Recherche exacte dans la base de données
    let deviceInfo = this.deviceDatabase[vendorProduct];

    // Recherche avec wildcard pour les fabricants
    if (!deviceInfo) {
      const [vendor] = vendorProduct.split(":");
      const wildcardKey = `${vendor}:*`;
      deviceInfo = this.deviceDatabase[wildcardKey];
    }

    // Recherche par nom/description
    if (!deviceInfo) {
      deviceInfo = this.findDeviceByDescription(usbDevice.description);
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

  private findDeviceByDescription(description: string): any {
    const lowerDesc = description.toLowerCase();

    for (const [key, device] of Object.entries(this.deviceDatabase)) {
      if (
        device.aliases.some((alias) => lowerDesc.includes(alias.toLowerCase()))
      ) {
        return device;
      }
    }

    return null;
  }

  private createUnknownDevice(usbDevice: any): DetectedDevice {
    // Tentative d'identification du type basée sur la description
    const desc = usbDevice.description.toLowerCase();
    let type: DetectedDevice["type"] = "unknown";
    let confidence = 20;

    if (desc.includes("camera") || desc.includes("cam")) {
      type = "camera";
      confidence = 60;
    } else if (desc.includes("mount") || desc.includes("telescope")) {
      type = "mount";
      confidence = 60;
    } else if (desc.includes("focuser") || desc.includes("focus")) {
      type = "focuser";
      confidence = 60;
    } else if (desc.includes("filter") || desc.includes("wheel")) {
      type = "filter-wheel";
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
    // Pour l'instant, nous retournons un appareil générique

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
      confidence: 30,
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

  private isCacheValid(cacheKey: string): boolean {
    // Implémentation simplifiée du cache
    return false; // Toujours revalider pour l'instant
  }

  clearCache(): void {
    this.detectionCache.clear();
  }
}

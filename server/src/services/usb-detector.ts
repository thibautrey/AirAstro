import { BrandInfo, DriverManager, UsbDevice } from "../indi";

import { EventEmitter } from "events";
import { exec as execCallback } from "child_process";
import { promisify } from "util";

const exec = promisify(execCallback);

export interface UsbDetectorConfig {
  pollInterval?: number; // Intervalle de polling en ms (défaut: 5000)
  indiRestartDelay?: number; // Délai avant redémarrage INDI en ms (défaut: 2000)
  enableAutoRestart?: boolean; // Activer le redémarrage automatique (défaut: true)
}

export interface UsbDeviceEvent {
  action: "added" | "removed";
  device: UsbDevice;
  timestamp: number;
}

export class UsbDetector extends EventEmitter {
  private config: Required<UsbDetectorConfig>;
  private driverManager: DriverManager;
  private currentDevices: Map<string, UsbDevice> = new Map();
  private pollTimer?: NodeJS.Timeout;
  private isPolling = false;
  private indiRestartTimer?: NodeJS.Timeout;

  constructor(driverManager: DriverManager, config: UsbDetectorConfig = {}) {
    super();
    this.driverManager = driverManager;
    this.config = {
      pollInterval: config.pollInterval || 5000,
      indiRestartDelay: config.indiRestartDelay || 2000,
      enableAutoRestart: config.enableAutoRestart !== false,
    };
  }

  /**
   * Démarrer la détection des périphériques USB
   */
  async start(): Promise<void> {
    if (this.isPolling) {
      console.warn("🔍 Détection USB déjà en cours");
      return;
    }

    console.log(
      "🔍 Démarrage de la détection automatique des périphériques USB"
    );
    this.isPolling = true;

    // Scan initial
    await this.scanUsbDevices();

    // Démarrer le polling
    this.pollTimer = setInterval(async () => {
      await this.scanUsbDevices();
    }, this.config.pollInterval);

    console.log(
      `✅ Détection USB démarrée (intervalle: ${this.config.pollInterval}ms)`
    );
  }

  /**
   * Arrêter la détection des périphériques USB
   */
  stop(): void {
    if (!this.isPolling) return;

    console.log("🛑 Arrêt de la détection USB");
    this.isPolling = false;

    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = undefined;
    }

    if (this.indiRestartTimer) {
      clearTimeout(this.indiRestartTimer);
      this.indiRestartTimer = undefined;
    }

    this.currentDevices.clear();
  }

  /**
   * Scanner les périphériques USB actuels
   */
  private async scanUsbDevices(): Promise<void> {
    try {
      const devices = await this.detectUsbDevices();
      const newDeviceMap = new Map<string, UsbDevice>();

      // Créer une map des nouveaux périphériques
      for (const device of devices) {
        newDeviceMap.set(device.id, device);
      }

      // Détecter les périphériques ajoutés
      for (const [id, device] of newDeviceMap) {
        if (!this.currentDevices.has(id)) {
          console.log(
            `🔌 Nouveau périphérique détecté: ${device.description} (${device.id})`
          );
          this.emit("deviceAdded", {
            action: "added",
            device,
            timestamp: Date.now(),
          } as UsbDeviceEvent);

          // Planifier le redémarrage INDI si nécessaire
          if (
            this.config.enableAutoRestart &&
            device.matchingDrivers.length > 0
          ) {
            this.scheduleIndiRestart();
          }
        }
      }

      // Détecter les périphériques supprimés
      for (const [id, device] of this.currentDevices) {
        if (!newDeviceMap.has(id)) {
          console.log(
            `🔌 Périphérique retiré: ${device.description} (${device.id})`
          );
          this.emit("deviceRemoved", {
            action: "removed",
            device,
            timestamp: Date.now(),
          } as UsbDeviceEvent);

          // Planifier le redémarrage INDI si nécessaire
          if (
            this.config.enableAutoRestart &&
            device.matchingDrivers.length > 0
          ) {
            this.scheduleIndiRestart();
          }
        }
      }

      // Mettre à jour la liste actuelle
      this.currentDevices = newDeviceMap;
    } catch (error) {
      console.error("❌ Erreur lors du scan USB:", error);
    }
  }

  /**
   * Détecter les périphériques USB avec lsusb
   */
  private async detectUsbDevices(): Promise<UsbDevice[]> {
    try {
      const { stdout } = await exec("lsusb");
      const lines = stdout.trim().split("\n");
      const installedDrivers = await this.driverManager.getInstalledDrivers();
      const devices: UsbDevice[] = [];

      for (const line of lines) {
        const match = line.match(
          /^Bus\s+(\d+)\s+Device\s+(\d+):\s+ID\s+([0-9a-fA-F]{4}):([0-9a-fA-F]{4})\s*(.*)$/
        );
        if (!match) continue;

        const [, bus, device, vendorId, productId, desc] = match;
        const id = `${vendorId}:${productId}`;

        // Obtenir des informations détaillées si possible
        const detailedInfo = await this.getUsbDeviceDetails(bus, device);

        const usbDevice: UsbDevice = {
          bus,
          device,
          id,
          vendorId: vendorId.toLowerCase(),
          productId: productId.toLowerCase(),
          description: desc,
          matchingDrivers: [],
          manufacturer: detailedInfo.manufacturer,
          product: detailedInfo.product,
        };

        // Détecter la marque et les drivers associés
        const brand = this.detectBrandFromUsbDevice(usbDevice);
        if (brand) {
          usbDevice.brand = brand.name;
          usbDevice.model = this.extractModelFromDevice(usbDevice, brand);
          usbDevice.matchingDrivers = await this.getMatchingDrivers(
            brand,
            installedDrivers
          );
        } else {
          // Fallback sur l'ancienne méthode de détection
          const tokens = desc
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length >= 3);
          usbDevice.matchingDrivers = installedDrivers.filter((d) => {
            const dl = d.toLowerCase();
            return tokens.some((t) => dl.includes(t));
          });
        }

        devices.push(usbDevice);
      }

      return devices;
    } catch (error) {
      console.error("❌ Erreur lors de la détection USB:", error);
      return [];
    }
  }

  /**
   * Obtenir les détails d'un périphérique USB
   */
  private async getUsbDeviceDetails(
    bus: string,
    device: string
  ): Promise<{
    manufacturer?: string;
    product?: string;
  }> {
    try {
      const { stdout } = await exec(`lsusb -s ${bus}:${device} -v`);
      const details: { manufacturer?: string; product?: string } = {};

      const manufacturerMatch = stdout.match(/iManufacturer\s+\d+\s+(.+)/);
      if (manufacturerMatch) {
        details.manufacturer = manufacturerMatch[1].trim();
      }

      const productMatch = stdout.match(/iProduct\s+\d+\s+(.+)/);
      if (productMatch) {
        details.product = productMatch[1].trim();
      }

      return details;
    } catch (error) {
      // Retourner des détails vides si l'obtention des détails échoue
      return {};
    }
  }

  /**
   * Détecter la marque d'un périphérique USB
   */
  private detectBrandFromUsbDevice(device: UsbDevice): BrandInfo | null {
    // Utiliser la base de données des marques connues du DriverManager
    // Cette méthode est similaire à celle dans DriverManager mais adaptée
    const KNOWN_BRANDS = {
      zwo: {
        name: "ZWO",
        vendorIds: ["03c3"],
        productPatterns: ["asi", "zwo"],
        driverPatterns: ["asi", "zwo"],
        packageNames: ["indi-asi", "libasi", "asi-camera"],
        description: "ZWO ASI Cameras",
      },
      qhy: {
        name: "QHYCCD",
        vendorIds: ["1618"],
        productPatterns: ["qhy"],
        driverPatterns: ["qhy"],
        packageNames: ["indi-qhy", "libqhy"],
        description: "QHY CCD Cameras",
      },
      celestron: {
        name: "Celestron",
        vendorIds: ["0525"],
        productPatterns: ["celestron"],
        driverPatterns: ["celestron"],
        packageNames: ["indi-celestron"],
        description: "Celestron Telescopes",
      },
      playerone: {
        name: "Player One",
        vendorIds: ["a0a0"],
        productPatterns: [
          "player",
          "one",
          "neptune",
          "mars",
          "uranus",
          "saturn",
          "apollo",
          "ceres",
          "poseidon",
        ],
        driverPatterns: ["playerone"],
        packageNames: ["indi-playerone", "libplayerone", "libplayeronecamera2"],
        description: "Player One Astronomy Cameras",
      },
      // Ajouter d'autres marques si nécessaire
    };

    for (const [key, brand] of Object.entries(KNOWN_BRANDS)) {
      // Vérifier l'ID du vendeur
      if (brand.vendorIds.includes(device.vendorId)) {
        return brand;
      }

      // Vérifier les patterns dans la description
      const description = device.description.toLowerCase();
      const manufacturer = device.manufacturer?.toLowerCase() || "";
      const product = device.product?.toLowerCase() || "";

      for (const pattern of brand.productPatterns) {
        if (
          description.includes(pattern) ||
          manufacturer.includes(pattern) ||
          product.includes(pattern)
        ) {
          return brand;
        }
      }
    }

    return null;
  }

  /**
   * Extraire le modèle d'un périphérique
   */
  private extractModelFromDevice(
    device: UsbDevice,
    brand: BrandInfo
  ): string | undefined {
    const description = device.description.toLowerCase();
    const manufacturer = device.manufacturer?.toLowerCase() || "";
    const product = device.product?.toLowerCase() || "";

    switch (brand.name) {
      case "ZWO":
        const asiMatch = (
          description +
          " " +
          manufacturer +
          " " +
          product
        ).match(/asi\s*(\d+\w*)/i);
        if (asiMatch) return `ASI ${asiMatch[1]}`;
        break;

      case "QHYCCD":
        const qhyMatch = (
          description +
          " " +
          manufacturer +
          " " +
          product
        ).match(/qhy\s*(\d+\w*)/i);
        if (qhyMatch) return `QHY ${qhyMatch[1]}`;
        break;

      case "Player One":
        const poMatch = (
          description +
          " " +
          manufacturer +
          " " +
          product
        ).match(
          /(neptune|mars|uranus|saturn|apollo|ceres|poseidon)[-\s]*[cm]?/i
        );
        if (poMatch) return poMatch[0].toUpperCase();
        break;
    }

    return undefined;
  }

  /**
   * Obtenir les drivers correspondants pour une marque
   */
  private async getMatchingDrivers(
    brand: BrandInfo,
    installedDrivers: string[]
  ): Promise<string[]> {
    const matchingDrivers: string[] = [];

    for (const pattern of brand.driverPatterns) {
      const matching = installedDrivers.filter((driver) =>
        driver.toLowerCase().includes(pattern)
      );
      matchingDrivers.push(...matching);
    }

    return matchingDrivers;
  }

  /**
   * Planifier le redémarrage du serveur INDI
   */
  private scheduleIndiRestart(): void {
    // Annuler le timer précédent si il existe
    if (this.indiRestartTimer) {
      clearTimeout(this.indiRestartTimer);
    }

    // Planifier le redémarrage
    this.indiRestartTimer = setTimeout(async () => {
      console.log("🔄 Redémarrage programmé du serveur INDI...");
      await this.restartIndiWithDetectedDevices();
    }, this.config.indiRestartDelay);
  }

  /**
   * Redémarrer le serveur INDI avec les périphériques détectés
   */
  private async restartIndiWithDetectedDevices(): Promise<void> {
    try {
      console.log(
        "🔄 Redémarrage du serveur INDI avec les périphériques détectés"
      );

      // Obtenir la liste des drivers à charger
      const driversToLoad = await this.getDriversToLoad();

      if (driversToLoad.length === 0) {
        console.log("⚠️ Aucun driver à charger détecté");
        return;
      }

      console.log(`📦 Drivers à charger: ${driversToLoad.join(", ")}`);

      // Arrêter le serveur INDI actuel
      await this.stopIndiServer();

      // Attendre un peu pour s'assurer que le serveur est arrêté
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Démarrer le serveur INDI avec les nouveaux drivers
      await this.startIndiServer(driversToLoad);

      console.log("✅ Serveur INDI redémarré avec succès");
      this.emit("indiRestarted", { drivers: driversToLoad });
    } catch (error) {
      console.error("❌ Erreur lors du redémarrage INDI:", error);
      this.emit("indiRestartError", error);
    }
  }

  /**
   * Obtenir la liste des drivers à charger
   */
  private async getDriversToLoad(): Promise<string[]> {
    const driversToLoad = new Set<string>();

    for (const device of this.currentDevices.values()) {
      for (const driver of device.matchingDrivers) {
        driversToLoad.add(driver);
      }
    }

    return Array.from(driversToLoad);
  }

  /**
   * Arrêter le serveur INDI
   */
  private async stopIndiServer(): Promise<void> {
    try {
      console.log("🛑 Arrêt du serveur INDI");
      await exec("sudo pkill -f indiserver");
      await exec("sudo systemctl stop indiserver || true");
    } catch (error) {
      console.warn("⚠️ Erreur lors de l'arrêt du serveur INDI:", error);
    }
  }

  /**
   * Démarrer le serveur INDI avec les drivers spécifiés
   */
  private async startIndiServer(drivers: string[]): Promise<void> {
    try {
      console.log("🚀 Démarrage du serveur INDI");

      // Construire la commande indiserver
      const driverPaths = await this.resolveDriverPaths(drivers);
      const command = `indiserver -v ${driverPaths.join(" ")}`;

      console.log(`🔧 Commande: ${command}`);

      // Démarrer le serveur en arrière-plan
      const { spawn } = require("child_process");
      const child = spawn("bash", ["-c", command], {
        detached: true,
        stdio: "ignore",
      });

      child.unref();

      // Attendre un peu pour s'assurer que le serveur démarre
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (error) {
      console.error("❌ Erreur lors du démarrage du serveur INDI:", error);
      throw error;
    }
  }

  /**
   * Résoudre les chemins complets des drivers
   */
  private async resolveDriverPaths(drivers: string[]): Promise<string[]> {
    const paths: string[] = [];
    const searchDirs = [
      "/usr/local/bin",
      "/usr/bin",
      "/usr/local/lib/indi",
      "/usr/lib/indi",
      "/opt/indi/bin",
      "/usr/lib/x86_64-linux-gnu/indi",
      "/usr/lib/aarch64-linux-gnu/indi",
      "/usr/lib/arm-linux-gnueabihf/indi",
    ];

    for (const driver of drivers) {
      let found = false;

      for (const dir of searchDirs) {
        const fullPath = `${dir}/${driver}`;
        try {
          await exec(`test -f ${fullPath} && test -x ${fullPath}`);
          paths.push(fullPath);
          found = true;
          break;
        } catch (error) {
          // Continuer la recherche
        }
      }

      if (!found) {
        console.warn(`⚠️ Driver ${driver} introuvable`);
      }
    }

    return paths;
  }

  /**
   * Obtenir la liste actuelle des périphériques détectés
   */
  getCurrentDevices(): UsbDevice[] {
    return Array.from(this.currentDevices.values());
  }

  /**
   * Obtenir les statistiques de détection
   */
  getStats(): {
    totalDevices: number;
    devicesWithDrivers: number;
    uniqueBrands: number;
    isRunning: boolean;
  } {
    const devices = this.getCurrentDevices();
    const devicesWithDrivers = devices.filter(
      (d) => d.matchingDrivers.length > 0
    );
    const brands = new Set(devices.map((d) => d.brand).filter(Boolean));

    return {
      totalDevices: devices.length,
      devicesWithDrivers: devicesWithDrivers.length,
      uniqueBrands: brands.size,
      isRunning: this.isPolling,
    };
  }
}

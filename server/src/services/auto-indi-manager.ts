import { IndiServerConfig, IndiServerManager } from "./indi-server-manager";
import { UsbDetector, UsbDetectorConfig, UsbDeviceEvent } from "./usb-detector";

import { DriverManager } from "../indi";
import { EventEmitter } from "events";

export interface AutoIndiConfig {
  usb?: UsbDetectorConfig;
  indi?: IndiServerConfig;
  enableAutoStart?: boolean;
  startupDrivers?: string[];
  logLevel?: "debug" | "info" | "warn" | "error";
}

export interface AutoIndiStatus {
  usbDetector: {
    running: boolean;
    devicesCount: number;
    devicesWithDrivers: number;
    uniqueBrands: number;
  };
  indiServer: {
    running: boolean;
    pid?: number;
    uptime?: number;
    loadedDrivers: string[];
    connectedClients: number;
  };
  systemStats: {
    totalRestarts: number;
    lastRestart?: number;
    uptime: number;
  };
}

export class AutoIndiManager extends EventEmitter {
  private config: Required<AutoIndiConfig>;
  private driverManager: DriverManager;
  private usbDetector: UsbDetector;
  private indiServerManager: IndiServerManager;
  private startTime: number;
  private totalRestarts = 0;
  private lastRestart?: number;
  private isInitialized = false;

  constructor(config: AutoIndiConfig = {}) {
    super();

    this.config = {
      usb: config.usb || {},
      indi: config.indi || {},
      enableAutoStart: config.enableAutoStart !== false,
      startupDrivers: config.startupDrivers || [],
      logLevel: config.logLevel || "info",
    };

    this.startTime = Date.now();
    this.driverManager = new DriverManager(
      this.config.indi.host || "localhost",
      this.config.indi.port || 7624
    );

    this.usbDetector = new UsbDetector(this.driverManager, this.config.usb);
    this.indiServerManager = new IndiServerManager(
      this.driverManager,
      this.config.indi
    );

    this.setupEventHandlers();
  }

  /**
   * Initialiser et démarrer le système
   */
  async start(): Promise<void> {
    if (this.isInitialized) {
      console.log("🔄 Système déjà initialisé");
      return;
    }

    console.log("🚀 Démarrage du système de gestion automatique INDI");

    try {
      // Démarrer la détection USB
      await this.usbDetector.start();

      // Démarrer le serveur INDI avec les drivers de démarrage si configuré
      if (this.config.enableAutoStart) {
        const driversToStart = await this.determineStartupDrivers();
        if (driversToStart.length > 0) {
          await this.indiServerManager.start(driversToStart);
        } else {
          console.log(
            "ℹ️ Aucun driver de démarrage détecté, serveur INDI non démarré"
          );
        }
      }

      this.isInitialized = true;
      console.log("✅ Système de gestion automatique INDI démarré");
      this.emit("systemStarted");
    } catch (error) {
      console.error("❌ Erreur lors du démarrage du système:", error);
      this.emit("systemError", error);
      throw error;
    }
  }

  /**
   * Arrêter le système
   */
  async stop(): Promise<void> {
    if (!this.isInitialized) {
      console.log("ℹ️ Système déjà arrêté");
      return;
    }

    console.log("🛑 Arrêt du système de gestion automatique INDI");

    try {
      // Arrêter la détection USB
      this.usbDetector.stop();

      // Arrêter le serveur INDI
      await this.indiServerManager.stop();

      this.isInitialized = false;
      console.log("✅ Système de gestion automatique INDI arrêté");
      this.emit("systemStopped");
    } catch (error) {
      console.error("❌ Erreur lors de l'arrêt du système:", error);
      this.emit("systemError", error);
      throw error;
    }
  }

  /**
   * Redémarrer le système
   */
  async restart(): Promise<void> {
    console.log("🔄 Redémarrage du système de gestion automatique INDI");

    try {
      await this.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.start();

      this.totalRestarts++;
      this.lastRestart = Date.now();

      console.log("✅ Système redémarré avec succès");
      this.emit("systemRestarted");
    } catch (error) {
      console.error("❌ Erreur lors du redémarrage du système:", error);
      this.emit("systemError", error);
      throw error;
    }
  }

  /**
   * Obtenir le statut complet du système
   */
  async getStatus(): Promise<AutoIndiStatus> {
    const usbStats = this.usbDetector.getStats();
    const indiStatus = await this.indiServerManager.getStatus();

    return {
      usbDetector: {
        running: usbStats.isRunning,
        devicesCount: usbStats.totalDevices,
        devicesWithDrivers: usbStats.devicesWithDrivers,
        uniqueBrands: usbStats.uniqueBrands,
      },
      indiServer: {
        running: indiStatus.running,
        pid: indiStatus.pid,
        uptime: indiStatus.uptime,
        loadedDrivers: indiStatus.loadedDrivers,
        connectedClients: indiStatus.connectedClients,
      },
      systemStats: {
        totalRestarts: this.totalRestarts,
        lastRestart: this.lastRestart,
        uptime: Date.now() - this.startTime,
      },
    };
  }

  /**
   * Configurer les gestionnaires d'événements
   */
  private setupEventHandlers(): void {
    // Événements de détection USB
    this.usbDetector.on("deviceAdded", (event: UsbDeviceEvent) => {
      this.log(
        "info",
        `📱 Périphérique ajouté: ${event.device.description} (${
          event.device.brand || "Inconnu"
        })`
      );
      this.emit("deviceAdded", event);
    });

    this.usbDetector.on("deviceRemoved", (event: UsbDeviceEvent) => {
      this.log(
        "info",
        `📱 Périphérique retiré: ${event.device.description} (${
          event.device.brand || "Inconnu"
        })`
      );
      this.emit("deviceRemoved", event);
    });

    this.usbDetector.on("indiRestarted", (data: { drivers: string[] }) => {
      this.log(
        "info",
        `🔄 Serveur INDI redémarré avec les drivers: ${data.drivers.join(", ")}`
      );
      this.totalRestarts++;
      this.lastRestart = Date.now();
      this.emit("indiRestarted", data);
    });

    this.usbDetector.on("indiRestartError", (error: Error) => {
      this.log("error", `❌ Erreur lors du redémarrage INDI: ${error.message}`);
      this.emit("indiRestartError", error);
    });

    // Événements du serveur INDI
    this.indiServerManager.on(
      "serverStarted",
      (data: { drivers: string[] }) => {
        this.log(
          "info",
          `🚀 Serveur INDI démarré avec les drivers: ${data.drivers.join(", ")}`
        );
        this.emit("serverStarted", data);
      }
    );

    this.indiServerManager.on("serverStopped", () => {
      this.log("info", "🛑 Serveur INDI arrêté");
      this.emit("serverStopped");
    });

    this.indiServerManager.on(
      "serverRestarted",
      (data: { drivers: string[] }) => {
        this.log(
          "info",
          `🔄 Serveur INDI redémarré avec les drivers: ${data.drivers.join(
            ", "
          )}`
        );
        this.totalRestarts++;
        this.lastRestart = Date.now();
        this.emit("serverRestarted", data);
      }
    );

    this.indiServerManager.on("serverError", (error: Error) => {
      this.log("error", `❌ Erreur du serveur INDI: ${error.message}`);
      this.emit("serverError", error);
    });

    this.indiServerManager.on(
      "serverExit",
      (data: { code: number | null; signal: string | null }) => {
        this.log(
          "warn",
          `⚠️ Serveur INDI terminé (code: ${data.code}, signal: ${data.signal})`
        );
        this.emit("serverExit", data);
      }
    );

    this.indiServerManager.on(
      "serverLog",
      (data: { type: "stdout" | "stderr"; message: string }) => {
        if (this.config.logLevel === "debug") {
          this.log(
            "debug",
            `[INDI ${data.type.toUpperCase()}] ${data.message}`
          );
        }
        this.emit("serverLog", data);
      }
    );
  }

  /**
   * Déterminer les drivers de démarrage
   */
  private async determineStartupDrivers(): Promise<string[]> {
    const driversToStart = new Set<string>();

    // Ajouter les drivers de démarrage configurés
    for (const driver of this.config.startupDrivers) {
      driversToStart.add(driver);
    }

    // Ajouter les drivers détectés via USB
    const detectedDevices = this.usbDetector.getCurrentDevices();
    for (const device of detectedDevices) {
      if (device.matchingDrivers && device.matchingDrivers.length > 0) {
        for (const driver of device.matchingDrivers) {
          driversToStart.add(driver);
        }
      }
    }

    return Array.from(driversToStart);
  }

  /**
   * Logging avec niveaux
   */
  private log(
    level: "debug" | "info" | "warn" | "error",
    message: string
  ): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      const levelText = level.toUpperCase().padEnd(5);
      console.log(`[${timestamp}] [${levelText}] ${message}`);
    }
  }

  /**
   * Obtenir les périphériques détectés
   */
  getDetectedDevices() {
    return this.usbDetector.getCurrentDevices();
  }

  /**
   * Obtenir les drivers actuellement chargés
   */
  getCurrentDrivers(): string[] {
    return this.indiServerManager.getCurrentDrivers();
  }

  /**
   * Forcer le redémarrage du serveur INDI
   */
  async forceIndiRestart(): Promise<void> {
    const driversToStart = await this.determineStartupDrivers();
    await this.indiServerManager.restart(driversToStart);
  }

  /**
   * Ajouter un driver manuellement
   */
  async addDriver(driver: string): Promise<void> {
    await this.indiServerManager.addDriver(driver);
  }

  /**
   * Supprimer un driver manuellement
   */
  async removeDriver(driver: string): Promise<void> {
    await this.indiServerManager.removeDriver(driver);
  }

  /**
   * Obtenir la liste des drivers installés
   */
  async getInstalledDrivers(): Promise<string[]> {
    return await this.driverManager.getInstalledDrivers();
  }

  /**
   * Obtenir les logs récents
   */
  async getRecentLogs(lines: number = 50): Promise<string[]> {
    return await this.indiServerManager.getRecentLogs(lines);
  }

  /**
   * Nettoyer les ressources
   */
  async cleanup(): Promise<void> {
    console.log("🧹 Nettoyage des ressources du système...");

    try {
      await this.stop();
      await this.indiServerManager.cleanup();
      console.log("✅ Nettoyage terminé");
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage:", error);
    }
  }

  /**
   * Obtenir les statistiques détaillées
   */
  async getDetailedStats(): Promise<{
    system: AutoIndiStatus;
    devices: any[];
    drivers: {
      installed: string[];
      loaded: string[];
      available: string[];
    };
  }> {
    const status = await this.getStatus();
    const devices = this.getDetectedDevices();
    const installedDrivers = await this.getInstalledDrivers();
    const loadedDrivers = this.getCurrentDrivers();
    const availableDrivers = await this.driverManager.getAvailableDrivers();

    return {
      system: status,
      devices,
      drivers: {
        installed: installedDrivers,
        loaded: loadedDrivers,
        available: availableDrivers,
      },
    };
  }
}

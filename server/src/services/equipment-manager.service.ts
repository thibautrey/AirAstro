import {
  DetectedDevice,
  EquipmentDetectorService,
} from "./equipment-detector.service";

import { DriverManager } from "../indi";
import { EquipmentDatabaseService } from "./equipment-database.service";
import { EventEmitter } from "events";

export interface EquipmentStatus {
  id: string;
  name: string;
  status: "disconnected" | "connected" | "error" | "configuring";
  lastSeen: Date;
  errorMessage?: string;
}

export interface AutoSetupResult {
  totalDevices: number;
  configured: number;
  failed: number;
  devices: DetectedDevice[];
  errors: string[];
}

export class EquipmentManagerService extends EventEmitter {
  private driverManager: DriverManager;
  private detectorService: EquipmentDetectorService;
  private equipmentDatabase: EquipmentDatabaseService;
  private equipmentStatus: Map<string, EquipmentStatus> = new Map();
  private isMonitoring: boolean = false;
  private monitoringInterval?: NodeJS.Timeout;
  private setupInProgress: boolean = false;

  constructor(
    driverManager: DriverManager,
    equipmentDatabase: EquipmentDatabaseService
  ) {
    super();
    this.driverManager = driverManager;
    this.equipmentDatabase = equipmentDatabase;
    this.detectorService = new EquipmentDetectorService(
      driverManager,
      equipmentDatabase
    );
  }

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    console.log("🔍 Démarrage du monitoring des équipements...");
    this.isMonitoring = true;

    // Scan initial
    await this.scanEquipment();

    // Scan périodique toutes les 30 secondes
    this.monitoringInterval = setInterval(async () => {
      await this.scanEquipment();
    }, 30000);

    this.emit("monitoringStarted");
  }

  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    console.log("🛑 Arrêt du monitoring des équipements...");
    this.isMonitoring = false;

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }

    this.emit("monitoringStopped");
  }

  private async scanEquipment(): Promise<void> {
    try {
      const devices = await this.detectorService.detectAllEquipment();

      // Mettre à jour le statut des équipements
      const currentTime = new Date();
      const newDeviceIds = new Set<string>();

      for (const device of devices) {
        newDeviceIds.add(device.id);

        const existingStatus = this.equipmentStatus.get(device.id);
        const status: EquipmentStatus = {
          id: device.id,
          name: device.name,
          status: this.getDeviceStatus(device),
          lastSeen: currentTime,
          errorMessage: existingStatus?.errorMessage,
        };

        // Vérifier si le statut a changé
        if (!existingStatus || existingStatus.status !== status.status) {
          this.equipmentStatus.set(device.id, status);
          this.emit("equipmentStatusChanged", status, device);

          console.log(`📡 ${device.name}: ${status.status}`);
        } else {
          // Juste mettre à jour lastSeen
          existingStatus.lastSeen = currentTime;
        }
      }

      // Marquer les équipements non détectés comme déconnectés
      for (const [deviceId, status] of this.equipmentStatus.entries()) {
        if (!newDeviceIds.has(deviceId) && status.status !== "disconnected") {
          status.status = "disconnected";
          status.lastSeen = currentTime;
          this.emit("equipmentStatusChanged", status, null);
          console.log(`🔌 ${status.name}: déconnecté`);
        }
      }
    } catch (error) {
      console.error("❌ Erreur lors du scan des équipements:", error);
      this.emit("scanError", error);
    }
  }

  private getDeviceStatus(device: DetectedDevice): EquipmentStatus["status"] {
    switch (device.driverStatus) {
      case "running":
        return "connected";
      case "installed":
      case "found":
        return "disconnected";
      case "not-found":
        return "error";
      default:
        return "disconnected";
    }
  }

  async performAutoSetup(): Promise<AutoSetupResult> {
    if (this.setupInProgress) {
      throw new Error("Une configuration automatique est déjà en cours");
    }

    this.setupInProgress = true;

    try {
      console.log("🚀 Démarrage de la configuration automatique...");
      this.emit("autoSetupStarted");

      // Détecter tous les équipements
      const devices = await this.detectorService.detectAllEquipment();

      console.log(`📦 ${devices.length} équipements détectés`);

      const result: AutoSetupResult = {
        totalDevices: devices.length,
        configured: 0,
        failed: 0,
        devices: [],
        errors: [],
      };

      // Configurer chaque équipement automatiquement
      for (const device of devices) {
        if (device.autoInstallable && device.driverStatus !== "running") {
          // Émettre un événement pour indiquer qu'on configure ce device
          this.emit("configuringDevice", device);

          // Mettre à jour le statut
          const status: EquipmentStatus = {
            id: device.id,
            name: device.name,
            status: "configuring",
            lastSeen: new Date(),
          };
          this.equipmentStatus.set(device.id, status);
          this.emit("equipmentStatusChanged", status, device);

          try {
            const success = await this.detectorService.setupDevice(device);

            if (success) {
              result.configured++;
              status.status = "connected";
              console.log(`✅ ${device.name} configuré avec succès`);
            } else {
              result.failed++;
              status.status = "error";
              status.errorMessage = "Échec de la configuration";
              result.errors.push(`Échec de la configuration de ${device.name}`);
              console.log(`❌ Échec de la configuration de ${device.name}`);
            }

            this.equipmentStatus.set(device.id, status);
            this.emit("equipmentStatusChanged", status, device);
          } catch (error) {
            result.failed++;
            status.status = "error";
            status.errorMessage =
              error instanceof Error ? error.message : "Erreur inconnue";
            result.errors.push(
              `Erreur lors de la configuration de ${device.name}: ${status.errorMessage}`
            );

            this.equipmentStatus.set(device.id, status);
            this.emit("equipmentStatusChanged", status, device);

            console.error(
              `❌ Erreur lors de la configuration de ${device.name}:`,
              error
            );
          }
        }

        result.devices.push(device);
      }

      console.log(
        `🎉 Configuration automatique terminée: ${result.configured} configurés, ${result.failed} échecs`
      );

      this.emit("autoSetupCompleted", result);

      return result;
    } finally {
      this.setupInProgress = false;
    }
  }

  async getEquipmentList(): Promise<DetectedDevice[]> {
    return await this.detectorService.detectAllEquipment();
  }

  getEquipmentStatus(): EquipmentStatus[] {
    return Array.from(this.equipmentStatus.values());
  }

  async setupSingleDevice(deviceId: string): Promise<boolean> {
    const devices = await this.detectorService.detectAllEquipment();
    const device = devices.find((d) => d.id === deviceId);

    if (!device) {
      throw new Error(`Équipement ${deviceId} non trouvé`);
    }

    if (!device.autoInstallable) {
      throw new Error(
        `Équipement ${device.name} ne peut pas être configuré automatiquement`
      );
    }

    const status: EquipmentStatus = {
      id: device.id,
      name: device.name,
      status: "configuring",
      lastSeen: new Date(),
    };

    this.equipmentStatus.set(device.id, status);
    this.emit("equipmentStatusChanged", status, device);

    try {
      const success = await this.detectorService.setupDevice(device);

      status.status = success ? "connected" : "error";
      if (!success) {
        status.errorMessage = "Échec de la configuration";
      }

      this.equipmentStatus.set(device.id, status);
      this.emit("equipmentStatusChanged", status, device);

      return success;
    } catch (error) {
      status.status = "error";
      status.errorMessage =
        error instanceof Error ? error.message : "Erreur inconnue";

      this.equipmentStatus.set(device.id, status);
      this.emit("equipmentStatusChanged", status, device);

      throw error;
    }
  }

  async restartDevice(deviceId: string): Promise<boolean> {
    const devices = await this.detectorService.detectAllEquipment();
    const device = devices.find((d) => d.id === deviceId);

    if (!device || !device.driverName) {
      return false;
    }

    try {
      // Arrêter le driver
      await this.driverManager.stopDriver(device.driverName);

      // Attendre un peu
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Redémarrer le driver
      await this.driverManager.startDriver(device.driverName);

      return true;
    } catch (error) {
      console.error(`Erreur lors du redémarrage de ${device.name}:`, error);
      return false;
    }
  }

  isSetupInProgress(): boolean {
    return this.setupInProgress;
  }

  clearCache(): void {
    this.detectorService.clearCache();
  }
}

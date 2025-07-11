import { EventEmitter } from "events";
import { IndiClient } from "./indi-client";
import { IndiController } from "./indi-controller";

/**
 * Service d'intégration INDI pour AirAstro
 * Centralise la gestion des connexions INDI et fournit une API unifiée
 */
export class IndiIntegrationService extends EventEmitter {
  private static instance: IndiIntegrationService;
  private indiController: IndiController;
  private isInitialized: boolean = false;

  private constructor() {
    super();
    this.indiController = new IndiController();
    this.setupEventForwarding();
  }

  public static getInstance(): IndiIntegrationService {
    if (!IndiIntegrationService.instance) {
      IndiIntegrationService.instance = new IndiIntegrationService();
    }
    return IndiIntegrationService.instance;
  }

  private setupEventForwarding(): void {
    // Forwarder tous les événements du controller vers les clients
    this.indiController.client.on("connected", () => {
      this.emit("connected");
    });

    this.indiController.client.on("disconnected", () => {
      this.emit("disconnected");
    });

    this.indiController.client.on("error", (error) => {
      this.emit("error", error);
    });

    this.indiController.client.on(
      "propertyDefined",
      (device, property, prop) => {
        this.emit("propertyDefined", device, property, prop);
      }
    );

    this.indiController.client.on(
      "propertyUpdated",
      (device, property, prop) => {
        this.emit("propertyUpdated", device, property, prop);
      }
    );

    this.indiController.client.on("message", (device, message, timestamp) => {
      this.emit("message", device, message, timestamp);
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      await this.indiController.connect();
      this.isInitialized = true;
      console.log("✅ Service d'intégration INDI initialisé");
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'initialisation du service INDI:",
        error
      );
      throw error;
    }
  }

  getIndiController(): IndiController {
    return this.indiController;
  }

  getIndiClient(): IndiClient {
    return this.indiController.client;
  }

  async getAvailableDevices(): Promise<string[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.indiController.client.getDevices();
  }

  async getDeviceStatus(): Promise<any> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    return this.indiController.getDeviceStatus();
  }

  async connectAllDevices(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    await this.indiController.connectAllDevices();
  }

  async runImagingSequence(targets: any[]): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }
    await this.indiController.runImagingSequence(targets);
  }

  async shutdown(): Promise<void> {
    if (this.isInitialized) {
      await this.indiController.disconnect();
      this.isInitialized = false;
      console.log("🔌 Service d'intégration INDI fermé");
    }
  }
}

// Instance singleton
export const indiIntegrationService = IndiIntegrationService.getInstance();

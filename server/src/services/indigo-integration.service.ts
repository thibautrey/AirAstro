import { EventEmitter } from "events";
import { IndigoClient } from "./indigo-client";

/**
 * Lightweight integration service for Indigo.
 * Provides a similar interface as IndiIntegrationService
 * so existing code can migrate progressively.
 */
export class IndigoIntegrationService extends EventEmitter {
  private static instance: IndigoIntegrationService;
  public client: IndigoClient;
  private initialized = false;

  private constructor() {
    super();
    this.client = new IndigoClient();
    this.forwardEvents();
  }

  static getInstance(): IndigoIntegrationService {
    if (!IndigoIntegrationService.instance) {
      IndigoIntegrationService.instance = new IndigoIntegrationService();
    }
    return IndigoIntegrationService.instance;
  }

  private forwardEvents() {
    this.client.on("connected", () => this.emit("connected"));
    this.client.on("disconnected", () => this.emit("disconnected"));
    this.client.on("message", (msg) => this.emit("message", msg));
    this.client.on("error", (err) => this.emit("error", err));
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.client.connect();
    this.initialized = true;
  }

  async shutdown(): Promise<void> {
    if (!this.initialized) return;
    await this.client.disconnect();
    this.initialized = false;
  }
}

export const indigoIntegrationService = IndigoIntegrationService.getInstance();

import airAstroUrlService from "./airastro-url.service";

export interface IndiEvent {
  type:
    | "connected"
    | "disconnected"
    | "propertyUpdated"
    | "propertyDefined"
    | "message"
    | "error";
  device?: string;
  property?: string;
  data?: any;
  timestamp: string;
}

export interface CameraEvent {
  type:
    | "cameraStatusUpdate"
    | "exposureProgress"
    | "exposureComplete"
    | "imageReceived"
    | "cameraError";
  data?: any;
  timestamp: string;
}

class IndiWebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<
    string,
    Set<(event: IndiEvent | CameraEvent) => void>
  > = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private isConnecting = false;

  connect(): void {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isConnecting = true;

    try {
      const wsUrl = airAstroUrlService.buildWebSocketUrl("indi");
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("✅ Connecté au WebSocket INDI");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit("connected", {
          type: "connected",
          timestamp: new Date().toISOString(),
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error("Erreur lors du parsing du message WebSocket:", error);
        }
      };

      this.ws.onclose = () => {
        console.log("❌ WebSocket INDI fermé");
        this.isConnecting = false;
        this.emit("disconnected", {
          type: "disconnected",
          timestamp: new Date().toISOString(),
        });
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("🔥 Erreur WebSocket INDI:", error);
        this.isConnecting = false;
        this.emit("error", {
          type: "error",
          data: { message: "Erreur de connexion WebSocket" },
          timestamp: new Date().toISOString(),
        });
      };
    } catch (error) {
      console.error("Erreur lors de la création du WebSocket:", error);
      this.isConnecting = false;
    }
  }

  private handleMessage(data: any): void {
    const timestamp = new Date().toISOString();

    // Messages INDI
    if (data.type === "indi-update") {
      const event: IndiEvent = {
        type: "propertyUpdated",
        device: data.device,
        property: data.property,
        data: data.state ? { state: data.state } : data.data,
        timestamp,
      };
      this.emit("propertyUpdated", event);
      this.emit("indi", event);
    }

    if (data.type === "indi-property-defined") {
      const event: IndiEvent = {
        type: "propertyDefined",
        device: data.device,
        property: data.property,
        data: data.data,
        timestamp,
      };
      this.emit("propertyDefined", event);
      this.emit("indi", event);
    }

    if (data.type === "indi-message") {
      const event: IndiEvent = {
        type: "message",
        device: data.device,
        data: { message: data.message, timestamp: data.timestamp },
        timestamp,
      };
      this.emit("message", event);
      this.emit("indi", event);
    }

    // Messages caméra
    if (data.type === "camera-status-update") {
      const event: CameraEvent = {
        type: "cameraStatusUpdate",
        data: data.status,
        timestamp,
      };
      this.emit("cameraStatusUpdate", event);
      this.emit("camera", event);
    }

    if (data.type === "exposure-progress") {
      const event: CameraEvent = {
        type: "exposureProgress",
        data: { progress: data.progress, timeRemaining: data.timeRemaining },
        timestamp,
      };
      this.emit("exposureProgress", event);
      this.emit("camera", event);
    }

    if (data.type === "exposure-complete") {
      const event: CameraEvent = {
        type: "exposureComplete",
        data: data.data,
        timestamp,
      };
      this.emit("exposureComplete", event);
      this.emit("camera", event);
    }

    if (data.type === "image-received") {
      const event: CameraEvent = {
        type: "imageReceived",
        data: {
          filename: data.filename,
          filepath: data.filepath,
          parameters: data.parameters,
        },
        timestamp,
      };
      this.emit("imageReceived", event);
      this.emit("camera", event);
    }

    if (data.type === "camera-error") {
      const event: CameraEvent = {
        type: "cameraError",
        data: { error: data.error },
        timestamp,
      };
      this.emit("cameraError", event);
      this.emit("camera", event);
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay =
        this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `⏳ Tentative de reconnexion WebSocket dans ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
      );

      setTimeout(() => {
        this.connect();
      }, delay);
    } else {
      console.error("❌ Nombre maximum de tentatives de reconnexion atteint");
    }
  }

  private emit(eventType: string, event: IndiEvent | CameraEvent): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          console.error("Erreur dans le listener WebSocket:", error);
        }
      });
    }
  }

  // Méthodes publiques pour les listeners
  on(
    eventType: "connected" | "disconnected" | "error",
    listener: (event: IndiEvent) => void
  ): () => void;
  on(eventType: "indi", listener: (event: IndiEvent) => void): () => void;
  on(
    eventType: "propertyUpdated" | "propertyDefined" | "message",
    listener: (event: IndiEvent) => void
  ): () => void;
  on(eventType: "camera", listener: (event: CameraEvent) => void): () => void;
  on(
    eventType:
      | "cameraStatusUpdate"
      | "exposureProgress"
      | "exposureComplete"
      | "imageReceived"
      | "cameraError",
    listener: (event: CameraEvent) => void
  ): () => void;
  on(eventType: string, listener: (event: any) => void): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }

    this.listeners.get(eventType)!.add(listener);

    // Retourner une fonction de nettoyage
    return () => {
      const listeners = this.listeners.get(eventType);
      if (listeners) {
        listeners.delete(listener);
        if (listeners.size === 0) {
          this.listeners.delete(eventType);
        }
      }
    };
  }

  off(eventType: string, listener: (event: any) => void): void {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(listener);
      if (listeners.size === 0) {
        this.listeners.delete(eventType);
      }
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

export const indiWebSocketService = new IndiWebSocketService();

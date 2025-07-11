import { io, Socket } from "socket.io-client";
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
  private socket: Socket | null = null;
  private listeners: Map<
    string,
    Set<(event: IndiEvent | CameraEvent) => void>
  > = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private isConnecting = false;

  connect(): void {
    if (this.isConnecting || (this.socket && this.socket.connected)) {
      return;
    }

    this.isConnecting = true;

    try {
      const baseUrl = airAstroUrlService.getBaseUrl();
      if (!baseUrl) {
        console.error("❌ URL de base AirAstro non disponible");
        this.isConnecting = false;
        return;
      }

      // Configuration de Socket.IO pour se connecter au namespace INDI
      this.socket = io(baseUrl, {
        path: "/ws/indi",
        transports: ["websocket", "polling"],
        timeout: 5000,
        reconnection: false, // On gère la reconnexion nous-mêmes
      });

      this.socket.on("connect", () => {
        console.log("✅ Connecté au Socket.IO INDI");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.emit("connected", {
          type: "connected",
          timestamp: new Date().toISOString(),
        });
      });

      this.socket.on("disconnect", (reason) => {
        console.log("❌ Socket.IO INDI déconnecté:", reason);
        this.isConnecting = false;
        this.emit("disconnected", {
          type: "disconnected",
          timestamp: new Date().toISOString(),
        });
        this.attemptReconnect();
      });

      this.socket.on("connect_error", (error) => {
        console.error("🔥 Erreur de connexion Socket.IO INDI:", error);
        this.isConnecting = false;
        this.emit("error", {
          type: "error",
          data: { message: error.message },
          timestamp: new Date().toISOString(),
        });
        this.attemptReconnect();
      });

      // Écouter les événements INDI du serveur
      this.setupIndiEventListeners();
    } catch (error) {
      console.error("Erreur lors de la création du Socket.IO:", error);
      this.isConnecting = false;
    }
  }

  private setupIndiEventListeners(): void {
    if (!this.socket) return;

    // Événements INDI génériques
    this.socket.on("indi:connected", (data) => {
      this.emit("connected", {
        type: "connected",
        data,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on("indi:disconnected", (data) => {
      this.emit("disconnected", {
        type: "disconnected",
        data,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on("indi:error", (data) => {
      this.emit("error", {
        type: "error",
        data,
        timestamp: new Date().toISOString(),
      });
    });

    this.socket.on("indi:propertyDefined", (data) => {
      this.emit("propertyDefined", {
        type: "propertyDefined",
        device: data.device,
        property: data.property,
        data: data.prop,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("indi:propertyUpdated", (data) => {
      this.emit("propertyUpdated", {
        type: "propertyUpdated",
        device: data.device,
        property: data.property,
        data: { state: data.state },
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("indi:message", (data) => {
      this.emit("message", {
        type: "message",
        device: data.device,
        data: { message: data.message, timestamp: data.timestamp },
        timestamp: new Date().toISOString(),
      });
    });

    // Événements caméra
    this.socket.on("camera:statusUpdate", (data) => {
      this.emit("cameraStatusUpdate", {
        type: "cameraStatusUpdate",
        data: data.status,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("camera:exposureStarted", (data) => {
      this.emit("exposureProgress", {
        type: "exposureProgress",
        data: { progress: 0, timeRemaining: 0 },
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("camera:exposureProgress", (data) => {
      this.emit("exposureProgress", {
        type: "exposureProgress",
        data: { progress: data.progress, timeRemaining: data.timeRemaining },
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("camera:exposureCompleted", (data) => {
      this.emit("exposureComplete", {
        type: "exposureComplete",
        data,
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("camera:imageReceived", (data) => {
      this.emit("imageReceived", {
        type: "imageReceived",
        data: {
          filename: data.filename,
          filepath: data.filepath,
          parameters: data.parameters,
        },
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("camera:temperatureUpdate", (data) => {
      this.emit("cameraStatusUpdate", {
        type: "cameraStatusUpdate",
        data: { temperature: data.temperature },
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });

    this.socket.on("device:connectionChanged", (data) => {
      this.emit("propertyUpdated", {
        type: "propertyUpdated",
        device: data.device,
        property: "CONNECTION",
        data: { connected: data.connected },
        timestamp: data.timestamp || new Date().toISOString(),
      });
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = 1000 * Math.pow(2, this.reconnectAttempts - 1);

      console.log(
        `⏳ Tentative de reconnexion Socket.IO dans ${delay}ms (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
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
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }

  isConnected(): boolean {
    return this.socket !== null && this.socket.connected;
  }
}

export const indiWebSocketService = new IndiWebSocketService();

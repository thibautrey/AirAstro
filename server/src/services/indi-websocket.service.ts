import { Server } from "socket.io";
import { indiIntegrationService } from "./indi-integration.service";

export class IndiWebSocketService {
  private io: Server;

  constructor(io: Server) {
    this.io = io;
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Forwarding des événements INDI vers les clients WebSocket
    indiIntegrationService.on("connected", () => {
      this.io.emit("indi:connected", { timestamp: new Date() });
    });

    indiIntegrationService.on("disconnected", () => {
      this.io.emit("indi:disconnected", { timestamp: new Date() });
    });

    indiIntegrationService.on("error", (error) => {
      this.io.emit("indi:error", {
        error: error.message,
        timestamp: new Date(),
      });
    });

    indiIntegrationService.on("propertyDefined", (device, property, prop) => {
      this.io.emit("indi:propertyDefined", {
        device,
        property,
        prop: {
          name: prop.name,
          label: prop.label,
          group: prop.group,
          state: prop.state,
          perm: prop.perm,
          elementCount: prop.elements.size,
        },
        timestamp: new Date(),
      });
    });

    indiIntegrationService.on("propertyUpdated", (device, property, prop) => {
      this.io.emit("indi:propertyUpdated", {
        device,
        property,
        state: prop.state,
        timestamp: new Date(),
      });

      // Événements spécialisés pour les caméras
      if (property === "CCD_EXPOSURE") {
        if (prop.state === "Busy") {
          this.io.emit("camera:exposureStarted", {
            device,
            timestamp: new Date(),
          });
        } else if (prop.state === "Ok") {
          this.io.emit("camera:exposureCompleted", {
            device,
            timestamp: new Date(),
          });
        }
      }

      if (property === "CCD_TEMPERATURE") {
        const tempElement = prop.elements.get("CCD_TEMPERATURE_VALUE");
        if (tempElement) {
          this.io.emit("camera:temperatureUpdate", {
            device,
            temperature: parseFloat(tempElement.value),
            timestamp: new Date(),
          });
        }
      }

      if (property === "CONNECTION") {
        const connected = prop.elements.get("CONNECT")?.value === "On";
        this.io.emit("device:connectionChanged", {
          device,
          connected,
          timestamp: new Date(),
        });
      }
    });

    indiIntegrationService.on("message", (device, message, timestamp) => {
      this.io.emit("indi:message", {
        device,
        message,
        timestamp,
      });
    });

    // Gestion des connexions des clients
    this.io.on("connection", (socket) => {
      console.log(`🔌 Client WebSocket connecté: ${socket.id}`);

      // Envoyer l'état actuel lors de la connexion
      socket.emit("indi:status", {
        connected: true,
        devices: indiIntegrationService.getIndiClient().getDevices(),
        timestamp: new Date(),
      });

      socket.on("disconnect", () => {
        console.log(`🔌 Client WebSocket déconnecté: ${socket.id}`);
      });

      // Permettre aux clients de demander des informations
      socket.on("indi:requestDeviceList", () => {
        const devices = indiIntegrationService.getIndiClient().getDevices();
        socket.emit("indi:deviceList", {
          devices,
          timestamp: new Date(),
        });
      });

      socket.on("indi:requestDeviceStatus", (deviceName: string) => {
        const client = indiIntegrationService.getIndiClient();
        const device = client.getDevice(deviceName);

        if (device) {
          const status = {
            name: deviceName,
            propertyCount: device.properties.size,
            connected:
              device.properties.get("CONNECTION")?.elements.get("CONNECT")
                ?.value === "On",
            properties: Array.from(device.properties.entries()).map(
              ([name, prop]) => ({
                name,
                state: prop.state,
                elementCount: prop.elements.size,
              })
            ),
          };

          socket.emit("indi:deviceStatus", {
            device: deviceName,
            status,
            timestamp: new Date(),
          });
        } else {
          socket.emit("indi:error", {
            error: `Device ${deviceName} not found`,
            timestamp: new Date(),
          });
        }
      });
    });
  }

  // Méthodes pour émettre des événements personnalisés
  emitCameraUpdate(device: string, status: any): void {
    this.io.emit("camera:statusUpdate", {
      device,
      status,
      timestamp: new Date(),
    });
  }

  emitExposureProgress(
    device: string,
    progress: number,
    timeRemaining: number
  ): void {
    this.io.emit("camera:exposureProgress", {
      device,
      progress,
      timeRemaining,
      timestamp: new Date(),
    });
  }

  emitImageReceived(device: string, imagePath: string): void {
    this.io.emit("camera:imageReceived", {
      device,
      imagePath,
      timestamp: new Date(),
    });
  }
}

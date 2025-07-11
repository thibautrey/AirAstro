import { Server, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { getCameraService } from "../controllers/camera.controller";
import { updateEmitter } from "./update.service";

export class WebSocketService {
  private io: Server;
  private cameraService: any;

  constructor(httpServer: HttpServer) {
    this.io = new Server(httpServer, {
      cors: {
        origin: [
          "http://localhost:5173",
          "http://localhost:3000",
          "http://airastro.local",
          "http://10.42.0.1",
        ],
        methods: ["GET", "POST"],
      },
    });

    this.cameraService = getCameraService();
    this.setupEventHandlers();
    this.setupUpdateEventHandlers();
  }

  private setupEventHandlers(): void {
    this.io.on("connection", (socket: Socket) => {
      console.log("Client connecté:", socket.id);

      // Envoyer l'état actuel de la caméra
      this.sendCameraStatus(socket);

      // Écouter les demandes de statut
      socket.on("requestCameraStatus", () => {
        this.sendCameraStatus(socket);
      });

      socket.on("disconnect", () => {
        console.log("Client déconnecté:", socket.id);
      });
    });

    // Écouter les événements de la caméra
    this.cameraService.on("cameraConnected", (cameraName: string) => {
      this.io.emit("cameraConnected", { cameraName });
    });

    this.cameraService.on("parametersUpdated", (parameters: any) => {
      this.io.emit("parametersUpdated", { parameters });
    });

    this.cameraService.on("captureStarted", (data: any) => {
      this.io.emit("captureStarted", data);
    });

    this.cameraService.on("captureProgress", (data: any) => {
      this.io.emit("captureProgress", data);
    });

    this.cameraService.on("captureCompleted", (data: any) => {
      this.io.emit("captureCompleted", data);
    });

    this.cameraService.on("captureCancelled", () => {
      this.io.emit("captureCancelled");
    });

    this.cameraService.on("captureError", (data: any) => {
      this.io.emit("captureError", data);
    });

    this.cameraService.on("coolingChanged", (data: any) => {
      this.io.emit("coolingChanged", data);
    });
  }

  private setupUpdateEventHandlers(): void {
    // Écouter les événements de progress de mise à jour
    updateEmitter.on("progress", (data) => {
      this.io.emit("updateProgress", data);
    });
  }

  private sendCameraStatus(socket: Socket): void {
    const status = this.cameraService.getCameraStatus();
    const selectedCamera = this.cameraService.getSelectedCamera();
    const lastParameters = this.cameraService.getLastParameters();

    socket.emit("cameraStatus", {
      ...status,
      selectedCamera,
      lastParameters,
    });
  }

  public broadcastCameraStatus(): void {
    const status = this.cameraService.getCameraStatus();
    const selectedCamera = this.cameraService.getSelectedCamera();
    const lastParameters = this.cameraService.getLastParameters();

    this.io.emit("cameraStatus", {
      ...status,
      selectedCamera,
      lastParameters,
    });
  }
}

export let webSocketService: WebSocketService;

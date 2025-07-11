import { DetectedDevice } from "./equipment-detector.service";
import { EquipmentManagerService } from "./equipment-manager.service";
import { EventEmitter } from "events";
import { IndiCamera } from "./indi-devices";
import { IndiClient } from "./indi-client";
import { cameraStateService } from "./camera-state.service";
import { promises as fs } from "fs";
import { indiIntegrationService } from "./indi-integration.service";
import path from "path";
import { v4 as uuidv4 } from "uuid";

export interface CameraParameters {
  exposure: number; // en secondes
  gain: number; // 0-100
  binning: string; // "1x1", "2x2", "3x3", "4x4"
  coolingTemperature?: number; // en degrés Celsius
  frameType: "Light" | "Dark" | "Flat" | "Bias";
  format: "FITS" | "TIFF" | "RAW";
  quality: number; // 0-100 pour JPEG/TIFF
  roi?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface CameraStatus {
  isConnected: boolean;
  isCapturing: boolean;
  temperature: number;
  coolingEnabled: boolean;
  coolingProgress: number;
  lastImagePath?: string;
  exposureProgress: number;
  exposureTimeRemaining: number;
  error?: string;
}

export interface CameraInfo {
  name: string;
  driver: string;
  model: string;
  maxBinning: number;
  pixelSize: number;
  sensorWidth: number;
  sensorHeight: number;
  hasCooling: boolean;
  hasFilterWheel: boolean;
  supportedFormats: string[];
}

export class CameraService extends EventEmitter {
  private indiClient: IndiClient;
  private selectedCamera?: IndiCamera;
  private selectedCameraName?: string;
  private cameraStatus: CameraStatus = {
    isConnected: false,
    isCapturing: false,
    temperature: 25,
    coolingEnabled: false,
    coolingProgress: 0,
    exposureProgress: 0,
    exposureTimeRemaining: 0,
  };
  private lastParameters: CameraParameters = {
    exposure: 1.0,
    gain: 50,
    binning: "1x1",
    frameType: "Light",
    format: "FITS",
    quality: 90,
  };
  private captureStartTime?: number;
  private exposureTimer?: NodeJS.Timeout;
  private imagesDirectory: string;

  constructor() {
    super();
    this.imagesDirectory = path.join(process.cwd(), "images");
    this.ensureImagesDirectory();

    // Utiliser le service d'intégration INDI
    this.indiClient = indiIntegrationService.getIndiClient();
    this.setupIndiEventHandlers();

    // Charger l'état persistant
    this.loadPersistedState();

    // Initialiser le service INDI
    this.initializeIndiService();
  }

  private async initializeIndiService(): Promise<void> {
    try {
      await indiIntegrationService.initialize();

      // Attendre un peu pour que les devices soient détectés
      setTimeout(() => {
        if (this.selectedCameraName) {
          this.reconnectSelectedCamera();
        }
      }, 2000);
    } catch (error) {
      console.error("❌ Impossible d'initialiser le service INDI:", error);
      this.cameraStatus.error = "Impossible de se connecter au serveur INDI";
    }
  }

  private setupIndiEventHandlers(): void {
    this.indiClient.on("connected", () => {
      console.log("✅ Connecté au serveur INDI");
      this.emit("indiConnected");
    });

    this.indiClient.on("disconnected", () => {
      console.log("❌ Déconnecté du serveur INDI");
      this.cameraStatus.isConnected = false;
      this.emit("indiDisconnected");
    });

    this.indiClient.on("error", (error) => {
      console.error("🔥 Erreur INDI:", error);
      this.cameraStatus.error =
        error instanceof Error ? error.message : String(error);
      this.emit("cameraError", error);
    });

    this.indiClient.on("propertyDefined", (device, property) => {
      console.log(`📡 Propriété définie: ${device}.${property}`);
      if (property === "CONNECTION" && device === this.selectedCameraName) {
        this.checkCameraConnection();
      }
    });

    this.indiClient.on("propertyUpdated", (device, property, prop) => {
      if (device === this.selectedCameraName) {
        this.handleCameraPropertyUpdate(property, prop);
      }
    });

    this.indiClient.on("message", (device, message) => {
      if (device === this.selectedCameraName) {
        console.log(`💬 [${device}] ${message}`);
        this.emit("cameraMessage", message);
      }
    });
  }
  private async connectToIndi(): Promise<void> {
    // Cette méthode n'est plus nécessaire car le service d'intégration gère la connexion
    // Garde pour compatibilité
  }

  private async reconnectSelectedCamera(): Promise<void> {
    if (this.selectedCameraName) {
      try {
        await this.selectCamera(this.selectedCameraName);
      } catch (error) {
        console.error("❌ Impossible de reconnecter la caméra:", error);
      }
    }
  }

  private handleCameraPropertyUpdate(property: string, prop: any): void {
    switch (property) {
      case "CONNECTION":
        this.cameraStatus.isConnected =
          prop.elements.get("CONNECT")?.value === "On";
        break;

      case "CCD_TEMPERATURE":
        const tempValue = prop.elements.get("CCD_TEMPERATURE_VALUE")?.value;
        if (tempValue !== undefined) {
          this.cameraStatus.temperature = parseFloat(tempValue);
        }
        break;

      case "CCD_COOLER":
        this.cameraStatus.coolingEnabled =
          prop.elements.get("COOLER_ON")?.value === "On";
        break;

      case "CCD_COOLER_POWER":
        const powerValue = prop.elements.get("CCD_COOLER_VALUE")?.value;
        if (powerValue !== undefined) {
          this.cameraStatus.coolingProgress = parseFloat(powerValue);
        }
        break;

      case "CCD_EXPOSURE":
        if (prop.state === "Busy") {
          this.cameraStatus.isCapturing = true;
          this.handleExposureStart();
        } else if (prop.state === "Ok") {
          this.cameraStatus.isCapturing = false;
          this.handleExposureComplete();
        } else if (prop.state === "Alert") {
          this.cameraStatus.isCapturing = false;
          this.cameraStatus.error = "Erreur lors de l'exposition";
        }
        break;

      case "CCD1":
        if (prop.state === "Ok") {
          this.handleImageReceived();
        }
        break;
    }

    // Émettre les changements d'état
    this.emit("cameraStatusUpdate", this.cameraStatus);
  }

  private handleExposureStart(): void {
    this.captureStartTime = Date.now();
    this.cameraStatus.exposureProgress = 0;
    this.cameraStatus.exposureTimeRemaining = this.lastParameters.exposure;

    // Démarrer le timer de progression
    this.exposureTimer = setInterval(() => {
      if (this.captureStartTime && this.cameraStatus.isCapturing) {
        const elapsed = (Date.now() - this.captureStartTime) / 1000;
        const totalTime = this.lastParameters.exposure;

        this.cameraStatus.exposureProgress = Math.min(
          (elapsed / totalTime) * 100,
          100
        );
        this.cameraStatus.exposureTimeRemaining = Math.max(
          totalTime - elapsed,
          0
        );

        this.emit("exposureProgress", {
          progress: this.cameraStatus.exposureProgress,
          timeRemaining: this.cameraStatus.exposureTimeRemaining,
        });
      }
    }, 100);
  }

  private handleExposureComplete(): void {
    if (this.exposureTimer) {
      clearInterval(this.exposureTimer);
      this.exposureTimer = undefined;
    }

    this.cameraStatus.exposureProgress = 100;
    this.cameraStatus.exposureTimeRemaining = 0;

    this.emit("exposureComplete");
  }

  private async handleImageReceived(): Promise<void> {
    // L'image est reçue via BLOB
    // Ici, vous devriez traiter l'image reçue
    console.log("📸 Image reçue");

    // Générer un nom de fichier unique
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `capture_${timestamp}.fits`;
    const filepath = path.join(this.imagesDirectory, filename);

    // Dans une implémentation complète, vous devriez sauvegarder l'image
    this.cameraStatus.lastImagePath = filepath;

    this.emit("imageReceived", {
      filename,
      filepath,
      parameters: this.lastParameters,
    });
  }

  private async checkCameraConnection(): Promise<void> {
    if (this.selectedCamera) {
      try {
        const isConnected = await this.selectedCamera.isConnected();
        this.cameraStatus.isConnected = isConnected;

        if (isConnected) {
          // Mettre à jour la température
          const temperature = await this.selectedCamera.getTemperature();
          this.cameraStatus.temperature = temperature;

          // Activer les BLOBs pour recevoir les images
          await this.selectedCamera.enableBLOB();
        }
      } catch (error) {
        console.error(
          "❌ Erreur lors de la vérification de la connexion:",
          error
        );
        this.cameraStatus.error =
          error instanceof Error ? error.message : String(error);
      }
    }
  }

  private loadPersistedState(): void {
    const state = cameraStateService.getState();
    this.selectedCameraName = state.selectedCamera;
    this.lastParameters = state.lastParameters;
  }

  private async ensureImagesDirectory(): Promise<void> {
    try {
      await fs.access(this.imagesDirectory);
    } catch {
      await fs.mkdir(this.imagesDirectory, { recursive: true });
    }
  }

  async getAvailableCameras(): Promise<CameraInfo[]> {
    // Récupérer les caméras détectées via INDI
    const devices = this.indiClient.getDevices();
    const cameras: CameraInfo[] = [];

    for (const deviceName of devices) {
      const device = this.indiClient.getDevice(deviceName);
      if (device) {
        // Vérifier si c'est une caméra en cherchant les propriétés caractéristiques
        const properties = Array.from(device.properties.keys());

        if (
          properties.includes("CCD_EXPOSURE") ||
          properties.includes("CCD_INFO") ||
          properties.includes("CCD1")
        ) {
          const cameraInfo: CameraInfo = {
            name: deviceName,
            driver: deviceName,
            model: deviceName,
            maxBinning: 4,
            pixelSize: 3.8,
            sensorWidth: 4096,
            sensorHeight: 4096,
            hasCooling: properties.includes("CCD_TEMPERATURE"),
            hasFilterWheel: properties.includes("FILTER_SLOT"),
            supportedFormats: ["FITS", "TIFF"],
          };

          cameras.push(cameraInfo);
        }
      }
    }

    return cameras;
  }

  async selectCamera(cameraName: string): Promise<void> {
    try {
      // Vérifier si la caméra est disponible via INDI
      const availableCameras = await this.getAvailableCameras();
      const cameraExists = availableCameras.some(
        (camera) => camera.name === cameraName
      );

      if (!cameraExists) {
        throw new Error(
          `Device ${cameraName} not found in INDI. Available cameras: ${availableCameras
            .map((c) => c.name)
            .join(", ")}`
        );
      }

      // Déconnecter l'ancienne caméra si elle existe
      if (this.selectedCamera) {
        try {
          await this.selectedCamera.disconnect();
        } catch (error) {
          console.warn(
            "Erreur lors de la déconnexion de l'ancienne caméra:",
            error
          );
        }
      }

      // Créer une nouvelle instance de caméra
      this.selectedCamera = new IndiCamera(this.indiClient, cameraName);
      this.selectedCameraName = cameraName;

      // Connecter la caméra
      await this.selectedCamera.connect();

      // Mettre à jour le statut
      this.cameraStatus.isConnected = true;
      this.cameraStatus.error = undefined;

      // Sauvegarder l'état
      cameraStateService.updateState({
        selectedCamera: cameraName,
        lastParameters: this.lastParameters,
      });

      // Vérifier la connexion et récupérer les informations
      await this.checkCameraConnection();

      console.log(`✅ Caméra sélectionnée: ${cameraName}`);
      this.emit("cameraSelected", cameraName);
    } catch (error) {
      console.error("❌ Erreur lors de la sélection de la caméra:", error);
      this.cameraStatus.error =
        error instanceof Error ? error.message : String(error);
      this.cameraStatus.isConnected = false;
      throw error;
    }
  }

  getCameraStatus(): CameraStatus {
    return { ...this.cameraStatus };
  }

  getSelectedCamera(): string | undefined {
    return this.selectedCameraName;
  }

  getLastParameters(): CameraParameters {
    return { ...this.lastParameters };
  }

  async updateParameters(parameters: Partial<CameraParameters>): Promise<void> {
    this.lastParameters = { ...this.lastParameters, ...parameters };

    // Sauvegarder l'état
    cameraStateService.updateState({
      selectedCamera: this.selectedCameraName,
      lastParameters: this.lastParameters,
    });

    // Appliquer les paramètres à la caméra si elle est connectée
    if (this.selectedCamera && this.cameraStatus.isConnected) {
      try {
        // Appliquer le binning
        if (parameters.binning) {
          const [x, y] = parameters.binning.split("x").map(Number);
          await this.selectedCamera.setBinning(x, y);
        }

        // Appliquer la ROI
        if (parameters.roi) {
          await this.selectedCamera.setROI(
            parameters.roi.x,
            parameters.roi.y,
            parameters.roi.width,
            parameters.roi.height
          );
        }

        // Appliquer la température de refroidissement
        if (parameters.coolingTemperature !== undefined) {
          await this.selectedCamera.setTemperature(
            parameters.coolingTemperature
          );
        }
      } catch (error) {
        console.error("❌ Erreur lors de l'application des paramètres:", error);
        throw error;
      }
    }

    this.emit("parametersUpdated", this.lastParameters);
  }

  async startCapture(parameters?: Partial<CameraParameters>): Promise<string> {
    if (!this.selectedCamera || !this.cameraStatus.isConnected) {
      throw new Error("Aucune caméra connectée");
    }

    if (this.cameraStatus.isCapturing) {
      throw new Error("Une capture est déjà en cours");
    }

    try {
      // Mettre à jour les paramètres si fournis
      if (parameters) {
        await this.updateParameters(parameters);
      }

      // Démarrer l'exposition
      await this.selectedCamera.startExposure(this.lastParameters.exposure);

      const captureId = uuidv4();
      console.log(
        `📸 Capture démarrée: ${captureId} (${this.lastParameters.exposure}s)`
      );

      this.emit("captureStarted", {
        captureId,
        parameters: this.lastParameters,
      });

      return captureId;
    } catch (error) {
      console.error("❌ Erreur lors du démarrage de la capture:", error);
      this.cameraStatus.error =
        error instanceof Error ? error.message : String(error);
      throw error;
    }
  }

  async cancelCapture(): Promise<void> {
    if (!this.selectedCamera || !this.cameraStatus.isCapturing) {
      throw new Error("Aucune capture en cours");
    }

    try {
      await this.selectedCamera.abortExposure();

      // Nettoyer les timers
      if (this.exposureTimer) {
        clearInterval(this.exposureTimer);
        this.exposureTimer = undefined;
      }

      this.cameraStatus.isCapturing = false;
      this.cameraStatus.exposureProgress = 0;
      this.cameraStatus.exposureTimeRemaining = 0;

      console.log("🛑 Capture annulée");
      this.emit("captureCancelled");
    } catch (error) {
      console.error("❌ Erreur lors de l'annulation de la capture:", error);
      throw error;
    }
  }

  async setCooling(
    enabled: boolean,
    targetTemperature?: number
  ): Promise<void> {
    if (!this.selectedCamera || !this.cameraStatus.isConnected) {
      throw new Error("Aucune caméra connectée");
    }

    try {
      if (enabled) {
        if (targetTemperature !== undefined) {
          await this.selectedCamera.setTemperature(targetTemperature);
        }
        await this.selectedCamera.enableCooling();
      } else {
        await this.selectedCamera.disableCooling();
      }

      this.cameraStatus.coolingEnabled = enabled;

      console.log(`❄️ Refroidissement ${enabled ? "activé" : "désactivé"}`);
      this.emit("coolingChanged", { enabled, targetTemperature });
    } catch (error) {
      console.error("❌ Erreur lors du contrôle du refroidissement:", error);
      throw error;
    }
  }

  async getImageHistory(): Promise<any[]> {
    try {
      const files = await fs.readdir(this.imagesDirectory);
      const images = [];

      for (const file of files) {
        if (
          file.endsWith(".fits") ||
          file.endsWith(".tiff") ||
          file.endsWith(".raw")
        ) {
          const filepath = path.join(this.imagesDirectory, file);
          const stats = await fs.stat(filepath);

          images.push({
            filename: file,
            filepath,
            size: stats.size,
            created: stats.birthtime,
            modified: stats.mtime,
          });
        }
      }

      return images.sort((a, b) => b.created.getTime() - a.created.getTime());
    } catch (error) {
      console.error(
        "❌ Erreur lors de la récupération de l'historique:",
        error
      );
      return [];
    }
  }

  async deleteImage(filename: string): Promise<void> {
    try {
      const filepath = path.join(this.imagesDirectory, filename);
      await fs.unlink(filepath);

      console.log(`🗑️ Image supprimée: ${filename}`);
      this.emit("imageDeleted", filename);
    } catch (error) {
      console.error("❌ Erreur lors de la suppression de l'image:", error);
      throw error;
    }
  }

  // Méthodes utilitaires
  isConnected(): boolean {
    return this.cameraStatus.isConnected;
  }

  isCapturing(): boolean {
    return this.cameraStatus.isCapturing;
  }

  // Nettoyage
  async disconnect(): Promise<void> {
    if (this.selectedCamera) {
      try {
        await this.selectedCamera.disconnect();
      } catch (error) {
        console.warn("Erreur lors de la déconnexion de la caméra:", error);
      }
    }

    if (this.exposureTimer) {
      clearInterval(this.exposureTimer);
      this.exposureTimer = undefined;
    }

    this.indiClient.disconnect();
  }
}

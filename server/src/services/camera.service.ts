import { IndiClient } from "./indi-client";

import { EventEmitter } from "events";
import { cameraStateService } from "./camera-state.service";
import { promises as fs } from "fs";
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
  private selectedCamera?: string;
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
  private imagesDirectory: string;

  constructor() {
    super();
    this.imagesDirectory = path.join(process.cwd(), "images");
    this.ensureImagesDirectory();

    // Charger l'état persistant
    this.loadPersistedState();
  }

  private loadPersistedState(): void {
    const state = cameraStateService.getState();
    this.selectedCamera = state.selectedCamera;
    this.lastParameters = state.lastParameters;

    if (this.selectedCamera) {
      this.cameraStatus.isConnected = true;
    }
  }

  private async ensureImagesDirectory(): Promise<void> {
    try {
      await fs.access(this.imagesDirectory);
    } catch {
      await fs.mkdir(this.imagesDirectory, { recursive: true });
    }
  }

  async getAvailableCameras(): Promise<CameraInfo[]> {
    // Récupérer les caméras détectées depuis le système d'équipements
    const detectedCameras = await this.getDetectedCameras();

    // Retourner uniquement les caméras réellement détectées et configurées
    return detectedCameras;
  }

  private async getDetectedCameras(): Promise<CameraInfo[]> {
    try {
      // Récupérer les équipements détectés
      const response = await fetch("http://localhost:3000/api/equipment");
      if (!response.ok) {
        console.warn("Impossible de récupérer les équipements détectés");
        return [];
      }

      const equipment = await response.json();
      const cameras: CameraInfo[] = [];

      // Filtrer et convertir les équipements caméra
      for (const device of equipment) {
        if (device.type === "camera" || device.type === "guide-camera") {
          // Permettre aux caméras guide d'être utilisées comme caméras principales
          const cameraInfo: CameraInfo = {
            name: device.name,
            driver: device.driverName || "unknown",
            model: device.model || device.name,
            maxBinning: this.getCameraMaxBinning(device),
            pixelSize: this.getCameraPixelSize(device),
            sensorWidth: this.getCameraSensorWidth(device),
            sensorHeight: this.getCameraSensorHeight(device),
            hasCooling: this.getCameraHasCooling(device),
            hasFilterWheel: false,
            supportedFormats: this.getCameraSupportedFormats(device),
          };
          cameras.push(cameraInfo);
        }
      }

      // Récupérer aussi les caméras configurées manuellement via l'état de l'équipement
      const configuredCameras = await this.getConfiguredCameras();

      // Combiner les caméras détectées et configurées, en évitant les doublons
      const allCameras = [...cameras];

      for (const configuredCamera of configuredCameras) {
        const exists = allCameras.some(
          (camera) =>
            camera.name === configuredCamera.name ||
            camera.model === configuredCamera.model
        );

        if (!exists) {
          allCameras.push(configuredCamera);
        }
      }

      return allCameras;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des caméras détectées:",
        error
      );
      return [];
    }
  }

  private async getConfiguredCameras(): Promise<CameraInfo[]> {
    try {
      // Récupérer l'état de l'équipement configuré
      const response = await fetch("http://localhost:3000/api/equipment/state");
      if (!response.ok) {
        return [];
      }

      const state = await response.json();
      const configuredCameras: CameraInfo[] = [];

      // Ajouter la caméra principale si configurée
      if (state.selectedMainCamera) {
        const mainCameraInfo = await this.getCameraInfoFromId(
          state.selectedMainCamera
        );
        if (mainCameraInfo) {
          configuredCameras.push(mainCameraInfo);
        }
      }

      // Ajouter la caméra de guidage si configurée
      if (state.selectedGuideCamera) {
        const guideCameraInfo = await this.getCameraInfoFromId(
          state.selectedGuideCamera
        );
        if (guideCameraInfo) {
          configuredCameras.push(guideCameraInfo);
        }
      }

      return configuredCameras;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des caméras configurées:",
        error
      );
      return [];
    }
  }

  private async getCameraInfoFromId(
    cameraId: string
  ): Promise<CameraInfo | null> {
    try {
      // Récupérer les informations de la caméra depuis l'API d'équipement
      const response = await fetch(
        `http://localhost:3000/api/equipment/${cameraId}`
      );
      if (!response.ok) {
        return null;
      }

      const device = await response.json();

      if (device.type === "camera" || device.type === "guide-camera") {
        return {
          name: device.name,
          driver: device.driverName || "unknown",
          model: device.model || device.name,
          maxBinning: this.getCameraMaxBinning(device),
          pixelSize: this.getCameraPixelSize(device),
          sensorWidth: this.getCameraSensorWidth(device),
          sensorHeight: this.getCameraSensorHeight(device),
          hasCooling: this.getCameraHasCooling(device),
          hasFilterWheel: false,
          supportedFormats: this.getCameraSupportedFormats(device),
        };
      }

      return null;
    } catch (error) {
      console.error(
        `Erreur lors de la récupération de la caméra ${cameraId}:`,
        error
      );
      return null;
    }
  }

  private getCameraMaxBinning(device: any): number {
    // Définir le binning maximum basé sur le modèle
    const model = device.model?.toLowerCase() || "";

    if (model.includes("asi120")) return 2;
    if (model.includes("asi178")) return 2;
    if (model.includes("asi290")) return 2;
    if (model.includes("asi294")) return 4;
    if (model.includes("asi2600")) return 4;

    return 1; // Défaut
  }

  private getCameraPixelSize(device: any): number {
    // Définir la taille de pixel basée sur le modèle
    const model = device.model?.toLowerCase() || "";

    if (model.includes("asi120")) return 3.75;
    if (model.includes("asi178")) return 2.4;
    if (model.includes("asi290")) return 2.9;
    if (model.includes("asi294")) return 4.63;
    if (model.includes("asi2600")) return 3.76;

    return 4.0; // Défaut
  }

  private getCameraSensorWidth(device: any): number {
    // Définir la largeur du capteur basée sur le modèle
    const model = device.model?.toLowerCase() || "";

    if (model.includes("asi120")) return 1280;
    if (model.includes("asi178")) return 3096;
    if (model.includes("asi290")) return 1936;
    if (model.includes("asi294")) return 4144;
    if (model.includes("asi2600")) return 6248;

    return 1920; // Défaut
  }

  private getCameraSensorHeight(device: any): number {
    // Définir la hauteur du capteur basée sur le modèle
    const model = device.model?.toLowerCase() || "";

    if (model.includes("asi120")) return 960;
    if (model.includes("asi178")) return 2080;
    if (model.includes("asi290")) return 1096;
    if (model.includes("asi294")) return 2822;
    if (model.includes("asi2600")) return 4176;

    return 1080; // Défaut
  }

  private getCameraHasCooling(device: any): boolean {
    // Définir si la caméra a un refroidissement basé sur le modèle
    const model = device.model?.toLowerCase() || "";

    // Les caméras ASI120 n'ont généralement pas de refroidissement
    if (model.includes("asi120")) return false;
    if (model.includes("asi178")) return false;
    if (model.includes("asi290")) return false;

    // Les caméras plus avancées ont généralement un refroidissement
    if (model.includes("asi294")) return true;
    if (model.includes("asi2600")) return true;

    return false; // Défaut
  }

  private getCameraSupportedFormats(device: any): string[] {
    // Tous les appareils INDI supportent FITS
    const formats = ["FITS"];

    // Ajouter d'autres formats selon le driver
    if (device.driverName === "indi-gphoto") {
      formats.push("RAW", "TIFF");
    } else if (device.driverName === "indi-asi") {
      formats.push("TIFF", "RAW");
    }

    return formats;
  }

  async selectCamera(cameraName: string): Promise<void> {
    this.selectedCamera = cameraName;
    this.cameraStatus.isConnected = true;

    // Sauvegarder l'état
    await cameraStateService.updateSelectedCamera(cameraName);

    this.emit("cameraConnected", cameraName);
  }

  getSelectedCamera(): string | undefined {
    return this.selectedCamera;
  }

  getCameraStatus(): CameraStatus {
    return { ...this.cameraStatus };
  }

  getLastParameters(): CameraParameters {
    return { ...this.lastParameters };
  }

  async updateParameters(params: Partial<CameraParameters>): Promise<void> {
    this.lastParameters = { ...this.lastParameters, ...params };

    // Sauvegarder l'état
    await cameraStateService.updateParameters(params);

    this.emit("parametersUpdated", this.lastParameters);
  }

  async startCapture(params?: Partial<CameraParameters>): Promise<string> {
    if (!this.selectedCamera) {
      throw new Error("Aucune caméra sélectionnée");
    }

    if (this.cameraStatus.isCapturing) {
      throw new Error("Une capture est déjà en cours");
    }

    // Mettre à jour les paramètres si fournis
    if (params) {
      await this.updateParameters(params);
    }

    const captureId = uuidv4();
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `capture_${timestamp}_${captureId}.${this.lastParameters.format.toLowerCase()}`;
    const filepath = path.join(this.imagesDirectory, filename);

    this.cameraStatus.isCapturing = true;
    this.cameraStatus.exposureProgress = 0;
    this.cameraStatus.exposureTimeRemaining = this.lastParameters.exposure;
    this.captureStartTime = Date.now();

    this.emit("captureStarted", {
      id: captureId,
      filename,
      filepath,
      parameters: this.lastParameters,
    });

    // Capture via INDI server
    await this.indiCapture(captureId, filepath);

    return captureId;
  }

  private async indiCapture(
    captureId: string,
    filepath: string
  ): Promise<void> {
    const client = new IndiClient();
    const device = this.selectedCamera as string;

    try {
      await client.setProp(`${device}.CCD_EXPOSURE.EXPOSURE_VALUE`, `${this.lastParameters.exposure}`);

      const checkInterval = 1000;
      const start = Date.now();

      while (Date.now() - start < this.lastParameters.exposure * 1000) {
        await new Promise((r) => setTimeout(r, checkInterval));
        this.cameraStatus.exposureProgress =
          ((Date.now() - start) / (this.lastParameters.exposure * 1000)) * 100;
        this.cameraStatus.exposureTimeRemaining = Math.max(
          0,
          this.lastParameters.exposure - (Date.now() - start) / 1000
        );
        this.emit("captureProgress", {
          id: captureId,
          progress: this.cameraStatus.exposureProgress,
          timeRemaining: this.cameraStatus.exposureTimeRemaining,
        });
      }

      this.cameraStatus.isCapturing = false;
      await this.completeCapture(captureId, filepath);
    } catch (error) {
      this.cameraStatus.isCapturing = false;
      this.cameraStatus.error =
        error instanceof Error ? error.message : "Erreur INDI";
      this.emit("captureError", { id: captureId, error: this.cameraStatus.error });
    }
  }


  private async completeCapture(
    captureId: string,
    filepath: string
  ): Promise<void> {
    // Créer un fichier factice pour la démonstration
    const metadata = {
      captureId,
      camera: this.selectedCamera,
      parameters: this.lastParameters,
      timestamp: new Date().toISOString(),
      filepath,
    };

    await fs.writeFile(filepath, JSON.stringify(metadata, null, 2));

    this.cameraStatus.isCapturing = false;
    this.cameraStatus.lastImagePath = filepath;
    this.cameraStatus.exposureProgress = 100;
    this.cameraStatus.exposureTimeRemaining = 0;
    this.cameraStatus.error = undefined;

    this.emit("captureCompleted", {
      id: captureId,
      filepath,
      metadata,
    });
  }

  async cancelCapture(): Promise<void> {
    if (!this.cameraStatus.isCapturing) {
      return;
    }

    this.cameraStatus.isCapturing = false;
    this.cameraStatus.exposureProgress = 0;
    this.cameraStatus.exposureTimeRemaining = 0;
    this.captureStartTime = undefined;

    this.emit("captureCancelled");
  }

  async setCooling(
    enabled: boolean,
    targetTemperature?: number
  ): Promise<void> {
    this.cameraStatus.coolingEnabled = enabled;

    if (enabled && targetTemperature !== undefined) {
      this.lastParameters.coolingTemperature = targetTemperature;
    }

    this.emit("coolingChanged", {
      enabled,
      targetTemperature: this.lastParameters.coolingTemperature,
    });
  }

  async getImageHistory(): Promise<string[]> {
    try {
      const files = await fs.readdir(this.imagesDirectory);
      return files
        .filter(
          (file) =>
            file.endsWith(".fits") ||
            file.endsWith(".tiff") ||
            file.endsWith(".raw")
        )
        .sort((a, b) => b.localeCompare(a)); // tri par date décroissante
    } catch {
      return [];
    }
  }

  async deleteImage(filename: string): Promise<void> {
    const filepath = path.join(this.imagesDirectory, filename);
    await fs.unlink(filepath);
    this.emit("imageDeleted", filename);
  }
}

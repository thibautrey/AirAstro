import { ChildProcess, spawn } from "child_process";

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
  private currentProcess?: ChildProcess;
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
    // Simuler les caméras disponibles - dans un vrai système, on interrogerait INDI
    return [
      {
        name: "ZWO ASI294MC",
        driver: "indi-asi",
        model: "ASI294MC",
        maxBinning: 4,
        pixelSize: 4.63,
        sensorWidth: 4144,
        sensorHeight: 2822,
        hasCooling: true,
        hasFilterWheel: false,
        supportedFormats: ["FITS", "TIFF", "RAW"],
      },
      {
        name: "Canon EOS 6D",
        driver: "indi-gphoto",
        model: "EOS 6D",
        maxBinning: 1,
        pixelSize: 6.55,
        sensorWidth: 5472,
        sensorHeight: 3648,
        hasCooling: false,
        hasFilterWheel: false,
        supportedFormats: ["RAW", "TIFF"],
      },
    ];
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

    // Simuler le processus de capture
    await this.simulateCapture(captureId, filepath);

    return captureId;
  }

  private async simulateCapture(
    captureId: string,
    filepath: string
  ): Promise<void> {
    const exposureMs = this.lastParameters.exposure * 1000;
    const updateInterval = 100; // mise à jour toutes les 100ms

    return new Promise((resolve, reject) => {
      const interval = setInterval(() => {
        if (!this.captureStartTime) {
          clearInterval(interval);
          reject(new Error("Capture annulée"));
          return;
        }

        const elapsed = Date.now() - this.captureStartTime;
        const progress = Math.min(elapsed / exposureMs, 1);

        this.cameraStatus.exposureProgress = progress * 100;
        this.cameraStatus.exposureTimeRemaining = Math.max(
          0,
          (exposureMs - elapsed) / 1000
        );

        this.emit("captureProgress", {
          id: captureId,
          progress: this.cameraStatus.exposureProgress,
          timeRemaining: this.cameraStatus.exposureTimeRemaining,
        });

        if (progress >= 1) {
          clearInterval(interval);
          this.completeCapture(captureId, filepath);
          resolve();
        }
      }, updateInterval);

      // Simuler un processus externe (dans un vrai système, ce serait un appel INDI)
      this.currentProcess = spawn("sleep", [
        this.lastParameters.exposure.toString(),
      ]);

      this.currentProcess.on("exit", (code) => {
        if (code !== 0 && this.cameraStatus.isCapturing) {
          clearInterval(interval);
          this.cameraStatus.isCapturing = false;
          this.cameraStatus.error = `Erreur lors de la capture (code: ${code})`;
          this.emit("captureError", {
            id: captureId,
            error: this.cameraStatus.error,
          });
          reject(new Error(this.cameraStatus.error));
        }
      });
    });
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

    if (this.currentProcess) {
      this.currentProcess.kill("SIGTERM");
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

import { CameraParameters } from "../services/camera.service";
import { promises as fs } from "fs";
import path from "path";

export interface CameraState {
  selectedCamera?: string;
  lastParameters: CameraParameters;
  savedAt: string;
}

export class CameraStateService {
  private stateFile: string;
  private state: CameraState;

  constructor() {
    this.stateFile = path.join(process.cwd(), "data", "camera-state.json");
    this.state = {
      lastParameters: {
        exposure: 1.0,
        gain: 50,
        binning: "1x1",
        frameType: "Light",
        format: "FITS",
        quality: 90,
      },
      savedAt: new Date().toISOString(),
    };

    this.loadState();
  }

  private async ensureDataDirectory(): Promise<void> {
    const dataDir = path.dirname(this.stateFile);
    try {
      await fs.access(dataDir);
    } catch {
      await fs.mkdir(dataDir, { recursive: true });
    }
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, "utf8");
      const savedState = JSON.parse(data);
      this.state = { ...this.state, ...savedState };
    } catch (error) {
      // Fichier n'existe pas ou erreur de lecture, utiliser l'état par défaut
      await this.saveState();
    }
  }

  private async saveState(): Promise<void> {
    try {
      await this.ensureDataDirectory();
      this.state.savedAt = new Date().toISOString();
      await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
    } catch (error) {
      console.error(
        "Erreur lors de la sauvegarde de l'état de la caméra:",
        error
      );
    }
  }

  getState(): CameraState {
    return { ...this.state };
  }

  async updateSelectedCamera(cameraName: string): Promise<void> {
    this.state.selectedCamera = cameraName;
    await this.saveState();
  }

  async updateParameters(parameters: Partial<CameraParameters>): Promise<void> {
    this.state.lastParameters = { ...this.state.lastParameters, ...parameters };
    await this.saveState();
  }

  async clearSelectedCamera(): Promise<void> {
    delete this.state.selectedCamera;
    await this.saveState();
  }

  async updateState(updates: Partial<CameraState>): Promise<void> {
    this.state = { ...this.state, ...updates };
    await this.saveState();
  }

  getLastParameters(): CameraParameters {
    return { ...this.state.lastParameters };
  }

  getSelectedCamera(): string | undefined {
    return this.state.selectedCamera;
  }
}

// Instance singleton
export const cameraStateService = new CameraStateService();

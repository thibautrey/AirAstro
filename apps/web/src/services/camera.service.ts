import airAstroUrlService from "./airastro-url.service";

export interface CameraParameters {
  exposure: number;
  gain: number;
  binning: string;
  coolingTemperature?: number;
  frameType: "Light" | "Dark" | "Flat" | "Bias";
  format: "FITS" | "TIFF" | "RAW";
  quality: number;
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
  selectedCamera?: string;
  lastParameters?: CameraParameters;
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

class CameraService {
  private buildApiUrl(endpoint: string): string {
    return airAstroUrlService.buildApiUrl(endpoint);
  }

  async getAvailableCameras(): Promise<CameraInfo[]> {
    const url = this.buildApiUrl("/api/camera/cameras");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération des caméras: ${response.statusText}`
      );
    }
    return response.json();
  }

  async selectCamera(cameraName: string): Promise<void> {
    const url = this.buildApiUrl("/api/camera/cameras/select");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cameraName }),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la sélection de la caméra: ${response.statusText}`
      );
    }
  }

  async getCameraStatus(): Promise<CameraStatus> {
    const url = this.buildApiUrl("/api/camera/status");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération du statut: ${response.statusText}`
      );
    }
    return response.json();
  }

  async updateParameters(
    parameters: Partial<CameraParameters>
  ): Promise<CameraParameters> {
    const url = this.buildApiUrl("/api/camera/parameters");
    const response = await fetch(url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parameters),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la mise à jour des paramètres: ${response.statusText}`
      );
    }

    const result = await response.json();
    return result.parameters;
  }

  async startCapture(parameters?: Partial<CameraParameters>): Promise<string> {
    const url = this.buildApiUrl("/api/camera/capture");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(parameters || {}),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors du démarrage de la capture: ${response.statusText}`
      );
    }

    const result = await response.json();
    return result.captureId;
  }

  async cancelCapture(): Promise<void> {
    const url = this.buildApiUrl("/api/camera/capture");
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de l'annulation de la capture: ${response.statusText}`
      );
    }
  }

  async setCooling(
    enabled: boolean,
    targetTemperature?: number
  ): Promise<void> {
    const url = this.buildApiUrl("/api/camera/cooling");
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ enabled, targetTemperature }),
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la configuration du refroidissement: ${response.statusText}`
      );
    }
  }

  async getImageHistory(): Promise<string[]> {
    const url = this.buildApiUrl("/api/camera/images");
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération de l'historique: ${response.statusText}`
      );
    }
    return response.json();
  }

  async deleteImage(filename: string): Promise<void> {
    const url = this.buildApiUrl(`/api/camera/images/${filename}`);
    const response = await fetch(url, {
      method: "DELETE",
    });

    if (!response.ok) {
      throw new Error(
        `Erreur lors de la suppression de l'image: ${response.statusText}`
      );
    }
  }
}

export const cameraService = new CameraService();

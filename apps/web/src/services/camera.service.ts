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
  private baseUrl: string;

  constructor() {
    this.baseUrl =
      import.meta.env.MODE === "production"
        ? "/api/camera"
        : "http://localhost:3000/api/camera";
  }

  async getAvailableCameras(): Promise<CameraInfo[]> {
    const response = await fetch(`${this.baseUrl}/cameras`);
    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération des caméras: ${response.statusText}`
      );
    }
    return response.json();
  }

  async selectCamera(cameraName: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/cameras/select`, {
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
    const response = await fetch(`${this.baseUrl}/status`);
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
    const response = await fetch(`${this.baseUrl}/parameters`, {
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
    const response = await fetch(`${this.baseUrl}/capture`, {
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
    const response = await fetch(`${this.baseUrl}/capture`, {
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
    const response = await fetch(`${this.baseUrl}/cooling`, {
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
    const response = await fetch(`${this.baseUrl}/images`);
    if (!response.ok) {
      throw new Error(
        `Erreur lors de la récupération de l'historique: ${response.statusText}`
      );
    }
    return response.json();
  }

  async deleteImage(filename: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/images/${filename}`, {
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

import {
  UpdateDownloadResponse,
  UpdateInfo,
  UpdateInstallResponse,
} from "../types/update";

class UpdateService {
  private baseUrl: string;

  constructor(deviceUrl: string) {
    this.baseUrl = `${deviceUrl}/api/update`;
  }

  async checkForUpdate(): Promise<UpdateInfo> {
    const response = await fetch(`${this.baseUrl}/check`);
    if (!response.ok) {
      throw new Error(
        `Erreur lors de la vérification des mises à jour: ${response.status}`
      );
    }
    return response.json();
  }

  async downloadUpdate(): Promise<UpdateDownloadResponse> {
    const response = await fetch(`${this.baseUrl}/download`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Erreur lors du téléchargement: ${response.status}`);
    }
    return response.json();
  }

  async installUpdate(): Promise<UpdateInstallResponse> {
    const response = await fetch(`${this.baseUrl}/install`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`Erreur lors de l'installation: ${response.status}`);
    }
    return response.json();
  }
}

export default UpdateService;

import {
  UpdateDownloadResponse,
  UpdateInfo,
  UpdateInstallResponse,
  UpdateRollbackResponse,
  UpdateBackupsResponse,
} from "../types/update";

class UpdateService {
  private baseUrl: string;

  constructor(deviceUrl: string) {
    this.baseUrl = `${deviceUrl}/api/update`;
  }

  async checkForUpdate(): Promise<UpdateInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/check`);
      if (!response.ok) {
        // Gérer les erreurs spécifiques avec des messages utilisateur-friendly
        if (response.status === 404) {
          return {
            updateAvailable: false,
            currentVersion: "unknown",
            latestVersion: "unknown",
            tarballUrl: "",
          };
        }

        if (response.status === 500) {
          // Essayer de récupérer le détail de l'erreur mais l'ignorer pour l'utilisateur
          try {
            const errorData = await response.json();
            console.warn(
              "Erreur serveur lors de la vérification des mises à jour:",
              errorData
            );
          } catch {
            // Ignorer l'erreur de parsing
          }

          throw new Error(
            "Impossible de vérifier les mises à jour pour le moment"
          );
        }

        throw new Error("Service de mise à jour temporairement indisponible");
      }
      return response.json();
    } catch (error) {
      // En cas d'erreur réseau ou autre
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Vérification des mises à jour indisponible");
    }
  }

  async downloadUpdate(): Promise<UpdateDownloadResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/download`, {
        method: "POST",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return {
            message: "Service de téléchargement non disponible",
          };
        }

        if (response.status === 500) {
          throw new Error("Impossible de télécharger la mise à jour");
        }

        throw new Error("Téléchargement temporairement indisponible");
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erreur lors du téléchargement");
    }
  }

  async installUpdate(): Promise<UpdateInstallResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/install`, {
        method: "POST",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return {
            message: "Service d'installation non disponible",
            version: "unknown",
            status: "error",
          };
        }

        if (response.status === 500) {
          throw new Error("Impossible d'installer la mise à jour");
        }

        throw new Error("Installation temporairement indisponible");
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erreur lors de l'installation");
    }
  }

  async rollbackUpdate(): Promise<UpdateRollbackResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/rollback`, {
        method: "POST",
      });
      if (!response.ok) {
        if (response.status === 404) {
          return {
            message: "Service de rollback non disponible",
            backup: "unknown",
            status: "error",
          };
        }

        if (response.status === 500) {
          throw new Error("Impossible d'effectuer le rollback");
        }

        throw new Error("Rollback temporairement indisponible");
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erreur lors du rollback");
    }
  }

  async listBackups(): Promise<UpdateBackupsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/backups`);
      if (!response.ok) {
        if (response.status === 404) {
          return {
            backups: [],
          };
        }

        if (response.status === 500) {
          throw new Error("Impossible de récupérer la liste des backups");
        }

        throw new Error("Service de backup temporairement indisponible");
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erreur lors de la récupération des backups");
    }
  }

  async rebootSystem(): Promise<{ message: string; status: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/reboot`, {
        method: "POST",
      });
      if (!response.ok) {
        throw new Error("Impossible de redémarrer le système");
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erreur lors du redémarrage");
    }
  }

  async getUpdateLogs(): Promise<{ logs: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/logs`);
      if (!response.ok) {
        throw new Error("Impossible de récupérer les logs");
      }
      return response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("Erreur lors de la récupération des logs");
    }
  }
}

export default UpdateService;

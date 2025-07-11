import { Request, Response } from "express";

import { EquipmentDatabaseService } from "../services/equipment-database.service";
import { EquipmentDetectorService } from "../services/equipment-detector.service";

export class DriversController {
  private equipmentService: EquipmentDatabaseService;
  private detectorService: EquipmentDetectorService;

  constructor(
    equipmentService: EquipmentDatabaseService,
    detectorService: EquipmentDetectorService
  ) {
    this.equipmentService = equipmentService;
    this.detectorService = detectorService;
  }

  // Obtenir le statut des drivers
  async getDriverStatus(req: Request, res: Response): Promise<void> {
    try {
      const status = this.equipmentService.getDriverStatus();
      res.json({
        success: true,
        data: status,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error retrieving driver status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Obtenir la liste des drivers disponibles
  async getAvailableDrivers(req: Request, res: Response): Promise<void> {
    try {
      const drivers = this.equipmentService.getAvailableDrivers();
      res.json({
        success: true,
        data: {
          drivers,
          count: drivers.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error retrieving available drivers",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Obtenir la liste des drivers installés
  async getInstalledDrivers(req: Request, res: Response): Promise<void> {
    try {
      const drivers = this.equipmentService.getInstalledDrivers();
      res.json({
        success: true,
        data: {
          drivers,
          count: drivers.length,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Error retrieving installed drivers",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Installer un driver spécifique
  async installDriver(req: Request, res: Response): Promise<void> {
    try {
      const { driverName } = req.params;

      if (!driverName) {
        res.status(400).json({
          success: false,
          error: "Driver name required",
        });
        return;
      }

      const success = await this.equipmentService.installDriver(driverName);

      if (success) {
        res.json({
          success: true,
          message: `Driver ${driverName} installed successfully`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Failed to install driver ${driverName}`,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de l'installation du driver",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Installer les drivers pour un équipement spécifique
  async installDriversForEquipment(req: Request, res: Response): Promise<void> {
    try {
      const { equipmentName } = req.params;

      if (!equipmentName) {
        res.status(400).json({
          success: false,
          error: "Nom de l'équipement requis",
        });
        return;
      }

      const success = await this.equipmentService.installDriversForEquipment(
        equipmentName
      );

      if (success) {
        res.json({
          success: true,
          message: `Drivers pour ${equipmentName} installés avec succès`,
        });
      } else {
        res.status(500).json({
          success: false,
          error: `Échec de l'installation des drivers pour ${equipmentName}`,
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de l'installation des drivers",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Installer les drivers recommandés
  async installRecommendedDrivers(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.equipmentService.installRecommendedDrivers();

      res.json({
        success: true,
        data: {
          installed: result.success,
          failed: result.failed,
          message: `${result.success.length} drivers installés avec succès, ${result.failed.length} échecs`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de l'installation des drivers recommandés",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Vérifier les mises à jour des drivers
  async checkDriverUpdates(req: Request, res: Response): Promise<void> {
    try {
      const updates = await this.equipmentService.checkDriverUpdates();

      res.json({
        success: true,
        data: updates,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la vérification des mises à jour",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Mettre à jour tous les drivers
  async updateAllDrivers(req: Request, res: Response): Promise<void> {
    try {
      const result = await this.equipmentService.updateAllDrivers();

      res.json({
        success: result.success,
        data: {
          updated: result.updated,
          errors: result.errors,
          message: result.success
            ? `${result.updated.length} drivers mis à jour avec succès`
            : "Échec de la mise à jour des drivers",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la mise à jour des drivers",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Nettoyer les drivers inutilisés
  async cleanupUnusedDrivers(req: Request, res: Response): Promise<void> {
    try {
      const unusedDrivers = await this.equipmentService.cleanupUnusedDrivers();

      res.json({
        success: true,
        data: {
          unusedDrivers,
          count: unusedDrivers.length,
          message:
            unusedDrivers.length > 0
              ? `${unusedDrivers.length} drivers inutilisés trouvés`
              : "Aucun driver inutilisé trouvé",
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors du nettoyage des drivers",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Vérifier si un driver est installé
  async checkDriverInstallation(req: Request, res: Response): Promise<void> {
    try {
      const { driverName } = req.params;

      if (!driverName) {
        res.status(400).json({
          success: false,
          error: "Nom du driver requis",
        });
        return;
      }

      const isInstalled = this.equipmentService.isDriverInstalled(driverName);

      res.json({
        success: true,
        data: {
          driverName,
          isInstalled,
          message: isInstalled
            ? `Driver ${driverName} est installé`
            : `Driver ${driverName} n'est pas installé`,
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la vérification du driver",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Forcer la mise à jour de la base de données
  async forceUpdateDatabase(req: Request, res: Response): Promise<void> {
    try {
      await this.equipmentService.forceUpdate();

      res.json({
        success: true,
        message: "Base de données mise à jour avec succès",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la mise à jour de la base de données",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }

  // Auto-configuration des drivers ASI
  async autoConfigureASI(req: Request, res: Response): Promise<void> {
    try {
      const success = await this.detectorService.autoConfigureASIDrivers();

      if (success) {
        res.json({
          success: true,
          message:
            "Configuration automatique des drivers ASI terminée avec succès",
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Échec de la configuration automatique des drivers ASI",
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Erreur lors de la configuration automatique des drivers ASI",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }
}

import { DriversController } from "../controllers/drivers.controller";
import { EquipmentDatabaseService } from "../services/equipment-database.service";
import express from "express";

const router = express.Router();

// Initialiser le service et le contrôleur
const equipmentService = new EquipmentDatabaseService();
const driversController = new DriversController(equipmentService);

// Routes pour la gestion des drivers
router.get("/status", (req, res) =>
  driversController.getDriverStatus(req, res)
);
router.get("/available", (req, res) =>
  driversController.getAvailableDrivers(req, res)
);
router.get("/installed", (req, res) =>
  driversController.getInstalledDrivers(req, res)
);
router.get("/check/:driverName", (req, res) =>
  driversController.checkDriverInstallation(req, res)
);

// Routes pour l'installation
router.post("/install/:driverName", (req, res) =>
  driversController.installDriver(req, res)
);
router.post("/install-equipment/:equipmentName", (req, res) =>
  driversController.installDriversForEquipment(req, res)
);
router.post("/install-recommended", (req, res) =>
  driversController.installRecommendedDrivers(req, res)
);

// Routes pour les mises à jour
router.get("/updates", (req, res) =>
  driversController.checkDriverUpdates(req, res)
);
router.post("/update-all", (req, res) =>
  driversController.updateAllDrivers(req, res)
);
router.post("/update-database", (req, res) =>
  driversController.forceUpdateDatabase(req, res)
);

// Routes pour le nettoyage
router.get("/cleanup", (req, res) =>
  driversController.cleanupUnusedDrivers(req, res)
);

export default router;

import { Request, Response, Router } from "express";

import { AutoConfigurationService } from "../services/auto-configuration.service";
import { AutoIndiManager } from "../services/auto-indi-manager";
import { DriverManager } from "../indi";
import { EquipmentDatabaseService } from "../services/equipment-database.service";
import { EquipmentManagerService } from "../services/equipment-manager.service";
import { mountStateService } from "../services/mount-state.service";

const router = Router();
const driverManager = new DriverManager();
const equipmentDatabase = new EquipmentDatabaseService();
const equipmentManager = new EquipmentManagerService(
  driverManager,
  equipmentDatabase
);
const autoConfigService = new AutoConfigurationService();

// Initialiser l'AutoIndiManager pour récupérer les données de détection USB
let autoIndiManager: AutoIndiManager;

const initAutoIndiManager = () => {
  if (!autoIndiManager) {
    autoIndiManager = new AutoIndiManager({
      enableAutoStart: true,
      logLevel: "info",
      usb: {
        pollInterval: 5000,
        indiRestartDelay: 3000,
        enableAutoRestart: true,
      },
      indi: {
        port: 7624,
        enableVerbose: true,
        maxRetries: 3,
        retryDelay: 5000,
      },
    });
  }
  return autoIndiManager;
};

// Fonction pour s'assurer que l'auto-indi est démarré
const ensureAutoIndiStarted = async () => {
  try {
    const manager = initAutoIndiManager();
    const status = await manager.getStatus();

    // Si le système n'est pas en cours d'exécution, le démarrer
    if (!status.usbDetector.running) {
      console.log(
        "🔄 Démarrage automatique de l'auto-indi depuis l'API equipment..."
      );
      await manager.start();
    }
  } catch (error) {
    console.warn("Impossible de démarrer l'auto-indi:", error);
  }
};

// Initialiser la base de données au démarrage
equipmentDatabase
  .initializeDatabase()
  .then(() => {
    console.log("✅ Base de données d'équipements initialisée dans les routes");
  })
  .catch((error) => {
    console.error(
      "❌ Erreur lors de l'initialisation de la base de données dans les routes:",
      error
    );
  });

// Démarrer le monitoring automatiquement
equipmentManager.startMonitoring();

// Lancer la configuration initiale après un délai
setTimeout(() => {
  autoConfigService.runInitialConfiguration();
}, 10000); // 10 secondes après le démarrage

// Events pour les WebSocket (à implémenter si nécessaire)
equipmentManager.on("equipmentStatusChanged", (status, device) => {
  console.log(
    `📡 Statut équipement changé: ${status.name} -> ${status.status}`
  );
});

equipmentManager.on("autoSetupCompleted", (result) => {
  console.log(
    `🎉 Configuration automatique terminée: ${result.configured}/${result.totalDevices} configurés`
  );
});

// GET /api/equipment - Lister tous les équipements détectés
router.get("/", async (req: Request, res: Response) => {
  try {
    const includeUnknown = req.query.includeUnknown === "true";

    // S'assurer que l'auto-indi est démarré
    await ensureAutoIndiStarted();

    // Utiliser les données de l'auto-indi si disponible
    let equipment: any[] = [];
    let isMonitoring = false;

    try {
      const manager = initAutoIndiManager();
      const autoIndiDevices = manager.getDetectedDevices();
      const autoIndiStatus = await manager.getStatus();

      console.log("📱 Auto-indi devices:", autoIndiDevices.length);
      console.log("📱 Auto-indi status:", autoIndiStatus.usbDetector.running);

      // Convertir les données auto-indi au format attendu par l'API equipment
      equipment = autoIndiDevices
        .filter((device) => {
          // Si includeUnknown est true, ne pas filtrer
          if (includeUnknown) {
            return true;
          }

          // Filtrer les hubs USB et contrôleurs
          if (!device.brand || device.matchingDrivers.length === 0) {
            return false;
          }

          return true;
        })
        .map((device) => ({
          id: device.id,
          name:
            device.description || `${device.manufacturer} ${device.product}`,
          type: device.brand === "ZWO" ? "camera" : "unknown", // Mapping simple pour l'instant
          manufacturer: device.manufacturer || device.brand || "Inconnu",
          model: device.product || device.model || "Inconnu",
          connection: "usb" as const,
          driverStatus:
            device.matchingDrivers.length > 0 ? "found" : "not-found",
          autoInstallable: device.matchingDrivers.length > 0,
          confidence: device.matchingDrivers.length > 0 ? 90 : 30,
          status: "connected" as const, // Les appareils détectés par USB sont considérés comme connectés
          lastSeen: new Date(),
        }));

      console.log("📱 Converted equipment:", equipment.length);
      
      isMonitoring = autoIndiStatus.usbDetector.running;
    } catch (autoIndiError) {
      console.warn(
        "Auto-indi non disponible, utilisation de l'ancien système:",
        autoIndiError
      );

      // Fallback sur l'ancien système si auto-indi n'est pas disponible
      const oldEquipment = await equipmentManager.getEquipmentList();
      const status = equipmentManager.getEquipmentStatus();

      equipment = oldEquipment
        .filter((device) => {
          if (includeUnknown) return true;
          if (device.type === "unknown" && device.confidence < 50) return false;
          if (device.confidence < 10) return false;
          return true;
        })
        .map((device) => {
          const deviceStatus = status.find((s) => s.id === device.id);
          return {
            ...device,
            status: deviceStatus?.status || "disconnected",
            lastSeen: deviceStatus?.lastSeen,
            errorMessage: deviceStatus?.errorMessage,
          };
        });

      isMonitoring = true;
    }

    res.json({
      equipment,
      totalCount: equipment.length,
      connectedCount: equipment.filter((e) => e.status === "connected").length,
      isMonitoring,
      isSetupInProgress: equipmentManager.isSetupInProgress(),
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des équipements:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des équipements",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// GET /api/equipment/status - Récupérer uniquement les statuts
router.get("/status", async (req: Request, res: Response) => {
  try {
    const status = equipmentManager.getEquipmentStatus();

    res.json({
      equipment: status,
      totalCount: status.length,
      connectedCount: status.filter((s) => s.status === "connected").length,
      isMonitoring: true,
      isSetupInProgress: equipmentManager.isSetupInProgress(),
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération du statut",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// POST /api/equipment/auto-setup - Lancer la configuration automatique
router.post("/auto-setup", async (req: Request, res: Response) => {
  try {
    if (equipmentManager.isSetupInProgress()) {
      return res.status(409).json({
        error: "Une configuration automatique est déjà en cours",
      });
    }

    console.log("🚀 Démarrage de la configuration automatique via API");

    const result = await equipmentManager.performAutoSetup();

    res.json({
      message: "Configuration automatique terminée",
      result: {
        totalDevices: result.totalDevices,
        configured: result.configured,
        failed: result.failed,
        successRate:
          result.totalDevices > 0
            ? (result.configured / result.totalDevices) * 100
            : 0,
        errors: result.errors,
      },
      devices: result.devices.map((device) => ({
        id: device.id,
        name: device.name,
        type: device.type,
        manufacturer: device.manufacturer,
        model: device.model,
        driverStatus: device.driverStatus,
        autoInstallable: device.autoInstallable,
        confidence: device.confidence,
      })),
    });
  } catch (error) {
    console.error("Erreur lors de la configuration automatique:", error);
    res.status(500).json({
      error: "Erreur lors de la configuration automatique",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// POST /api/equipment/:id/setup - Configurer un équipement spécifique
router.post("/:id/setup", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🔧 Configuration de l'équipement ${id} via API`);

    const success = await equipmentManager.setupSingleDevice(id);

    if (success) {
      res.json({
        message: "Équipement configuré avec succès",
        deviceId: id,
        success: true,
      });
    } else {
      res.status(500).json({
        error: "Échec de la configuration de l'équipement",
        deviceId: id,
        success: false,
      });
    }
  } catch (error) {
    console.error(
      `Erreur lors de la configuration de l'équipement ${req.params.id}:`,
      error
    );
    res.status(500).json({
      error: "Erreur lors de la configuration de l'équipement",
      details: error instanceof Error ? error.message : "Erreur inconnue",
      deviceId: req.params.id,
    });
  }
});

// POST /api/equipment/:id/restart - Redémarrer un équipement
router.post("/:id/restart", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    console.log(`🔄 Redémarrage de l'équipement ${id} via API`);

    const success = await equipmentManager.restartDevice(id);

    if (success) {
      res.json({
        message: "Équipement redémarré avec succès",
        deviceId: id,
        success: true,
      });
    } else {
      res.status(500).json({
        error: "Échec du redémarrage de l'équipement",
        deviceId: id,
        success: false,
      });
    }
  } catch (error) {
    console.error(
      `Erreur lors du redémarrage de l'équipement ${req.params.id}:`,
      error
    );
    res.status(500).json({
      error: "Erreur lors du redémarrage de l'équipement",
      details: error instanceof Error ? error.message : "Erreur inconnue",
      deviceId: req.params.id,
    });
  }
});

// POST /api/equipment/scan - Forcer un nouveau scan
router.post("/scan", async (req: Request, res: Response) => {
  try {
    console.log("🔍 Scan forcé des équipements via API");

    // S'assurer que l'auto-indi est démarré
    await ensureAutoIndiStarted();

    let equipment: any[] = [];

    try {
      // Utiliser l'auto-indi pour le scan
      const manager = initAutoIndiManager();
      
      // Forcer un scan USB immédiat (redémarrer le détecteur)
      await manager.stop();
      await new Promise(resolve => setTimeout(resolve, 1000));
      await manager.start();
      
      // Attendre un peu pour que la détection se fasse
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const autoIndiDevices = manager.getDetectedDevices();
      const includeUnknown = req.query.includeUnknown === "true";

      equipment = autoIndiDevices
        .filter((device) => {
          if (includeUnknown) return true;
          if (!device.brand || device.matchingDrivers.length === 0) return false;
          return true;
        })
        .map((device) => ({
          id: device.id,
          name: device.description || `${device.manufacturer} ${device.product}`,
          type: device.brand === "ZWO" ? "camera" : "unknown",
          manufacturer: device.manufacturer || device.brand || "Inconnu",
          model: device.product || device.model || "Inconnu",
          connection: "usb" as const,
          driverStatus: device.matchingDrivers.length > 0 ? "found" : "not-found",
          autoInstallable: device.matchingDrivers.length > 0,
          confidence: device.matchingDrivers.length > 0 ? 90 : 30,
          status: "connected" as const,
          lastSeen: new Date(),
        }));

    } catch (autoIndiError) {
      console.warn("Auto-indi non disponible pour le scan, utilisation de l'ancien système:", autoIndiError);
      
      // Fallback sur l'ancien système
      equipmentManager.clearCache();
      const oldEquipment = await equipmentManager.getEquipmentList();
      const status = equipmentManager.getEquipmentStatus();

      equipment = oldEquipment.map((device) => {
        const deviceStatus = status.find((s) => s.id === device.id);
        return {
          ...device,
          status: deviceStatus?.status || "disconnected",
          lastSeen: deviceStatus?.lastSeen,
          errorMessage: deviceStatus?.errorMessage,
        };
      });
    }

    res.json({
      message: "Scan des équipements terminé",
      equipment,
      totalCount: equipment.length,
      connectedCount: equipment.filter((e) => e.status === "connected").length,
      scannedAt: new Date(),
    });
  } catch (error) {
    console.error("Erreur lors du scan des équipements:", error);
    res.status(500).json({
      error: "Erreur lors du scan des équipements",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// GET /api/equipment/types - Lister les types d'équipements disponibles
router.get("/types", (req: Request, res: Response) => {
  const types = [
    {
      id: "mount",
      name: "Montures",
      description: "Montures équatoriales et altazimutales",
      icon: "🔭",
    },
    {
      id: "camera",
      name: "Caméras",
      description: "Caméras CCD/CMOS et DSLR",
      icon: "📷",
    },
    {
      id: "guide-camera",
      name: "Caméras de guidage",
      description: "Caméras dédiées au guidage",
      icon: "📸",
    },
    {
      id: "focuser",
      name: "Focuseurs",
      description: "Focuseurs électroniques",
      icon: "🔍",
    },
    {
      id: "filter-wheel",
      name: "Roues à filtres",
      description: "Roues à filtres automatiques",
      icon: "🎨",
    },
    {
      id: "unknown",
      name: "Autres",
      description: "Équipements non identifiés",
      icon: "❓",
    },
  ];

  res.json({ types });
});

// GET /api/equipment/manufacturers - Lister les fabricants pris en charge
router.get("/manufacturers", (req: Request, res: Response) => {
  const manufacturers = [
    {
      id: "zwo",
      name: "ZWO",
      description: "Caméras ASI et accessoires",
      website: "https://astronomy-imaging-camera.com/",
      supportLevel: "excellent",
    },
    {
      id: "celestron",
      name: "Celestron",
      description: "Montures et télescopes",
      website: "https://www.celestron.com/",
      supportLevel: "excellent",
    },
    {
      id: "skywatcher",
      name: "Sky-Watcher",
      description: "Montures équatoriales",
      website: "https://www.skywatchertelescope.com/",
      supportLevel: "excellent",
    },
    {
      id: "qhyccd",
      name: "QHYCCD",
      description: "Caméras CCD/CMOS",
      website: "https://www.qhyccd.com/",
      supportLevel: "good",
    },
    {
      id: "canon",
      name: "Canon",
      description: "Appareils photo DSLR",
      website: "https://www.canon.com/",
      supportLevel: "good",
    },
    {
      id: "nikon",
      name: "Nikon",
      description: "Appareils photo DSLR",
      website: "https://www.nikon.com/",
      supportLevel: "good",
    },
  ];

  res.json({ manufacturers });
});

// POST /api/equipment/system-setup - Configuration automatique du système
router.post("/system-setup", async (req: Request, res: Response) => {
  try {
    if (autoConfigService.isConfigurationRunning()) {
      return res.status(409).json({
        error: "Configuration automatique du système déjà en cours",
      });
    }

    console.log(
      "🔧 Démarrage de la configuration automatique du système via API"
    );

    const report = await autoConfigService.runAutoConfiguration();

    res.json({
      message: "Configuration automatique du système terminée",
      report: {
        status: report.status,
        driversInstalled: report.drivers_installed,
        usbDevicesDetected: report.usb_devices_detected,
        services: report.services,
        timestamp: report.timestamp,
      },
    });
  } catch (error) {
    console.error(
      "Erreur lors de la configuration automatique du système:",
      error
    );
    res.status(500).json({
      error: "Erreur lors de la configuration automatique du système",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// GET /api/equipment/system-status - Statut de la configuration système
router.get("/system-status", async (req: Request, res: Response) => {
  try {
    const lastReport = autoConfigService.getLastReport();
    const isRunning = autoConfigService.isConfigurationRunning();
    const requirements = await autoConfigService.checkSystemRequirements();

    res.json({
      isConfigurationRunning: isRunning,
      lastReport,
      systemRequirements: requirements,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du statut système:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération du statut système",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// POST /api/equipment/install-drivers - Installation manuelle de drivers
router.post("/install-drivers", async (req: Request, res: Response) => {
  try {
    const { devices } = req.body as { devices?: string[] };

    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({
        error: "Liste des appareils requise",
      });
    }

    console.log(
      `🔧 Installation de drivers pour ${devices.length} appareils via API`
    );

    const result = await autoConfigService.installDriversForDevices(devices);

    res.json({
      message: "Installation des drivers terminée",
      result: {
        totalDevices: devices.length,
        successful: result.success.length,
        failed: result.failed.length,
        successfulDevices: result.success,
        failedDevices: result.failed,
      },
    });
  } catch (error) {
    console.error("Erreur lors de l'installation des drivers:", error);
    res.status(500).json({
      error: "Erreur lors de l'installation des drivers",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// GET /api/equipment/required-drivers - Récupérer les drivers requis par la base de données
router.get("/required-drivers", async (req: Request, res: Response) => {
  try {
    // Récupérer tous les drivers uniques de la base de données
    const database = equipmentDatabase.getDatabase();
    const drivers = new Set<string>();

    Object.values(database).forEach((equipment) => {
      if (equipment.driverName) {
        drivers.add(equipment.driverName);
      }
    });

    // Convertir en array et trier
    const driverList = Array.from(drivers).sort();

    res.json({
      drivers: driverList,
      count: driverList.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erreur lors de la récupération des drivers requis:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des drivers requis",
      details: error.message,
    });
  }
});

// POST /api/equipment/database/update - Forcer la mise à jour de la base de données d'équipements
router.post("/database/update", async (req: Request, res: Response) => {
  try {
    console.log(
      "📡 Mise à jour forcée de la base de données d'équipements via API"
    );

    const startTime = Date.now();
    await equipmentDatabase.forceUpdate();
    const endTime = Date.now();

    const stats = equipmentDatabase.getStatistics();

    res.json({
      message: "Base de données mise à jour avec succès",
      updateTime: endTime - startTime,
      statistics: stats,
      success: true,
    });
  } catch (error) {
    console.error(
      "Erreur lors de la mise à jour de la base de données:",
      error
    );
    res.status(500).json({
      error: "Erreur lors de la mise à jour de la base de données",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// GET /api/equipment/database/stats - Récupérer les statistiques de la base de données
router.get("/database/stats", async (req: Request, res: Response) => {
  try {
    const stats = equipmentDatabase.getStatistics();

    res.json({
      ...stats,
      databasePath: "server/src/data/equipment-database.json",
      isOnline: true, // TODO: Vérifier la connexion Internet
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      error: "Erreur lors de la récupération des statistiques",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// GET /api/equipment/state - Get persisted mount state
router.get("/state", (req: Request, res: Response) => {
  try {
    const state = mountStateService.getState();
    res.json(state);
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de la lecture de l\u0027état",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

// POST /api/equipment/state - Update persisted mount state
router.post("/state", async (req: Request, res: Response) => {
  try {
    const { selectedMount, lastPosition } = req.body as {
      selectedMount?: string;
      lastPosition?: { ra: number; dec: number };
    };

    if (selectedMount !== undefined) {
      if (selectedMount) {
        await mountStateService.updateSelectedMount(selectedMount);
      } else {
        await mountStateService.clearSelectedMount();
      }
    }

    if (lastPosition) {
      await mountStateService.updatePosition(lastPosition);
    }

    res.json({ success: true, state: mountStateService.getState() });
  } catch (error) {
    res.status(500).json({
      error: "Erreur lors de la mise \u00e0 jour de l\u0027e9tat",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

export default router;

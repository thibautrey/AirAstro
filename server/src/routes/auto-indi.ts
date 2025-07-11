import { AutoIndiManager } from "../services/auto-indi-manager";
import { Router } from "express";

const router = Router();
let autoIndiManager: AutoIndiManager;

// Initialiser le gestionnaire automatique INDI
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

/**
 * GET /api/auto-indi/status
 * Obtenir le statut complet du système
 */
router.get("/status", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    const status = await manager.getStatus();
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération du statut:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération du statut",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/auto-indi/devices
 * Obtenir la liste des périphériques détectés
 */
router.get("/devices", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    const devices = manager.getDetectedDevices();
    res.json({
      success: true,
      data: devices,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des périphériques:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des périphériques",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/auto-indi/drivers
 * Obtenir les informations sur les drivers
 */
router.get("/drivers", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    const installed = await manager.getInstalledDrivers();
    const loaded = manager.getCurrentDrivers();

    res.json({
      success: true,
      data: {
        installed,
        loaded,
      },
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des drivers:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des drivers",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/auto-indi/stats
 * Obtenir les statistiques détaillées
 */
router.get("/stats", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    const stats = await manager.getDetailedStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des statistiques:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des statistiques",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/start
 * Démarrer le système
 */
router.post("/start", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    await manager.start();
    res.json({
      success: true,
      message: "Système démarré avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du démarrage du système:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du démarrage du système",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/stop
 * Arrêter le système
 */
router.post("/stop", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    await manager.stop();
    res.json({
      success: true,
      message: "Système arrêté avec succès",
    });
  } catch (error) {
    console.error("Erreur lors de l'arrêt du système:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'arrêt du système",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/restart
 * Redémarrer le système
 */
router.post("/restart", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    await manager.restart();
    res.json({
      success: true,
      message: "Système redémarré avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du redémarrage du système:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du redémarrage du système",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/force-indi-restart
 * Forcer le redémarrage du serveur INDI
 */
router.post("/force-indi-restart", async (req, res) => {
  try {
    const manager = initAutoIndiManager();
    await manager.forceIndiRestart();
    res.json({
      success: true,
      message: "Serveur INDI redémarré avec succès",
    });
  } catch (error) {
    console.error("Erreur lors du redémarrage forcé d'INDI:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du redémarrage forcé d'INDI",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/drivers/add
 * Ajouter un driver
 */
router.post("/drivers/add", async (req, res) => {
  try {
    const { driver } = req.body;

    if (!driver || typeof driver !== "string") {
      return res.status(400).json({
        success: false,
        error: "Nom du driver requis",
      });
    }

    const manager = initAutoIndiManager();
    await manager.addDriver(driver);

    res.json({
      success: true,
      message: `Driver ${driver} ajouté avec succès`,
    });
  } catch (error) {
    console.error("Erreur lors de l'ajout du driver:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de l'ajout du driver",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/drivers/remove
 * Supprimer un driver
 */
router.post("/drivers/remove", async (req, res) => {
  try {
    const { driver } = req.body;

    if (!driver || typeof driver !== "string") {
      return res.status(400).json({
        success: false,
        error: "Nom du driver requis",
      });
    }

    const manager = initAutoIndiManager();
    await manager.removeDriver(driver);

    res.json({
      success: true,
      message: `Driver ${driver} supprimé avec succès`,
    });
  } catch (error) {
    console.error("Erreur lors de la suppression du driver:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la suppression du driver",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/auto-indi/logs
 * Obtenir les logs récents
 */
router.get("/logs", async (req, res) => {
  try {
    const lines = parseInt(req.query.lines as string) || 50;
    const manager = initAutoIndiManager();
    const logs = await manager.getRecentLogs(lines);

    res.json({
      success: true,
      data: logs,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des logs:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des logs",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/auto-indi/diagnostics
 * Obtenir des informations de diagnostic détaillées
 */
router.get("/diagnostics", async (req, res) => {
  try {
    const manager = initAutoIndiManager();

    // Obtenir les informations de diagnostic
    const diagnostics = {
      timestamp: new Date().toISOString(),
      system: {
        status: await manager.getStatus(),
        detectedDevices: manager.getDetectedDevices(),
        currentDrivers: manager.getCurrentDrivers(),
      },
      usb: {
        // Exécuter lsusb pour voir les périphériques USB bruts
        lsusb: await new Promise<string[]>((resolve, reject) => {
          const { exec } = require("child_process");
          exec("lsusb", (error: any, stdout: any, stderr: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(stdout.trim().split("\n"));
            }
          });
        }),
        // Vérifier les permissions
        udevRules: await new Promise<string[]>((resolve) => {
          const { exec } = require("child_process");
          exec(
            'ls -la /etc/udev/rules.d/*astro* /etc/udev/rules.d/*indi* /etc/udev/rules.d/*zwo* /etc/udev/rules.d/*asi* 2>/dev/null || echo "Aucune règle udev trouvée"',
            (error: any, stdout: any) => {
              resolve(stdout.trim().split("\n"));
            }
          );
        }),
      },
      indi: {
        // Vérifier si le service INDI est actif
        servicestatus: await new Promise<string[]>((resolve) => {
          const { exec } = require("child_process");
          exec(
            'ps aux | grep indi | grep -v grep || echo "Aucun processus INDI trouvé"',
            (error: any, stdout: any) => {
              resolve(stdout.trim().split("\n"));
            }
          );
        }),
        // Vérifier les drivers installés
        installedDrivers: await manager.getInstalledDrivers(),
      },
      logs: await manager.getRecentLogs(20),
    };

    res.json({
      success: true,
      data: diagnostics,
    });
  } catch (error) {
    console.error("Erreur lors de la récupération des diagnostics:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors de la récupération des diagnostics",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/force-usb-detection
 * Forcer le démarrage du détecteur USB
 */
router.post("/force-usb-detection", async (req, res) => {
  try {
    const manager = initAutoIndiManager();

    // Forcer le redémarrage du détecteur USB
    console.log("🔄 Redémarrage forcé du détecteur USB...");

    // Arrêter d'abord le système
    await manager.stop();

    // Attendre un peu
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Redémarrer le système
    await manager.start();

    // Obtenir le statut après redémarrage
    const status = await manager.getStatus();

    res.json({
      success: true,
      message: "Détecteur USB redémarré avec succès",
      data: {
        status,
        detectedDevices: manager.getDetectedDevices(),
      },
    });
  } catch (error) {
    console.error("Erreur lors du redémarrage du détecteur USB:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du redémarrage du détecteur USB",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * POST /api/auto-indi/force-start
 * Forcer le démarrage du système même s'il est déjà initialisé
 */
router.post("/force-start", async (req, res) => {
  try {
    const manager = initAutoIndiManager();

    // Forcer le redémarrage complet du système
    console.log("🔄 Forçage du démarrage du système...");

    // Arrêter d'abord le système
    await manager.stop();

    // Attendre un peu
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Redémarrer le système
    await manager.start();

    // Obtenir le statut après redémarrage
    const status = await manager.getStatus();

    res.json({
      success: true,
      message: "Système forcé au démarrage avec succès",
      data: {
        status,
        detectedDevices: manager.getDetectedDevices(),
      },
    });
  } catch (error) {
    console.error("Erreur lors du forçage du démarrage:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du forçage du démarrage",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * GET /api/auto-indi/debug-usb
 * Diagnostiquer la détection USB
 */
router.get("/debug-usb", async (req, res) => {
  try {
    const { exec } = require("child_process");
    const { promisify } = require("util");
    const execAsync = promisify(exec);

    // Exécuter lsusb pour voir les périphériques USB bruts
    const { stdout: lsusbOutput } = await execAsync("lsusb");

    // Vérifier les permissions
    const { stdout: permissionsOutput } = await execAsync(
      "ls -la /dev/bus/usb/ | head -10"
    );

    // Vérifier les règles udev
    const { stdout: udevOutput } = await execAsync(
      'find /etc/udev/rules.d/ -name "*zwo*" -o -name "*asi*" -o -name "*astro*" 2>/dev/null || echo "Aucune règle udev trouvée"'
    );

    const manager = initAutoIndiManager();
    const status = await manager.getStatus();

    res.json({
      success: true,
      data: {
        systemStatus: status,
        usbRawOutput: lsusbOutput.trim().split("\n"),
        permissions: permissionsOutput.trim().split("\n"),
        udevRules: udevOutput.trim().split("\n"),
        detectedDevices: manager.getDetectedDevices(),
      },
    });
  } catch (error) {
    console.error("Erreur lors du debug USB:", error);
    res.status(500).json({
      success: false,
      error: "Erreur lors du debug USB",
      details: error instanceof Error ? error.message : "Erreur inconnue",
    });
  }
});

/**
 * Middleware pour initialiser le gestionnaire automatique INDI au démarrage
 */
export const initAutoIndiOnStartup = async () => {
  try {
    console.log(
      "🔄 Initialisation du gestionnaire automatique INDI au démarrage..."
    );
    const manager = initAutoIndiManager();
    await manager.start();
    console.log("✅ Gestionnaire automatique INDI initialisé au démarrage");
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'initialisation du gestionnaire automatique INDI:",
      error
    );
  }
};

/**
 * Middleware pour nettoyer les ressources à l'arrêt
 */
export const cleanupAutoIndiOnShutdown = async () => {
  try {
    if (autoIndiManager) {
      console.log("🧹 Nettoyage du gestionnaire automatique INDI...");
      await autoIndiManager.cleanup();
      console.log("✅ Gestionnaire automatique INDI nettoyé");
    }
  } catch (error) {
    console.error(
      "❌ Erreur lors du nettoyage du gestionnaire automatique INDI:",
      error
    );
  }
};

export default router;

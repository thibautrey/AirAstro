import { Router, Request, Response } from 'express';
import { EquipmentManagerService } from '../services/equipment-manager.service';
import { AutoConfigurationService } from '../services/auto-configuration.service';
import { DriverManager } from '../indi';

const router = Router();
const driverManager = new DriverManager();
const equipmentManager = new EquipmentManagerService(driverManager);
const autoConfigService = new AutoConfigurationService();

// Démarrer le monitoring automatiquement
equipmentManager.startMonitoring();

// Lancer la configuration initiale après un délai
setTimeout(() => {
  autoConfigService.runInitialConfiguration();
}, 10000); // 10 secondes après le démarrage

// Events pour les WebSocket (à implémenter si nécessaire)
equipmentManager.on('equipmentStatusChanged', (status, device) => {
  console.log(`📡 Statut équipement changé: ${status.name} -> ${status.status}`);
});

equipmentManager.on('autoSetupCompleted', (result) => {
  console.log(`🎉 Configuration automatique terminée: ${result.configured}/${result.totalDevices} configurés`);
});

// GET /api/equipment - Lister tous les équipements détectés
router.get('/', async (req: Request, res: Response) => {
  try {
    const equipment = await equipmentManager.getEquipmentList();
    const status = equipmentManager.getEquipmentStatus();
    
    // Combiner les informations de détection et de statut
    const enrichedEquipment = equipment.map(device => {
      const deviceStatus = status.find(s => s.id === device.id);
      return {
        ...device,
        status: deviceStatus?.status || 'disconnected',
        lastSeen: deviceStatus?.lastSeen,
        errorMessage: deviceStatus?.errorMessage
      };
    });
    
    res.json({
      equipment: enrichedEquipment,
      totalCount: enrichedEquipment.length,
      connectedCount: enrichedEquipment.filter(e => e.status === 'connected').length,
      isMonitoring: true,
      isSetupInProgress: equipmentManager.isSetupInProgress()
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération des équipements:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des équipements',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/equipment/status - Récupérer uniquement les statuts
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = equipmentManager.getEquipmentStatus();
    
    res.json({
      equipment: status,
      totalCount: status.length,
      connectedCount: status.filter(s => s.status === 'connected').length,
      isMonitoring: true,
      isSetupInProgress: equipmentManager.isSetupInProgress()
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du statut:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du statut',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/equipment/auto-setup - Lancer la configuration automatique
router.post('/auto-setup', async (req: Request, res: Response) => {
  try {
    if (equipmentManager.isSetupInProgress()) {
      return res.status(409).json({ 
        error: 'Une configuration automatique est déjà en cours'
      });
    }
    
    console.log('🚀 Démarrage de la configuration automatique via API');
    
    const result = await equipmentManager.performAutoSetup();
    
    res.json({
      message: 'Configuration automatique terminée',
      result: {
        totalDevices: result.totalDevices,
        configured: result.configured,
        failed: result.failed,
        successRate: result.totalDevices > 0 ? (result.configured / result.totalDevices) * 100 : 0,
        errors: result.errors
      },
      devices: result.devices.map(device => ({
        id: device.id,
        name: device.name,
        type: device.type,
        manufacturer: device.manufacturer,
        model: device.model,
        driverStatus: device.driverStatus,
        autoInstallable: device.autoInstallable,
        confidence: device.confidence
      }))
    });
    
  } catch (error) {
    console.error('Erreur lors de la configuration automatique:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la configuration automatique',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/equipment/:id/setup - Configurer un équipement spécifique
router.post('/:id/setup', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`🔧 Configuration de l'équipement ${id} via API`);
    
    const success = await equipmentManager.setupSingleDevice(id);
    
    if (success) {
      res.json({ 
        message: 'Équipement configuré avec succès',
        deviceId: id,
        success: true
      });
    } else {
      res.status(500).json({ 
        error: 'Échec de la configuration de l\'équipement',
        deviceId: id,
        success: false
      });
    }
    
  } catch (error) {
    console.error(`Erreur lors de la configuration de l'équipement ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Erreur lors de la configuration de l\'équipement',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      deviceId: req.params.id
    });
  }
});

// POST /api/equipment/:id/restart - Redémarrer un équipement
router.post('/:id/restart', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    console.log(`🔄 Redémarrage de l'équipement ${id} via API`);
    
    const success = await equipmentManager.restartDevice(id);
    
    if (success) {
      res.json({ 
        message: 'Équipement redémarré avec succès',
        deviceId: id,
        success: true
      });
    } else {
      res.status(500).json({ 
        error: 'Échec du redémarrage de l\'équipement',
        deviceId: id,
        success: false
      });
    }
    
  } catch (error) {
    console.error(`Erreur lors du redémarrage de l'équipement ${req.params.id}:`, error);
    res.status(500).json({ 
      error: 'Erreur lors du redémarrage de l\'équipement',
      details: error instanceof Error ? error.message : 'Erreur inconnue',
      deviceId: req.params.id
    });
  }
});

// POST /api/equipment/scan - Forcer un nouveau scan
router.post('/scan', async (req: Request, res: Response) => {
  try {
    console.log('🔍 Scan forcé des équipements via API');
    
    // Vider le cache pour forcer une nouvelle détection
    equipmentManager.clearCache();
    
    const equipment = await equipmentManager.getEquipmentList();
    const status = equipmentManager.getEquipmentStatus();
    
    const enrichedEquipment = equipment.map(device => {
      const deviceStatus = status.find(s => s.id === device.id);
      return {
        ...device,
        status: deviceStatus?.status || 'disconnected',
        lastSeen: deviceStatus?.lastSeen,
        errorMessage: deviceStatus?.errorMessage
      };
    });
    
    res.json({
      message: 'Scan des équipements terminé',
      equipment: enrichedEquipment,
      totalCount: enrichedEquipment.length,
      connectedCount: enrichedEquipment.filter(e => e.status === 'connected').length,
      scannedAt: new Date()
    });
    
  } catch (error) {
    console.error('Erreur lors du scan des équipements:', error);
    res.status(500).json({ 
      error: 'Erreur lors du scan des équipements',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/equipment/types - Lister les types d'équipements disponibles
router.get('/types', (req: Request, res: Response) => {
  const types = [
    { 
      id: 'mount', 
      name: 'Montures', 
      description: 'Montures équatoriales et altazimutales',
      icon: '🔭'
    },
    { 
      id: 'camera', 
      name: 'Caméras', 
      description: 'Caméras CCD/CMOS et DSLR',
      icon: '📷'
    },
    { 
      id: 'guide-camera', 
      name: 'Caméras de guidage', 
      description: 'Caméras dédiées au guidage',
      icon: '📸'
    },
    { 
      id: 'focuser', 
      name: 'Focuseurs', 
      description: 'Focuseurs électroniques',
      icon: '🔍'
    },
    { 
      id: 'filter-wheel', 
      name: 'Roues à filtres', 
      description: 'Roues à filtres automatiques',
      icon: '🎨'
    },
    { 
      id: 'unknown', 
      name: 'Autres', 
      description: 'Équipements non identifiés',
      icon: '❓'
    }
  ];
  
  res.json({ types });
});

// GET /api/equipment/manufacturers - Lister les fabricants pris en charge
router.get('/manufacturers', (req: Request, res: Response) => {
  const manufacturers = [
    { 
      id: 'zwo', 
      name: 'ZWO',
      description: 'Caméras ASI et accessoires',
      website: 'https://astronomy-imaging-camera.com/',
      supportLevel: 'excellent'
    },
    { 
      id: 'celestron', 
      name: 'Celestron',
      description: 'Montures et télescopes',
      website: 'https://www.celestron.com/',
      supportLevel: 'excellent'
    },
    { 
      id: 'skywatcher', 
      name: 'Sky-Watcher',
      description: 'Montures équatoriales',
      website: 'https://www.skywatchertelescope.com/',
      supportLevel: 'excellent'
    },
    { 
      id: 'qhyccd', 
      name: 'QHYCCD',
      description: 'Caméras CCD/CMOS',
      website: 'https://www.qhyccd.com/',
      supportLevel: 'good'
    },
    { 
      id: 'canon', 
      name: 'Canon',
      description: 'Appareils photo DSLR',
      website: 'https://www.canon.com/',
      supportLevel: 'good'
    },
    { 
      id: 'nikon', 
      name: 'Nikon',
      description: 'Appareils photo DSLR',
      website: 'https://www.nikon.com/',
      supportLevel: 'good'
    }
  ];
  
  res.json({ manufacturers });
});

// POST /api/equipment/system-setup - Configuration automatique du système
router.post('/system-setup', async (req: Request, res: Response) => {
  try {
    if (autoConfigService.isConfigurationRunning()) {
      return res.status(409).json({ 
        error: 'Configuration automatique du système déjà en cours'
      });
    }
    
    console.log('🔧 Démarrage de la configuration automatique du système via API');
    
    const report = await autoConfigService.runAutoConfiguration();
    
    res.json({
      message: 'Configuration automatique du système terminée',
      report: {
        status: report.status,
        driversInstalled: report.drivers_installed,
        usbDevicesDetected: report.usb_devices_detected,
        services: report.services,
        timestamp: report.timestamp
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de la configuration automatique du système:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la configuration automatique du système',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// GET /api/equipment/system-status - Statut de la configuration système
router.get('/system-status', async (req: Request, res: Response) => {
  try {
    const lastReport = autoConfigService.getLastReport();
    const isRunning = autoConfigService.isConfigurationRunning();
    const requirements = await autoConfigService.checkSystemRequirements();
    
    res.json({
      isConfigurationRunning: isRunning,
      lastReport,
      systemRequirements: requirements,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Erreur lors de la récupération du statut système:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération du statut système',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

// POST /api/equipment/install-drivers - Installation manuelle de drivers
router.post('/install-drivers', async (req: Request, res: Response) => {
  try {
    const { devices } = req.body as { devices?: string[] };
    
    if (!devices || !Array.isArray(devices) || devices.length === 0) {
      return res.status(400).json({ 
        error: 'Liste des appareils requise'
      });
    }
    
    console.log(`🔧 Installation de drivers pour ${devices.length} appareils via API`);
    
    const result = await autoConfigService.installDriversForDevices(devices);
    
    res.json({
      message: 'Installation des drivers terminée',
      result: {
        totalDevices: devices.length,
        successful: result.success.length,
        failed: result.failed.length,
        successfulDevices: result.success,
        failedDevices: result.failed
      }
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'installation des drivers:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'installation des drivers',
      details: error instanceof Error ? error.message : 'Erreur inconnue'
    });
  }
});

export default router;

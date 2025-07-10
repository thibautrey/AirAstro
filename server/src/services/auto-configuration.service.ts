import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import path from 'path';

const exec = promisify(execCallback);

export interface AutoConfigReport {
  timestamp: string;
  status: 'completed' | 'running' | 'failed';
  drivers_installed: number;
  usb_devices_detected: number;
  services: {
    indi: string;
  };
}

export class AutoConfigurationService {
  private isRunning: boolean = false;
  private lastReport: AutoConfigReport | null = null;
  private configScriptPath: string;

  constructor() {
    this.configScriptPath = path.join(__dirname, '../scripts/auto-configure-equipment.sh');
  }

  async runAutoConfiguration(): Promise<AutoConfigReport> {
    if (this.isRunning) {
      throw new Error('Configuration automatique déjà en cours');
    }

    this.isRunning = true;
    
    try {
      console.log('🔧 Démarrage de la configuration automatique des équipements...');
      
      // Vérifier si le script existe
      try {
        await fs.access(this.configScriptPath);
      } catch (error) {
        throw new Error(`Script de configuration non trouvé: ${this.configScriptPath}`);
      }

      // Rendre le script exécutable
      await exec(`chmod +x "${this.configScriptPath}"`);

      // Exécuter le script de configuration
      const { stdout, stderr } = await exec(`"${this.configScriptPath}"`);
      
      console.log('📋 Sortie du script de configuration:');
      console.log(stdout);
      
      if (stderr) {
        console.warn('⚠️ Warnings du script de configuration:');
        console.warn(stderr);
      }

      // Lire le rapport généré
      const report = await this.readConfigReport();
      this.lastReport = report;

      console.log('✅ Configuration automatique terminée avec succès');
      console.log(`📊 Rapport: ${report.drivers_installed} drivers installés, ${report.usb_devices_detected} appareils détectés`);

      return report;

    } catch (error) {
      console.error('❌ Erreur lors de la configuration automatique:', error);
      
      // Créer un rapport d'erreur
      const errorReport: AutoConfigReport = {
        timestamp: new Date().toISOString(),
        status: 'failed',
        drivers_installed: 0,
        usb_devices_detected: 0,
        services: {
          indi: 'unknown'
        }
      };
      
      this.lastReport = errorReport;
      throw error;
      
    } finally {
      this.isRunning = false;
    }
  }

  async readConfigReport(): Promise<AutoConfigReport> {
    try {
      const reportPath = '/tmp/airastro-config-report.json';
      const reportData = await fs.readFile(reportPath, 'utf-8');
      const report = JSON.parse(reportData) as AutoConfigReport;
      
      return report;
      
    } catch (error) {
      console.warn('⚠️ Impossible de lire le rapport de configuration, création d\'un rapport par défaut');
      
      // Créer un rapport par défaut
      return {
        timestamp: new Date().toISOString(),
        status: 'completed',
        drivers_installed: await this.countInstalledDrivers(),
        usb_devices_detected: await this.countUsbDevices(),
        services: {
          indi: await this.getServiceStatus('indi')
        }
      };
    }
  }

  async runInitialConfiguration(): Promise<void> {
    console.log('🚀 Lancement de la configuration initiale au démarrage...');
    
    try {
      // Attendre un peu pour que le système soit prêt
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      await this.runAutoConfiguration();
      
    } catch (error) {
      console.error('❌ Erreur lors de la configuration initiale:', error);
      // Ne pas faire échouer le démarrage du serveur
    }
  }

  private async countInstalledDrivers(): Promise<number> {
    try {
      const { stdout } = await exec('dpkg -l | grep -E "^ii\\s+indi-" | wc -l');
      return parseInt(stdout.trim(), 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  private async countUsbDevices(): Promise<number> {
    try {
      const { stdout } = await exec('lsusb 2>/dev/null | wc -l');
      return parseInt(stdout.trim(), 10) || 0;
    } catch (error) {
      return 0;
    }
  }

  private async getServiceStatus(serviceName: string): Promise<string> {
    try {
      const { stdout } = await exec(`systemctl is-active ${serviceName}.service 2>/dev/null`);
      return stdout.trim();
    } catch (error) {
      return 'inactive';
    }
  }

  getLastReport(): AutoConfigReport | null {
    return this.lastReport;
  }

  isConfigurationRunning(): boolean {
    return this.isRunning;
  }

  async installDriversForDevices(deviceList: string[]): Promise<{ success: string[], failed: string[] }> {
    const success: string[] = [];
    const failed: string[] = [];
    
    console.log(`🔧 Installation de drivers pour ${deviceList.length} appareils...`);
    
    for (const device of deviceList) {
      try {
        // Mapper les appareils vers les drivers appropriés
        const driverName = this.mapDeviceToDriver(device);
        
        if (driverName) {
          await this.installSingleDriver(driverName);
          success.push(device);
          console.log(`✅ Driver installé pour ${device}`);
        } else {
          failed.push(device);
          console.log(`❌ Pas de driver disponible pour ${device}`);
        }
        
      } catch (error) {
        failed.push(device);
        console.error(`❌ Erreur lors de l'installation du driver pour ${device}:`, error);
      }
    }
    
    return { success, failed };
  }

  private mapDeviceToDriver(device: string): string | null {
    const deviceLower = device.toLowerCase();
    
    if (deviceLower.includes('zwo') || deviceLower.includes('asi')) {
      return 'indi-asi';
    } else if (deviceLower.includes('qhy')) {
      return 'indi-qhy';
    } else if (deviceLower.includes('canon')) {
      return 'indi-gphoto';
    } else if (deviceLower.includes('nikon')) {
      return 'indi-gphoto';
    } else if (deviceLower.includes('celestron')) {
      return 'indi-celestron';
    } else if (deviceLower.includes('skywatcher') || deviceLower.includes('sky-watcher')) {
      return 'indi-eqmod';
    } else if (deviceLower.includes('camera') || deviceLower.includes('cam')) {
      return 'indi-gphoto';
    } else if (deviceLower.includes('mount') || deviceLower.includes('telescope')) {
      return 'indi-eqmod';
    }
    
    return null;
  }

  private async installSingleDriver(driverName: string): Promise<void> {
    console.log(`🔧 Installation du driver ${driverName}...`);
    
    // Vérifier si le driver est déjà installé
    try {
      const { stdout } = await exec(`dpkg -l | grep -q "^ii  ${driverName} "`);
      console.log(`Driver ${driverName} déjà installé`);
      return;
    } catch (error) {
      // Le driver n'est pas installé, continuer
    }
    
    // Installer le driver
    try {
      await exec(`sudo apt-get update > /dev/null 2>&1`);
      await exec(`sudo apt-get install -y ${driverName}`);
      console.log(`✅ Driver ${driverName} installé avec succès`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'installation du driver ${driverName}:`, error);
      throw error;
    }
  }

  async checkSystemRequirements(): Promise<{ satisfied: boolean, missing: string[] }> {
    const missing: string[] = [];
    
    // Vérifier les commandes nécessaires
    const requiredCommands = ['lsusb', 'dpkg', 'systemctl', 'apt-get'];
    
    for (const cmd of requiredCommands) {
      try {
        await exec(`which ${cmd}`);
      } catch (error) {
        missing.push(cmd);
      }
    }
    
    return {
      satisfied: missing.length === 0,
      missing
    };
  }
}

import { promises as fs } from 'fs';
import { exec as execCallback } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const exec = promisify(execCallback);

export interface EquipmentDatabase {
  [vendorProduct: string]: {
    name: string;
    type: 'mount' | 'camera' | 'focuser' | 'filter-wheel' | 'guide-camera' | 'dome' | 'weather' | 'aux' | 'unknown';
    manufacturer: string;
    model: string;
    driverName: string;
    packageName: string;
    autoInstallable: boolean;
    aliases: string[];
    description?: string;
    category: string;
    lastUpdated: string;
  };
}

export interface DriverInfo {
  name: string;
  packageName: string;
  category: 'telescope' | 'ccd' | 'focuser' | 'aux' | 'dome' | 'weather' | 'spectrograph';
  description: string;
  manufacturer: string[];
  models: string[];
  supported_devices: {
    vendor_id?: string;
    product_id?: string;
    device_name?: string;
  }[];
}

export class EquipmentDatabaseService {
  private databasePath: string;
  private cachePath: string;
  private database: EquipmentDatabase = {};
  private lastUpdate: Date | null = null;
  private readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures

  constructor() {
    this.databasePath = path.join(__dirname, '../data/equipment-database.json');
    this.cachePath = path.join(__dirname, '../data');
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.cachePath, { recursive: true });
    } catch (error) {
      console.error('Erreur lors de la création du répertoire de cache:', error);
    }
  }

  async initializeDatabase(): Promise<void> {
    console.log('🔄 Initialisation de la base de données d\'équipements...');
    
    try {
      // Charger la base de données existante
      await this.loadLocalDatabase();
      
      // Vérifier si une mise à jour est nécessaire
      if (this.shouldUpdate()) {
        console.log('📡 Mise à jour de la base de données depuis les dépôts INDI...');
        await this.updateFromRemote();
      } else {
        console.log('✅ Base de données à jour');
      }
      
    } catch (error) {
      console.error('❌ Erreur lors de l\'initialisation de la base de données:', error);
      // Utiliser la base de données par défaut si le téléchargement échoue
      await this.loadDefaultDatabase();
    }
  }

  private async loadLocalDatabase(): Promise<void> {
    try {
      const data = await fs.readFile(this.databasePath, 'utf-8');
      const parsed = JSON.parse(data);
      this.database = parsed.database || {};
      this.lastUpdate = parsed.lastUpdate ? new Date(parsed.lastUpdate) : null;
      
      console.log(`📊 Base de données locale chargée: ${Object.keys(this.database).length} équipements`);
      
    } catch (error) {
      console.log('📝 Aucune base de données locale trouvée, création d\'une nouvelle');
      this.database = {};
      this.lastUpdate = null;
    }
  }

  private shouldUpdate(): boolean {
    if (!this.lastUpdate) return true;
    
    const timeSinceUpdate = Date.now() - this.lastUpdate.getTime();
    return timeSinceUpdate > this.UPDATE_INTERVAL;
  }

  async updateFromRemote(): Promise<void> {
    try {
      console.log('🌐 Téléchargement des données depuis GitHub...');
      
      // Télécharger les données des dépôts INDI
      const [indiDrivers, thirdPartyDrivers] = await Promise.all([
        this.fetchIndiDrivers(),
        this.fetchThirdPartyDrivers()
      ]);
      
      // Fusionner les données
      const combinedDatabase = {
        ...this.buildDatabaseFromDrivers(indiDrivers, 'indi-core'),
        ...this.buildDatabaseFromDrivers(thirdPartyDrivers, 'indi-3rdparty')
      };
      
      // Ajouter les mappings USB connus
      const usbMappings = await this.buildUsbMappings();
      Object.assign(combinedDatabase, usbMappings);
      
      this.database = combinedDatabase;
      this.lastUpdate = new Date();
      
      // Sauvegarder
      await this.saveLocalDatabase();
      
      console.log(`✅ Base de données mise à jour: ${Object.keys(this.database).length} équipements`);
      
    } catch (error) {
      console.error('❌ Erreur lors de la mise à jour depuis les dépôts distants:', error);
      throw error;
    }
  }

  private async fetchIndiDrivers(): Promise<DriverInfo[]> {
    const drivers: DriverInfo[] = [];
    
    const categories = [
      'telescope',
      'ccd', 
      'focuser',
      'aux',
      'dome',
      'weather'
    ];
    
    for (const category of categories) {
      try {
        const url = `https://api.github.com/repos/indilib/indi/contents/drivers/${category}`;
        const response = await fetch(url, {
          headers: { 'User-Agent': 'AirAstro-Equipment-Detector' }
        });
        
        if (!response.ok) continue;
        
        const files = await response.json() as any[];
        
        for (const file of files) {
          if (file.type === 'dir') {
            const driverInfo = await this.fetchDriverInfo('indilib/indi', `drivers/${category}/${file.name}`, category as any);
            if (driverInfo) {
              drivers.push(driverInfo);
            }
          }
        }
        
      } catch (error) {
        console.warn(`Erreur lors du téléchargement de la catégorie ${category}:`, error);
      }
    }
    
    return drivers;
  }

  private async fetchThirdPartyDrivers(): Promise<DriverInfo[]> {
    const drivers: DriverInfo[] = [];
    
    try {
      const url = 'https://api.github.com/repos/indilib/indi-3rdparty/git/trees/master?recursive=1';
      const response = await fetch(url, {
        headers: { 'User-Agent': 'AirAstro-Equipment-Detector' }
      });
      
      if (!response.ok) {
        throw new Error(`GitHub API responded with ${response.status}`);
      }
      
      const data = await response.json() as { tree: { path: string; type: string }[] };
      
      // Extraire les noms de drivers
      const driverPaths = new Set<string>();
      
      for (const item of data.tree) {
        if (item.type === 'blob' && item.path.startsWith('indi-') && item.path.includes('/')) {
          const pathParts = item.path.split('/');
          if (pathParts.length >= 2) {
            driverPaths.add(pathParts[0]);
          }
        }
      }
      
      // Récupérer les infos de chaque driver
      for (const driverPath of driverPaths) {
        try {
          const driverInfo = await this.fetchDriverInfo('indilib/indi-3rdparty', driverPath, 'aux');
          if (driverInfo) {
            drivers.push(driverInfo);
          }
        } catch (error) {
          // Continuer même si un driver échoue
        }
      }
      
    } catch (error) {
      console.warn('Erreur lors du téléchargement des drivers tiers:', error);
    }
    
    return drivers;
  }

  private async fetchDriverInfo(repo: string, driverPath: string, category: DriverInfo['category']): Promise<DriverInfo | null> {
    try {
      // Essayer de récupérer le CMakeLists.txt pour les informations
      const cmakeUrl = `https://api.github.com/repos/${repo}/contents/${driverPath}/CMakeLists.txt`;
      const response = await fetch(cmakeUrl, {
        headers: { 'User-Agent': 'AirAstro-Equipment-Detector' }
      });
      
      if (!response.ok) {
        return this.createDefaultDriverInfo(driverPath, category);
      }
      
      const fileData = await response.json() as any;
      const content = Buffer.from(fileData.content, 'base64').toString('utf-8');
      
      return this.parseDriverInfo(driverPath, content, category);
      
    } catch (error) {
      return this.createDefaultDriverInfo(driverPath, category);
    }
  }

  private parseDriverInfo(driverPath: string, cmakeContent: string, category: DriverInfo['category']): DriverInfo {
    const lines = cmakeContent.split('\n');
    
    let description = '';
    let manufacturer: string[] = [];
    
    for (const line of lines) {
      if (line.includes('DESCRIPTION') || line.includes('PROJECT_DESCRIPTION')) {
        const match = line.match(/"([^"]+)"/);
        if (match) description = match[1];
      }
    }
    
    // Extraire le fabricant du nom du driver
    const driverName = driverPath.replace('indi-', '');
    if (driverName.includes('asi')) manufacturer.push('ZWO');
    if (driverName.includes('qhy')) manufacturer.push('QHY');
    if (driverName.includes('canon')) manufacturer.push('Canon');
    if (driverName.includes('nikon')) manufacturer.push('Nikon');
    if (driverName.includes('celestron')) manufacturer.push('Celestron');
    if (driverName.includes('skywatcher') || driverName.includes('eqmod')) manufacturer.push('Sky-Watcher');
    
    return {
      name: driverPath,
      packageName: driverPath,
      category,
      description: description || `Driver ${driverName}`,
      manufacturer,
      models: [],
      supported_devices: []
    };
  }

  private createDefaultDriverInfo(driverPath: string, category: DriverInfo['category']): DriverInfo {
    const driverName = driverPath.replace('indi-', '');
    
    return {
      name: driverPath,
      packageName: driverPath,
      category,
      description: `Driver ${driverName}`,
      manufacturer: [],
      models: [],
      supported_devices: []
    };
  }

  private buildDatabaseFromDrivers(drivers: DriverInfo[], source: string): EquipmentDatabase {
    const database: EquipmentDatabase = {};
    
    for (const driver of drivers) {
      // Créer des entrées génériques basées sur le nom du driver
      const driverName = driver.name.replace('indi-', '');
      
      // Mapper le nom du driver aux types d'équipements
      const type = this.mapDriverToEquipmentType(driverName, driver.category);
      const manufacturer = this.extractManufacturer(driverName);
      
      // Créer une entrée générique
      const genericKey = `generic:${driverName}`;
      database[genericKey] = {
        name: driver.description || `${manufacturer} ${driverName}`,
        type,
        manufacturer,
        model: driverName.toUpperCase(),
        driverName: driver.name,
        packageName: driver.packageName,
        autoInstallable: true,
        aliases: [driverName, ...driver.manufacturer.map(m => m.toLowerCase())],
        description: driver.description,
        category: driver.category,
        lastUpdated: new Date().toISOString()
      };
    }
    
    return database;
  }

  private async buildUsbMappings(): Promise<EquipmentDatabase> {
    // Base de données étendue des mappings USB connus
    return {
      // ZWO ASI Cameras - Gamme complète
      '03c3:120a': { name: 'ASI120MC', type: 'camera', manufacturer: 'ZWO', model: 'ASI120MC', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi120mc', 'zwo asi120mc'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:120b': { name: 'ASI120MM', type: 'guide-camera', manufacturer: 'ZWO', model: 'ASI120MM', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi120mm', 'zwo asi120mm'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:120c': { name: 'ASI120MC-S', type: 'guide-camera', manufacturer: 'ZWO', model: 'ASI120MC-S', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi120mc-s'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:120d': { name: 'ASI120MM-S', type: 'guide-camera', manufacturer: 'ZWO', model: 'ASI120MM-S', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi120mm-s'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:178a': { name: 'ASI178MC', type: 'camera', manufacturer: 'ZWO', model: 'ASI178MC', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi178mc'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:178b': { name: 'ASI178MM', type: 'guide-camera', manufacturer: 'ZWO', model: 'ASI178MM', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi178mm'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:290a': { name: 'ASI290MC', type: 'guide-camera', manufacturer: 'ZWO', model: 'ASI290MC', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi290mc'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:290b': { name: 'ASI290MM', type: 'guide-camera', manufacturer: 'ZWO', model: 'ASI290MM', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi290mm'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:294a': { name: 'ASI294MC Pro', type: 'camera', manufacturer: 'ZWO', model: 'ASI294MC Pro', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi294mc', 'asi294mc pro'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:533a': { name: 'ASI533MC Pro', type: 'camera', manufacturer: 'ZWO', model: 'ASI533MC Pro', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi533mc'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:2600': { name: 'ASI2600MC Pro', type: 'camera', manufacturer: 'ZWO', model: 'ASI2600MC Pro', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi2600mc'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '03c3:6200': { name: 'ASI6200MC Pro', type: 'camera', manufacturer: 'ZWO', model: 'ASI6200MC Pro', driverName: 'indi-asi', packageName: 'indi-asi', autoInstallable: true, aliases: ['asi6200mc'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // QHY Cameras
      '1618:0901': { name: 'QHY5III-290M', type: 'guide-camera', manufacturer: 'QHY', model: 'QHY5III-290M', driverName: 'indi-qhy', packageName: 'indi-qhy', autoInstallable: true, aliases: ['qhy5iii-290m'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '1618:0920': { name: 'QHY268M', type: 'camera', manufacturer: 'QHY', model: 'QHY268M', driverName: 'indi-qhy', packageName: 'indi-qhy', autoInstallable: true, aliases: ['qhy268m'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '1618:2850': { name: 'QHY294C', type: 'camera', manufacturer: 'QHY', model: 'QHY294C', driverName: 'indi-qhy', packageName: 'indi-qhy', autoInstallable: true, aliases: ['qhy294c'], category: 'ccd', lastUpdated: new Date().toISOString() },
      '1618:6940': { name: 'QHY600M', type: 'camera', manufacturer: 'QHY', model: 'QHY600M', driverName: 'indi-qhy', packageName: 'indi-qhy', autoInstallable: true, aliases: ['qhy600m'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // Canon DSLR
      '04a9:*': { name: 'Canon DSLR', type: 'camera', manufacturer: 'Canon', model: 'DSLR', driverName: 'indi-gphoto', packageName: 'indi-gphoto', autoInstallable: true, aliases: ['canon', 'dslr'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // Nikon DSLR  
      '04b0:*': { name: 'Nikon DSLR', type: 'camera', manufacturer: 'Nikon', model: 'DSLR', driverName: 'indi-gphoto', packageName: 'indi-gphoto', autoInstallable: true, aliases: ['nikon', 'dslr'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // Celestron Mounts
      '0403:6001': { name: 'Celestron Mount', type: 'mount', manufacturer: 'Celestron', model: 'CGX/CGX-L/CGEM II', driverName: 'indi-celestron', packageName: 'indi-celestron', autoInstallable: true, aliases: ['celestron', 'cgx', 'cgem'], category: 'telescope', lastUpdated: new Date().toISOString() },
      
      // Sky-Watcher Mounts via FTDI
      '067b:2303': { name: 'Sky-Watcher Mount', type: 'mount', manufacturer: 'Sky-Watcher', model: 'EQ6-R/HEQ5 Pro', driverName: 'indi-eqmod', packageName: 'indi-eqmod', autoInstallable: true, aliases: ['skywatcher', 'eq6r', 'heq5'], category: 'telescope', lastUpdated: new Date().toISOString() },
      
      // Player One Astronomy
      '2e8d:*': { name: 'Player One Camera', type: 'camera', manufacturer: 'Player One Astronomy', model: 'Generic', driverName: 'indi-playerone', packageName: 'indi-playerone', autoInstallable: true, aliases: ['playerone'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // ToupTek
      '0547:*': { name: 'ToupTek Camera', type: 'camera', manufacturer: 'ToupTek', model: 'Generic', driverName: 'indi-toupbase', packageName: 'indi-toupbase', autoInstallable: true, aliases: ['touptek'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // Finger Lakes Instruments
      '16cc:*': { name: 'FLI Camera', type: 'camera', manufacturer: 'Finger Lakes Instruments', model: 'Generic', driverName: 'indi-fli', packageName: 'indi-fli', autoInstallable: true, aliases: ['fli'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // SBIG
      '0d56:*': { name: 'SBIG Camera', type: 'camera', manufacturer: 'SBIG', model: 'Generic', driverName: 'indi-sbig', packageName: 'indi-sbig', autoInstallable: true, aliases: ['sbig'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // Starlight Express
      '1278:*': { name: 'Starlight Express', type: 'camera', manufacturer: 'Starlight Express', model: 'Generic', driverName: 'indi-sx', packageName: 'indi-sx', autoInstallable: true, aliases: ['starlight express', 'sx'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // Apogee
      '125c:*': { name: 'Apogee Camera', type: 'camera', manufacturer: 'Apogee', model: 'Generic', driverName: 'indi-apogee', packageName: 'indi-apogee', autoInstallable: true, aliases: ['apogee'], category: 'ccd', lastUpdated: new Date().toISOString() },
      
      // Moravian Instruments
      '1ab1:*': { name: 'Moravian Camera', type: 'camera', manufacturer: 'Moravian Instruments', model: 'Generic', driverName: 'indi-mi', packageName: 'indi-mi', autoInstallable: true, aliases: ['moravian'], category: 'ccd', lastUpdated: new Date().toISOString() }
    };
  }

  private mapDriverToEquipmentType(driverName: string, category: string): EquipmentDatabase[string]['type'] {
    const name = driverName.toLowerCase();
    
    if (category === 'telescope' || name.includes('mount') || name.includes('telescope') || name.includes('eq')) {
      return 'mount';
    } else if (category === 'ccd' || name.includes('cam') || name.includes('ccd') || name.includes('asi') || name.includes('qhy')) {
      return 'camera';
    } else if (category === 'focuser' || name.includes('focus')) {
      return 'focuser';
    } else if (name.includes('filter') || name.includes('wheel')) {
      return 'filter-wheel';
    } else if (category === 'dome' || name.includes('dome')) {
      return 'dome';
    } else if (category === 'weather' || name.includes('weather')) {
      return 'weather';
    } else {
      return 'aux';
    }
  }

  private extractManufacturer(driverName: string): string {
    const name = driverName.toLowerCase();
    
    if (name.includes('asi') || name.includes('zwo')) return 'ZWO';
    if (name.includes('qhy')) return 'QHY';
    if (name.includes('canon')) return 'Canon';
    if (name.includes('nikon')) return 'Nikon';
    if (name.includes('celestron')) return 'Celestron';
    if (name.includes('skywatcher') || name.includes('eqmod')) return 'Sky-Watcher';
    if (name.includes('playerone')) return 'Player One Astronomy';
    if (name.includes('touptek')) return 'ToupTek';
    if (name.includes('fli')) return 'Finger Lakes Instruments';
    if (name.includes('sbig')) return 'SBIG';
    if (name.includes('sx')) return 'Starlight Express';
    if (name.includes('apogee')) return 'Apogee';
    if (name.includes('moravian') || name.includes('mi')) return 'Moravian Instruments';
    
    return 'Generic';
  }

  private async saveLocalDatabase(): Promise<void> {
    try {
      const data = {
        database: this.database,
        lastUpdate: this.lastUpdate?.toISOString(),
        version: '1.0.0'
      };
      
      await fs.writeFile(this.databasePath, JSON.stringify(data, null, 2));
      console.log('💾 Base de données sauvegardée localement');
      
    } catch (error) {
      console.error('❌ Erreur lors de la sauvegarde de la base de données:', error);
    }
  }

  private async loadDefaultDatabase(): Promise<void> {
    console.log('🔄 Chargement de la base de données par défaut...');
    this.database = await this.buildUsbMappings();
    this.lastUpdate = new Date();
    await this.saveLocalDatabase();
  }

  getDatabase(): EquipmentDatabase {
    return this.database;
  }

  findEquipmentByUsbId(vendorId: string, productId: string): EquipmentDatabase[string] | null {
    const usbId = `${vendorId.toLowerCase()}:${productId.toLowerCase()}`;
    
    // Recherche exacte
    if (this.database[usbId]) {
      return this.database[usbId];
    }
    
    // Recherche avec wildcard
    const wildcardId = `${vendorId.toLowerCase()}:*`;
    if (this.database[wildcardId]) {
      return this.database[wildcardId];
    }
    
    return null;
  }

  findEquipmentByName(name: string): EquipmentDatabase[string][] {
    const searchTerm = name.toLowerCase();
    const results: EquipmentDatabase[string][] = [];
    
    for (const equipment of Object.values(this.database)) {
      if (equipment.name.toLowerCase().includes(searchTerm) ||
          equipment.manufacturer.toLowerCase().includes(searchTerm) ||
          equipment.model.toLowerCase().includes(searchTerm) ||
          equipment.aliases.some(alias => alias.toLowerCase().includes(searchTerm))) {
        results.push(equipment);
      }
    }
    
    return results;
  }

  async forceUpdate(): Promise<void> {
    console.log('🔄 Mise à jour forcée de la base de données...');
    this.lastUpdate = null;
    await this.updateFromRemote();
  }

  getStatistics(): { totalEquipment: number, byType: Record<string, number>, byManufacturer: Record<string, number>, lastUpdate: string | null } {
    const byType: Record<string, number> = {};
    const byManufacturer: Record<string, number> = {};
    
    for (const equipment of Object.values(this.database)) {
      byType[equipment.type] = (byType[equipment.type] || 0) + 1;
      byManufacturer[equipment.manufacturer] = (byManufacturer[equipment.manufacturer] || 0) + 1;
    }
    
    return {
      totalEquipment: Object.keys(this.database).length,
      byType,
      byManufacturer,
      lastUpdate: this.lastUpdate?.toISOString() || null
    };
  }
}

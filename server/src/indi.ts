import { ChildProcess, exec as execCallback, spawn } from "child_process";

import { IndiClient } from "./services/indi-client";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

const exec = promisify(execCallback);

export interface IndiDevice {
  name: string;
  label: string;
  type:
    | "camera"
    | "mount"
    | "focuser"
    | "filterwheel"
    | "dome"
    | "weather"
    | "aux"
    | "unknown";
  driver: string;
  connected: boolean;
  properties: IndiProperty[];
  brand?: string;
  model?: string;
}

export interface IndiProperty {
  name: string;
  label: string;
  type: "text" | "number" | "switch" | "light" | "blob";
  value: any;
  writable: boolean;
  state: "idle" | "ok" | "busy" | "alert";
}

export interface UsbDevice {
  bus: string;
  device: string;
  id: string;
  description: string;
  matchingDrivers: string[];
  vendorId: string;
  productId: string;
  manufacturer?: string;
  product?: string;
  brand?: string;
  model?: string;
}

// Interface pour les informations de marque
export interface BrandInfo {
  name: string;
  vendorIds: string[];
  productPatterns: string[];
  driverPatterns: string[];
  packageNames: string[];
  description: string;
  installationScript?: string;
  diagnosticScript?: string;
  hasKnownConflicts?: boolean;
  conflictNote?: string;
}

// Base de données des marques connues
const KNOWN_BRANDS: Record<string, BrandInfo> = {
  zwo: {
    name: "ZWO",
    vendorIds: ["03c3"],
    productPatterns: ["asi", "zwo"],
    driverPatterns: ["asi", "zwo"],
    packageNames: ["indi-asi", "libasi", "asi-camera"],
    description: "ZWO ASI Cameras",
    installationScript: "brands/asi/install-asi-complete.sh",
    diagnosticScript: "brands/asi/diagnose-asi.sh",
  },
  qhy: {
    name: "QHYCCD",
    vendorIds: ["1618"],
    productPatterns: ["qhy"],
    driverPatterns: ["qhy"],
    packageNames: ["indi-qhy", "libqhy"],
    description: "QHY CCD Cameras",
  },
  celestron: {
    name: "Celestron",
    vendorIds: ["0525"],
    productPatterns: ["celestron"],
    driverPatterns: ["celestron"],
    packageNames: ["indi-celestron"],
    description: "Celestron Telescopes",
  },
  skywatcher: {
    name: "SkyWatcher",
    vendorIds: ["0525"],
    productPatterns: ["skywatcher", "eq6", "eq5", "az-eq"],
    driverPatterns: ["skywatcher", "eq6", "eq5"],
    packageNames: ["indi-skywatcher", "indi-eqmod"],
    description: "SkyWatcher Mounts",
  },
  meade: {
    name: "Meade",
    vendorIds: ["0525"],
    productPatterns: ["meade", "lx200"],
    driverPatterns: ["meade", "lx200"],
    packageNames: ["indi-meade"],
    description: "Meade Telescopes",
  },
  atik: {
    name: "Atik",
    vendorIds: ["04d8"],
    productPatterns: ["atik"],
    driverPatterns: ["atik"],
    packageNames: ["indi-atik"],
    description: "Atik Cameras",
  },
  moravian: {
    name: "Moravian",
    vendorIds: ["04d8"],
    productPatterns: ["moravian", "g2", "g3", "g4"],
    driverPatterns: ["moravian", "gxccd"],
    packageNames: ["indi-gxccd"],
    description: "Moravian Instruments",
  },
  sbig: {
    name: "SBIG",
    vendorIds: ["0d56"],
    productPatterns: ["sbig", "st-"],
    driverPatterns: ["sbig"],
    packageNames: ["indi-sbig"],
    description: "SBIG Cameras",
  },
  starlight: {
    name: "Starlight Xpress",
    vendorIds: ["1278"],
    productPatterns: ["starlight", "sxv", "lodestar"],
    driverPatterns: ["sx"],
    packageNames: ["indi-sx"],
    description: "Starlight Xpress Cameras",
  },
  playerone: {
    name: "Player One",
    vendorIds: ["a0a0"],
    productPatterns: [
      "player",
      "one",
      "neptune",
      "mars",
      "uranus",
      "saturn",
      "apollo",
      "ceres",
      "poseidon",
    ],
    driverPatterns: ["playerone"],
    packageNames: ["indi-playerone", "libplayerone", "libplayeronecamera2"],
    description: "Player One Astronomy Cameras",
    installationScript: "brands/playerone/install-playerone.sh",
    diagnosticScript: "brands/playerone/diagnose-playerone.sh",
    hasKnownConflicts: true, // Nouveau flag pour indiquer des conflits connus
    conflictNote:
      "Conflits de packages connus entre libplayerone et libplayeronecamera2. Installation manuelle recommandée.",
  },
  pegasus: {
    name: "Pegasus Astro",
    vendorIds: ["0483"],
    productPatterns: ["pegasus", "upb", "ppb"],
    driverPatterns: ["pegasus"],
    packageNames: ["indi-pegasus"],
    description: "Pegasus Astro Power Boxes",
  },
  svbony: {
    name: "SVBony",
    vendorIds: ["0547"],
    productPatterns: [
      "svbony",
      "sv105",
      "sv205",
      "sv305",
      "sv405",
      "sv505",
      "sv605",
      "sv905",
    ],
    driverPatterns: ["svbony", "sv105", "sv205", "sv305"],
    packageNames: ["indi-svbony", "libsvbony"],
    description: "SVBony Cameras",
  },
};

export class DriverManager {
  private searchDirs: string[];
  private running: Map<string, ChildProcess> = new Map();
  private availableCache?: { names: string[]; timestamp: number };
  private readonly CACHE_DURATION = 60 * 60 * 1000; // 1 hour
  private indiClient: IndiClient;

  constructor(indiHost: string = "localhost", indiPort: number = 7624) {
    this.searchDirs = [
      "/usr/local/bin",
      "/usr/bin",
      "/usr/local/lib/indi",
      "/usr/lib/indi",
      "/opt/indi/bin",
      "/usr/lib/x86_64-linux-gnu/indi",
      "/usr/lib/aarch64-linux-gnu/indi",
      "/usr/lib/arm-linux-gnueabihf/indi",
      "/usr/share/indi",
    ];
    this.indiClient = new IndiClient(indiHost, indiPort);
  }

  // Nouvelles méthodes pour communiquer avec les équipements via INDI

  /**
   * Obtenir la liste des équipements connectés via INDI
   */
  async getConnectedDevices(): Promise<IndiDevice[]> {
    try {
      // Obtenir la liste des devices depuis INDI
      const devicesOutput = await this.indiClient.getProp(
        "*.CONNECTION.CONNECT"
      );
      const devices: IndiDevice[] = [];

      if (devicesOutput) {
        const lines = devicesOutput.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          const match = line.match(/^([^.]+)\.CONNECTION\.CONNECT=(.+)$/);
          if (match) {
            const [, deviceName, connectionStatus] = match;
            const connected =
              connectionStatus === "On" || connectionStatus === "true";

            // Obtenir les informations détaillées du device
            const deviceInfo = await this.getDeviceInfo(deviceName);
            devices.push({
              name: deviceName,
              label: deviceInfo.label || deviceName,
              type: deviceInfo.type || "unknown",
              driver: deviceInfo.driver || "unknown",
              connected,
              properties: deviceInfo.properties || [],
              brand: deviceInfo.brand,
              model: deviceInfo.model,
            });
          }
        }
      }

      return devices;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des équipements connectés:",
        error
      );
      return [];
    }
  }

  /**
   * Obtenir les informations détaillées d'un équipement
   */
  private async getDeviceInfo(
    deviceName: string
  ): Promise<Partial<IndiDevice>> {
    try {
      const info: Partial<IndiDevice> = {};

      // Obtenir le type de device
      const driverExec = await this.indiClient.getProp(
        `${deviceName}.DRIVER_INFO.DRIVER_EXEC`
      );
      if (driverExec) {
        info.driver = driverExec.trim();
        info.type = this.inferDeviceType(driverExec);
      }

      // Obtenir le nom affiché
      const driverName = await this.indiClient.getProp(
        `${deviceName}.DRIVER_INFO.DRIVER_NAME`
      );
      if (driverName) {
        info.label = driverName.trim();
      }

      // Obtenir la version du driver
      const driverVersion = await this.indiClient.getProp(
        `${deviceName}.DRIVER_INFO.DRIVER_VERSION`
      );

      // Obtenir les propriétés importantes
      info.properties = await this.getDeviceProperties(deviceName);

      // Détecter la marque et le modèle à partir du nom du driver
      const brandModel = this.detectBrandFromDriverName(
        info.driver || deviceName
      );
      if (brandModel) {
        info.brand = brandModel.brand;
        info.model = brandModel.model;
      }

      return info;
    } catch (error) {
      console.warn(
        `Erreur lors de la récupération des informations pour ${deviceName}:`,
        error
      );
      return {};
    }
  }

  /**
   * Inférer le type d'équipement à partir du nom du driver
   */
  private inferDeviceType(driverName: string): IndiDevice["type"] {
    const name = driverName.toLowerCase();

    if (name.includes("ccd") || name.includes("camera")) return "camera";
    if (
      name.includes("telescope") ||
      name.includes("mount") ||
      name.includes("eqmod")
    )
      return "mount";
    if (name.includes("focuser") || name.includes("focus")) return "focuser";
    if (name.includes("wheel") || name.includes("filter")) return "filterwheel";
    if (name.includes("dome")) return "dome";
    if (name.includes("weather")) return "weather";

    return "aux";
  }

  /**
   * Obtenir les propriétés d'un équipement
   */
  private async getDeviceProperties(
    deviceName: string
  ): Promise<IndiProperty[]> {
    try {
      const properties: IndiProperty[] = [];

      // Obtenir toutes les propriétés du device
      const allProps = await this.indiClient.getProp(`${deviceName}.*`);

      if (allProps) {
        const lines = allProps.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          const match = line.match(/^([^.]+)\.([^.]+)\.([^=]+)=(.+)$/);
          if (match) {
            const [, device, group, propName, value] = match;

            // Filtrer les propriétés importantes
            if (this.isImportantProperty(group, propName)) {
              properties.push({
                name: `${group}.${propName}`,
                label: propName,
                type: this.inferPropertyType(propName, value),
                value: this.parsePropertyValue(value),
                writable: this.isWritableProperty(group, propName),
                state: "idle", // On pourrait l'obtenir depuis INDI mais c'est plus complexe
              });
            }
          }
        }
      }

      return properties;
    } catch (error) {
      console.warn(
        `Erreur lors de la récupération des propriétés pour ${deviceName}:`,
        error
      );
      return [];
    }
  }

  /**
   * Vérifier si une propriété est importante à afficher
   */
  private isImportantProperty(group: string, propName: string): boolean {
    const importantGroups = [
      "CONNECTION",
      "DRIVER_INFO",
      "CCD_INFO",
      "TELESCOPE_INFO",
      "FOCUSER_INFO",
      "FILTER_INFO",
      "WEATHER_INFO",
    ];

    const importantProps = [
      "CONNECT",
      "DRIVER_NAME",
      "DRIVER_VERSION",
      "DRIVER_EXEC",
      "CCD_MAX_X",
      "CCD_MAX_Y",
      "CCD_PIXEL_SIZE",
      "CCD_PIXEL_SIZE_X",
      "CCD_PIXEL_SIZE_Y",
      "TELESCOPE_INFO",
      "MOUNT_TYPE",
      "FOCUSER_INFO",
      "FILTER_COUNT",
    ];

    return importantGroups.includes(group) || importantProps.includes(propName);
  }

  /**
   * Inférer le type d'une propriété
   */
  private inferPropertyType(
    propName: string,
    value: string
  ): IndiProperty["type"] {
    if (propName.includes("CONNECT") || propName.includes("ENABLE"))
      return "switch";
    if (!isNaN(Number(value))) return "number";
    return "text";
  }

  /**
   * Parser la valeur d'une propriété
   */
  private parsePropertyValue(value: string): any {
    if (value === "On" || value === "true") return true;
    if (value === "Off" || value === "false") return false;
    if (!isNaN(Number(value))) return Number(value);
    return value;
  }

  /**
   * Vérifier si une propriété est modifiable
   */
  private isWritableProperty(group: string, propName: string): boolean {
    const writableProps = [
      "CONNECT",
      "CCD_EXPOSURE",
      "CCD_TEMPERATURE",
      "TELESCOPE_COORD",
      "FOCUSER_POSITION",
      "FILTER_SLOT",
    ];

    return writableProps.some((prop) => propName.includes(prop));
  }

  /**
   * Détecter la marque et le modèle à partir du nom du driver
   */
  private detectBrandFromDriverName(
    driverName: string
  ): { brand: string; model?: string } | null {
    const name = driverName.toLowerCase();

    for (const [key, brand] of Object.entries(KNOWN_BRANDS)) {
      for (const pattern of brand.driverPatterns) {
        if (name.includes(pattern)) {
          return {
            brand: brand.name,
            model: this.extractModelFromDriverName(name, brand),
          };
        }
      }
    }

    return null;
  }

  /**
   * Extraire le modèle du nom du driver
   */
  private extractModelFromDriverName(
    driverName: string,
    brand: BrandInfo
  ): string | undefined {
    // Logique similaire à extractModelFromDevice mais adaptée aux noms de drivers
    switch (brand.name) {
      case "ZWO":
        const asiMatch = driverName.match(/asi.*?(\d+\w*)/i);
        if (asiMatch) return `ASI ${asiMatch[1]}`;
        break;

      case "QHYCCD":
        const qhyMatch = driverName.match(/qhy.*?(\d+\w*)/i);
        if (qhyMatch) return `QHY ${qhyMatch[1]}`;
        break;

      // Ajouter d'autres marques si nécessaire
    }

    return undefined;
  }

  /**
   * Connecter un équipement via INDI
   */
  async connectDevice(deviceName: string): Promise<void> {
    try {
      await this.indiClient.setProp(`${deviceName}.CONNECTION.CONNECT`, "On");
      console.log(`Équipement ${deviceName} connecté`);
    } catch (error) {
      console.error(`Erreur lors de la connexion à ${deviceName}:`, error);
      throw error;
    }
  }

  /**
   * Déconnecter un équipement via INDI
   */
  async disconnectDevice(deviceName: string): Promise<void> {
    try {
      await this.indiClient.setProp(`${deviceName}.CONNECTION.CONNECT`, "Off");
      console.log(`Équipement ${deviceName} déconnecté`);
    } catch (error) {
      console.error(`Erreur lors de la déconnexion de ${deviceName}:`, error);
      throw error;
    }
  }

  /**
   * Obtenir la valeur d'une propriété d'un équipement
   */
  async getDeviceProperty(
    deviceName: string,
    propertyName: string
  ): Promise<string> {
    try {
      return await this.indiClient.getProp(`${deviceName}.${propertyName}`);
    } catch (error) {
      console.error(
        `Erreur lors de la lecture de ${deviceName}.${propertyName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Définir la valeur d'une propriété d'un équipement
   */
  async setDeviceProperty(
    deviceName: string,
    propertyName: string,
    value: string
  ): Promise<void> {
    try {
      await this.indiClient.setProp(`${deviceName}.${propertyName}`, value);
      console.log(`Propriété ${deviceName}.${propertyName} définie à ${value}`);
    } catch (error) {
      console.error(
        `Erreur lors de la définition de ${deviceName}.${propertyName}:`,
        error
      );
      throw error;
    }
  }

  /**
   * Vérifier si le serveur INDI est en cours d'exécution
   */
  async isIndiServerRunning(): Promise<boolean> {
    try {
      const result = await this.indiClient.getProp("*.CONNECTION.CONNECT");
      return result !== null && result !== "";
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir le statut du serveur INDI
   */
  async getIndiServerStatus(): Promise<{
    running: boolean;
    connectedDevices: number;
    availableDevices: string[];
  }> {
    try {
      const running = await this.isIndiServerRunning();
      const devices = await this.getConnectedDevices();

      return {
        running,
        connectedDevices: devices.filter((d) => d.connected).length,
        availableDevices: devices.map((d) => d.name),
      };
    } catch (error) {
      console.error("Erreur lors de la récupération du statut INDI:", error);
      return {
        running: false,
        connectedDevices: 0,
        availableDevices: [],
      };
    }
  }

  private async fetchDriverNamesFromGitHub(repo: string): Promise<string[]> {
    const url = `https://api.github.com/repos/${repo}/git/trees/master?recursive=1`;
    const res = await fetch(url, {
      headers: { "User-Agent": "AirAstro-Server" },
    });
    if (!res.ok) {
      throw new Error(`GitHub API responded with ${res.status}`);
    }
    const data = (await res.json()) as {
      tree: { path: string; type: string }[];
    };
    const names = new Set<string>();
    for (const item of data.tree) {
      if (
        item.type === "blob" &&
        item.path.startsWith("drivers/") &&
        item.path.endsWith("CMakeLists.txt")
      ) {
        const parts = item.path.split("/");
        if (parts.length >= 3) {
          names.add(parts[parts.length - 2]);
        }
      }
    }
    return Array.from(names);
  }

  async getAvailableDrivers(): Promise<string[]> {
    const cacheDuration = this.CACHE_DURATION;
    if (
      this.availableCache &&
      Date.now() - this.availableCache.timestamp < cacheDuration
    ) {
      return this.availableCache.names;
    }

    try {
      const repos = ["indilib/indi", "indilib/indi-3rdparty"];
      const lists = await Promise.all(
        repos.map((r) => this.fetchDriverNamesFromGitHub(r))
      );
      const names = Array.from(new Set(lists.flat())).sort();
      this.availableCache = { names, timestamp: Date.now() };
      return names;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des drivers disponibles:",
        error
      );
      return this.availableCache?.names || [];
    }
  }

  async searchDrivers(query: string): Promise<string[]> {
    const lower = query.toLowerCase();
    const names = await this.getAvailableDrivers();
    return names.filter((n) => n.toLowerCase().includes(lower));
  }

  // Nouvelle méthode pour détecter la marque d'un périphérique USB
  private detectBrandFromUsbDevice(device: UsbDevice): BrandInfo | null {
    for (const [key, brand] of Object.entries(KNOWN_BRANDS)) {
      // Vérifier l'ID du vendeur
      if (brand.vendorIds.includes(device.vendorId.toLowerCase())) {
        return brand;
      }

      // Vérifier les patterns dans la description
      const description = device.description.toLowerCase();
      const manufacturer = device.manufacturer?.toLowerCase() || "";
      const product = device.product?.toLowerCase() || "";

      for (const pattern of brand.productPatterns) {
        if (
          description.includes(pattern) ||
          manufacturer.includes(pattern) ||
          product.includes(pattern)
        ) {
          return brand;
        }
      }
    }
    return null;
  }

  // Méthode pour obtenir les drivers recommandés pour une marque
  private async getRecommendedDriversForBrand(
    brand: BrandInfo
  ): Promise<string[]> {
    const installed = await this.getInstalledDrivers();
    const recommended: string[] = [];

    for (const pattern of brand.driverPatterns) {
      const matching = installed.filter((driver) =>
        driver.toLowerCase().includes(pattern)
      );
      recommended.push(...matching);
    }

    return recommended;
  }

  // Méthode pour obtenir les suggestions d'installation pour une marque
  async getBrandInstallationSuggestions(brand: BrandInfo): Promise<{
    missingPackages: string[];
    installationScript?: string;
    diagnosticScript?: string;
  }> {
    const installed = await this.getInstalledDrivers();
    const hasAnyDriver = brand.driverPatterns.some((pattern) =>
      installed.some((driver) => driver.toLowerCase().includes(pattern))
    );

    if (hasAnyDriver) {
      return {
        missingPackages: [],
        installationScript: brand.installationScript,
        diagnosticScript: brand.diagnosticScript,
      };
    }

    return {
      missingPackages: brand.packageNames,
      installationScript: brand.installationScript,
      diagnosticScript: brand.diagnosticScript,
    };
  }

  async getInstalledDrivers(): Promise<string[]> {
    const found = new Set<string>();

    // Recherche dans les répertoires standards
    for (const dir of this.searchDirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.startsWith("indi_")) {
            found.add(file);
          }
        }
      } catch {
        // ignore missing directories
      }
    }

    // Recherche supplémentaire avec find pour les drivers qui pourraient être ailleurs
    try {
      const { stdout } = await exec(
        'find /usr /opt -name "indi_*" -type f -executable 2>/dev/null || true'
      );
      const foundDrivers = stdout.trim().split("\n").filter(Boolean);
      for (const driverPath of foundDrivers) {
        const driverName = path.basename(driverPath);
        found.add(driverName);
      }
    } catch (error) {
      console.warn("Erreur lors de la recherche étendue des drivers:", error);
    }

    return Array.from(found).sort();
  }

  private async findDriverPath(name: string): Promise<string> {
    if (path.isAbsolute(name)) {
      return name;
    }

    // Recherche dans les répertoires standards
    for (const dir of this.searchDirs) {
      const full = path.join(dir, name);
      try {
        await fs.access(full);
        return full;
      } catch {
        // try next
      }
    }

    // Recherche avec find si pas trouvé
    try {
      const { stdout } = await exec(
        `find /usr /opt -name "${name}" -type f -executable 2>/dev/null | head -1`
      );
      const foundPath = stdout.trim();
      if (foundPath) {
        return foundPath;
      }
    } catch (error) {
      console.warn(`Erreur lors de la recherche du driver ${name}:`, error);
    }

    return "";
  }

  async startDriver(name: string): Promise<void> {
    if (this.running.has(name)) return;
    const driverPath = await this.findDriverPath(name);
    if (!driverPath) {
      throw new Error(`Driver ${name} not found`);
    }

    // Always run drivers through indiserver
    const child = spawn("indiserver", ["-v", driverPath], {
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.on("exit", () => {
      this.running.delete(name);
    });
    this.running.set(name, child);
  }

  async stopDriver(name: string): Promise<void> {
    const proc = this.running.get(name);
    if (proc) {
      proc.kill();
      this.running.delete(name);
    }
  }

  listRunningDrivers(): string[] {
    return Array.from(this.running.keys());
  }

  /**
   * Obtenir la liste des équipements (remplace listUsbDevices)
   * Cette méthode utilise INDI au lieu de la détection USB directe
   */
  async listConnectedEquipment(): Promise<IndiDevice[]> {
    try {
      console.log("🔍 Récupération des équipements via INDI...");
      const devices = await this.getConnectedDevices();
      console.log(`📱 ${devices.length} équipements trouvés via INDI`);
      return devices;
    } catch (error) {
      console.error(
        "Erreur lors de la récupération des équipements via INDI:",
        error
      );
      return [];
    }
  }

  /**
   * Méthode dépréciée : listUsbDevices
   * Utiliser listConnectedEquipment() à la place
   * @deprecated Utiliser listConnectedEquipment() qui communique avec INDI
   */
  async listUsbDevices(): Promise<UsbDevice[]> {
    console.warn(
      "⚠️ listUsbDevices() est déprécié. Utilisez listConnectedEquipment() à la place."
    );

    try {
      const { stdout } = await exec("lsusb");
      const lines = stdout.trim().split("\n");
      const installed = await this.getInstalledDrivers();
      const devices: UsbDevice[] = [];

      for (const line of lines) {
        const match = line.match(
          /^Bus\s+(\d+)\s+Device\s+(\d+):\s+ID\s+([0-9a-fA-F]{4}):([0-9a-fA-F]{4})\s*(.*)$/
        );
        if (!match) continue;

        const [, bus, device, vendorId, productId, desc] = match;
        const id = `${vendorId}:${productId}`;

        // Obtenir des informations détaillées sur l'appareil (méthode simplifiée)
        // const detailedInfo = await this.getUsbDeviceDetails(bus, device);

        // Créer l'objet device de base
        const usbDevice: UsbDevice = {
          bus,
          device,
          id,
          vendorId,
          productId,
          description: desc,
          matchingDrivers: [],
          // manufacturer: detailedInfo.manufacturer,
          // product: detailedInfo.product,
        };

        // Détecter la marque
        const brand = this.detectBrandFromUsbDevice(usbDevice);
        if (brand) {
          usbDevice.brand = brand.name;
          usbDevice.model = this.extractModelFromDevice(usbDevice, brand);

          // Obtenir les drivers recommandés pour cette marque
          const recommendedDrivers = await this.getRecommendedDriversForBrand(
            brand
          );
          usbDevice.matchingDrivers = recommendedDrivers;
        } else {
          // Fallback sur l'ancienne méthode de détection
          const tokens = desc
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((t) => t.length >= 3);
          usbDevice.matchingDrivers = installed.filter((d) => {
            const dl = d.toLowerCase();
            return tokens.some((t) => dl.includes(t));
          });
        }

        devices.push(usbDevice);
      }

      return devices;
    } catch (error) {
      console.error("Erreur lors de la liste des appareils USB:", error);
      return [];
    }
  }

  // Méthode pour extraire le modèle d'un périphérique basé sur sa marque
  private extractModelFromDevice(
    device: UsbDevice,
    brand: BrandInfo
  ): string | undefined {
    const description = device.description.toLowerCase();
    const manufacturer = device.manufacturer?.toLowerCase() || "";
    const product = device.product?.toLowerCase() || "";

    // Patterns spécifiques par marque pour extraire le modèle
    switch (brand.name) {
      case "ZWO":
        // Pour ZWO, chercher ASI suivi de chiffres
        const asiMatch = (
          description +
          " " +
          manufacturer +
          " " +
          product
        ).match(/asi\s*(\d+\w*)/i);
        if (asiMatch) {
          return `ASI ${asiMatch[1]}`;
        }
        break;

      case "QHYCCD":
        // Pour QHY, chercher QHY suivi de chiffres
        const qhyMatch = (
          description +
          " " +
          manufacturer +
          " " +
          product
        ).match(/qhy\s*(\d+\w*)/i);
        if (qhyMatch) {
          return `QHY ${qhyMatch[1]}`;
        }
        break;

      case "Player One":
        // Pour Player One, chercher des patterns comme "Neptune-C" ou "Mars-C"
        const poMatch = (
          description +
          " " +
          manufacturer +
          " " +
          product
        ).match(
          /(neptune|mars|uranus|saturn|apollo|ceres|poseidon)[-\s]*[cm]?/i
        );
        if (poMatch) {
          return poMatch[0].toUpperCase();
        }
        break;

      default:
        // Fallback générique - essayer d'extraire un modèle basé sur les patterns de la marque
        for (const pattern of brand.productPatterns) {
          const regex = new RegExp(`${pattern}[\\s-]*([\\w\\d]+)`, "i");
          const match = (
            description +
            " " +
            manufacturer +
            " " +
            product
          ).match(regex);
          if (match) {
            return match[0];
          }
        }
    }

    return undefined;
  }

  /**
   * Prendre une photo avec une caméra
   */
  async captureImage(
    cameraName: string,
    exposureTime: number = 1.0
  ): Promise<void> {
    try {
      console.log(`📸 Prise de photo avec ${cameraName} (${exposureTime}s)`);

      // Vérifier que la caméra est connectée
      const isConnected = await this.indiClient.getProp(
        `${cameraName}.CONNECTION.CONNECT`
      );
      if (isConnected !== "On") {
        throw new Error(`La caméra ${cameraName} n'est pas connectée`);
      }

      // Définir le temps d'exposition
      await this.indiClient.setProp(
        `${cameraName}.CCD_EXPOSURE.CCD_EXPOSURE_VALUE`,
        exposureTime.toString()
      );

      // Démarrer l'exposition
      await this.indiClient.setProp(
        `${cameraName}.CCD_EXPOSURE.CCD_EXPOSURE_REQUEST`,
        "On"
      );

      console.log(`✅ Exposition démarrée pour ${cameraName}`);
    } catch (error) {
      console.error(`❌ Erreur lors de la prise de photo:`, error);
      throw error;
    }
  }

  /**
   * Bouger une monture vers des coordonnées spécifiées
   */
  async moveMount(mountName: string, ra: number, dec: number): Promise<void> {
    try {
      console.log(
        `🔭 Mouvement de la monture ${mountName} vers RA: ${ra}, DEC: ${dec}`
      );

      // Vérifier que la monture est connectée
      const isConnected = await this.indiClient.getProp(
        `${mountName}.CONNECTION.CONNECT`
      );
      if (isConnected !== "On") {
        throw new Error(`La monture ${mountName} n'est pas connectée`);
      }

      // Définir les coordonnées
      await this.indiClient.setProp(
        `${mountName}.EQUATORIAL_EOD_COORD.RA`,
        ra.toString()
      );
      await this.indiClient.setProp(
        `${mountName}.EQUATORIAL_EOD_COORD.DEC`,
        dec.toString()
      );

      // Démarrer le mouvement
      await this.indiClient.setProp(`${mountName}.ON_COORD_SET.SLEW`, "On");

      console.log(`✅ Mouvement démarré pour ${mountName}`);
    } catch (error) {
      console.error(`❌ Erreur lors du mouvement de la monture:`, error);
      throw error;
    }
  }

  /**
   * Ajuster la position d'un focuser
   */
  async adjustFocuser(focuserName: string, position: number): Promise<void> {
    try {
      console.log(
        `🔧 Ajustement du focuser ${focuserName} à la position ${position}`
      );

      // Vérifier que le focuser est connecté
      const isConnected = await this.indiClient.getProp(
        `${focuserName}.CONNECTION.CONNECT`
      );
      if (isConnected !== "On") {
        throw new Error(`Le focuser ${focuserName} n'est pas connecté`);
      }

      // Définir la position
      await this.indiClient.setProp(
        `${focuserName}.ABS_FOCUS_POSITION.FOCUS_ABSOLUTE_POSITION`,
        position.toString()
      );

      console.log(`✅ Position du focuser ${focuserName} ajustée`);
    } catch (error) {
      console.error(`❌ Erreur lors de l'ajustement du focuser:`, error);
      throw error;
    }
  }

  /**
   * Changer de filtre sur une roue à filtres
   */
  async changeFilter(
    filterWheelName: string,
    filterSlot: number
  ): Promise<void> {
    try {
      console.log(
        `🎨 Changement vers le filtre ${filterSlot} sur ${filterWheelName}`
      );

      // Vérifier que la roue à filtres est connectée
      const isConnected = await this.indiClient.getProp(
        `${filterWheelName}.CONNECTION.CONNECT`
      );
      if (isConnected !== "On") {
        throw new Error(
          `La roue à filtres ${filterWheelName} n'est pas connectée`
        );
      }

      // Changer de filtre
      await this.indiClient.setProp(
        `${filterWheelName}.FILTER_SLOT.FILTER_SLOT_VALUE`,
        filterSlot.toString()
      );

      console.log(`✅ Filtre changé sur ${filterWheelName}`);
    } catch (error) {
      console.error(`❌ Erreur lors du changement de filtre:`, error);
      throw error;
    }
  }

  /**
   * Obtenir les informations météo d'une station météo
   */
  async getWeatherInfo(weatherStationName: string): Promise<{
    temperature?: number;
    humidity?: number;
    pressure?: number;
    windSpeed?: number;
    cloudCover?: number;
    skyQuality?: number;
  }> {
    try {
      console.log(
        `🌤️ Récupération des informations météo de ${weatherStationName}`
      );

      const weatherInfo: any = {};

      // Essayer de récupérer diverses informations météo
      const tempProp = await this.indiClient.getProp(
        `${weatherStationName}.WEATHER_TEMPERATURE.TEMPERATURE`
      );
      if (tempProp) weatherInfo.temperature = parseFloat(tempProp);

      const humidityProp = await this.indiClient.getProp(
        `${weatherStationName}.WEATHER_HUMIDITY.HUMIDITY`
      );
      if (humidityProp) weatherInfo.humidity = parseFloat(humidityProp);

      const pressureProp = await this.indiClient.getProp(
        `${weatherStationName}.WEATHER_PRESSURE.PRESSURE`
      );
      if (pressureProp) weatherInfo.pressure = parseFloat(pressureProp);

      const windProp = await this.indiClient.getProp(
        `${weatherStationName}.WEATHER_WIND_SPEED.WIND_SPEED`
      );
      if (windProp) weatherInfo.windSpeed = parseFloat(windProp);

      const cloudProp = await this.indiClient.getProp(
        `${weatherStationName}.WEATHER_CLOUD_COVER.CLOUD_COVER`
      );
      if (cloudProp) weatherInfo.cloudCover = parseFloat(cloudProp);

      const skyProp = await this.indiClient.getProp(
        `${weatherStationName}.WEATHER_SKY_QUALITY.SKY_QUALITY`
      );
      if (skyProp) weatherInfo.skyQuality = parseFloat(skyProp);

      return weatherInfo;
    } catch (error) {
      console.error(
        `❌ Erreur lors de la récupération des informations météo:`,
        error
      );
      return {};
    }
  }

  /**
   * Obtenir l'état d'une exposition en cours
   */
  async getExposureStatus(cameraName: string): Promise<{
    exposing: boolean;
    remainingTime?: number;
    progress?: number;
  }> {
    try {
      const exposureState = await this.indiClient.getProp(
        `${cameraName}.CCD_EXPOSURE.CCD_EXPOSURE_REQUEST`
      );
      const exposing = exposureState === "On";

      let remainingTime: number | undefined;
      let progress: number | undefined;

      if (exposing) {
        const remainingProp = await this.indiClient.getProp(
          `${cameraName}.CCD_EXPOSURE.CCD_EXPOSURE_VALUE`
        );
        if (remainingProp) {
          remainingTime = parseFloat(remainingProp);
        }
      }

      return {
        exposing,
        remainingTime,
        progress,
      };
    } catch (error) {
      console.error(
        `❌ Erreur lors de la récupération de l'état d'exposition:`,
        error
      );
      return { exposing: false };
    }
  }

  /**
   * Obtenir la position actuelle d'une monture
   */
  async getMountPosition(mountName: string): Promise<{
    ra?: number;
    dec?: number;
    isTracking?: boolean;
    isParked?: boolean;
  }> {
    try {
      const position: any = {};

      const raProp = await this.indiClient.getProp(
        `${mountName}.EQUATORIAL_EOD_COORD.RA`
      );
      if (raProp) position.ra = parseFloat(raProp);

      const decProp = await this.indiClient.getProp(
        `${mountName}.EQUATORIAL_EOD_COORD.DEC`
      );
      if (decProp) position.dec = parseFloat(decProp);

      const trackingProp = await this.indiClient.getProp(
        `${mountName}.TELESCOPE_TRACK_STATE.TRACK_ON`
      );
      if (trackingProp) position.isTracking = trackingProp === "On";

      const parkProp = await this.indiClient.getProp(
        `${mountName}.TELESCOPE_PARK.PARK`
      );
      if (parkProp) position.isParked = parkProp === "On";

      return position;
    } catch (error) {
      console.error(
        `❌ Erreur lors de la récupération de la position de la monture:`,
        error
      );
      return {};
    }
  }

  /**
   * Démarrer/arrêter le suivi d'une monture
   */
  async setMountTracking(mountName: string, tracking: boolean): Promise<void> {
    try {
      console.log(
        `🔭 ${tracking ? "Démarrage" : "Arrêt"} du suivi pour ${mountName}`
      );

      const trackingValue = tracking ? "On" : "Off";
      await this.indiClient.setProp(
        `${mountName}.TELESCOPE_TRACK_STATE.TRACK_${trackingValue.toUpperCase()}`,
        "On"
      );

      console.log(
        `✅ Suivi ${tracking ? "démarré" : "arrêté"} pour ${mountName}`
      );
    } catch (error) {
      console.error(
        `❌ Erreur lors du ${tracking ? "démarrage" : "arrêt"} du suivi:`,
        error
      );
      throw error;
    }
  }

  /**
   * Parker/déparker une monture
   */
  async setMountParking(mountName: string, park: boolean): Promise<void> {
    try {
      console.log(
        `🔭 ${park ? "Parking" : "Déparking"} de la monture ${mountName}`
      );

      const parkValue = park ? "PARK" : "UNPARK";
      await this.indiClient.setProp(
        `${mountName}.TELESCOPE_PARK.${parkValue}`,
        "On"
      );

      console.log(`✅ Monture ${mountName} ${park ? "parkée" : "déparkée"}`);
    } catch (error) {
      console.error(
        `❌ Erreur lors du ${park ? "parking" : "déparking"}:`,
        error
      );
      throw error;
    }
  }
}

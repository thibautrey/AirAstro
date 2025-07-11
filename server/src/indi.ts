import { ChildProcess, exec as execCallback, spawn } from "child_process";

import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

const exec = promisify(execCallback);

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
    productPatterns: ["player", "one"],
    driverPatterns: ["playerone"],
    packageNames: ["indi-playerone"],
    description: "Player One Astronomy Cameras",
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

  constructor() {
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
    const child = spawn(driverPath, [], { stdio: ["ignore", "pipe", "pipe"] });
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

  async listUsbDevices(): Promise<UsbDevice[]> {
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

        // Obtenir des informations détaillées sur l'appareil
        const detailedInfo = await this.getUsbDeviceDetails(bus, device);

        // Créer l'objet device de base
        const usbDevice: UsbDevice = {
          bus,
          device,
          id,
          vendorId,
          productId,
          description: desc,
          matchingDrivers: [],
          manufacturer: detailedInfo.manufacturer,
          product: detailedInfo.product,
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

  // Méthode pour obtenir les informations détaillées d'une marque
  getBrandInfo(brandName: string): BrandInfo | null {
    const brand = Object.values(KNOWN_BRANDS).find(
      (b) => b.name.toLowerCase() === brandName.toLowerCase()
    );
    return brand || null;
  }

  // Méthode pour lister toutes les marques supportées
  getSupportedBrands(): BrandInfo[] {
    return Object.values(KNOWN_BRANDS);
  }

  // Méthode pour détecter automatiquement les équipements connectés avec leurs marques
  async detectConnectedEquipment(): Promise<{
    devices: UsbDevice[];
    brandSummary: Record<
      string,
      {
        brand: BrandInfo;
        devices: UsbDevice[];
        hasDrivers: boolean;
        recommendations: {
          missingPackages: string[];
          installationScript?: string;
          diagnosticScript?: string;
        };
      }
    >;
  }> {
    const devices = await this.listUsbDevices();
    const brandSummary: Record<string, any> = {};

    for (const device of devices) {
      if (device.brand) {
        const brandKey = device.brand.toLowerCase();
        const brandInfo = this.getBrandInfo(device.brand);

        if (brandInfo) {
          if (!brandSummary[brandKey]) {
            brandSummary[brandKey] = {
              brand: brandInfo,
              devices: [],
              hasDrivers: false,
              recommendations: await this.getBrandInstallationSuggestions(
                brandInfo
              ),
            };
          }

          brandSummary[brandKey].devices.push(device);
          if (device.matchingDrivers.length > 0) {
            brandSummary[brandKey].hasDrivers = true;
          }
        }
      }
    }

    return {
      devices,
      brandSummary,
    };
  }

  private async getUsbDeviceDetails(
    bus: string,
    device: string
  ): Promise<{ manufacturer?: string; product?: string }> {
    try {
      const { stdout } = await exec(`lsusb -s ${bus}:${device} -v 2>/dev/null`);
      const lines = stdout.split("\n");

      let manufacturer: string | undefined;
      let product: string | undefined;

      for (const line of lines) {
        if (line.includes("iManufacturer")) {
          const match = line.match(/iManufacturer\s+\d+\s+(.+)/);
          if (match) manufacturer = match[1].trim();
        } else if (line.includes("iProduct")) {
          const match = line.match(/iProduct\s+\d+\s+(.+)/);
          if (match) product = match[1].trim();
        }
      }

      return { manufacturer, product };
    } catch (error) {
      return {};
    }
  }

  async installDriver(packageName: string): Promise<void> {
    try {
      console.log(`🔧 Installation du driver ${packageName}...`);

      // Vérifier si le package existe
      const { stdout: searchResult } = await exec(
        `apt-cache search ${packageName}`
      );
      if (!searchResult.includes(packageName)) {
        throw new Error(`Package ${packageName} non trouvé dans les dépôts`);
      }

      // Mettre à jour la liste des packages
      await exec(`sudo apt-get update`);

      // Installer le package
      await exec(`sudo apt-get install -y ${packageName}`);

      console.log(`✅ Driver ${packageName} installé avec succès`);
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'installation du driver ${packageName}:`,
        error
      );
      throw error;
    }
  }

  // Méthode pour installer les drivers d'une marque spécifique
  async installBrandDrivers(brandName: string): Promise<{
    success: boolean;
    installedPackages: string[];
    failedPackages: string[];
    scriptExecuted?: boolean;
  }> {
    const brand = this.getBrandInfo(brandName);
    if (!brand) {
      throw new Error(`Marque ${brandName} non supportée`);
    }

    console.log(`🔧 Installation des drivers pour ${brand.name}...`);

    const installedPackages: string[] = [];
    const failedPackages: string[] = [];
    let scriptExecuted = false;

    // Essayer d'exécuter le script d'installation spécifique s'il existe
    if (brand.installationScript) {
      try {
        const scriptPath = path.join(
          process.cwd(),
          "scripts",
          brand.installationScript
        );
        console.log(`🔧 Exécution du script d'installation: ${scriptPath}`);

        // Vérifier si le script existe
        try {
          await fs.access(scriptPath);
          await exec(`chmod +x ${scriptPath}`);
          await exec(`${scriptPath}`);
          scriptExecuted = true;
          console.log(`✅ Script d'installation exécuté avec succès`);
        } catch (scriptError) {
          console.warn(
            `⚠️  Script d'installation non trouvé ou échec: ${scriptError}`
          );
          // Continuer avec l'installation des packages
        }
      } catch (error) {
        console.warn(`⚠️  Erreur lors de l'exécution du script: ${error}`);
      }
    }

    // Installation des packages individuels
    for (const packageName of brand.packageNames) {
      try {
        await this.installDriver(packageName);
        installedPackages.push(packageName);
      } catch (error) {
        console.warn(`⚠️  Échec de l'installation de ${packageName}: ${error}`);
        failedPackages.push(packageName);
      }
    }

    const success = installedPackages.length > 0 || scriptExecuted;

    if (success) {
      console.log(`✅ Installation terminée pour ${brand.name}`);
      if (installedPackages.length > 0) {
        console.log(`   Packages installés: ${installedPackages.join(", ")}`);
      }
      if (failedPackages.length > 0) {
        console.log(`   Packages échoués: ${failedPackages.join(", ")}`);
      }
    } else {
      console.log(`❌ Aucun driver installé pour ${brand.name}`);
    }

    return {
      success,
      installedPackages,
      failedPackages,
      scriptExecuted,
    };
  }

  // Méthode pour exécuter le diagnostic d'une marque
  async runBrandDiagnostic(brandName: string): Promise<{
    success: boolean;
    output: string;
  }> {
    const brand = this.getBrandInfo(brandName);
    if (!brand || !brand.diagnosticScript) {
      throw new Error(`Diagnostic non disponible pour ${brandName}`);
    }

    try {
      const scriptPath = path.join(
        process.cwd(),
        "scripts",
        brand.diagnosticScript
      );
      console.log(`🔍 Exécution du diagnostic pour ${brand.name}...`);

      const { stdout } = await exec(`chmod +x ${scriptPath} && ${scriptPath}`);

      return {
        success: true,
        output: stdout,
      };
    } catch (error) {
      return {
        success: false,
        output: error instanceof Error ? error.message : String(error),
      };
    }
  }
}

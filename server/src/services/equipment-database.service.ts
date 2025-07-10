import { exec as execCallback } from "child_process";
import { promises as fs } from "fs";
import path from "path";
import { promisify } from "util";

const exec = promisify(execCallback);

export interface EquipmentDatabase {
  [vendorProduct: string]: {
    name: string;
    type:
      | "mount"
      | "camera"
      | "focuser"
      | "filter-wheel"
      | "guide-camera"
      | "dome"
      | "weather"
      | "aux"
      | "unknown";
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
  category:
    | "telescope"
    | "ccd"
    | "focuser"
    | "aux"
    | "dome"
    | "weather"
    | "spectrograph";
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
  private driversPath: string;
  private database: EquipmentDatabase = {};
  private lastUpdate: Date | null = null;
  private readonly UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 heures
  private availableDrivers: Set<string> = new Set();
  private installedDrivers: Set<string> = new Set();

  constructor() {
    this.databasePath = path.join(__dirname, "../data/equipment-database.json");
    this.cachePath = path.join(__dirname, "../data");
    this.driversPath = path.join(__dirname, "../data/drivers");
    this.ensureDirectoryExists();
  }

  private async ensureDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.cachePath, { recursive: true });
      await fs.mkdir(this.driversPath, { recursive: true });
    } catch (error) {
      console.error(
        "Erreur lors de la création du répertoire de cache:",
        error
      );
    }
  }

  async initializeDatabase(): Promise<void> {
    console.log("🔄 Initialisation de la base de données d'équipements...");

    try {
      // Charger la base de données existante
      await this.loadLocalDatabase();

      // Vérifier les drivers installés
      await this.checkInstalledDrivers();

      // Vérifier si une mise à jour est nécessaire
      if (this.shouldUpdate()) {
        console.log(
          "📡 Mise à jour de la base de données depuis les dépôts INDI..."
        );
        await this.updateFromRemote();

        // Installer les drivers essentiels automatiquement
        await this.installEssentialDrivers();
      } else {
        console.log("✅ Base de données à jour");
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'initialisation de la base de données:",
        error
      );
      // Utiliser la base de données par défaut si le téléchargement échoue
      await this.loadDefaultDatabase();
    }
  }

  private async loadLocalDatabase(): Promise<void> {
    try {
      const data = await fs.readFile(this.databasePath, "utf-8");
      const parsed = JSON.parse(data);
      this.database = parsed.database || {};
      this.lastUpdate = parsed.lastUpdate ? new Date(parsed.lastUpdate) : null;

      console.log(
        `📊 Base de données locale chargée: ${
          Object.keys(this.database).length
        } équipements`
      );
    } catch (error) {
      console.log(
        "📝 Aucune base de données locale trouvée, création d'une nouvelle"
      );
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
      console.log("🌐 Téléchargement des données depuis GitHub...");

      // Télécharger les données des dépôts INDI
      const [indiDrivers, thirdPartyDrivers] = await Promise.all([
        this.fetchIndiDrivers(),
        this.fetchThirdPartyDrivers(),
      ]);

      // Fusionner les données
      const combinedDatabase = {
        ...this.buildDatabaseFromDrivers(indiDrivers, "indi-core"),
        ...this.buildDatabaseFromDrivers(thirdPartyDrivers, "indi-3rdparty"),
      };

      // Ajouter les mappings USB connus
      const usbMappings = await this.buildUsbMappings();
      Object.assign(combinedDatabase, usbMappings);

      this.database = combinedDatabase;
      this.lastUpdate = new Date();

      // Sauvegarder
      await this.saveLocalDatabase();

      console.log(
        `✅ Base de données mise à jour: ${
          Object.keys(this.database).length
        } équipements`
      );
    } catch (error) {
      console.error(
        "❌ Erreur lors de la mise à jour depuis les dépôts distants:",
        error
      );
      throw error;
    }
  }

  private async fetchIndiDrivers(): Promise<DriverInfo[]> {
    const drivers: DriverInfo[] = [];

    const categories = [
      "telescope",
      "ccd",
      "focuser",
      "aux",
      "dome",
      "weather",
    ];

    for (const category of categories) {
      try {
        const url = `https://api.github.com/repos/indilib/indi/contents/drivers/${category}`;
        const response = await fetch(url, {
          headers: { "User-Agent": "AirAstro-Equipment-Detector" },
        });

        if (!response.ok) continue;

        const files = (await response.json()) as any[];

        for (const file of files) {
          if (file.type === "dir") {
            const driverInfo = await this.fetchDriverInfo(
              "indilib/indi",
              `drivers/${category}/${file.name}`,
              category as any
            );
            if (driverInfo) {
              drivers.push(driverInfo);
            }
          }
        }
      } catch (error) {
        console.warn(
          `Erreur lors du téléchargement de la catégorie ${category}:`,
          error
        );
      }
    }

    return drivers;
  }

  private async fetchThirdPartyDrivers(): Promise<DriverInfo[]> {
    const drivers: DriverInfo[] = [];

    // Liste complète des drivers tiers basée sur le dépôt GitHub
    const knownThirdPartyDrivers = [
      // Cameras
      "indi-asi",
      "indi-qhy",
      "indi-gphoto",
      "indi-playerone",
      "indi-svbony",
      "indi-toupbase",
      "indi-atik",
      "indi-apogee",
      "indi-fli",
      "indi-sbig",
      "indi-sx",
      "indi-mi",
      "indi-dsi",
      "indi-ffmv",
      "indi-fishcamp",
      "indi-gige",
      "indi-nightscape",
      "indi-qsi",
      "indi-webcam",
      "indi-pentax",
      "indi-libcamera",
      "indi-mgen",

      // Montures
      "indi-eqmod",
      "indi-celestronaux",
      "indi-avalon",
      "indi-avalonud",
      "indi-bresserexos2",
      "indi-ioptron",
      "indi-orion-ssg3",
      "indi-starbook",
      "indi-starbook-ten",
      "indi-talon6",

      // Focusers
      "indi-asi-power",
      "indi-moonlite",
      "indi-beefocus",
      "indi-aok",

      // Domes
      "indi-maxdomeii",
      "indi-nexdome",
      "indi-rolloffino",

      // Weather/Environment
      "indi-aagcloudwatcher-ng",
      "indi-gpsd",
      "indi-gpsnmea",
      "indi-nut",
      "indi-weewx-json",

      // Auxiliary
      "indi-duino",
      "indi-gpio",
      "indi-rpi-gpio",
      "indi-ahp-xc",
      "indi-astarbox",
      "indi-astroasis",
      "indi-armadillo-platypus",
      "indi-ocs",
      "indi-inovaplx",
      "indi-limesdr",
      "indi-rtklib",
      "indi-shelyak",

      // Librairies
      "libasi",
      "libqhy",
      "libplayerone",
      "libsvbony",
      "libtoupcam",
      "libapogee",
      "libatik",
      "libfli",
      "libsbig",
      "libfishcamp",
      "libqsi",
      "libmicam",
      "libnncam",
      "libogmacam",
      "libomegonprocam",
      "libstarshootg",
      "libsvbonycam",
      "libtscam",
      "libaltaircam",
      "libastroasis",
      "libbressercam",
      "libmallincam",
      "libmeadecam",
      "libinovasdk",
      "libpigpiod",
      "libpktriggercord",
      "libricohcamerasdk",
    ];

    // Ajouter tous les drivers connus à la liste des drivers disponibles
    knownThirdPartyDrivers.forEach((driver) =>
      this.availableDrivers.add(driver)
    );

    try {
      const url =
        "https://api.github.com/repos/indilib/indi-3rdparty/git/trees/master?recursive=1";
      const response = await fetch(url, {
        headers: { "User-Agent": "AirAstro-Equipment-Detector" },
      });

      if (!response.ok) {
        console.warn(
          `GitHub API responded with ${response.status}, using known drivers list`
        );
        return this.createDriversFromKnownList(knownThirdPartyDrivers);
      }

      const data = (await response.json()) as {
        tree: { path: string; type: string }[];
      };

      // Extraire les noms de drivers du dépôt
      const driverPaths = new Set<string>();

      for (const item of data.tree) {
        if (
          item.type === "blob" &&
          (item.path.startsWith("indi-") || item.path.startsWith("lib")) &&
          item.path.includes("/")
        ) {
          const pathParts = item.path.split("/");
          if (pathParts.length >= 2) {
            const driverName = pathParts[0];
            driverPaths.add(driverName);
            this.availableDrivers.add(driverName);
          }
        }
      }

      console.log(`📡 Trouvé ${driverPaths.size} drivers tiers sur GitHub`);

      // Créer les informations de driver pour chaque driver trouvé
      for (const driverPath of driverPaths) {
        try {
          const driverInfo = await this.fetchDriverInfo(
            "indilib/indi-3rdparty",
            driverPath,
            this.categorizeDriver(driverPath)
          );
          if (driverInfo) {
            drivers.push(driverInfo);
          }
        } catch (error) {
          // En cas d'erreur, créer un driver par défaut
          const defaultDriver = this.createDefaultDriverInfo(
            driverPath,
            this.categorizeDriver(driverPath)
          );
          drivers.push(defaultDriver);
        }
      }

      // Ajouter les drivers connus qui n'ont pas été trouvés
      const missingDrivers = knownThirdPartyDrivers.filter(
        (driver) => !driverPaths.has(driver)
      );
      missingDrivers.forEach((driver) => {
        const defaultDriver = this.createDefaultDriverInfo(
          driver,
          this.categorizeDriver(driver)
        );
        drivers.push(defaultDriver);
      });
    } catch (error) {
      console.warn("Erreur lors du téléchargement des drivers tiers:", error);
      return this.createDriversFromKnownList(knownThirdPartyDrivers);
    }

    console.log(`✅ Collecté ${drivers.length} drivers tiers au total`);
    return drivers;
  }

  private createDriversFromKnownList(knownDrivers: string[]): DriverInfo[] {
    return knownDrivers.map((driver) =>
      this.createDefaultDriverInfo(driver, this.categorizeDriver(driver))
    );
  }

  private categorizeDriver(driverName: string): DriverInfo["category"] {
    const name = driverName.toLowerCase();

    if (
      name.includes("asi") ||
      name.includes("qhy") ||
      name.includes("gphoto") ||
      name.includes("playerone") ||
      name.includes("svbony") ||
      name.includes("toupbase") ||
      name.includes("atik") ||
      name.includes("apogee") ||
      name.includes("fli") ||
      name.includes("sbig") ||
      name.includes("sx") ||
      name.includes("mi") ||
      name.includes("dsi") ||
      name.includes("ffmv") ||
      name.includes("fishcamp") ||
      name.includes("gige") ||
      name.includes("nightscape") ||
      name.includes("qsi") ||
      name.includes("webcam") ||
      name.includes("pentax") ||
      name.includes("libcamera") ||
      name.includes("mgen") ||
      name.includes("cam")
    ) {
      return "ccd";
    } else if (
      name.includes("eqmod") ||
      name.includes("celestron") ||
      name.includes("avalon") ||
      name.includes("bresser") ||
      name.includes("ioptron") ||
      name.includes("orion") ||
      name.includes("starbook") ||
      name.includes("talon") ||
      name.includes("mount")
    ) {
      return "telescope";
    } else if (
      name.includes("focus") ||
      name.includes("moonlite") ||
      name.includes("beefocus") ||
      name.includes("aok")
    ) {
      return "focuser";
    } else if (
      name.includes("dome") ||
      name.includes("maxdome") ||
      name.includes("nexdome") ||
      name.includes("rolloff")
    ) {
      return "dome";
    } else if (
      name.includes("weather") ||
      name.includes("cloudwatcher") ||
      name.includes("weewx") ||
      name.includes("nut")
    ) {
      return "weather";
    } else {
      return "aux";
    }
  }

  private async fetchDriverInfo(
    repo: string,
    driverPath: string,
    category: DriverInfo["category"]
  ): Promise<DriverInfo | null> {
    try {
      // Essayer de récupérer le CMakeLists.txt pour les informations
      const cmakeUrl = `https://api.github.com/repos/${repo}/contents/${driverPath}/CMakeLists.txt`;
      const response = await fetch(cmakeUrl, {
        headers: { "User-Agent": "AirAstro-Equipment-Detector" },
      });

      if (!response.ok) {
        return this.createDefaultDriverInfo(driverPath, category);
      }

      const fileData = (await response.json()) as any;
      const content = Buffer.from(fileData.content, "base64").toString("utf-8");

      return this.parseDriverInfo(driverPath, content, category);
    } catch (error) {
      return this.createDefaultDriverInfo(driverPath, category);
    }
  }

  private parseDriverInfo(
    driverPath: string,
    cmakeContent: string,
    category: DriverInfo["category"]
  ): DriverInfo {
    const lines = cmakeContent.split("\n");

    let description = "";
    let manufacturer: string[] = [];

    for (const line of lines) {
      if (
        line.includes("DESCRIPTION") ||
        line.includes("PROJECT_DESCRIPTION")
      ) {
        const match = line.match(/"([^"]+)"/);
        if (match) description = match[1];
      }
    }

    // Extraire le fabricant du nom du driver
    const driverName = driverPath.replace("indi-", "");
    if (driverName.includes("asi")) manufacturer.push("ZWO");
    if (driverName.includes("qhy")) manufacturer.push("QHY");
    if (driverName.includes("canon")) manufacturer.push("Canon");
    if (driverName.includes("nikon")) manufacturer.push("Nikon");
    if (driverName.includes("celestron")) manufacturer.push("Celestron");
    if (driverName.includes("skywatcher") || driverName.includes("eqmod"))
      manufacturer.push("Sky-Watcher");

    return {
      name: driverPath,
      packageName: driverPath,
      category,
      description: description || `Driver ${driverName}`,
      manufacturer,
      models: [],
      supported_devices: [],
    };
  }

  private createDefaultDriverInfo(
    driverPath: string,
    category: DriverInfo["category"]
  ): DriverInfo {
    const driverName = driverPath.replace("indi-", "");

    return {
      name: driverPath,
      packageName: driverPath,
      category,
      description: `Driver ${driverName}`,
      manufacturer: [],
      models: [],
      supported_devices: [],
    };
  }

  private buildDatabaseFromDrivers(
    drivers: DriverInfo[],
    source: string
  ): EquipmentDatabase {
    const database: EquipmentDatabase = {};

    for (const driver of drivers) {
      // Créer des entrées génériques basées sur le nom du driver
      const driverName = driver.name.replace("indi-", "");

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
        aliases: [
          driverName,
          ...driver.manufacturer.map((m) => m.toLowerCase()),
        ],
        description: driver.description,
        category: driver.category,
        lastUpdated: new Date().toISOString(),
      };
    }

    return database;
  }

  private async buildUsbMappings(): Promise<EquipmentDatabase> {
    // Base de données étendue des mappings USB connus
    return {
      // ZWO ASI Cameras - Gamme complète
      "03c3:120a": {
        name: "ASI120MC",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI120MC",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi120mc", "zwo asi120mc"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:120b": {
        name: "ASI120MM",
        type: "camera", // Changé de "guide-camera" à "camera" pour permettre usage principal
        manufacturer: "ZWO",
        model: "ASI120MM",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi120mm", "zwo asi120mm", "asi 120mm"],
        category: "ccd",
        description:
          "Caméra ZWO ASI120MM - Peut être utilisée comme caméra principale ou de guidage",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:120c": {
        name: "ASI120MC-S",
        type: "guide-camera",
        manufacturer: "ZWO",
        model: "ASI120MC-S",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi120mc-s"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:120d": {
        name: "ASI120MM-S",
        type: "guide-camera",
        manufacturer: "ZWO",
        model: "ASI120MM-S",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi120mm-s"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:178a": {
        name: "ASI178MC",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI178MC",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi178mc"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:178b": {
        name: "ASI178MM",
        type: "guide-camera",
        manufacturer: "ZWO",
        model: "ASI178MM",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi178mm"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:290a": {
        name: "ASI290MC",
        type: "guide-camera",
        manufacturer: "ZWO",
        model: "ASI290MC",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi290mc"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:290b": {
        name: "ASI290MM",
        type: "guide-camera",
        manufacturer: "ZWO",
        model: "ASI290MM",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi290mm"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:294a": {
        name: "ASI294MC Pro",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI294MC Pro",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi294mc", "asi294mc pro"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:533a": {
        name: "ASI533MC Pro",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI533MC Pro",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi533mc"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:2600": {
        name: "ASI2600MC Pro",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI2600MC Pro",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi2600mc"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "03c3:6200": {
        name: "ASI6200MC Pro",
        type: "camera",
        manufacturer: "ZWO",
        model: "ASI6200MC Pro",
        driverName: "indi-asi",
        packageName: "indi-asi",
        autoInstallable: true,
        aliases: ["asi6200mc"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // QHY Cameras
      "1618:0901": {
        name: "QHY5III-290M",
        type: "guide-camera",
        manufacturer: "QHY",
        model: "QHY5III-290M",
        driverName: "indi-qhy",
        packageName: "indi-qhy",
        autoInstallable: true,
        aliases: ["qhy5iii-290m"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "1618:0920": {
        name: "QHY268M",
        type: "camera",
        manufacturer: "QHY",
        model: "QHY268M",
        driverName: "indi-qhy",
        packageName: "indi-qhy",
        autoInstallable: true,
        aliases: ["qhy268m"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "1618:2850": {
        name: "QHY294C",
        type: "camera",
        manufacturer: "QHY",
        model: "QHY294C",
        driverName: "indi-qhy",
        packageName: "indi-qhy",
        autoInstallable: true,
        aliases: ["qhy294c"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
      "1618:6940": {
        name: "QHY600M",
        type: "camera",
        manufacturer: "QHY",
        model: "QHY600M",
        driverName: "indi-qhy",
        packageName: "indi-qhy",
        autoInstallable: true,
        aliases: ["qhy600m"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // Canon DSLR
      "04a9:*": {
        name: "Canon DSLR",
        type: "camera",
        manufacturer: "Canon",
        model: "DSLR",
        driverName: "indi-gphoto",
        packageName: "indi-gphoto",
        autoInstallable: true,
        aliases: ["canon", "dslr"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // Nikon DSLR
      "04b0:*": {
        name: "Nikon DSLR",
        type: "camera",
        manufacturer: "Nikon",
        model: "DSLR",
        driverName: "indi-gphoto",
        packageName: "indi-gphoto",
        autoInstallable: true,
        aliases: ["nikon", "dslr"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // Celestron Mounts
      "0403:6001": {
        name: "Celestron Mount",
        type: "mount",
        manufacturer: "Celestron",
        model: "CGX/CGX-L/CGEM II",
        driverName: "indi-celestron",
        packageName: "indi-celestron",
        autoInstallable: true,
        aliases: ["celestron", "cgx", "cgem"],
        category: "telescope",
        lastUpdated: new Date().toISOString(),
      },

      // Sky-Watcher Mounts via FTDI
      "067b:2303": {
        name: "Sky-Watcher Mount",
        type: "mount",
        manufacturer: "Sky-Watcher",
        model: "EQ6-R/HEQ5 Pro",
        driverName: "indi-eqmod",
        packageName: "indi-eqmod",
        autoInstallable: true,
        aliases: ["skywatcher", "eq6r", "heq5"],
        category: "telescope",
        lastUpdated: new Date().toISOString(),
      },

      // Player One Astronomy
      "2e8d:*": {
        name: "Player One Camera",
        type: "camera",
        manufacturer: "Player One Astronomy",
        model: "Generic",
        driverName: "indi-playerone",
        packageName: "indi-playerone",
        autoInstallable: true,
        aliases: ["playerone"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // ToupTek
      "0547:*": {
        name: "ToupTek Camera",
        type: "camera",
        manufacturer: "ToupTek",
        model: "Generic",
        driverName: "indi-toupbase",
        packageName: "indi-toupbase",
        autoInstallable: true,
        aliases: ["touptek"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // Finger Lakes Instruments
      "16cc:*": {
        name: "FLI Camera",
        type: "camera",
        manufacturer: "Finger Lakes Instruments",
        model: "Generic",
        driverName: "indi-fli",
        packageName: "indi-fli",
        autoInstallable: true,
        aliases: ["fli"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // SBIG
      "0d56:*": {
        name: "SBIG Camera",
        type: "camera",
        manufacturer: "SBIG",
        model: "Generic",
        driverName: "indi-sbig",
        packageName: "indi-sbig",
        autoInstallable: true,
        aliases: ["sbig"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // Starlight Express
      "1278:*": {
        name: "Starlight Express",
        type: "camera",
        manufacturer: "Starlight Express",
        model: "Generic",
        driverName: "indi-sx",
        packageName: "indi-sx",
        autoInstallable: true,
        aliases: ["starlight express", "sx"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // Apogee
      "125c:*": {
        name: "Apogee Camera",
        type: "camera",
        manufacturer: "Apogee",
        model: "Generic",
        driverName: "indi-apogee",
        packageName: "indi-apogee",
        autoInstallable: true,
        aliases: ["apogee"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },

      // Moravian Instruments
      "1ab1:*": {
        name: "Moravian Camera",
        type: "camera",
        manufacturer: "Moravian Instruments",
        model: "Generic",
        driverName: "indi-mi",
        packageName: "indi-mi",
        autoInstallable: true,
        aliases: ["moravian"],
        category: "ccd",
        lastUpdated: new Date().toISOString(),
      },
    };
  }

  private mapDriverToEquipmentType(
    driverName: string,
    category: string
  ): EquipmentDatabase[string]["type"] {
    const name = driverName.toLowerCase();

    if (
      category === "telescope" ||
      name.includes("mount") ||
      name.includes("telescope") ||
      name.includes("eq")
    ) {
      return "mount";
    } else if (
      category === "ccd" ||
      name.includes("cam") ||
      name.includes("ccd") ||
      name.includes("asi") ||
      name.includes("qhy")
    ) {
      return "camera";
    } else if (category === "focuser" || name.includes("focus")) {
      return "focuser";
    } else if (name.includes("filter") || name.includes("wheel")) {
      return "filter-wheel";
    } else if (category === "dome" || name.includes("dome")) {
      return "dome";
    } else if (category === "weather" || name.includes("weather")) {
      return "weather";
    } else {
      return "aux";
    }
  }

  private extractManufacturer(driverName: string): string {
    const name = driverName.toLowerCase();

    if (name.includes("asi") || name.includes("zwo")) return "ZWO";
    if (name.includes("qhy")) return "QHY";
    if (name.includes("canon")) return "Canon";
    if (name.includes("nikon")) return "Nikon";
    if (name.includes("celestron")) return "Celestron";
    if (name.includes("skywatcher") || name.includes("eqmod"))
      return "Sky-Watcher";
    if (name.includes("playerone")) return "Player One Astronomy";
    if (name.includes("touptek")) return "ToupTek";
    if (name.includes("fli")) return "Finger Lakes Instruments";
    if (name.includes("sbig")) return "SBIG";
    if (name.includes("sx")) return "Starlight Express";
    if (name.includes("apogee")) return "Apogee";
    if (name.includes("moravian") || name.includes("mi"))
      return "Moravian Instruments";

    return "Generic";
  }

  private async saveLocalDatabase(): Promise<void> {
    try {
      const data = {
        database: this.database,
        lastUpdate: this.lastUpdate?.toISOString(),
        version: "1.0.0",
      };

      await fs.writeFile(this.databasePath, JSON.stringify(data, null, 2));
      console.log("💾 Base de données sauvegardée localement");
    } catch (error) {
      console.error(
        "❌ Erreur lors de la sauvegarde de la base de données:",
        error
      );
    }
  }

  private async loadDefaultDatabase(): Promise<void> {
    console.log("🔄 Chargement de la base de données par défaut...");
    this.database = await this.buildUsbMappings();
    this.lastUpdate = new Date();
    await this.saveLocalDatabase();
  }

  // Méthodes pour accéder à la base de données
  getDatabase(): EquipmentDatabase {
    return this.database;
  }

  getLastUpdate(): Date | null {
    return this.lastUpdate;
  }

  // Méthodes de recherche
  findEquipmentByUsbId(
    vendorId: string,
    productId: string
  ): EquipmentDatabase[string] | null {
    const usbKey = `${vendorId}:${productId}`.toLowerCase();
    return this.database[usbKey] || null;
  }

  findEquipmentByName(searchTerm: string): EquipmentDatabase[string][] {
    const lowerSearchTerm = searchTerm.toLowerCase();
    const results: EquipmentDatabase[string][] = [];

    for (const equipment of Object.values(this.database)) {
      // Recherche dans le nom
      if (equipment.name.toLowerCase().includes(lowerSearchTerm)) {
        results.push(equipment);
        continue;
      }

      // Recherche dans les alias
      if (
        equipment.aliases &&
        equipment.aliases.some((alias) =>
          alias.toLowerCase().includes(lowerSearchTerm)
        )
      ) {
        results.push(equipment);
        continue;
      }

      // Recherche dans le modèle
      if (equipment.model.toLowerCase().includes(lowerSearchTerm)) {
        results.push(equipment);
        continue;
      }

      // Recherche dans la description
      if (
        equipment.description &&
        equipment.description.toLowerCase().includes(lowerSearchTerm)
      ) {
        results.push(equipment);
        continue;
      }

      // Recherche dans le fabricant
      if (equipment.manufacturer.toLowerCase().includes(lowerSearchTerm)) {
        results.push(equipment);
        continue;
      }
    }

    // Trier par pertinence (nom exact en premier, puis nom partiel, etc.)
    return results.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase() === lowerSearchTerm;
      const bNameMatch = b.name.toLowerCase() === lowerSearchTerm;

      if (aNameMatch && !bNameMatch) return -1;
      if (!aNameMatch && bNameMatch) return 1;

      const aNameIncludes = a.name.toLowerCase().includes(lowerSearchTerm);
      const bNameIncludes = b.name.toLowerCase().includes(lowerSearchTerm);

      if (aNameIncludes && !bNameIncludes) return -1;
      if (!aNameIncludes && bNameIncludes) return 1;

      return 0;
    });
  }

  findEquipmentByType(type: string): EquipmentDatabase[string][] {
    return Object.values(this.database).filter(
      (equipment) => equipment.type === type
    );
  }

  findEquipmentByManufacturer(
    manufacturer: string
  ): EquipmentDatabase[string][] {
    const lowerManufacturer = manufacturer.toLowerCase();
    return Object.values(this.database).filter((equipment) =>
      equipment.manufacturer.toLowerCase().includes(lowerManufacturer)
    );
  }

  findEquipmentByDriver(driverName: string): EquipmentDatabase[string][] {
    return Object.values(this.database).filter(
      (equipment) => equipment.driverName === driverName
    );
  }

  // Méthode pour obtenir les statistiques de la base de données
  getDatabaseStats() {
    const stats = {
      totalEquipment: Object.keys(this.database).length,
      byType: {} as Record<string, number>,
      byManufacturer: {} as Record<string, number>,
      byDriver: {} as Record<string, number>,
      autoInstallableCount: 0,
      lastUpdate: this.lastUpdate,
    };

    Object.values(this.database).forEach((equipment) => {
      // Compter par type
      stats.byType[equipment.type] = (stats.byType[equipment.type] || 0) + 1;

      // Compter par fabricant
      stats.byManufacturer[equipment.manufacturer] =
        (stats.byManufacturer[equipment.manufacturer] || 0) + 1;

      // Compter par driver
      if (equipment.driverName) {
        stats.byDriver[equipment.driverName] =
          (stats.byDriver[equipment.driverName] || 0) + 1;
      }

      // Compter les auto-installables
      if (equipment.autoInstallable) {
        stats.autoInstallableCount++;
      }
    });

    return stats;
  }

  // Méthode pour forcer la mise à jour publique
  async forceUpdate(): Promise<void> {
    await this.updateFromRemote();
  }

  getStatistics(): {
    totalEquipment: number;
    byType: Record<string, number>;
    byManufacturer: Record<string, number>;
    lastUpdate: string | null;
  } {
    const byType: Record<string, number> = {};
    const byManufacturer: Record<string, number> = {};

    for (const equipment of Object.values(this.database)) {
      byType[equipment.type] = (byType[equipment.type] || 0) + 1;
      byManufacturer[equipment.manufacturer] =
        (byManufacturer[equipment.manufacturer] || 0) + 1;
    }

    return {
      totalEquipment: Object.keys(this.database).length,
      byType,
      byManufacturer,
      lastUpdate: this.lastUpdate?.toISOString() || null,
    };
  }

  // Méthodes pour la gestion des drivers

  private async checkInstalledDrivers(): Promise<void> {
    console.log("🔍 Vérification des drivers installés...");

    try {
      // Vérifier les drivers INDI installés
      const { stdout } = await exec("dpkg -l | grep indi- | awk '{print $2}'");
      const installedPackages = stdout
        .trim()
        .split("\n")
        .filter((pkg) => pkg.length > 0);

      this.installedDrivers.clear();
      installedPackages.forEach((pkg) => this.installedDrivers.add(pkg));

      console.log(`📦 ${this.installedDrivers.size} drivers INDI installés`);
    } catch (error) {
      console.warn("⚠️ Impossible de vérifier les drivers installés:", error);
    }
  }

  private async installEssentialDrivers(): Promise<void> {
    console.log("🚀 Installation des drivers essentiels...");

    const essentialDrivers = this.getEssentialDriversList();
    const driversToInstall = essentialDrivers.filter(
      (driver) => !this.installedDrivers.has(driver)
    );

    if (driversToInstall.length === 0) {
      console.log("✅ Tous les drivers essentiels sont déjà installés");
      return;
    }

    console.log(
      `📦 Installation de ${driversToInstall.length} drivers essentiels...`
    );

    // Installer les drivers par groupes pour éviter les conflits
    const driverGroups = this.groupDriversByDependency(driversToInstall);

    for (const group of driverGroups) {
      await this.installDriverGroup(group);
    }
  }

  private getEssentialDriversList(): string[] {
    // Liste des drivers les plus couramment utilisés
    return [
      // Cameras populaires
      "indi-asi", // ZWO ASI Cameras
      "indi-qhy", // QHY Cameras
      "indi-gphoto", // DSLR Support
      "indi-playerone", // Player One Cameras
      "indi-svbony", // SVBONY Cameras
      "indi-toupbase", // ToupTek family

      // Montures populaires
      "indi-eqmod", // EQMod (Sky-Watcher, etc.)
      "indi-celestronaux", // Celestron Mounts
      "indi-ioptron", // iOptron Mounts

      // Focusers
      "indi-asi-power", // ASI Power/Focus
      "indi-moonlite", // Moonlite Focuser

      // Accessoires
      "indi-gpsd", // GPS Support
      "indi-aagcloudwatcher-ng", // Cloud Watcher

      // Librairies essentielles
      "libasi", // ASI Library
      "libqhy", // QHY Library
      "libplayerone", // Player One Library
      "libsvbony", // SVBONY Library
      "libtoupcam", // ToupTek Library
    ];
  }

  private groupDriversByDependency(drivers: string[]): string[][] {
    const groups: string[][] = [];
    const libs: string[] = [];
    const driverPackages: string[] = [];

    // Séparer les librairies des drivers
    drivers.forEach((driver) => {
      if (driver.startsWith("lib")) {
        libs.push(driver);
      } else {
        driverPackages.push(driver);
      }
    });

    // Installer les librairies en premier
    if (libs.length > 0) {
      groups.push(libs);
    }

    // Puis les drivers par groupes logiques
    const cameraDrivers = driverPackages.filter(
      (d) =>
        d.includes("asi") ||
        d.includes("qhy") ||
        d.includes("gphoto") ||
        d.includes("playerone") ||
        d.includes("svbony") ||
        d.includes("toupbase")
    );

    const mountDrivers = driverPackages.filter(
      (d) =>
        d.includes("eqmod") || d.includes("celestron") || d.includes("ioptron")
    );

    const otherDrivers = driverPackages.filter(
      (d) => !cameraDrivers.includes(d) && !mountDrivers.includes(d)
    );

    if (cameraDrivers.length > 0) groups.push(cameraDrivers);
    if (mountDrivers.length > 0) groups.push(mountDrivers);
    if (otherDrivers.length > 0) groups.push(otherDrivers);

    return groups;
  }

  private async installDriverGroup(drivers: string[]): Promise<void> {
    if (drivers.length === 0) return;

    const driverList = drivers.join(" ");
    console.log(`📦 Installation du groupe: ${driverList}`);

    try {
      // Mettre à jour la liste des paquets
      await exec("sudo apt-get update");

      // Installer les drivers
      const installCommand = `sudo apt-get install -y ${driverList}`;
      console.log(`🔧 Commande: ${installCommand}`);

      const { stdout, stderr } = await exec(installCommand);

      if (stderr && !stderr.includes("Reading package lists")) {
        console.warn(`⚠️ Warnings lors de l'installation:`, stderr);
      }

      // Marquer les drivers comme installés
      drivers.forEach((driver) => this.installedDrivers.add(driver));

      console.log(`✅ Groupe installé avec succès: ${driverList}`);
    } catch (error: any) {
      console.error(
        `❌ Erreur lors de l'installation du groupe ${driverList}:`,
        error.message
      );

      // Essayer d'installer individuellement en cas d'échec
      for (const driver of drivers) {
        try {
          await exec(`sudo apt-get install -y ${driver}`);
          this.installedDrivers.add(driver);
          console.log(`✅ Driver installé individuellement: ${driver}`);
        } catch (individualError) {
          console.warn(`⚠️ Impossible d'installer ${driver}:`, individualError);
        }
      }
    }
  }

  // Méthode publique pour installer un driver spécifique
  async installDriver(driverName: string): Promise<boolean> {
    console.log(`📦 Installation du driver: ${driverName}`);

    if (this.installedDrivers.has(driverName)) {
      console.log(`✅ Driver ${driverName} déjà installé`);
      return true;
    }

    try {
      await exec("sudo apt-get update");
      await exec(`sudo apt-get install -y ${driverName}`);

      this.installedDrivers.add(driverName);
      console.log(`✅ Driver ${driverName} installé avec succès`);
      return true;
    } catch (error) {
      console.error(
        `❌ Erreur lors de l'installation de ${driverName}:`,
        error
      );
      return false;
    }
  }

  // Méthode publique pour installer les drivers requis pour un équipement
  async installDriversForEquipment(equipmentName: string): Promise<boolean> {
    const equipment = this.findEquipmentByName(equipmentName);

    if (equipment.length === 0) {
      console.warn(`⚠️ Équipement non trouvé: ${equipmentName}`);
      return false;
    }

    const driversToInstall = new Set<string>();

    // Collecter tous les drivers nécessaires
    equipment.forEach((eq) => {
      if (eq.packageName) {
        driversToInstall.add(eq.packageName);
      }
      if (eq.driverName && eq.driverName !== eq.packageName) {
        driversToInstall.add(eq.driverName);
      }
    });

    console.log(
      `📦 Installation des drivers pour ${equipmentName}:`,
      Array.from(driversToInstall)
    );

    let allInstalled = true;

    for (const driver of driversToInstall) {
      const installed = await this.installDriver(driver);
      if (!installed) {
        allInstalled = false;
      }
    }

    return allInstalled;
  }

  // Méthode pour obtenir la liste des drivers disponibles
  getAvailableDrivers(): string[] {
    return Array.from(this.availableDrivers);
  }

  // Méthode pour obtenir la liste des drivers installés
  getInstalledDrivers(): string[] {
    return Array.from(this.installedDrivers);
  }

  // Méthode pour vérifier si un driver est installé
  isDriverInstalled(driverName: string): boolean {
    return this.installedDrivers.has(driverName);
  }

  // Méthode pour obtenir le statut complet des drivers
  getDriverStatus(): {
    available: number;
    installed: number;
    essential: string[];
    recommendations: string[];
    categories: Record<string, string[]>;
  } {
    const essentialDrivers = this.getEssentialDriversList();
    const availableDrivers = Array.from(this.availableDrivers);
    const installedDrivers = Array.from(this.installedDrivers);

    // Recommandations basées sur l'équipement détecté
    const recommendations = this.getDriverRecommendations();

    // Catégoriser les drivers disponibles
    const categories: Record<string, string[]> = {
      cameras: [],
      mounts: [],
      focusers: [],
      domes: [],
      weather: [],
      auxiliary: [],
      libraries: [],
    };

    availableDrivers.forEach((driver) => {
      if (driver.startsWith("lib")) {
        categories.libraries.push(driver);
      } else {
        const category = this.categorizeDriver(driver);
        switch (category) {
          case "ccd":
            categories.cameras.push(driver);
            break;
          case "telescope":
            categories.mounts.push(driver);
            break;
          case "focuser":
            categories.focusers.push(driver);
            break;
          case "dome":
            categories.domes.push(driver);
            break;
          case "weather":
            categories.weather.push(driver);
            break;
          default:
            categories.auxiliary.push(driver);
        }
      }
    });

    return {
      available: availableDrivers.length,
      installed: installedDrivers.length,
      essential: essentialDrivers,
      recommendations,
      categories,
    };
  }

  private getDriverRecommendations(): string[] {
    const recommendations: string[] = [];

    // Analyser l'équipement dans la base de données pour recommander des drivers
    const equipmentTypes = new Set<string>();
    Object.values(this.database).forEach((eq) => {
      equipmentTypes.add(eq.type);
    });

    // Recommandations basées sur les types d'équipement
    if (equipmentTypes.has("camera")) {
      recommendations.push("indi-asi", "indi-qhy", "indi-gphoto");
    }
    if (equipmentTypes.has("mount")) {
      recommendations.push("indi-eqmod", "indi-celestronaux");
    }
    if (equipmentTypes.has("focuser")) {
      recommendations.push("indi-asi-power", "indi-moonlite");
    }

    return recommendations.filter(
      (driver) => !this.installedDrivers.has(driver)
    );
  }

  // Méthode pour installer tous les drivers recommandés
  async installRecommendedDrivers(): Promise<{
    success: string[];
    failed: string[];
  }> {
    const recommendations = this.getDriverRecommendations();
    const success: string[] = [];
    const failed: string[] = [];

    console.log(
      `📦 Installation des drivers recommandés: ${recommendations.join(", ")}`
    );

    for (const driver of recommendations) {
      const installed = await this.installDriver(driver);
      if (installed) {
        success.push(driver);
      } else {
        failed.push(driver);
      }
    }

    return { success, failed };
  }

  // Méthode pour nettoyer les drivers inutilisés
  async cleanupUnusedDrivers(): Promise<string[]> {
    const installedDrivers = Array.from(this.installedDrivers);
    const usedDrivers = new Set<string>();

    // Identifier les drivers utilisés dans la base de données
    Object.values(this.database).forEach((eq) => {
      if (eq.packageName) usedDrivers.add(eq.packageName);
      if (eq.driverName) usedDrivers.add(eq.driverName);
    });

    // Toujours conserver les drivers essentiels
    const essentialDrivers = this.getEssentialDriversList();
    essentialDrivers.forEach((driver) => usedDrivers.add(driver));

    const unusedDrivers = installedDrivers.filter(
      (driver) => !usedDrivers.has(driver)
    );

    console.log(`🧹 Drivers inutilisés trouvés: ${unusedDrivers.join(", ")}`);

    // Pour l'instant, on ne fait que retourner la liste sans désinstaller automatiquement
    // La désinstallation automatique pourrait être dangereuse
    return unusedDrivers;
  }

  // Méthode pour vérifier les mises à jour des drivers
  async checkDriverUpdates(): Promise<{
    hasUpdates: boolean;
    updatable: string[];
  }> {
    console.log("🔄 Vérification des mises à jour des drivers...");

    try {
      // Vérifier les mises à jour disponibles
      const { stdout } = await exec("apt list --upgradable | grep indi-");
      const updatableDrivers = stdout
        .split("\n")
        .filter((line) => line.includes("indi-"))
        .map((line) => line.split("/")[0])
        .filter((driver) => driver.length > 0);

      return {
        hasUpdates: updatableDrivers.length > 0,
        updatable: updatableDrivers,
      };
    } catch (error) {
      console.warn("⚠️ Impossible de vérifier les mises à jour:", error);
      return { hasUpdates: false, updatable: [] };
    }
  }

  // Méthode pour mettre à jour tous les drivers
  async updateAllDrivers(): Promise<{
    success: boolean;
    updated: string[];
    errors: string[];
  }> {
    console.log("🔄 Mise à jour de tous les drivers INDI...");

    try {
      // Mettre à jour la liste des paquets
      await exec("sudo apt-get update");

      // Mettre à jour tous les paquets INDI
      const { stdout, stderr } = await exec("sudo apt-get upgrade -y indi-*");

      // Analyser le résultat
      const updated = stdout
        .split("\n")
        .filter((line) => line.includes("indi-") && line.includes("upgraded"))
        .map((line) => line.match(/indi-[^\s]+/)?.[0])
        .filter(Boolean) as string[];

      console.log(
        `✅ Mise à jour terminée: ${updated.length} drivers mis à jour`
      );

      return {
        success: true,
        updated,
        errors: stderr ? [stderr] : [],
      };
    } catch (error: any) {
      console.error("❌ Erreur lors de la mise à jour:", error.message);
      return {
        success: false,
        updated: [],
        errors: [error.message],
      };
    }
  }
}

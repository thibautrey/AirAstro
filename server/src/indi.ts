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
}

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

  async getInstalledDrivers(): Promise<string[]> {
    const found = new Set<string>();
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
    return Array.from(found).sort();
  }

  private async findDriverPath(name: string): Promise<string> {
    if (path.isAbsolute(name)) {
      return name;
    }
    for (const dir of this.searchDirs) {
      const full = path.join(dir, name);
      try {
        await fs.access(full);
        return full;
      } catch {
        // try next
      }
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

        const tokens = desc
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((t) => t.length >= 3);
        const matchingDrivers = installed.filter((d) => {
          const dl = d.toLowerCase();
          return tokens.some((t) => dl.includes(t));
        });

        devices.push({
          bus,
          device,
          id,
          vendorId,
          productId,
          description: desc,
          matchingDrivers,
          manufacturer: detailedInfo.manufacturer,
          product: detailedInfo.product,
        });
      }

      return devices;
    } catch (error) {
      console.error("Erreur lors de la liste des appareils USB:", error);
      return [];
    }
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
}

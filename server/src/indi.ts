import { promises as fs } from 'fs';
import { spawn, ChildProcess, exec as execCallback } from 'child_process';
import path from 'path';
import { promisify } from 'util';

const exec = promisify(execCallback);

export class DriverManager {
  private searchDirs: string[];
  private running: Map<string, ChildProcess> = new Map();
  private availableCache?: { names: string[]; timestamp: number };

  constructor() {
    this.searchDirs = [
      '/usr/local/bin',
      '/usr/bin',
      '/usr/local/lib/indi',
      '/usr/lib/indi'
    ];
  }

  private async fetchDriverNamesFromGitHub(repo: string): Promise<string[]> {
    const url = `https://api.github.com/repos/${repo}/git/trees/master?recursive=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AirAstro-Server' } });
    if (!res.ok) {
      throw new Error(`GitHub API responded with ${res.status}`);
    }
    const data = (await res.json()) as { tree: { path: string; type: string }[] };
    const names = new Set<string>();
    for (const item of data.tree) {
      if (item.type === 'blob' && item.path.startsWith('drivers/') && item.path.endsWith('CMakeLists.txt')) {
        const parts = item.path.split('/');
        if (parts.length >= 3) {
          names.add(parts[parts.length - 2]);
        }
      }
    }
    return Array.from(names);
  }

  async getAvailableDrivers(): Promise<string[]> {
    const cacheDuration = 60 * 60 * 1000; // 1 hour
    if (this.availableCache && Date.now() - this.availableCache.timestamp < cacheDuration) {
      return this.availableCache.names;
    }
    const repos = ['indilib/indi', 'indilib/indi-3rdparty'];
    const lists = await Promise.all(repos.map(r => this.fetchDriverNamesFromGitHub(r)));
    const names = Array.from(new Set(lists.flat())).sort();
    this.availableCache = { names, timestamp: Date.now() };
    return names;
  }

  async searchDrivers(query: string): Promise<string[]> {
    const lower = query.toLowerCase();
    const names = await this.getAvailableDrivers();
    return names.filter(n => n.toLowerCase().includes(lower));
  }

  async installDriver(packageName: string): Promise<void> {
    await exec(`sudo apt-get update`);
    await exec(`sudo apt-get install -y ${packageName}`);
  }

  async getInstalledDrivers(): Promise<string[]> {
    const found = new Set<string>();
    for (const dir of this.searchDirs) {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) {
          if (file.startsWith('indi_')) {
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
    return '';
  }

  async startDriver(name: string): Promise<void> {
    if (this.running.has(name)) return;
    const driverPath = await this.findDriverPath(name);
    if (!driverPath) {
      throw new Error(`Driver ${name} not found`);
    }
    const child = spawn(driverPath, [], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.on('exit', () => {
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
}

import { promises as fs } from "fs";
import path from "path";

export interface MountPosition {
  ra: number;
  dec: number;
}

export interface MountState {
  selectedMount?: string;
  lastPosition?: MountPosition;
  savedAt: string;
}

export class MountStateService {
  private stateFile: string;
  private state: MountState;

  constructor() {
    this.stateFile = path.join(process.cwd(), "data", "mount-state.json");
    this.state = { savedAt: new Date().toISOString() };
    this.loadState();
  }

  private async ensureDataDirectory(): Promise<void> {
    const dir = path.dirname(this.stateFile);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  private async loadState(): Promise<void> {
    try {
      const data = await fs.readFile(this.stateFile, "utf8");
      const saved = JSON.parse(data) as MountState;
      this.state = { ...this.state, ...saved };
    } catch {
      await this.saveState();
    }
  }

  private async saveState(): Promise<void> {
    await this.ensureDataDirectory();
    this.state.savedAt = new Date().toISOString();
    await fs.writeFile(this.stateFile, JSON.stringify(this.state, null, 2));
  }

  getState(): MountState {
    return { ...this.state };
  }

  async updateSelectedMount(id: string): Promise<void> {
    this.state.selectedMount = id;
    await this.saveState();
  }

  async clearSelectedMount(): Promise<void> {
    delete this.state.selectedMount;
    await this.saveState();
  }

  async updatePosition(pos: MountPosition): Promise<void> {
    this.state.lastPosition = pos;
    await this.saveState();
  }
}

export const mountStateService = new MountStateService();

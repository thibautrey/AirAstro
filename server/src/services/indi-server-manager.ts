import { ChildProcess, exec as execCallback, spawn } from "child_process";

import { DriverManager } from "../indi";
import { EventEmitter } from "events";
import { promisify } from "util";

const exec = promisify(execCallback);

export interface IndiServerConfig {
  host?: string;
  port?: number;
  enableVerbose?: boolean;
  enableFifo?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}

export interface IndiServerStatus {
  running: boolean;
  pid?: number;
  uptime?: number;
  loadedDrivers: string[];
  connectedClients: number;
}

export class IndiServerManager extends EventEmitter {
  private config: Required<IndiServerConfig>;
  private driverManager: DriverManager;
  private serverProcess?: ChildProcess;
  private currentDrivers: string[] = [];
  private startTime?: number;
  private retryCount = 0;
  private isRestarting = false;

  constructor(driverManager: DriverManager, config: IndiServerConfig = {}) {
    super();
    this.driverManager = driverManager;
    this.config = {
      host: config.host || "localhost",
      port: config.port || 7624,
      enableVerbose: config.enableVerbose !== false,
      enableFifo: config.enableFifo || false,
      maxRetries: config.maxRetries || 3,
      retryDelay: config.retryDelay || 5000,
    };
  }

  /**
   * Démarrer le serveur INDI avec les drivers spécifiés
   */
  async start(drivers: string[] = []): Promise<void> {
    if (this.serverProcess && !this.serverProcess.killed) {
      console.log("🔄 Serveur INDI déjà en cours d'exécution, redémarrage...");
      await this.restart(drivers);
      return;
    }

    console.log("🚀 Démarrage du serveur INDI...");

    try {
      // Résoudre les chemins complets des drivers
      const driverPaths = await this.resolveDriverPaths(drivers);

      if (driverPaths.length === 0) {
        console.warn(
          "⚠️ Aucun driver valide trouvé, démarrage du serveur sans drivers"
        );
      } else {
        console.log(`📦 Drivers à charger: ${driverPaths.join(", ")}`);
      }

      // Construire les arguments pour indiserver
      const args = this.buildIndiServerArgs(driverPaths);

      // Démarrer le processus indiserver
      this.serverProcess = spawn("indiserver", args, {
        stdio: ["ignore", "pipe", "pipe"],
        detached: false,
      });

      // Configurer les gestionnaires d'événements
      this.setupProcessHandlers();

      // Attendre un peu pour s'assurer que le serveur démarre
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Vérifier si le serveur est bien démarré
      const isRunning = await this.isServerRunning();
      if (!isRunning) {
        throw new Error("Le serveur INDI n'a pas pu démarrer");
      }

      this.currentDrivers = drivers;
      this.startTime = Date.now();
      this.retryCount = 0;

      console.log(
        `✅ Serveur INDI démarré avec succès (PID: ${this.serverProcess.pid})`
      );
      this.emit("serverStarted", { drivers: this.currentDrivers });
    } catch (error) {
      console.error("❌ Erreur lors du démarrage du serveur INDI:", error);
      this.emit("serverError", error);
      throw error;
    }
  }

  /**
   * Arrêter le serveur INDI
   */
  async stop(): Promise<void> {
    if (!this.serverProcess || this.serverProcess.killed) {
      console.log("ℹ️ Serveur INDI déjà arrêté");
      return;
    }

    console.log("🛑 Arrêt du serveur INDI...");

    try {
      // Envoyer SIGTERM au processus
      this.serverProcess.kill("SIGTERM");

      // Attendre que le processus se termine
      await new Promise((resolve) => {
        if (!this.serverProcess) {
          resolve(undefined);
          return;
        }

        const timeout = setTimeout(() => {
          // Forcer l'arrêt avec SIGKILL si SIGTERM ne fonctionne pas
          if (this.serverProcess && !this.serverProcess.killed) {
            console.warn("⚠️ Arrêt forcé du serveur INDI (SIGKILL)");
            this.serverProcess.kill("SIGKILL");
          }
          resolve(undefined);
        }, 5000);

        this.serverProcess.on("exit", () => {
          clearTimeout(timeout);
          resolve(undefined);
        });
      });

      this.serverProcess = undefined;
      this.currentDrivers = [];
      this.startTime = undefined;

      console.log("✅ Serveur INDI arrêté");
      this.emit("serverStopped");
    } catch (error) {
      console.error("❌ Erreur lors de l'arrêt du serveur INDI:", error);
      this.emit("serverError", error);
      throw error;
    }
  }

  /**
   * Redémarrer le serveur INDI avec de nouveaux drivers
   */
  async restart(drivers: string[] = []): Promise<void> {
    if (this.isRestarting) {
      console.log("🔄 Redémarrage déjà en cours...");
      return;
    }

    this.isRestarting = true;
    console.log("🔄 Redémarrage du serveur INDI...");

    try {
      await this.stop();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await this.start(drivers);

      console.log("✅ Serveur INDI redémarré avec succès");
      this.emit("serverRestarted", { drivers: this.currentDrivers });
    } catch (error) {
      console.error("❌ Erreur lors du redémarrage du serveur INDI:", error);
      this.emit("serverError", error);
      throw error;
    } finally {
      this.isRestarting = false;
    }
  }

  /**
   * Obtenir le statut du serveur INDI
   */
  async getStatus(): Promise<IndiServerStatus> {
    const running = await this.isServerRunning();
    const uptime = this.startTime ? Date.now() - this.startTime : undefined;
    const connectedClients = await this.getConnectedClientsCount();

    return {
      running,
      pid: this.serverProcess?.pid,
      uptime,
      loadedDrivers: [...this.currentDrivers],
      connectedClients,
    };
  }

  /**
   * Vérifier si le serveur INDI est en cours d'exécution
   */
  private async isServerRunning(): Promise<boolean> {
    try {
      // Vérifier si le processus est vivant
      if (this.serverProcess && !this.serverProcess.killed) {
        // Vérifier si le port est ouvert
        const { stdout } = await exec(
          `netstat -tlnp | grep :${this.config.port} || true`
        );
        return stdout.trim().length > 0;
      }
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Obtenir le nombre de clients connectés
   */
  private async getConnectedClientsCount(): Promise<number> {
    try {
      const { stdout } = await exec(
        `netstat -tn | grep :${this.config.port} | grep ESTABLISHED | wc -l`
      );
      return parseInt(stdout.trim()) || 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Construire les arguments pour indiserver
   */
  private buildIndiServerArgs(driverPaths: string[]): string[] {
    const args: string[] = [];

    // Port
    args.push("-p", this.config.port.toString());

    // Verbose
    if (this.config.enableVerbose) {
      args.push("-v");
    }

    // FIFO
    if (this.config.enableFifo) {
      args.push("-f", "/tmp/indiFIFO");
    }

    // Drivers
    args.push(...driverPaths);

    return args;
  }

  /**
   * Résoudre les chemins complets des drivers
   */
  private async resolveDriverPaths(drivers: string[]): Promise<string[]> {
    const paths: string[] = [];
    const searchDirs = [
      "/usr/local/bin",
      "/usr/bin",
      "/usr/local/lib/indi",
      "/usr/lib/indi",
      "/opt/indi/bin",
      "/usr/lib/x86_64-linux-gnu/indi",
      "/usr/lib/aarch64-linux-gnu/indi",
      "/usr/lib/arm-linux-gnueabihf/indi",
    ];

    for (const driver of drivers) {
      // Si c'est déjà un chemin absolu, l'utiliser directement
      if (driver.startsWith("/")) {
        try {
          await exec(`test -f "${driver}" && test -x "${driver}"`);
          paths.push(driver);
          continue;
        } catch (error) {
          console.warn(`⚠️ Driver ${driver} introuvable ou non exécutable`);
          continue;
        }
      }

      // Chercher dans les répertoires standards
      let found = false;
      for (const dir of searchDirs) {
        const fullPath = `${dir}/${driver}`;
        try {
          await exec(`test -f "${fullPath}" && test -x "${fullPath}"`);
          paths.push(fullPath);
          found = true;
          break;
        } catch (error) {
          // Continuer la recherche
        }
      }

      if (!found) {
        console.warn(
          `⚠️ Driver ${driver} introuvable dans les répertoires standards`
        );
      }
    }

    return paths;
  }

  /**
   * Configurer les gestionnaires d'événements du processus
   */
  private setupProcessHandlers(): void {
    if (!this.serverProcess) return;

    this.serverProcess.on("exit", (code, signal) => {
      console.log(`🔄 Serveur INDI terminé (code: ${code}, signal: ${signal})`);
      this.emit("serverExit", { code, signal });

      // Tentative de redémarrage automatique si inattendu
      if (
        code !== 0 &&
        !this.isRestarting &&
        this.retryCount < this.config.maxRetries
      ) {
        console.log(
          `🔄 Tentative de redémarrage automatique (${this.retryCount + 1}/${
            this.config.maxRetries
          })`
        );
        this.retryCount++;

        setTimeout(async () => {
          try {
            await this.start(this.currentDrivers);
          } catch (error) {
            console.error("❌ Échec du redémarrage automatique:", error);
          }
        }, this.config.retryDelay);
      }
    });

    this.serverProcess.on("error", (error) => {
      console.error("❌ Erreur du processus serveur INDI:", error);
      this.emit("serverError", error);
    });

    // Capturer les logs du serveur
    if (this.serverProcess.stdout) {
      this.serverProcess.stdout.on("data", (data) => {
        const log = data.toString().trim();
        if (log) {
          console.log(`[INDI] ${log}`);
          this.emit("serverLog", { type: "stdout", message: log });
        }
      });
    }

    if (this.serverProcess.stderr) {
      this.serverProcess.stderr.on("data", (data) => {
        const log = data.toString().trim();
        if (log) {
          console.error(`[INDI ERROR] ${log}`);
          this.emit("serverLog", { type: "stderr", message: log });
        }
      });
    }
  }

  /**
   * Ajouter un driver au serveur en cours d'exécution
   */
  async addDriver(driver: string): Promise<void> {
    if (!this.currentDrivers.includes(driver)) {
      const newDrivers = [...this.currentDrivers, driver];
      await this.restart(newDrivers);
    }
  }

  /**
   * Supprimer un driver du serveur en cours d'exécution
   */
  async removeDriver(driver: string): Promise<void> {
    const newDrivers = this.currentDrivers.filter((d) => d !== driver);
    if (newDrivers.length !== this.currentDrivers.length) {
      await this.restart(newDrivers);
    }
  }

  /**
   * Obtenir la liste des drivers actuellement chargés
   */
  getCurrentDrivers(): string[] {
    return [...this.currentDrivers];
  }

  /**
   * Vérifier si un driver est actuellement chargé
   */
  isDriverLoaded(driver: string): boolean {
    return this.currentDrivers.includes(driver);
  }

  /**
   * Obtenir les logs récents du serveur
   */
  async getRecentLogs(lines: number = 50): Promise<string[]> {
    try {
      const { stdout } = await exec(
        `journalctl -n ${lines} -u indiserver || echo "Pas de logs systemd disponibles"`
      );
      return stdout
        .trim()
        .split("\n")
        .filter((line) => line.trim());
    } catch (error) {
      return [`Erreur lors de la récupération des logs: ${error}`];
    }
  }

  /**
   * Nettoyer les ressources
   */
  async cleanup(): Promise<void> {
    console.log("🧹 Nettoyage des ressources du serveur INDI...");

    try {
      if (this.serverProcess && !this.serverProcess.killed) {
        await this.stop();
      }

      // Nettoyer les fichiers temporaires
      await exec("rm -f /tmp/indiFIFO* || true");

      console.log("✅ Nettoyage terminé");
    } catch (error) {
      console.error("❌ Erreur lors du nettoyage:", error);
    }
  }
}

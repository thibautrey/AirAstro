import {
  IndiCamera,
  IndiFilterWheel,
  IndiFocuser,
  IndiMount,
} from "./indi-devices";

import { IndiClient } from "./indi-client";

/**
 * Exemple d'utilisation du client INDI robuste
 *
 * Cette classe montre comment :
 * 1. Se connecter au serveur INDI
 * 2. Gérer les reconnexions automatiques
 * 3. Utiliser les classes de haut niveau pour les appareils
 * 4. Effectuer des séquences d'observation complexes
 */
export class IndiController {
  public client: IndiClient;
  private camera?: IndiCamera;
  private mount?: IndiMount;
  private focuser?: IndiFocuser;
  private filterWheel?: IndiFilterWheel;

  constructor(host: string = "localhost", port: number = 7624) {
    this.client = new IndiClient(host, port);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    // Gestion des connexions
    this.client.on("connected", () => {
      console.log("✅ Connecté au serveur INDI");
    });

    this.client.on("disconnected", () => {
      console.log("❌ Déconnecté du serveur INDI");
    });

    this.client.on("error", (error) => {
      console.error("🔥 Erreur INDI:", error);
    });

    // Gestion des appareils
    this.client.on("propertyDefined", (device, property, prop) => {
      console.log(`📡 Appareil détecté: ${device}.${property}`);

      // Auto-initialisation des appareils basés sur leurs propriétés
      if (property === "CONNECTION") {
        this.initializeDevice(device);
      }
    });

    this.client.on("propertyUpdated", (device, property, prop) => {
      console.log(`🔄 Mise à jour: ${device}.${property} = ${prop.state}`);

      // Log des messages importants
      if (property === "CCD_EXPOSURE" && prop.state === "Ok") {
        console.log(`📸 Exposition terminée pour ${device}`);
      }
    });

    this.client.on("message", (device, message, timestamp) => {
      console.log(`💬 [${device}] ${message}`);
    });
  }

  private initializeDevice(deviceName: string): void {
    // Détection automatique du type d'appareil basé sur les propriétés communes
    setTimeout(() => {
      const device = this.client.getDevice(deviceName);
      if (!device) return;

      const properties = Array.from(device.properties.keys());

      if (properties.includes("CCD_EXPOSURE")) {
        this.camera = new IndiCamera(this.client, deviceName);
        console.log(`📹 Caméra initialisée: ${deviceName}`);
      }

      if (properties.includes("EQUATORIAL_EOD_COORD")) {
        this.mount = new IndiMount(this.client, deviceName);
        console.log(`🔭 Monture initialisée: ${deviceName}`);
      }

      if (properties.includes("ABS_FOCUS_POSITION")) {
        this.focuser = new IndiFocuser(this.client, deviceName);
        console.log(`🎯 Focuser initialisé: ${deviceName}`);
      }

      if (properties.includes("FILTER_SLOT")) {
        this.filterWheel = new IndiFilterWheel(this.client, deviceName);
        console.log(`🎨 Roue à filtres initialisée: ${deviceName}`);
      }
    }, 1000); // Délai pour permettre à toutes les propriétés d'être définies
  }

  async connect(): Promise<void> {
    await this.client.connect();

    // Attendre que les appareils soient détectés
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  async disconnect(): Promise<void> {
    this.client.disconnect();
  }

  // Méthodes de haut niveau pour les opérations courantes
  async connectAllDevices(): Promise<void> {
    const devices = [this.camera, this.mount, this.focuser, this.filterWheel];

    for (const device of devices) {
      if (device) {
        try {
          const isConnected = await device.isConnected();
          if (!isConnected) {
            console.log(`🔌 Connexion de ${device.constructor.name}...`);
            await device.connect();
          }
        } catch (error) {
          console.error(
            `❌ Erreur lors de la connexion de ${device.constructor.name}:`,
            error
          );
        }
      }
    }
  }

  async takeExposure(duration: number, filter?: number): Promise<void> {
    if (!this.camera) {
      throw new Error("Aucune caméra disponible");
    }

    try {
      // Changer de filtre si spécifié
      if (filter !== undefined && this.filterWheel) {
        console.log(`🎨 Changement vers le filtre ${filter}`);
        await this.filterWheel.setFilter(filter);
      }

      // Activer les BLOBs pour recevoir les images
      await this.camera.enableBLOB();

      // Démarrer l'exposition
      console.log(`📸 Début de l'exposition de ${duration}s`);
      await this.camera.startExposure(duration);

      console.log(`✅ Exposition terminée`);
    } catch (error) {
      console.error("❌ Erreur lors de l'exposition:", error);
      throw error;
    }
  }

  async slewToTarget(ra: number, dec: number): Promise<void> {
    if (!this.mount) {
      throw new Error("Aucune monture disponible");
    }

    try {
      console.log(`🎯 Pointage vers RA=${ra}, DEC=${dec}`);
      await this.mount.slewToCoord(ra, dec);
      console.log(`✅ Pointage terminé`);
    } catch (error) {
      console.error("❌ Erreur lors du pointage:", error);
      throw error;
    }
  }

  async autoFocus(): Promise<void> {
    if (!this.focuser || !this.camera) {
      throw new Error("Focuser et caméra requis pour l'autofocus");
    }

    try {
      console.log(`🎯 Début de l'autofocus`);

      // Algorithme d'autofocus simple
      const initialPosition = await this.focuser.getCurrentPosition();
      let bestPosition = initialPosition;
      let bestScore = 0;

      // Test plusieurs positions
      for (let offset = -50; offset <= 50; offset += 10) {
        const position = initialPosition + offset;
        await this.focuser.moveAbsolute(position);

        // Prendre une image test
        await this.camera.startExposure(1);

        // Ici, vous devriez analyser l'image pour calculer un score de netteté
        // Pour cet exemple, on utilise un score simulé
        const score = Math.random() * 100;

        if (score > bestScore) {
          bestScore = score;
          bestPosition = position;
        }
      }

      // Aller à la meilleure position
      await this.focuser.moveAbsolute(bestPosition);
      console.log(`✅ Autofocus terminé, position optimale: ${bestPosition}`);
    } catch (error) {
      console.error("❌ Erreur lors de l'autofocus:", error);
      throw error;
    }
  }

  async runImagingSequence(
    targets: Array<{
      ra: number;
      dec: number;
      exposures: Array<{ duration: number; filter: number; count: number }>;
    }>
  ): Promise<void> {
    console.log(
      `🚀 Début de la séquence d'imagerie avec ${targets.length} cibles`
    );

    try {
      // Connecter tous les appareils
      await this.connectAllDevices();

      // Démarrer le suivi si une monture est disponible
      if (this.mount) {
        await this.mount.startTracking();
      }

      for (const [targetIndex, target] of targets.entries()) {
        console.log(
          `🎯 Cible ${targetIndex + 1}/${targets.length}: RA=${
            target.ra
          }, DEC=${target.dec}`
        );

        // Pointer vers la cible
        if (this.mount) {
          await this.slewToTarget(target.ra, target.dec);
        }

        // Autofocus
        await this.autoFocus();

        // Prendre les expositions
        for (const exposure of target.exposures) {
          for (let i = 0; i < exposure.count; i++) {
            console.log(
              `📸 Exposition ${i + 1}/${exposure.count} (${
                exposure.duration
              }s, filtre ${exposure.filter})`
            );
            await this.takeExposure(exposure.duration, exposure.filter);
          }
        }
      }

      console.log(`✅ Séquence d'imagerie terminée`);
    } catch (error) {
      console.error("❌ Erreur lors de la séquence d'imagerie:", error);
      throw error;
    }
  }

  // Méthodes utilitaires
  getDeviceStatus(): any {
    return {
      devices: this.client.getDevices(),
      camera: this.camera ? "connected" : "not available",
      mount: this.mount ? "connected" : "not available",
      focuser: this.focuser ? "connected" : "not available",
      filterWheel: this.filterWheel ? "connected" : "not available",
    };
  }
}

// Exemple d'utilisation
export async function exampleUsage(): Promise<void> {
  const controller = new IndiController("localhost", 7624);

  try {
    await controller.connect();

    // Exemple de séquence d'imagerie
    const targets = [
      {
        ra: 5.5, // Orion
        dec: -5.4,
        exposures: [
          { duration: 300, filter: 1, count: 5 }, // 5 x 5min en luminance
          { duration: 180, filter: 2, count: 3 }, // 3 x 3min en rouge
          { duration: 180, filter: 3, count: 3 }, // 3 x 3min en vert
          { duration: 180, filter: 4, count: 3 }, // 3 x 3min en bleu
        ],
      },
    ];

    await controller.runImagingSequence(targets);
  } catch (error) {
    console.error("Erreur:", error);
  } finally {
    await controller.disconnect();
  }
}

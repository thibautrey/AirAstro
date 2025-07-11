import { promises as fs } from "fs";
import path from "path";

export interface EquipmentContext {
  selectedMount?: string;
  selectedMainCamera?: string;
  selectedGuideCamera?: string;
  selectedFocuser?: string;
  selectedFilterWheel?: string;
  mainFocalLength?: number;
  guideFocalLength?: number;
  lastUpdated?: Date;
}

export class EquipmentContextService {
  private context: EquipmentContext;
  private contextFilePath: string;

  constructor() {
    this.context = {
      mainFocalLength: 1000,
      guideFocalLength: 240,
    };

    this.contextFilePath = path.join(
      __dirname,
      "../../config/equipment-context.json"
    );
    this.loadContext();
  }

  /**
   * Charger le contexte depuis le fichier
   */
  private async loadContext(): Promise<void> {
    try {
      const data = await fs.readFile(this.contextFilePath, "utf8");
      const loadedContext = JSON.parse(data);

      // Convertir la date si elle existe
      if (loadedContext.lastUpdated) {
        loadedContext.lastUpdated = new Date(loadedContext.lastUpdated);
      }

      this.context = { ...this.context, ...loadedContext };
      console.log("📋 Contexte d'équipement chargé:", this.context);
    } catch (error) {
      console.log(
        "📋 Aucun contexte d'équipement sauvegardé trouvé, utilisation des valeurs par défaut"
      );
    }
  }

  /**
   * Sauvegarder le contexte dans le fichier
   */
  private async saveContext(): Promise<void> {
    try {
      // Créer le dossier config s'il n'existe pas
      const configDir = path.dirname(this.contextFilePath);
      await fs.mkdir(configDir, { recursive: true });

      await fs.writeFile(
        this.contextFilePath,
        JSON.stringify(this.context, null, 2)
      );
      console.log("💾 Contexte d'équipement sauvegardé dans le fichier");
    } catch (error) {
      console.error("❌ Erreur lors de la sauvegarde du contexte:", error);
    }
  }

  /**
   * Obtenir le contexte actuel
   */
  getContext(): EquipmentContext {
    return { ...this.context };
  }

  /**
   * Vérifier si un contexte existe
   */
  hasContext(): boolean {
    return !!(
      this.context.selectedMount ||
      this.context.selectedMainCamera ||
      this.context.selectedGuideCamera
    );
  }

  /**
   * Mettre à jour le contexte
   */
  async updateContext(newContext: Partial<EquipmentContext>): Promise<void> {
    this.context = {
      ...this.context,
      ...newContext,
      lastUpdated: new Date(),
    };

    console.log("📋 Contexte d'équipement mis à jour:", this.context);
    await this.saveContext();
  }

  /**
   * Effacer le contexte
   */
  async clearContext(): Promise<void> {
    this.context = {
      mainFocalLength: 1000,
      guideFocalLength: 240,
    };

    console.log("🗑️ Contexte d'équipement effacé");
    await this.saveContext();
  }

  /**
   * Obtenir un résumé du contexte
   */
  getContextSummary(): {
    hasMount: boolean;
    hasMainCamera: boolean;
    hasGuideCamera: boolean;
    hasFocuser: boolean;
    hasFilterWheel: boolean;
    lastUpdated?: Date;
  } {
    return {
      hasMount: !!this.context.selectedMount,
      hasMainCamera: !!this.context.selectedMainCamera,
      hasGuideCamera: !!this.context.selectedGuideCamera,
      hasFocuser: !!this.context.selectedFocuser,
      hasFilterWheel: !!this.context.selectedFilterWheel,
      lastUpdated: this.context.lastUpdated,
    };
  }
}

// Instance singleton
export const equipmentContextService = new EquipmentContextService();

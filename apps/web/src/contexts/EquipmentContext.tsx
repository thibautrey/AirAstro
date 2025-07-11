import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import { DetectedEquipment } from "../hooks/useEquipment";

// Interface pour la configuration d'équipement sélectionné
export interface SelectedEquipmentConfig {
  mount?: DetectedEquipment;
  mainCamera?: DetectedEquipment;
  mainFocalLength: number;
  guideCamera?: DetectedEquipment;
  guideFocalLength: number;
  focuser?: DetectedEquipment;
  filterWheel?: DetectedEquipment;
  // Ajoutez d'autres équipements selon vos besoins
}

// Interface pour le contexte d'équipement
interface EquipmentContextType {
  selectedEquipment: SelectedEquipmentConfig;
  setSelectedEquipment: (config: Partial<SelectedEquipmentConfig>) => void;
  updateEquipment: (
    type: keyof SelectedEquipmentConfig,
    equipment: any
  ) => void;
  clearEquipment: (type: keyof SelectedEquipmentConfig) => void;
  clearAllEquipment: () => void;
  hasEquipmentOfType: (type: keyof SelectedEquipmentConfig) => boolean;
  getEquipmentOfType: (
    type: keyof SelectedEquipmentConfig
  ) => DetectedEquipment | number | undefined;
}

// Configuration par défaut
const defaultEquipmentConfig: SelectedEquipmentConfig = {
  mount: undefined,
  mainCamera: undefined,
  mainFocalLength: 1000,
  guideCamera: undefined,
  guideFocalLength: 240,
  focuser: undefined,
  filterWheel: undefined,
};

// Création du contexte
const EquipmentContext = createContext<EquipmentContextType | undefined>(
  undefined
);

// Clés pour le stockage local
const STORAGE_KEY = "airastro_selected_equipment";

// Provider du contexte
export const EquipmentProvider = ({ children }: { children: ReactNode }) => {
  const [selectedEquipment, setSelectedEquipmentState] =
    useState<SelectedEquipmentConfig>(defaultEquipmentConfig);

  // Charger la configuration depuis le stockage local au montage
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem(STORAGE_KEY);
      if (savedConfig) {
        const parsedConfig = JSON.parse(savedConfig);
        setSelectedEquipmentState((prev) => ({
          ...prev,
          ...parsedConfig,
        }));
      }
    } catch (error) {
      console.error(
        "Erreur lors du chargement de la configuration d'équipement:",
        error
      );
    }
  }, []);

  // Sauvegarder la configuration dans le stockage local à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedEquipment));
    } catch (error) {
      console.error(
        "Erreur lors de la sauvegarde de la configuration d'équipement:",
        error
      );
    }
  }, [selectedEquipment]);

  // Fonction pour mettre à jour la configuration complète
  const setSelectedEquipment = (config: Partial<SelectedEquipmentConfig>) => {
    setSelectedEquipmentState((prev) => ({
      ...prev,
      ...config,
    }));
  };

  // Fonction pour mettre à jour un équipement spécifique
  const updateEquipment = (
    type: keyof SelectedEquipmentConfig,
    equipment: any
  ) => {
    setSelectedEquipmentState((prev) => ({
      ...prev,
      [type]: equipment,
    }));
  };

  // Fonction pour effacer un équipement spécifique
  const clearEquipment = (type: keyof SelectedEquipmentConfig) => {
    setSelectedEquipmentState((prev) => ({
      ...prev,
      [type]:
        type === "mainFocalLength"
          ? 1000
          : type === "guideFocalLength"
          ? 240
          : undefined,
    }));
  };

  // Fonction pour effacer tous les équipements
  const clearAllEquipment = () => {
    setSelectedEquipmentState(defaultEquipmentConfig);
  };

  // Fonction pour vérifier si un type d'équipement est sélectionné
  const hasEquipmentOfType = (type: keyof SelectedEquipmentConfig): boolean => {
    const equipment = selectedEquipment[type];
    return equipment !== undefined && equipment !== null;
  };

  // Fonction pour obtenir un équipement spécifique
  const getEquipmentOfType = (
    type: keyof SelectedEquipmentConfig
  ): DetectedEquipment | number | undefined => {
    return selectedEquipment[type];
  };

  const contextValue: EquipmentContextType = {
    selectedEquipment,
    setSelectedEquipment,
    updateEquipment,
    clearEquipment,
    clearAllEquipment,
    hasEquipmentOfType,
    getEquipmentOfType,
  };

  return (
    <EquipmentContext.Provider value={contextValue}>
      {children}
    </EquipmentContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte d'équipement
export const useEquipmentContext = (): EquipmentContextType => {
  const context = useContext(EquipmentContext);
  if (!context) {
    throw new Error(
      "useEquipmentContext must be used within an EquipmentProvider"
    );
  }
  return context;
};

// Hook personnalisé pour obtenir les équipements connectés
export const useConnectedEquipment = () => {
  const { selectedEquipment } = useEquipmentContext();

  return {
    mount: selectedEquipment.mount,
    mainCamera: selectedEquipment.mainCamera,
    guideCamera: selectedEquipment.guideCamera,
    focuser: selectedEquipment.focuser,
    filterWheel: selectedEquipment.filterWheel,
    mainFocalLength: selectedEquipment.mainFocalLength,
    guideFocalLength: selectedEquipment.guideFocalLength,
  };
};

// Hook personnalisé pour obtenir les statistiques d'équipement
export const useEquipmentStats = () => {
  const { selectedEquipment } = useEquipmentContext();

  const connectedCount = Object.values(selectedEquipment).filter(
    (equipment) =>
      equipment !== undefined &&
      equipment !== null &&
      typeof equipment === "object"
  ).length;

  const totalPossibleEquipment = 5; // mount, mainCamera, guideCamera, focuser, filterWheel

  return {
    connectedCount,
    totalPossibleEquipment,
    hasMount: !!selectedEquipment.mount,
    hasMainCamera: !!selectedEquipment.mainCamera,
    hasGuideCamera: !!selectedEquipment.guideCamera,
    hasFocuser: !!selectedEquipment.focuser,
    hasFilterWheel: !!selectedEquipment.filterWheel,
  };
};

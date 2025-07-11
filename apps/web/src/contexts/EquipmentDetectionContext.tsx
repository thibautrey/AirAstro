import { DetectedEquipment, useEquipment } from "../hooks/useEquipment";
import {
  ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

// Interface pour le contexte de détection d'équipement
interface EquipmentDetectionContextType {
  equipment: DetectedEquipment[];
  loading: boolean;
  error: string | null;
  refreshEquipment: () => Promise<void>;
  summary: {
    totalCount: number;
    connectedCount: number;
    isMonitoring: boolean;
    isSetupInProgress: boolean;
  };
}

// Création du contexte
const EquipmentDetectionContext = createContext<
  EquipmentDetectionContextType | undefined
>(undefined);

// Provider du contexte
export const EquipmentDetectionProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const equipmentData = useEquipment({
    enablePolling: true,
    pollingInterval: 15000, // Poll toutes les 15 secondes
  });

  const contextValue: EquipmentDetectionContextType = {
    equipment: equipmentData.equipment,
    loading: equipmentData.loading,
    error: equipmentData.error,
    refreshEquipment: equipmentData.refreshEquipment,
    summary: equipmentData.summary,
  };

  return (
    <EquipmentDetectionContext.Provider value={contextValue}>
      {children}
    </EquipmentDetectionContext.Provider>
  );
};

// Hook personnalisé pour utiliser le contexte de détection d'équipement
export const useEquipmentDetection = (): EquipmentDetectionContextType => {
  const context = useContext(EquipmentDetectionContext);
  if (!context) {
    throw new Error(
      "useEquipmentDetection must be used within an EquipmentDetectionProvider"
    );
  }
  return context;
};

// Hook pour obtenir les caméras détectées
export const useDetectedCameras = () => {
  const { equipment } = useEquipmentDetection();

  return equipment.filter((device) => device.type === "camera");
};

// Hook pour obtenir les montures détectées
export const useDetectedMounts = () => {
  const { equipment } = useEquipmentDetection();

  return equipment.filter((device) => device.type === "mount");
};

// Hook pour obtenir les équipements par type
export const useEquipmentByType = (type: DetectedEquipment["type"]) => {
  const { equipment } = useEquipmentDetection();

  return equipment.filter((device) => device.type === type);
};

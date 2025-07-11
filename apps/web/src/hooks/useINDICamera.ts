import { useCallback, useEffect, useState } from "react";

import { DetectedEquipment } from "./useEquipment";
import { useEquipment } from "./useEquipment";
import { useEquipmentContext } from "../contexts/EquipmentContext";

export interface INDICameraCapabilities {
  hasTemperatureControl: boolean;
  hasGain: boolean;
  hasOffset: boolean;
  supportedBinnings: string[];
  maxExposureTime: number;
  minExposureTime: number;
  hasShutter: boolean;
  hasCooling: boolean;
}

export interface INDICameraStatus {
  isConnected: boolean;
  temperature?: number;
  targetTemperature?: number;
  coolingEnabled: boolean;
  coolingPower?: number;
  currentGain?: number;
  currentOffset?: number;
  isCapturing: boolean;
  exposureProgress: number;
  exposureTimeRemaining: number;
  lastImagePath?: string;
  capabilities?: INDICameraCapabilities;
}

export interface UseINDICameraResult {
  availableCameras: DetectedEquipment[];
  selectedCamera: DetectedEquipment | null;
  cameraStatus: INDICameraStatus | null;
  loading: boolean;
  error: string | null;
  selectCamera: (cameraId: string) => Promise<void>;
  startExposure: (exposureTime: number, binning?: string) => Promise<void>;
  cancelExposure: () => Promise<void>;
  setCooling: (enabled: boolean, targetTemp?: number) => Promise<void>;
  setGain: (gain: number) => Promise<void>;
  setOffset: (offset: number) => Promise<void>;
  refreshCameraStatus: () => Promise<void>;
}

export function useINDICamera(): UseINDICameraResult {
  const { equipment, refreshEquipment } = useEquipment({
    enablePolling: true,
    pollingInterval: 5000,
  });
  const { selectedEquipment, updateEquipment } = useEquipmentContext();

  const [cameraStatus, setCameraStatus] = useState<INDICameraStatus | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtrer les caméras disponibles
  const availableCameras = equipment.filter((eq) => eq.type === "camera");
  const selectedCamera = selectedEquipment.mainCamera || null;

  // Récupérer le statut de la caméra sélectionnée
  const refreshCameraStatus = useCallback(async () => {
    if (!selectedCamera) {
      setCameraStatus(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ici vous devrez implémenter l'appel API pour récupérer le statut INDI
      // Pour l'instant, simulons un statut basique
      const mockStatus: INDICameraStatus = {
        isConnected: selectedCamera.status === "connected",
        temperature: selectedCamera.status === "connected" ? -10 : undefined,
        targetTemperature: -10,
        coolingEnabled: true,
        coolingPower: 75,
        currentGain: 100,
        currentOffset: 30,
        isCapturing: false,
        exposureProgress: 0,
        exposureTimeRemaining: 0,
        capabilities: {
          hasTemperatureControl: true,
          hasGain: true,
          hasOffset: true,
          supportedBinnings: ["1x1", "2x2", "3x3", "4x4"],
          maxExposureTime: 3600,
          minExposureTime: 0.001,
          hasShutter: true,
          hasCooling: true,
        },
      };

      setCameraStatus(mockStatus);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error(
        "Erreur lors de la récupération du statut de la caméra:",
        err
      );
    } finally {
      setLoading(false);
    }
  }, [selectedCamera]);

  // Sélectionner une caméra
  const selectCamera = useCallback(
    async (cameraId: string) => {
      const camera = availableCameras.find((cam) => cam.id === cameraId);
      if (!camera) {
        throw new Error("Caméra non trouvée");
      }

      updateEquipment("mainCamera", camera);
      await refreshCameraStatus();
    },
    [availableCameras, updateEquipment, refreshCameraStatus]
  );

  // Démarrer une exposition
  const startExposure = useCallback(
    async (exposureTime: number, binning = "1x1") => {
      if (!selectedCamera || !cameraStatus?.isConnected) {
        throw new Error("Aucune caméra sélectionnée ou connectée");
      }

      setLoading(true);
      setError(null);

      try {
        // Ici vous devrez implémenter l'appel API INDI pour démarrer l'exposition
        console.log(
          `Démarrage exposition: ${exposureTime}s, binning: ${binning}`
        );

        // Simuler le démarrage de l'exposition
        setCameraStatus((prev) =>
          prev
            ? {
                ...prev,
                isCapturing: true,
                exposureProgress: 0,
                exposureTimeRemaining: exposureTime,
              }
            : null
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedCamera, cameraStatus]
  );

  // Annuler l'exposition
  const cancelExposure = useCallback(async () => {
    if (!selectedCamera || !cameraStatus?.isCapturing) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ici vous devrez implémenter l'appel API INDI pour annuler l'exposition
      console.log("Annulation exposition");

      setCameraStatus((prev) =>
        prev
          ? {
              ...prev,
              isCapturing: false,
              exposureProgress: 0,
              exposureTimeRemaining: 0,
            }
          : null
      );
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [selectedCamera, cameraStatus]);

  // Contrôler le refroidissement
  const setCooling = useCallback(
    async (enabled: boolean, targetTemp?: number) => {
      if (!selectedCamera || !cameraStatus?.isConnected) {
        throw new Error("Aucune caméra sélectionnée ou connectée");
      }

      setLoading(true);
      setError(null);

      try {
        // Ici vous devrez implémenter l'appel API INDI pour contrôler le refroidissement
        console.log(
          `Refroidissement: ${enabled ? "activé" : "désactivé"}`,
          targetTemp
        );

        setCameraStatus((prev) =>
          prev
            ? {
                ...prev,
                coolingEnabled: enabled,
                targetTemperature: targetTemp || prev.targetTemperature,
              }
            : null
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedCamera, cameraStatus]
  );

  // Définir le gain
  const setGain = useCallback(
    async (gain: number) => {
      if (!selectedCamera || !cameraStatus?.isConnected) {
        throw new Error("Aucune caméra sélectionnée ou connectée");
      }

      setLoading(true);
      setError(null);

      try {
        // Ici vous devrez implémenter l'appel API INDI pour définir le gain
        console.log(`Gain: ${gain}`);

        setCameraStatus((prev) =>
          prev
            ? {
                ...prev,
                currentGain: gain,
              }
            : null
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedCamera, cameraStatus]
  );

  // Définir l'offset
  const setOffset = useCallback(
    async (offset: number) => {
      if (!selectedCamera || !cameraStatus?.isConnected) {
        throw new Error("Aucune caméra sélectionnée ou connectée");
      }

      setLoading(true);
      setError(null);

      try {
        // Ici vous devrez implémenter l'appel API INDI pour définir l'offset
        console.log(`Offset: ${offset}`);

        setCameraStatus((prev) =>
          prev
            ? {
                ...prev,
                currentOffset: offset,
              }
            : null
        );
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [selectedCamera, cameraStatus]
  );

  // Actualiser le statut quand la caméra change
  useEffect(() => {
    refreshCameraStatus();
  }, [refreshCameraStatus]);

  // Polling du statut de la caméra si elle est en cours de capture
  useEffect(() => {
    if (!cameraStatus?.isCapturing) return;

    const interval = setInterval(async () => {
      await refreshCameraStatus();
    }, 1000);

    return () => clearInterval(interval);
  }, [cameraStatus?.isCapturing, refreshCameraStatus]);

  return {
    availableCameras,
    selectedCamera,
    cameraStatus,
    loading,
    error,
    selectCamera,
    startExposure,
    cancelExposure,
    setCooling,
    setGain,
    setOffset,
    refreshCameraStatus,
  };
}

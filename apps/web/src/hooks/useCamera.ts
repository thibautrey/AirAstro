import {
  CameraInfo,
  CameraParameters,
  CameraStatus,
  cameraService,
} from "../services/camera.service";
import { useCallback, useEffect, useState } from "react";

import { useIndiWebSocket } from "./useIndiWebSocket";

interface UseCameraReturn {
  cameraStatus: CameraStatus | null;
  availableCameras: CameraInfo[];
  isLoading: boolean;
  error: string | null;

  // Actions
  selectCamera: (cameraName: string) => Promise<void>;
  updateParameters: (parameters: Partial<CameraParameters>) => Promise<void>;
  startCapture: (parameters?: Partial<CameraParameters>) => Promise<string>;
  cancelCapture: () => Promise<void>;
  setCooling: (enabled: boolean, targetTemperature?: number) => Promise<void>;
  refreshStatus: () => Promise<void>;
  loadCameras: () => Promise<void>;
}

export function useCamera(): UseCameraReturn {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null);
  const [availableCameras, setAvailableCameras] = useState<CameraInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Configurer le WebSocket pour les mises à jour temps réel
  useIndiWebSocket({
    autoConnect: true,
    onCameraEvent: (event) => {
      switch (event.type) {
        case "cameraStatusUpdate":
          setCameraStatus(event.data);
          break;
        case "exposureProgress":
          setCameraStatus((prev) =>
            prev
              ? {
                  ...prev,
                  exposureProgress: event.data.progress,
                  exposureTimeRemaining: event.data.timeRemaining,
                }
              : null
          );
          break;
        case "exposureComplete":
          setCameraStatus((prev) =>
            prev
              ? {
                  ...prev,
                  isCapturing: false,
                  exposureProgress: 100,
                  exposureTimeRemaining: 0,
                }
              : null
          );
          break;
        case "imageReceived":
          setCameraStatus((prev) =>
            prev
              ? {
                  ...prev,
                  lastImagePath: event.data.filepath,
                }
              : null
          );
          break;
        case "cameraError":
          setError(event.data.error);
          break;
      }
    },
    onError: (error) => {
      console.warn("Erreur WebSocket INDI:", error);
      // Ne pas afficher l'erreur WebSocket comme erreur caméra
    },
  });

  const refreshStatus = useCallback(async () => {
    try {
      const status = await cameraService.getCameraStatus();
      setCameraStatus(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inconnue");
    }
  }, []);

  const loadCameras = useCallback(async () => {
    try {
      setIsLoading(true);
      const cameras = await cameraService.getAvailableCameras();
      setAvailableCameras(cameras);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors du chargement des caméras"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const selectCamera = useCallback(
    async (cameraName: string) => {
      try {
        await cameraService.selectCamera(cameraName);
        await refreshStatus();
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la sélection de la caméra"
        );
      }
    },
    [refreshStatus]
  );

  const updateParameters = useCallback(
    async (parameters: Partial<CameraParameters>) => {
      try {
        await cameraService.updateParameters(parameters);
        await refreshStatus();
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la mise à jour des paramètres"
        );
      }
    },
    [refreshStatus]
  );

  const startCapture = useCallback(
    async (parameters?: Partial<CameraParameters>): Promise<string> => {
      try {
        const captureId = await cameraService.startCapture(parameters);
        await refreshStatus();
        setError(null);
        return captureId;
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors du démarrage de la capture"
        );
        throw err;
      }
    },
    [refreshStatus]
  );

  const cancelCapture = useCallback(async () => {
    try {
      await cameraService.cancelCapture();
      await refreshStatus();
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Erreur lors de l'annulation de la capture"
      );
    }
  }, [refreshStatus]);

  const setCooling = useCallback(
    async (enabled: boolean, targetTemperature?: number) => {
      try {
        await cameraService.setCooling(enabled, targetTemperature);
        await refreshStatus();
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Erreur lors de la configuration du refroidissement"
        );
      }
    },
    [refreshStatus]
  );

  // Charger les données initiales
  useEffect(() => {
    loadCameras();
    refreshStatus();
  }, [loadCameras, refreshStatus]);

  // Rafraîchir le statut régulièrement pendant une capture (moins fréquent grâce au WebSocket)
  useEffect(() => {
    if (cameraStatus?.isCapturing) {
      const interval = setInterval(refreshStatus, 5000); // Réduire la fréquence à 5 secondes
      return () => clearInterval(interval);
    }
  }, [cameraStatus?.isCapturing, refreshStatus]);

  return {
    cameraStatus,
    availableCameras,
    isLoading,
    error,
    selectCamera,
    updateParameters,
    startCapture,
    cancelCapture,
    setCooling,
    refreshStatus,
    loadCameras,
  };
}

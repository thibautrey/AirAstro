import airAstroUrlService, {
  AirAstroInstance,
} from "../services/airastro-url.service";
import { useCallback, useEffect, useState } from "react";

export interface UseAirAstroUrlResult {
  baseUrl: string | null;
  detectionInfo: AirAstroInstance | null;
  isDetecting: boolean;
  isOnline: boolean;
  error: string | null;
  detectAirAstro: () => Promise<void>;
  setManualUrl: (url: string) => Promise<boolean>;
  checkOnlineStatus: () => Promise<void>;
  reset: () => void;
  buildApiUrl: (endpoint: string) => string;
}

/**
 * Hook pour gérer l'URL de base d'AirAstro
 */
export function useAirAstroUrl(): UseAirAstroUrlResult {
  const [baseUrl, setBaseUrl] = useState<string | null>(
    airAstroUrlService.getBaseUrl()
  );
  const [detectionInfo, setDetectionInfo] = useState<AirAstroInstance | null>(
    airAstroUrlService.getDetectionInfo()
  );
  const [isDetecting, setIsDetecting] = useState(false);
  const [isOnline, setIsOnline] = useState(detectionInfo?.isOnline ?? false);
  const [error, setError] = useState<string | null>(null);

  const detectAirAstro = useCallback(async () => {
    setIsDetecting(true);
    setError(null);

    try {
      const result = await airAstroUrlService.detectAirAstro();

      if (result) {
        setBaseUrl(result.baseUrl);
        setDetectionInfo(result);
        setIsOnline(result.isOnline);
      } else {
        setError("Aucune instance AirAstro trouvée automatiquement");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur de détection";
      setError(errorMessage);
      console.error("Erreur lors de la détection AirAstro:", err);
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const setManualUrl = useCallback(async (url: string): Promise<boolean> => {
    setIsDetecting(true);
    setError(null);

    try {
      const success = await airAstroUrlService.setManualUrl(url);

      if (success) {
        const newInfo = airAstroUrlService.getDetectionInfo();
        setBaseUrl(url);
        setDetectionInfo(newInfo);
        setIsOnline(true);
        return true;
      } else {
        setError(`Impossible de se connecter à ${url}`);
        return false;
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur de connexion";
      setError(errorMessage);
      return false;
    } finally {
      setIsDetecting(false);
    }
  }, []);

  const checkOnlineStatus = useCallback(async () => {
    try {
      const online = await airAstroUrlService.checkOnlineStatus();
      setIsOnline(online);

      const updatedInfo = airAstroUrlService.getDetectionInfo();
      setDetectionInfo(updatedInfo);

      if (!online) {
        setError("Connexion à AirAstro perdue");
      } else {
        setError(null);
      }
    } catch (err) {
      setIsOnline(false);
      setError("Erreur lors de la vérification de la connexion");
    }
  }, []);

  const reset = useCallback(() => {
    airAstroUrlService.reset();
    setBaseUrl(null);
    setDetectionInfo(null);
    setIsOnline(false);
    setError(null);
  }, []);

  const buildApiUrl = useCallback((endpoint: string): string => {
    try {
      return airAstroUrlService.buildApiUrl(endpoint);
    } catch (err) {
      throw new Error(
        `URL de base non définie. Appelez detectAirAstro() d'abord.`
      );
    }
  }, []);

  // Détection automatique au montage si pas d'URL
  useEffect(() => {
    if (!baseUrl) {
      detectAirAstro();
    }
  }, [baseUrl, detectAirAstro]);

  // Vérification périodique du statut (toutes les 2 minutes)
  useEffect(() => {
    if (baseUrl) {
      const interval = setInterval(checkOnlineStatus, 120000); // 2 minutes
      return () => clearInterval(interval);
    }
  }, [baseUrl, checkOnlineStatus]);

  return {
    baseUrl,
    detectionInfo,
    isDetecting,
    isOnline,
    error,
    detectAirAstro,
    setManualUrl,
    checkOnlineStatus,
    reset,
    buildApiUrl,
  };
}

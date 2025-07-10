import { useCallback, useEffect, useState } from "react";

import { useAirAstroUrl } from "./useAirAstroUrl";

export interface DetectedEquipment {
  id: string;
  name: string;
  type:
    | "mount"
    | "camera"
    | "focuser"
    | "filter-wheel"
    | "guide-camera"
    | "dome"
    | "weather"
    | "aux"
    | "unknown";
  manufacturer: string;
  model: string;
  connection: "usb" | "serial" | "network";
  driverStatus: "not-found" | "found" | "installed" | "running";
  autoInstallable: boolean;
  confidence: number;
  status: "disconnected" | "connected" | "error" | "configuring";
  lastSeen?: Date;
  errorMessage?: string;
}

export interface EquipmentSummary {
  totalCount: number;
  connectedCount: number;
  isMonitoring: boolean;
  isSetupInProgress: boolean;
}

export interface AutoSetupResult {
  totalDevices: number;
  configured: number;
  failed: number;
  successRate: number;
  errors: string[];
}

export interface UseEquipmentResult {
  equipment: DetectedEquipment[];
  summary: EquipmentSummary;
  loading: boolean;
  error: string | null;
  refreshEquipment: () => Promise<void>;
  performAutoSetup: () => Promise<AutoSetupResult>;
  setupDevice: (deviceId: string) => Promise<boolean>;
  restartDevice: (deviceId: string) => Promise<boolean>;
  scanEquipment: () => Promise<void>;
  forceUpdateDatabase: () => Promise<void>;
}

export interface UseEquipmentOptions {
  enablePolling?: boolean;
  pollingInterval?: number;
  includeUnknown?: boolean;
}

export function useEquipment(
  options?: UseEquipmentOptions
): UseEquipmentResult {
  const {
    enablePolling = false,
    pollingInterval = 30000,
    includeUnknown = false,
  } = options || {};
  const { buildApiUrl, isOnline } = useAirAstroUrl();

  const [equipment, setEquipment] = useState<DetectedEquipment[]>([]);
  const [summary, setSummary] = useState<EquipmentSummary>({
    totalCount: 0,
    connectedCount: 0,
    isMonitoring: false,
    isSetupInProgress: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshEquipment = useCallback(async () => {
    if (!isOnline) {
      setError("AirAstro n'est pas en ligne");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const url = buildApiUrl(
        `/api/equipment${includeUnknown ? "?includeUnknown=true" : ""}`
      );
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Convertir les dates
      const equipmentWithDates = data.equipment.map((item: any) => ({
        ...item,
        lastSeen: item.lastSeen ? new Date(item.lastSeen) : undefined,
      }));

      setEquipment(equipmentWithDates);
      setSummary({
        totalCount: data.totalCount,
        connectedCount: data.connectedCount,
        isMonitoring: data.isMonitoring,
        isSetupInProgress: data.isSetupInProgress,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error("Erreur lors de la récupération des équipements:", err);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, isOnline, includeUnknown]);

  const performAutoSetup = useCallback(async (): Promise<AutoSetupResult> => {
    setLoading(true);
    setError(null);

    try {
      const url = buildApiUrl("/api/equipment/auto-setup");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Rafraîchir la liste des équipements
      await refreshEquipment();

      return data.result;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error("Erreur lors de la configuration automatique:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshEquipment, buildApiUrl]);

  const setupDevice = useCallback(
    async (deviceId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const url = buildApiUrl(`/api/equipment/${deviceId}/setup`);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Rafraîchir la liste des équipements
        await refreshEquipment();

        return data.success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        console.error(
          `Erreur lors de la configuration de l'équipement ${deviceId}:`,
          err
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshEquipment]
  );

  const restartDevice = useCallback(
    async (deviceId: string): Promise<boolean> => {
      setLoading(true);
      setError(null);

      try {
        const url = buildApiUrl(`/api/equipment/${deviceId}/restart`);
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Rafraîchir la liste des équipements
        await refreshEquipment();

        return data.success;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        console.error(
          `Erreur lors du redémarrage de l'équipement ${deviceId}:`,
          err
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [refreshEquipment, buildApiUrl]
  );

  const scanEquipment = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const url = buildApiUrl("/api/equipment/scan");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();

      // Convertir les dates
      const equipmentWithDates = data.equipment.map((item: any) => ({
        ...item,
        lastSeen: item.lastSeen ? new Date(item.lastSeen) : undefined,
      }));

      setEquipment(equipmentWithDates);
      setSummary({
        totalCount: data.totalCount,
        connectedCount: data.connectedCount,
        isMonitoring: true,
        isSetupInProgress: false,
      });
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error("Erreur lors du scan des équipements:", err);
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl]);

  const forceUpdateDatabase = useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);

    try {
      const url = buildApiUrl("/api/equipment/database/update");
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      console.log("Base de données mise à jour:", data);

      // Rafraîchir la liste des équipements
      await refreshEquipment();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error(
        "Erreur lors de la mise à jour de la base de données:",
        err
      );
    } finally {
      setLoading(false);
    }
  }, [refreshEquipment, buildApiUrl]);

  // Chargement initial des équipements
  useEffect(() => {
    refreshEquipment();
  }, [refreshEquipment]);

  // Actualisation périodique (seulement si enablePolling est true)
  useEffect(() => {
    if (!enablePolling) return;

    const interval = setInterval(() => {
      refreshEquipment();
    }, pollingInterval);

    return () => clearInterval(interval);
  }, [refreshEquipment, enablePolling, pollingInterval]);

  return {
    equipment,
    summary,
    loading,
    error,
    refreshEquipment,
    performAutoSetup,
    setupDevice,
    restartDevice,
    scanEquipment,
    forceUpdateDatabase,
  };
}

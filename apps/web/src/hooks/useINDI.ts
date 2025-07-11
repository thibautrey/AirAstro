import { useCallback, useEffect, useState } from "react";

import { useAirAstroUrl } from "./useAirAstroUrl";

export interface INDIDevice {
  name: string;
  driver: string;
  connected: boolean;
  properties: Record<string, any>;
}

export interface INDIProperty {
  name: string;
  label: string;
  type: "text" | "number" | "switch" | "light" | "blob";
  value: any;
  writable: boolean;
  state: "idle" | "ok" | "busy" | "alert";
}

export interface UseINDIResult {
  devices: INDIDevice[];
  loading: boolean;
  error: string | null;
  connectDevice: (deviceName: string) => Promise<void>;
  disconnectDevice: (deviceName: string) => Promise<void>;
  setProperty: (
    deviceName: string,
    propertyName: string,
    value: any
  ) => Promise<void>;
  getProperty: (
    deviceName: string,
    propertyName: string
  ) => Promise<INDIProperty | null>;
  refreshDevices: () => Promise<void>;
  startCapture: (
    deviceName: string,
    exposure: number,
    binning?: string
  ) => Promise<void>;
  cancelCapture: (deviceName: string) => Promise<void>;
}

export function useINDI(): UseINDIResult {
  const { buildApiUrl, isOnline } = useAirAstroUrl();
  const [devices, setDevices] = useState<INDIDevice[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Récupérer la liste des périphériques INDI
  const refreshDevices = useCallback(async () => {
    if (!isOnline) {
      setError("AirAstro n'est pas en ligne");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl("/api/indi/devices"));
      if (!response.ok) {
        throw new Error(`Erreur HTTP: ${response.status}`);
      }

      const data = await response.json();
      setDevices(data.devices || []);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erreur inconnue";
      setError(errorMessage);
      console.error(
        "Erreur lors de la récupération des périphériques INDI:",
        err
      );
    } finally {
      setLoading(false);
    }
  }, [buildApiUrl, isOnline]);

  // Connecter un périphérique
  const connectDevice = useCallback(
    async (deviceName: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl(`/api/indi/devices/${deviceName}/connect`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        await refreshDevices();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [buildApiUrl, refreshDevices]
  );

  // Déconnecter un périphérique
  const disconnectDevice = useCallback(
    async (deviceName: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl(`/api/indi/devices/${deviceName}/disconnect`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        await refreshDevices();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [buildApiUrl, refreshDevices]
  );

  // Définir une propriété
  const setProperty = useCallback(
    async (deviceName: string, propertyName: string, value: any) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl(
            `/api/indi/devices/${deviceName}/properties/${propertyName}`
          ),
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ value }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        await refreshDevices();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [buildApiUrl, refreshDevices]
  );

  // Récupérer une propriété
  const getProperty = useCallback(
    async (
      deviceName: string,
      propertyName: string
    ): Promise<INDIProperty | null> => {
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl(
            `/api/indi/devices/${deviceName}/properties/${propertyName}`
          )
        );
        if (!response.ok) {
          if (response.status === 404) {
            return null;
          }
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        return data.property;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        console.error("Erreur lors de la récupération de la propriété:", err);
        return null;
      }
    },
    [buildApiUrl]
  );

  // Démarrer une capture
  const startCapture = useCallback(
    async (deviceName: string, exposure: number, binning = "1x1") => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl(`/api/indi/devices/${deviceName}/capture`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              exposure,
              binning,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        await refreshDevices();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [buildApiUrl, refreshDevices]
  );

  // Annuler une capture
  const cancelCapture = useCallback(
    async (deviceName: string) => {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          buildApiUrl(`/api/indi/devices/${deviceName}/capture/cancel`),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
        }

        await refreshDevices();
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Erreur inconnue";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [buildApiUrl, refreshDevices]
  );

  // Charger les périphériques au montage
  useEffect(() => {
    refreshDevices();
  }, []); // Supprimer refreshDevices des dépendances pour éviter la boucle infinie

  return {
    devices,
    loading,
    error,
    connectDevice,
    disconnectDevice,
    setProperty,
    getProperty,
    refreshDevices,
    startCapture,
    cancelCapture,
  };
}

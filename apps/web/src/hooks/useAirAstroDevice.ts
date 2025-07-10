import { useCallback, useEffect, useState } from "react";

import { useAirAstroUrl } from "./useAirAstroUrl";

type DeviceStatus = "checking" | "found" | "not-found" | "error";

interface AirAstroDevice {
  status: DeviceStatus;
  url?: string;
  isChecking: boolean;
  lastChecked?: Date;
  error?: string;
}

export function useAirAstroDevice() {
  const { baseUrl, isOnline, isDetecting, detectAirAstro } = useAirAstroUrl();

  const [device, setDevice] = useState<AirAstroDevice>({
    status: "checking",
    isChecking: true,
  });

  const checkServerPing = async (serverUrl: string): Promise<boolean> => {
    try {
      console.log(`Tentative de ping vers: ${serverUrl}/api/ping`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 secondes de timeout

      const response = await fetch(`${serverUrl}/api/ping`, {
        method: "GET",
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      });

      clearTimeout(timeoutId);
      console.log(`Réponse de ${serverUrl}:`, response.status, response.ok);

      if (response.ok) {
        const data = await response.json();
        console.log(`Données reçues de ${serverUrl}:`, data);
        return data.status === "ok";
      }
      return false;
    } catch (error) {
      console.error(`Erreur lors du ping vers ${serverUrl}:`, error);
      return false;
    }
  };

  const findAvailableServer = useCallback(async (): Promise<string | null> => {
    console.log("Recherche d'un serveur AirAstro disponible...");
    for (const server of DEFAULT_SERVERS) {
      console.log(`Test du serveur: ${server}`);
      const isAvailable = await checkServerPing(server);
      console.log(`Serveur ${server} disponible:`, isAvailable);
      if (isAvailable) {
        console.log(`Serveur trouvé: ${server}`);
        return server;
      }
    }
    console.log("Aucun serveur disponible trouvé");
    return null;
  }, []);

  const checkDevice = useCallback(async () => {
    setDevice((prev) => ({
      ...prev,
      status: "checking",
      isChecking: true,
      error: undefined,
    }));

    try {
      const availableServer = await findAvailableServer();

      if (availableServer) {
        setDevice({
          status: "found",
          url: availableServer,
          isChecking: false,
          lastChecked: new Date(),
        });
      } else {
        setDevice({
          status: "not-found",
          isChecking: false,
          lastChecked: new Date(),
          error: "Aucun serveur AirAstro accessible",
        });
      }
    } catch (error) {
      setDevice({
        status: "error",
        isChecking: false,
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : "Erreur inconnue",
      });
    }
  }, [findAvailableServer]);

  // Vérification initiale
  useEffect(() => {
    checkDevice();
  }, [checkDevice]);

  return {
    device,
    checkDevice,
    isReachable: device.status === "found",
    isChecking: device.isChecking,
  };
}

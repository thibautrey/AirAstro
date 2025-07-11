import { useCallback, useEffect, useState } from "react";

import airAstroUrlService from "../services/airastro-url.service";
import { useIndiWebSocket } from "./useIndiWebSocket";

export interface IndiDevice {
  name: string;
  type: "camera" | "mount" | "focuser" | "filterwheel" | "unknown";
  isConnected: boolean;
  properties: string[];
  lastUpdate: Date;
}

export interface IndiProperty {
  device: string;
  name: string;
  label?: string;
  state: "Idle" | "Ok" | "Busy" | "Alert";
  elements: Record<string, any>;
}

interface UseIndiDevicesReturn {
  devices: IndiDevice[];
  properties: Map<string, IndiProperty>;
  isConnected: boolean;
  error: string | null;

  // Actions
  connectDevice: (deviceName: string) => Promise<void>;
  disconnectDevice: (deviceName: string) => Promise<void>;
  setProperty: (
    device: string,
    property: string,
    elements: Record<string, string>
  ) => Promise<void>;
  getProperty: (device: string, property: string) => IndiProperty | undefined;
  refreshDevices: () => Promise<void>;
}

export function useIndiDevices(): UseIndiDevicesReturn {
  const [devices, setDevices] = useState<IndiDevice[]>([]);
  const [properties, setProperties] = useState<Map<string, IndiProperty>>(
    new Map()
  );
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Configurer le WebSocket pour les mises à jour INDI
  const { isConnected: wsConnected } = useIndiWebSocket({
    autoConnect: true,
    onIndiEvent: (event) => {
      switch (event.type) {
        case "propertyDefined":
          handlePropertyDefined(event.device!, event.property!, event.data);
          break;
        case "propertyUpdated":
          handlePropertyUpdated(event.device!, event.property!, event.data);
          break;
        case "connected":
          setIsConnected(true);
          setError(null);
          break;
        case "disconnected":
          setIsConnected(false);
          break;
        case "error":
          setError(event.data?.message || "Erreur INDI");
          break;
      }
    },
    onError: (error) => {
      setError("Erreur de connexion WebSocket");
    },
  });

  const handlePropertyDefined = useCallback(
    (device: string, property: string, data: any) => {
      // Mettre à jour les propriétés
      const propertyKey = `${device}.${property}`;
      setProperties((prev) => {
        const newProperties = new Map(prev);
        newProperties.set(propertyKey, {
          device,
          name: property,
          label: data.label,
          state: data.state || "Idle",
          elements: data.elements || {},
        });
        return newProperties;
      });

      // Mettre à jour ou créer l'appareil
      setDevices((prev) => {
        const existingDevice = prev.find((d) => d.name === device);
        if (existingDevice) {
          return prev.map((d) =>
            d.name === device
              ? {
                  ...d,
                  properties: [...d.properties, property].filter(
                    (p, i, arr) => arr.indexOf(p) === i
                  ),
                  lastUpdate: new Date(),
                }
              : d
          );
        } else {
          return [
            ...prev,
            {
              name: device,
              type: detectDeviceType(property),
              isConnected: false,
              properties: [property],
              lastUpdate: new Date(),
            },
          ];
        }
      });
    },
    []
  );

  const handlePropertyUpdated = useCallback(
    (device: string, property: string, data: any) => {
      const propertyKey = `${device}.${property}`;
      setProperties((prev) => {
        const newProperties = new Map(prev);
        const existingProperty = newProperties.get(propertyKey);
        if (existingProperty) {
          newProperties.set(propertyKey, {
            ...existingProperty,
            state: data.state || existingProperty.state,
            elements: { ...existingProperty.elements, ...data.elements },
          });
        }
        return newProperties;
      });

      // Mettre à jour le statut de connexion si c'est la propriété CONNECTION
      if (property === "CONNECTION") {
        setDevices((prev) =>
          prev.map((d) =>
            d.name === device
              ? {
                  ...d,
                  isConnected: data.elements?.CONNECT === "On",
                  lastUpdate: new Date(),
                }
              : d
          )
        );
      }
    },
    []
  );

  const detectDeviceType = (property: string): IndiDevice["type"] => {
    if (property.includes("CCD") || property.includes("EXPOSURE")) {
      return "camera";
    }
    if (property.includes("EQUATORIAL") || property.includes("TELESCOPE")) {
      return "mount";
    }
    if (property.includes("FOCUS")) {
      return "focuser";
    }
    if (property.includes("FILTER")) {
      return "filterwheel";
    }
    return "unknown";
  };

  const connectDevice = useCallback(async (deviceName: string) => {
    try {
      await setProperty(deviceName, "CONNECTION", { CONNECT: "On" });
      setError(null);
    } catch (err) {
      setError(
        `Erreur lors de la connexion de ${deviceName}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }, []);

  const disconnectDevice = useCallback(async (deviceName: string) => {
    try {
      await setProperty(deviceName, "CONNECTION", { DISCONNECT: "On" });
      setError(null);
    } catch (err) {
      setError(
        `Erreur lors de la déconnexion de ${deviceName}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }, []);

  const setProperty = useCallback(
    async (
      device: string,
      property: string,
      elements: Record<string, string>
    ) => {
      try {
        const response = await fetch(
          airAstroUrlService.buildApiUrl("indi/property"),
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ device, property, elements }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(
            errorData.error || `HTTP error! status: ${response.status}`
          );
        }

        setError(null);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(
          `Erreur lors de la définition de la propriété ${device}.${property}: ${errorMessage}`
        );
        throw err;
      }
    },
    []
  );

  const getProperty = useCallback(
    (device: string, property: string): IndiProperty | undefined => {
      return properties.get(`${device}.${property}`);
    },
    [properties]
  );

  const refreshDevices = useCallback(async () => {
    try {
      const response = await fetch(
        airAstroUrlService.buildApiUrl("indi/devices")
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const devicesData = await response.json();
      setDevices(
        devicesData.map((device: any) => ({
          name: device.name,
          type: device.type || "unknown",
          isConnected: device.isConnected || false,
          properties: device.properties || [],
          lastUpdate: new Date(),
        }))
      );

      setError(null);
    } catch (err) {
      setError(
        `Erreur lors du rafraîchissement des appareils: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }, []);

  // Charger les appareils au démarrage
  useEffect(() => {
    refreshDevices();
  }, [refreshDevices]);

  return {
    devices,
    properties,
    isConnected: wsConnected && isConnected,
    error,
    connectDevice,
    disconnectDevice,
    setProperty,
    getProperty,
    refreshDevices,
  };
}

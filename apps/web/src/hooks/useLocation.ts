import { LocationData, LocationHookResult } from "../types/location";
import { useEffect, useState } from "react";

const STORAGE_KEY = "airastro-location";

export function useLocation(): LocationHookResult {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoLocationStatus, setAutoLocationStatus] = useState<
    | "idle"
    | "checking"
    | "requesting"
    | "denied"
    | "unavailable"
    | "success"
    | "error"
  >("idle");

  // Fonction pour tenter de récupérer automatiquement la position GPS
  const requestAutoLocation = () => {
    if (!navigator.geolocation) {
      setAutoLocationStatus("unavailable");
      return;
    }

    setAutoLocationStatus("checking");

    // Vérifier d'abord les permissions
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((permission) => {
        if (permission.state === "granted") {
          // Permission accordée, demander la position
          getCurrentPosition();
        } else if (permission.state === "prompt") {
          // Demander la permission
          setAutoLocationStatus("requesting");
          getCurrentPosition();
        } else {
          // Permission refusée
          setAutoLocationStatus("denied");
        }
      })
      .catch(() => {
        // Fallback si l'API permissions n'est pas supportée
        setAutoLocationStatus("requesting");
        getCurrentPosition();
      });
  };

  const getCurrentPosition = () => {
    const options = {
      enableHighAccuracy: true,
      timeout: 8000,
      maximumAge: 300000, // 5 minutes
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLocation: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          method: "gps",
          timestamp: Date.now(),
        };

        updateLocation(newLocation);
        setAutoLocationStatus("success");
      },
      (error) => {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setAutoLocationStatus("denied");
            break;
          case error.POSITION_UNAVAILABLE:
            setAutoLocationStatus("unavailable");
            break;
          case error.TIMEOUT:
            setAutoLocationStatus("error");
            break;
          default:
            setAutoLocationStatus("error");
            break;
        }
      },
      options
    );
  };

  // Charger la localisation sauvegardée au démarrage et tenter auto-location
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsedLocation = JSON.parse(saved) as LocationData;
        setLocation(parsedLocation);
        setIsLoading(false);

        // Si la position est ancienne (>24h), tenter une nouvelle géolocalisation
        const hoursSince =
          (Date.now() - (parsedLocation.timestamp || 0)) / (1000 * 60 * 60);
        if (hoursSince > 24) {
          requestAutoLocation();
        }
      } else {
        // Aucune position sauvegardée, tenter la géolocalisation automatique
        setIsLoading(false);
        requestAutoLocation();
      }
    } catch (error) {
      console.warn("Erreur lors du chargement de la localisation:", error);
      setIsLoading(false);
      requestAutoLocation();
    }
  }, []);

  // Sauvegarder la localisation quand elle change
  const updateLocation = (newLocation: LocationData) => {
    const locationWithTimestamp = {
      ...newLocation,
      timestamp: Date.now(),
    };

    setLocation(locationWithTimestamp);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(locationWithTimestamp));
    } catch (error) {
      console.warn("Erreur lors de la sauvegarde de la localisation:", error);
    }
  };

  // Effacer la localisation
  const clearLocation = () => {
    setLocation(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn("Erreur lors de la suppression de la localisation:", error);
    }
  };

  // Fonction utilitaire pour formater la localisation
  const formatLocation = (loc: LocationData | null): string => {
    if (!loc) return "Localisation non définie";

    const latDirection = loc.latitude >= 0 ? "N" : "S";
    const lonDirection = loc.longitude >= 0 ? "E" : "O";

    return `${Math.abs(loc.latitude).toFixed(4)}°${latDirection}, ${Math.abs(
      loc.longitude
    ).toFixed(4)}°${lonDirection}`;
  };

  // Fonction utilitaire pour obtenir le nom de ville (fictive pour la démo)
  const getLocationName = (loc: LocationData | null): string => {
    if (!loc) return "Localisation inconnue";

    // Pour une vraie application, vous utiliseriez une API de géocodage inverse
    // Ici, on retourne juste les coordonnées formatées
    const lat = loc.latitude;
    const lon = loc.longitude;

    // Quelques exemples pour la démo
    if (lat > 48.8 && lat < 48.9 && lon > 2.3 && lon < 2.4) {
      return "Paris, France";
    } else if (lat > 43.6 && lat < 43.8 && lon > 7.2 && lon < 7.3) {
      return "Nice, France";
    } else if (lat > 45.7 && lat < 45.8 && lon > 4.8 && lon < 4.9) {
      return "Lyon, France";
    } else if (lat > 50.8 && lat < 50.9 && lon > 4.3 && lon < 4.4) {
      return "Bruxelles, Belgique";
    } else {
      return formatLocation(loc);
    }
  };

  // Vérifier si la localisation est récente (moins de 24h)
  const isLocationCurrent = (loc: LocationData | null): boolean => {
    if (!loc?.timestamp) return false;
    const hoursSince = (Date.now() - loc.timestamp) / (1000 * 60 * 60);
    return hoursSince < 24;
  };

  return {
    location,
    isLoading,
    autoLocationStatus,
    updateLocation,
    clearLocation,
    formatLocation,
    getLocationName,
    isLocationCurrent,
    requestAutoLocation,
  };
}

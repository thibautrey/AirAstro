import { MapPin, Navigation, X } from "lucide-react";
import { useEffect, useState } from "react";

import { LocationData } from "../types/location";

interface LocationSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelected: (location: LocationData) => void;
  currentLocation?: LocationData;
}

export default function LocationSelector({
  isOpen,
  onClose,
  onLocationSelected,
  currentLocation,
}: LocationSelectorProps) {
  const [selectedTab, setSelectedTab] = useState<"gps" | "manual">("gps");
  const [gpsStatus, setGpsStatus] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle");
  const [gpsError, setGpsError] = useState<string>("");
  const [manualLat, setManualLat] = useState(
    currentLocation?.latitude.toString() || ""
  );
  const [manualLon, setManualLon] = useState(
    currentLocation?.longitude.toString() || ""
  );

  // Réinitialiser les champs quand la modal s'ouvre
  useEffect(() => {
    if (isOpen && currentLocation) {
      setManualLat(currentLocation.latitude.toString());
      setManualLon(currentLocation.longitude.toString());
    }
  }, [isOpen, currentLocation]);

  const requestGPSLocation = () => {
    if (!navigator.geolocation) {
      setGpsError("La géolocalisation n'est pas supportée sur ce navigateur");
      setGpsStatus("error");
      return;
    }

    setGpsStatus("loading");
    setGpsError("");

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000, // Cache pendant 1 minute
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          method: "gps",
        };

        setGpsStatus("success");
        onLocationSelected(location);
        onClose();
      },
      (error) => {
        setGpsStatus("error");
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGpsError("Permission de géolocalisation refusée");
            break;
          case error.POSITION_UNAVAILABLE:
            setGpsError("Position indisponible");
            break;
          case error.TIMEOUT:
            setGpsError("Délai d'attente dépassé");
            break;
          default:
            setGpsError("Erreur de géolocalisation inconnue");
            break;
        }
      },
      options
    );
  };

  const handleManualSubmit = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);

    // Validation des coordonnées
    if (isNaN(lat) || isNaN(lon)) {
      return;
    }

    if (lat < -90 || lat > 90) {
      return;
    }

    if (lon < -180 || lon > 180) {
      return;
    }

    const location: LocationData = {
      latitude: lat,
      longitude: lon,
      method: "manual",
    };

    onLocationSelected(location);
    onClose();
  };

  const isManualValid = () => {
    const lat = parseFloat(manualLat);
    const lon = parseFloat(manualLon);
    return (
      !isNaN(lat) &&
      !isNaN(lon) &&
      lat >= -90 &&
      lat <= 90 &&
      lon >= -180 &&
      lon <= 180
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
            <MapPin className="w-5 h-5 text-brand-blue" />
            Sélection de localisation
          </h2>
          <button
            onClick={onClose}
            className="p-1 text-text-secondary hover:text-text-primary transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-zinc-700">
          <button
            onClick={() => setSelectedTab("gps")}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              selectedTab === "gps"
                ? "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <Navigation className="w-4 h-4 inline mr-2" />
            GPS
          </button>
          <button
            onClick={() => setSelectedTab("manual")}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              selectedTab === "manual"
                ? "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5"
                : "text-text-secondary hover:text-text-primary"
            }`}
          >
            <MapPin className="w-4 h-4 inline mr-2" />
            Manuel
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {selectedTab === "gps" && (
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Utilisez la géolocalisation de votre appareil pour détecter
                automatiquement vos coordonnées.
              </p>

              {gpsError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                  {gpsError}
                </div>
              )}

              {gpsStatus === "success" && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-green-400 text-sm">
                  Localisation détectée avec succès !
                </div>
              )}

              <button
                onClick={requestGPSLocation}
                disabled={gpsStatus === "loading"}
                className={`w-full h-11 rounded font-semibold flex items-center justify-center gap-2 transition-all ${
                  gpsStatus === "loading"
                    ? "bg-zinc-700 text-text-secondary cursor-not-allowed"
                    : "bg-brand-blue hover:bg-brand-blue/90 text-white active:scale-[0.98]"
                }`}
              >
                <Navigation className="w-4 h-4" />
                {gpsStatus === "loading"
                  ? "Détection en cours..."
                  : "Détecter ma position"}
              </button>
            </div>
          )}

          {selectedTab === "manual" && (
            <div className="space-y-4">
              <p className="text-text-secondary text-sm">
                Saisissez manuellement vos coordonnées géographiques.
              </p>

              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="block text-text-secondary text-sm font-medium">
                    Latitude
                  </label>
                  <input
                    type="number"
                    value={manualLat}
                    onChange={(e) => setManualLat(e.target.value)}
                    placeholder="Ex: 48.8566"
                    step="any"
                    min="-90"
                    max="90"
                    className="w-full bg-zinc-800 text-text-primary rounded px-3 h-9 border border-zinc-700 focus:border-brand-blue focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-text-secondary">
                    Entre -90° et 90° (Sud négatif, Nord positif)
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="block text-text-secondary text-sm font-medium">
                    Longitude
                  </label>
                  <input
                    type="number"
                    value={manualLon}
                    onChange={(e) => setManualLon(e.target.value)}
                    placeholder="Ex: 2.3522"
                    step="any"
                    min="-180"
                    max="180"
                    className="w-full bg-zinc-800 text-text-primary rounded px-3 h-9 border border-zinc-700 focus:border-brand-blue focus:outline-none transition-colors"
                  />
                  <p className="text-xs text-text-secondary">
                    Entre -180° et 180° (Ouest négatif, Est positif)
                  </p>
                </div>
              </div>

              <button
                onClick={handleManualSubmit}
                disabled={!isManualValid()}
                className={`w-full h-11 rounded font-semibold transition-all ${
                  isManualValid()
                    ? "bg-brand-blue hover:bg-brand-blue/90 text-white active:scale-[0.98]"
                    : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                }`}
              >
                Valider les coordonnées
              </button>
            </div>
          )}
        </div>

        {/* Footer avec info actuelle */}
        {currentLocation && (
          <div className="px-4 py-3 bg-zinc-800/50 border-t border-zinc-700">
            <p className="text-xs text-text-secondary">
              Position actuelle : {currentLocation.latitude.toFixed(4)}°,{" "}
              {currentLocation.longitude.toFixed(4)}°
              {currentLocation.method === "gps" && currentLocation.accuracy && (
                <span> (±{Math.round(currentLocation.accuracy)}m)</span>
              )}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

import { ChevronRight, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import AirAstroLogo from "./AirAstroLogo";
import LocationSelector from "./LocationSelector";
import LocationStatusIcon from "./LocationStatusIcon";
import { useLocation } from "../hooks/useLocation";
import { useNavigate } from "react-router-dom";

export default function DeviceWelcome() {
  const navigate = useNavigate();
  const [hasReachableDevice, setHasReachableDevice] = useState(false);
  const [isLocationSelectorOpen, setIsLocationSelectorOpen] = useState(false);
  const {
    location,
    isLoading: isLocationLoading,
    autoLocationStatus,
    updateLocation,
    getLocationName,
  } = useLocation();

  const handleEnterDevice = () => {
    // Ne permettre l'accès que si on a une localisation
    if (location) {
      navigate("/setup");
    }
  };

  const getLocationDisplayText = () => {
    if (isLocationLoading) return "Chargement de la localisation...";

    switch (autoLocationStatus) {
      case "checking":
        return "Vérification des permissions GPS...";
      case "requesting":
        return "Demande d'accès à la géolocalisation...";
      case "denied":
        return "Géolocalisation refusée - Cliquez pour saisir manuellement";
      case "unavailable":
        return "GPS indisponible - Cliquez pour saisir manuellement";
      case "error":
        return "Erreur GPS - Cliquez pour réessayer";
      case "success":
        return getLocationName(location);
      default:
        return location
          ? getLocationName(location)
          : "Cliquez pour définir votre localisation";
    }
  };

  const getLocationBorderColor = () => {
    if (
      !location &&
      (autoLocationStatus === "denied" ||
        autoLocationStatus === "unavailable" ||
        autoLocationStatus === "error")
    ) {
      return "border-yellow-500/70";
    }
    return "border-zinc-700";
  };

  const canEnterDevice = hasReachableDevice && location;

  const handleLocationClick = () => {
    setIsLocationSelectorOpen(true);
  };

  const getButtonText = () => {
    if (!hasReachableDevice) return "Recherche d'appareils...";
    if (!location) return "Localisation requise";
    return "Entrer dans l'appareil";
  };

  const getButtonStyle = () => {
    if (!hasReachableDevice || !location) {
      return "opacity-40 cursor-not-allowed";
    }
    return "active:scale-[0.98] hover:shadow-lg shadow-elevation";
  };

  // Simuler la détection d'appareils
  useEffect(() => {
    const checkDevices = setTimeout(() => {
      setHasReachableDevice(true); // Pour la démo, on simule qu'un appareil est trouvé
    }, 2000);

    return () => {
      clearTimeout(checkDevices);
    };
  }, []);

  return (
    <div className="h-viewport w-screen flex flex-col bg-bg-surface text-text-primary font-sans overflow-hidden">
      {/* Header */}
      <header className="pt-6 pl-6 flex-shrink-0">
        <AirAstroLogo className="h-10 text-brand-blue" />
      </header>

      {/* Hero shot */}
      <div className="flex-1 flex items-center justify-center px-8 min-h-0 py-4">
        <div className="w-full max-w-sm md:max-w-md max-h-full mx-auto">
          {/* Image placeholder - remplacez par votre PNG transparent */}
          <div
            className="bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg
                         landscape-card-adaptive
                         flex items-center justify-center shadow-elevation relative overflow-hidden"
          >
            {/* Simulated device mockup */}
            <div className="text-center relative z-10">
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 bg-brand-blue/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 md:w-12 md:h-12 text-brand-blue"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
              </div>
              <p className="text-text-secondary text-sm font-medium">
                AirAstro Device
              </p>
            </div>

            {/* Background constellation pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 200 200">
                <circle cx="30" cy="40" r="1" fill="currentColor" />
                <circle cx="70" cy="25" r="0.5" fill="currentColor" />
                <circle cx="150" cy="60" r="1" fill="currentColor" />
                <circle cx="180" cy="100" r="0.5" fill="currentColor" />
                <circle cx="40" cy="120" r="0.5" fill="currentColor" />
                <circle cx="90" cy="140" r="1" fill="currentColor" />
                <circle cx="160" cy="170" r="0.5" fill="currentColor" />
                <line
                  x1="30"
                  y1="40"
                  x2="70"
                  y2="25"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
                <line
                  x1="150"
                  y1="60"
                  x2="180"
                  y2="100"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
                <line
                  x1="90"
                  y1="140"
                  x2="160"
                  y2="170"
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="w-full p-4 pb-6 md:pb-4 bg-bg-surface/95 backdrop-blur-sm space-y-3 flex-shrink-0 min-h-[120px]">
        {/* Location row */}
        <div
          className={`rounded border flex items-center justify-between px-4 py-3 cursor-pointer hover:border-zinc-600 transition-colors active:bg-zinc-800/50 ${getLocationBorderColor()}`}
          onClick={handleLocationClick}
        >
          <div className="flex items-center space-x-3">
            <LocationStatusIcon
              status={autoLocationStatus}
              hasLocation={!!location}
              className="w-5 h-5 flex-shrink-0"
            />
            <span className="text-text-primary font-medium">
              {getLocationDisplayText()}
            </span>
          </div>
          <ChevronRight className="w-6 h-6 text-text-secondary flex-shrink-0" />
        </div>

        {/* Location requirement notice */}
        {!location && (
          <div className="px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded text-yellow-400 text-xs">
            📍 La localisation est requise pour le calcul astronomique et la
            calibration des montures
          </div>
        )}

        {/* Primary CTA */}
        <button
          className={`w-full h-11 rounded bg-gradient-to-r from-brand-blue to-brand-blue-light text-white
            font-semibold tracking-wide flex items-center justify-center transition-all duration-200
            ${getButtonStyle()}`}
          onClick={canEnterDevice ? handleEnterDevice : undefined}
          disabled={!canEnterDevice}
        >
          {getButtonText()}
        </button>
      </footer>

      {/* Location Selector Modal */}
      <LocationSelector
        isOpen={isLocationSelectorOpen}
        onClose={() => setIsLocationSelectorOpen(false)}
        onLocationSelected={updateLocation}
        currentLocation={location || undefined}
      />
    </div>
  );
}

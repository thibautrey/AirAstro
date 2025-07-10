import { ChevronRight, MapPin } from "lucide-react";
import { useEffect, useState } from "react";

import AirAstroLogo from "./AirAstroLogo";
import { useNavigate } from "react-router-dom";

export default function DeviceWelcome() {
  const navigate = useNavigate();
  const [hasReachableDevice, setHasReachableDevice] = useState(false);
  const [location, setLocation] = useState("Detecting location...");

  const handleEnterDevice = () => {
    navigate("/setup");
  };

  const handleLocationClick = () => {
    // Ici vous pourriez ouvrir un modal de sélection de localisation
    console.log("Opening location selector...");
  };

  // Simuler la détection d'appareils et de localisation
  useEffect(() => {
    // Simuler une vérification d'appareils
    const checkDevices = setTimeout(() => {
      setHasReachableDevice(true); // Pour la démo, on simule qu'un appareil est trouvé
    }, 2000);

    // Simuler la détection de localisation
    const detectLocation = setTimeout(() => {
      setLocation("Paris, France"); // Localisation par défaut pour la démo
    }, 1500);

    return () => {
      clearTimeout(checkDevices);
      clearTimeout(detectLocation);
    };
  }, []);

  return (
    <div className="h-screen flex flex-col bg-bg-surface text-text-primary font-sans">
      {/* Header */}
      <header className="pt-6 pl-6">
        <AirAstroLogo className="h-10 text-brand-red" />
      </header>

      {/* Hero shot */}
      <div className="flex-1 flex items-center justify-center px-8">
        <div className="w-full max-w-sm md:max-w-md">
          {/* Image placeholder - remplacez par votre PNG transparent */}
          <div className="bg-gradient-to-br from-zinc-700 to-zinc-800 rounded-lg aspect-square flex items-center justify-center shadow-elevation relative overflow-hidden">
            {/* Simulated device mockup */}
            <div className="text-center relative z-10">
              <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 bg-brand-red/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-10 h-10 md:w-12 md:h-12 text-brand-red"
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
      <footer className="w-full p-4 bg-bg-surface/95 backdrop-blur-sm space-y-3 pb-safe">
        {/* Location row */}
        <div
          className="rounded border border-zinc-700 flex items-center justify-between px-4 py-3 cursor-pointer hover:border-zinc-600 transition-colors active:bg-zinc-800/50"
          onClick={handleLocationClick}
        >
          <div className="flex items-center space-x-3">
            <MapPin className="w-5 h-5 text-brand-red flex-shrink-0" />
            <span className="text-text-primary font-medium">{location}</span>
          </div>
          <ChevronRight className="w-6 h-6 text-text-secondary flex-shrink-0" />
        </div>

        {/* Primary CTA */}
        <button
          className={`w-full h-11 rounded bg-gradient-to-r from-brand-red to-brand-pink text-white
            font-semibold tracking-wide flex items-center justify-center transition-all duration-200
            ${
              hasReachableDevice
                ? "active:scale-[0.98] hover:shadow-lg shadow-elevation"
                : "opacity-40 cursor-not-allowed"
            }`}
          onClick={hasReachableDevice ? handleEnterDevice : undefined}
          disabled={!hasReachableDevice}
        >
          {hasReachableDevice ? "Enter Device" : "Searching for devices..."}
        </button>
      </footer>
    </div>
  );
}

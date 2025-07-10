import DeviceWelcome from "./components/DeviceWelcome";
import EquipmentSetup from "./components/EquipmentSetup";
import { useState } from "react";

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<
    "welcome" | "device" | "location" | "setup"
  >("welcome");

  const handleEnterDevice = () => {
    setCurrentScreen("setup");
    // Navigation vers l'écran de configuration d'équipement
    console.log("Opening equipment setup...");
  };

  const handleLocationClick = () => {
    setCurrentScreen("location");
    // Ici vous pourriez ouvrir un modal de sélection de localisation
    console.log("Opening location selector...");
    // Pour la démo, on revient à l'écran principal après 2 secondes
    setTimeout(() => setCurrentScreen("welcome"), 2000);
  };

  const handleSetupComplete = () => {
    setCurrentScreen("device");
    console.log("Equipment setup completed, entering device interface...");
  };

  if (currentScreen === "welcome") {
    return (
      <DeviceWelcome
        onEnterDevice={handleEnterDevice}
        onLocationClick={handleLocationClick}
      />
    );
  }

  if (currentScreen === "setup") {
    return (
      <EquipmentSetup
        onBack={() => setCurrentScreen("welcome")}
        onComplete={handleSetupComplete}
      />
    );
  }

  if (currentScreen === "location") {
    return (
      <div className="h-screen flex items-center justify-center bg-bg-surface text-text-primary">
        <div className="text-center">
          <h2 className="text-2xl font-semibold mb-4">
            Sélection de localisation
          </h2>
          <p className="text-text-secondary">
            Modal de sélection de site en cours de développement...
          </p>
        </div>
      </div>
    );
  }

  // Écran principal de l'appareil (placeholder)
  return (
    <div className="h-screen flex items-center justify-center bg-bg-surface text-text-primary">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Interface AirAstro</h2>
        <p className="text-text-secondary mb-4">
          Vous êtes maintenant connecté à votre appareil AirAstro
        </p>
        <button
          onClick={() => setCurrentScreen("welcome")}
          className="px-4 py-2 bg-brand-red rounded text-white hover:bg-brand-red/80 transition-colors"
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  );
}

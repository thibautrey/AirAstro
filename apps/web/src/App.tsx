import { Route, BrowserRouter as Router, Routes } from "react-router-dom";
import { useEffect, useState } from "react";

import DashboardScreen from "./components/DashboardScreen";
import DeviceWelcome from "./components/DeviceWelcome";
import EquipmentSetup from "./components/EquipmentSetup";
import PWAInstallModal from "./components/PWAInstallModal";
import { usePWAInstall } from "./hooks/usePWAInstall";
import { useViewportHeight } from "./hooks/useViewportHeight";

export default function App() {
  const { canShowInstallPrompt } = usePWAInstall();
  const [showInstallModal, setShowInstallModal] = useState(false);

  // Initialiser la gestion de la hauteur de viewport au niveau de l'app
  useViewportHeight();

  useEffect(() => {
    // Show install modal after a delay if PWA is not installed
    const timer = setTimeout(() => {
      if (canShowInstallPrompt) {
        setShowInstallModal(true);
      }
    }, 3000); // Show after 3 seconds

    return () => clearTimeout(timer);
  }, [canShowInstallPrompt]);

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<DeviceWelcome />} />
          <Route path="/setup" element={<EquipmentSetup />} />
          <Route path="/control" element={<DashboardScreen />} />
        </Routes>
      </Router>

      {showInstallModal && (
        <PWAInstallModal onClose={() => setShowInstallModal(false)} />
      )}
    </>
  );
}

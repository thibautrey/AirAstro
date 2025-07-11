import { useEffect, useState } from "react";

import CameraRail from "./dashboard/CameraRail";
import GuidingOverlay from "./dashboard/GuidingOverlay";
import HistogramBar from "./dashboard/HistogramBar";
import LiveCanvas from "./dashboard/LiveCanvas";
import ModeRail from "./dashboard/ModeRail";
import TopBarDashboard from "./dashboard/TopBarDashboard";
import UpdateNotification from "./UpdateNotification";
import { UpdateStatus } from "../types/update";
import { useParams } from "react-router-dom";
import { useUpdate } from "../hooks/useUpdate";

export default function DashboardScreen() {
  const { id } = useParams<{ id: string }>();
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [showGuidingOverlay, setShowGuidingOverlay] = useState(false);

  // Construire l'URL du device
  const deviceUrl = id ? `http://${id}` : "";

  const {
    status: updateStatus,
    updateInfo,
    error: updateError,
    checkForUpdate,
    downloadAndInstallUpdate,
    resetUpdate,
  } = useUpdate(deviceUrl);

  // Vérifier automatiquement les mises à jour au chargement
  useEffect(() => {
    if (deviceUrl && checkForUpdate) {
      checkForUpdate();
    }
  }, [deviceUrl, checkForUpdate]);

  const handleUpdateFromNotification = () => {
    setNotificationDismissed(true);
    downloadAndInstallUpdate();
  };

  const handleDismissNotification = () => {
    setNotificationDismissed(true);
  };

  const handleToggleGuidingOverlay = () => {
    setShowGuidingOverlay(!showGuidingOverlay);
  };

  return (
    <div className="viewport-height bg-bg-surface overflow-hidden relative">
      {/* Global toolbar at top */}
      <TopBarDashboard
        deviceId={id}
        updateStatus={updateStatus}
        updateInfo={updateInfo}
        updateError={updateError}
        onCheckUpdate={checkForUpdate}
        onDownloadAndInstall={downloadAndInstallUpdate}
        onResetUpdate={resetUpdate}
      />

      {/* Update notification */}
      {!notificationDismissed && (
        <UpdateNotification
          status={updateStatus}
          latestVersion={updateInfo?.latestVersion}
          onUpdate={handleUpdateFromNotification}
          onDismiss={handleDismissNotification}
        />
      )}

      {/* Main content area with overlays */}
      <div className="relative dashboard-content-height flex">
        {/* Left vertical mode rail */}
        <ModeRail
          showGuidingOverlay={showGuidingOverlay}
          onToggleGuidingOverlay={handleToggleGuidingOverlay}
        />

        {/* Central stage area */}
        <div className="flex-1 relative">
          <LiveCanvas />
          <GuidingOverlay isVisible={showGuidingOverlay} />
        </div>

        {/* Right camera control rail */}
        <CameraRail />
      </div>

      {/* Bottom histogram/stats bar */}
      <HistogramBar />
    </div>
  );
}

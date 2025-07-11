import { useEffect, useState } from "react";

import CameraRail from "./dashboard/CameraRail";
import GuidingOverlay from "./dashboard/GuidingOverlay";
import HistogramBar from "./dashboard/HistogramBar";
import LiveCanvas from "./dashboard/LiveCanvas";
import ModeRail from "./dashboard/ModeRail";
import TopBarDashboard from "./dashboard/TopBarDashboard";
import UpdateNotification from "./UpdateNotification";
import { useEquipment } from "../hooks/useEquipment";
import { useUpdate } from "../hooks/useUpdate";

export default function DashboardScreen() {
  const [notificationDismissed, setNotificationDismissed] = useState(false);
  const [showGuidingOverlay, setShowGuidingOverlay] = useState(false);
  const [showHistogramBar, setShowHistogramBar] = useState(false);
  const [hasInitialCheckRun, setHasInitialCheckRun] = useState(false);

  const {
    status: updateStatus,
    updateInfo,
    error: updateError,
    checkForUpdate,
    downloadAndInstallUpdate,
    resetUpdate,
  } = useUpdate();

  // Hook pour récupérer les équipements
  const { equipment } = useEquipment({
    enablePolling: true,
    pollingInterval: 30000,
    includeUnknown: false,
  });

  // Vérifier automatiquement les mises à jour au chargement (une seule fois)
  useEffect(() => {
    if (checkForUpdate && !hasInitialCheckRun) {
      checkForUpdate();
      setHasInitialCheckRun(true);
    }
  }, [checkForUpdate, hasInitialCheckRun]);

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

  const handleToggleHistogramBar = () => {
    setShowHistogramBar(!showHistogramBar);
  };

  return (
    <div className="relative overflow-hidden viewport-height bg-bg-surface">
      {/* Global toolbar at top */}
      <TopBarDashboard
        updateStatus={updateStatus}
        updateInfo={updateInfo}
        updateError={updateError}
        onCheckUpdate={checkForUpdate}
        onDownloadAndInstall={downloadAndInstallUpdate}
        onResetUpdate={resetUpdate}
        equipment={equipment}
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

      {/* Main content area with overlays - takes full height minus header */}
      <div className="relative flex dashboard-content-height-full">
        {/* Left vertical mode rail */}
        <ModeRail
          showGuidingOverlay={showGuidingOverlay}
          onToggleGuidingOverlay={handleToggleGuidingOverlay}
          showHistogramBar={showHistogramBar}
          onToggleHistogramBar={handleToggleHistogramBar}
        />

        {/* Central stage area */}
        <div className="relative flex-1">
          <LiveCanvas />
          <GuidingOverlay isVisible={showGuidingOverlay} />
        </div>

        {/* Right camera control rail */}
        <CameraRail showHistogramBar={showHistogramBar} />
      </div>

      {/* Bottom histogram/stats bar */}
      {showHistogramBar && <HistogramBar />}
    </div>
  );
}

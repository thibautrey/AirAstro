import {
  BarChart3,
  Battery,
  Camera,
  ChevronLeft,
  Clock,
  Download,
  Filter,
  Focus,
  HardDrive,
  Info,
  Target,
  Telescope,
  Wifi,
} from "lucide-react";

import UpdateModal from "../UpdateModal";
import { UpdateStatus } from "../../types/update";
import { clsx } from "clsx";
import { useNavigate } from "react-router-dom";
import { useState } from "react";

interface TopBarDashboardProps {
  deviceId?: string;
  updateStatus?: UpdateStatus;
  updateInfo?: any;
  updateError?: string | null;
  onCheckUpdate?: () => void;
  onDownloadAndInstall?: () => void;
  onResetUpdate?: () => void;
}

export default function TopBarDashboard({
  deviceId,
  updateStatus = UpdateStatus.IDLE,
  updateInfo,
  updateError,
  onCheckUpdate,
  onDownloadAndInstall,
  onResetUpdate,
}: TopBarDashboardProps) {
  const navigate = useNavigate();
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  const currentTime = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleUpdateClick = () => {
    setShowUpdateModal(true);
  };

  const handleCloseModal = () => {
    setShowUpdateModal(false);
    if (
      updateStatus === UpdateStatus.COMPLETED ||
      updateStatus === UpdateStatus.ERROR
    ) {
      onResetUpdate?.();
    }
  };

  const iconButtons = [
    { icon: Wifi, label: "Wifi", active: true, implemented: true },
    { icon: Camera, label: "Photo", active: false, implemented: false },
    { icon: BarChart3, label: "Histogram", active: false, implemented: false },
    { icon: Telescope, label: "Scope", active: true, implemented: true },
    { icon: Filter, label: "EFW", active: false, implemented: false },
    { icon: Focus, label: "EAF", active: false, implemented: false },
    { icon: Target, label: "CAA", active: false, implemented: false },
    { icon: HardDrive, label: "SD", active: true, implemented: true },
    { icon: Info, label: "Info", active: false, implemented: false },
  ];

  return (
    <div className="flex items-center justify-between border-b h-11 bg-black/70 backdrop-blur-sm border-zinc-700/40">
      {/* Left section */}
      <div className="flex items-center gap-2 pl-3">
        <button
          onClick={() => navigate("/")}
          className="p-1 transition-colors rounded hover:bg-white/10"
          aria-label="Retour"
        >
          <ChevronLeft size={16} className="text-text-primary" />
        </button>
        <span className="text-sm font-semibold tracking-wider text-text-primary">
          AIRASTRO
        </span>
        <Battery size={14} className="ml-2 text-text-secondary" />
        <span className="text-xs text-text-secondary">{currentTime}</span>
      </div>

      {/* Center section - reserved */}
      <div className="flex-1" />

      {/* Right section - Icon buttons */}
      <div className="flex items-center gap-4 pr-4">
        {/* Update button */}
        <button
          onClick={handleUpdateClick}
          className={clsx(
            "p-1.5 rounded transition-colors relative",
            updateStatus === UpdateStatus.AVAILABLE
              ? "text-yellow-400 bg-yellow-400/20 animate-pulse"
              : updateStatus === UpdateStatus.CHECKING ||
                updateStatus === UpdateStatus.DOWNLOADING ||
                updateStatus === UpdateStatus.INSTALLING
              ? "text-cta-green bg-cta-green/20"
              : "text-text-secondary hover:text-text-primary hover:bg-white/10"
          )}
          aria-label="Mises à jour"
          disabled={
            updateStatus === UpdateStatus.DOWNLOADING ||
            updateStatus === UpdateStatus.INSTALLING
          }
        >
          <Download size={20} />
          {updateStatus === UpdateStatus.AVAILABLE && (
            <div className="absolute w-2 h-2 bg-yellow-400 rounded-full -top-1 -right-1" />
          )}
        </button>

        {iconButtons.map(
          ({ icon: Icon, label, active, implemented }, index) => (
            <button
              key={index}
              disabled={!implemented}
              className={clsx(
                "p-1.5 rounded transition-colors relative",
                !implemented && "opacity-30 cursor-not-allowed",
                implemented && active
                  ? "text-cta-green bg-cta-green/20"
                  : implemented
                  ? "text-text-secondary hover:text-text-primary hover:bg-white/10"
                  : "text-text-secondary"
              )}
              aria-label={implemented ? label : `${label} (Non implémenté)`}
            >
              <Icon size={20} />
              {!implemented && (
                <div className="absolute w-2 h-2 rounded-full -top-1 -right-1 bg-red-500/60" />
              )}
            </button>
          )
        )}
      </div>

      {/* Update Modal */}
      <UpdateModal
        isOpen={showUpdateModal}
        onClose={handleCloseModal}
        status={updateStatus}
        updateInfo={updateInfo}
        error={updateError || null}
        onUpdate={onDownloadAndInstall || (() => {})}
        onCheck={onCheckUpdate || (() => {})}
      />
    </div>
  );
}

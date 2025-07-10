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
    { icon: Wifi, label: "Wifi", active: true },
    { icon: Camera, label: "Photo", active: false },
    { icon: BarChart3, label: "Histogram", active: false },
    { icon: Telescope, label: "Scope", active: true },
    { icon: Filter, label: "EFW", active: false },
    { icon: Focus, label: "EAF", active: false },
    { icon: Target, label: "CAA", active: false },
    { icon: HardDrive, label: "SD", active: true },
    { icon: Info, label: "Info", active: false },
  ];

  return (
    <div className="h-11 bg-black/70 backdrop-blur-sm border-b border-zinc-700/40 flex items-center justify-between">
      {/* Left section */}
      <div className="flex items-center gap-2 pl-3">
        <button
          onClick={() => navigate("/")}
          className="p-1 hover:bg-white/10 rounded transition-colors"
          aria-label="Retour"
        >
          <ChevronLeft size={16} className="text-text-primary" />
        </button>
        <span className="font-semibold text-sm text-text-primary tracking-wider">
          AIRASTRO
        </span>
        <Battery size={14} className="text-text-secondary ml-2" />
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
            <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full" />
          )}
        </button>

        {iconButtons.map(({ icon: Icon, label, active }, index) => (
          <button
            key={index}
            className={clsx(
              "p-1.5 rounded transition-colors",
              active
                ? "text-cta-green bg-cta-green/20"
                : "text-text-secondary hover:text-text-primary hover:bg-white/10"
            )}
            aria-label={label}
          >
            <Icon size={20} />
          </button>
        ))}
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

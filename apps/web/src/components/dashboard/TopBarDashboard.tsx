import { Battery, ChevronLeft, Download, Settings } from "lucide-react";

import { DetectedEquipment } from "../../hooks/useEquipment";
import EquipmentModal from "../EquipmentModal";
import EquipmentSidebar from "../EquipmentSidebar";
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
  equipment?: DetectedEquipment[];
}

export default function TopBarDashboard({
  deviceId,
  updateStatus = UpdateStatus.IDLE,
  updateInfo,
  updateError,
  onCheckUpdate,
  onDownloadAndInstall,
  onResetUpdate,
  equipment = [],
}: TopBarDashboardProps) {
  const navigate = useNavigate();
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showEquipmentModal, setShowEquipmentModal] = useState(false);
  const [showEquipmentSidebar, setShowEquipmentSidebar] = useState(false);
  const [selectedEquipment, setSelectedEquipment] =
    useState<DetectedEquipment | null>(null);

  const currentTime = new Date().toLocaleTimeString("fr-FR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleUpdateClick = () => {
    setShowUpdateModal(true);
  };

  const handleEquipmentClick = () => {
    setShowEquipmentModal(true);
  };

  const handleEquipmentSelect = (equipment: DetectedEquipment) => {
    setSelectedEquipment(equipment);
    setShowEquipmentSidebar(true);
  };

  const handleCloseSidebar = () => {
    setShowEquipmentSidebar(false);
    setSelectedEquipment(null);
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
        {/* Equipment settings button */}
        <button
          onClick={handleEquipmentClick}
          className="p-1.5 rounded transition-colors text-text-secondary hover:text-text-primary hover:bg-white/10"
          aria-label="Paramètres des équipements"
        >
          <Settings size={20} />
        </button>

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

        {/* Equipment settings button */}
        <button
          onClick={handleEquipmentClick}
          className="p-1.5 rounded transition-colors text-text-secondary hover:text-text-primary hover:bg-white/10"
          aria-label="Paramètres des équipements"
        >
          <Settings size={20} />
        </button>
      </div>

      {/* Equipment Modal */}
      <EquipmentModal
        isOpen={showEquipmentModal}
        onClose={() => setShowEquipmentModal(false)}
        equipment={equipment}
        onEquipmentSelect={handleEquipmentSelect}
      />

      {/* Equipment Sidebar */}
      <EquipmentSidebar
        isOpen={showEquipmentSidebar}
        onClose={handleCloseSidebar}
        equipment={equipment}
        selectedEquipment={selectedEquipment}
        onEquipmentSelect={setSelectedEquipment}
      />

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

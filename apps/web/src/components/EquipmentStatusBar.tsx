import { Camera, Crosshair, Settings, Telescope } from "lucide-react";
import {
  useEquipmentContext,
  useEquipmentStats,
} from "../contexts/EquipmentContext";

import { clsx } from "clsx";

interface EquipmentStatusBarProps {
  className?: string;
}

export default function EquipmentStatusBar({
  className,
}: EquipmentStatusBarProps) {
  const { selectedEquipment } = useEquipmentContext();
  const stats = useEquipmentStats();

  const getEquipmentIcon = (type: string) => {
    switch (type) {
      case "mount":
        return <Telescope size={16} />;
      case "camera":
        return <Camera size={16} />;
      case "guideCamera":
        return <Crosshair size={16} />;
      case "focuser":
        return <Settings size={16} />;
      default:
        return <Settings size={16} />;
    }
  };

  const equipmentItems = [
    {
      type: "mount",
      label: "Monture",
      equipment: selectedEquipment.mount,
      isConnected: selectedEquipment.mount?.status === "connected",
    },
    {
      type: "camera",
      label: "Caméra",
      equipment: selectedEquipment.mainCamera,
      isConnected: selectedEquipment.mainCamera?.status === "connected",
    },
    {
      type: "guideCamera",
      label: "Guidage",
      equipment: selectedEquipment.guideCamera,
      isConnected: selectedEquipment.guideCamera?.status === "connected",
    },
    {
      type: "focuser",
      label: "Focuser",
      equipment: selectedEquipment.focuser,
      isConnected: selectedEquipment.focuser?.status === "connected",
    },
  ];

  const connectedItems = equipmentItems.filter((item) => item.equipment);

  return (
    <div
      className={clsx(
        "flex items-center gap-2 p-2 bg-black/30 backdrop-blur-sm rounded-lg",
        className
      )}
    >
      {/* Compteur d'équipements */}
      <div className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-800/50">
        <div className="w-2 h-2 bg-cta-green rounded-full"></div>
        <span className="text-xs font-medium text-text-primary">
          {stats.connectedCount} équipement{stats.connectedCount > 1 ? "s" : ""}
        </span>
      </div>

      {/* Liste des équipements connectés */}
      <div className="flex items-center gap-1">
        {connectedItems.map((item) => (
          <div
            key={item.type}
            className={clsx(
              "flex items-center gap-1 px-2 py-1 rounded text-xs",
              item.isConnected
                ? "bg-cta-green/20 text-cta-green"
                : "bg-zinc-800/50 text-text-secondary"
            )}
            title={
              item.equipment
                ? `${item.equipment.manufacturer} ${item.equipment.model}`
                : item.label
            }
          >
            {getEquipmentIcon(item.type)}
            <span className="font-medium">{item.label}</span>
            {item.isConnected && (
              <div className="w-1.5 h-1.5 bg-cta-green rounded-full"></div>
            )}
          </div>
        ))}
      </div>

      {/* Indicateur si aucun équipement */}
      {stats.connectedCount === 0 && (
        <div className="flex items-center gap-2 px-2 py-1 rounded bg-zinc-800/50">
          <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
          <span className="text-xs text-text-secondary">
            Aucun équipement configuré
          </span>
        </div>
      )}
    </div>
  );
}

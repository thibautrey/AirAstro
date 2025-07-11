import { useEffect, useState } from "react";

import { useAirAstroUrl } from "../hooks/useAirAstroUrl";
import { useEquipmentContext } from "../contexts/EquipmentContext";
import { useEquipmentSync } from "../hooks/useEquipmentSync";

export default function EquipmentSyncStatus() {
  const { selectedEquipment } = useEquipmentContext();
  const { isOnline } = useAirAstroUrl();
  const { clearEquipmentState } = useEquipmentSync();
  const [syncStatus, setSyncStatus] = useState<
    "idle" | "syncing" | "synced" | "error"
  >("idle");
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Surveiller les changements pour afficher le statut
  useEffect(() => {
    if (!isOnline) {
      setSyncStatus("error");
      return;
    }

    setSyncStatus("syncing");
    const timer = setTimeout(() => {
      setSyncStatus("synced");
      setLastSyncTime(new Date());
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedEquipment, isOnline]);

  const handleClearContext = async () => {
    if (
      confirm(
        "Êtes-vous sûr de vouloir effacer le contexte d'équipement sauvegardé ?"
      )
    ) {
      await clearEquipmentState();
    }
  };

  const getStatusIcon = () => {
    switch (syncStatus) {
      case "syncing":
        return "⏳";
      case "synced":
        return "✅";
      case "error":
        return "❌";
      default:
        return "⚫";
    }
  };

  const getStatusText = () => {
    switch (syncStatus) {
      case "syncing":
        return "Synchronisation...";
      case "synced":
        return "Synchronisé";
      case "error":
        return "Hors ligne";
      default:
        return "Non synchronisé";
    }
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-black/20 rounded-lg text-sm">
      <div className="flex items-center gap-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="text-text-secondary">{getStatusText()}</span>
      </div>

      {lastSyncTime && (
        <div className="text-text-secondary text-xs">
          Dernière sync: {lastSyncTime.toLocaleTimeString()}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        <div className="text-text-secondary text-xs">
          {selectedEquipment.mount && "🔭"}
          {selectedEquipment.mainCamera && "📷"}
          {selectedEquipment.guideCamera && "📸"}
          {selectedEquipment.focuser && "🔍"}
          {selectedEquipment.filterWheel && "🎨"}
        </div>

        <button
          onClick={handleClearContext}
          className="text-text-secondary hover:text-text-primary transition-colors"
          title="Effacer le contexte"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

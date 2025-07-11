import { Settings, X } from "lucide-react";
import { useEffect, useState } from "react";

import { DetectedEquipment } from "../hooks/useEquipment";
import { clsx } from "clsx";

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: DetectedEquipment[];
  onEquipmentSelect: (equipment: DetectedEquipment) => void;
}

const getEquipmentIcon = (type: DetectedEquipment["type"]) => {
  switch (type) {
    case "mount":
      return "🔭";
    case "camera":
      return "📷";
    case "guide-camera":
      return "📸";
    case "focuser":
      return "🔍";
    case "filter-wheel":
      return "🎨";
    default:
      return "❓";
  }
};

const getStatusColor = (status: DetectedEquipment["status"]) => {
  switch (status) {
    case "connected":
      return "bg-green-500";
    case "configuring":
      return "bg-yellow-500";
    case "error":
      return "bg-red-500";
    case "disconnected":
    default:
      return "bg-gray-500";
  }
};

const getStatusText = (status: DetectedEquipment["status"]) => {
  switch (status) {
    case "connected":
      return "Connecté";
    case "configuring":
      return "Configuration...";
    case "error":
      return "Erreur";
    case "disconnected":
    default:
      return "Déconnecté";
  }
};

export default function EquipmentModal({
  isOpen,
  onClose,
  equipment,
  onEquipmentSelect,
}: EquipmentModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 150);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isVisible) return null;

  // Filtrer les équipements pour ne montrer que ceux qui sont connectés ou configurables
  const availableEquipment = equipment.filter(
    (eq) => eq.status === "connected" || eq.driverStatus === "running"
  );

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex items-center justify-center transition-all duration-150",
        isOpen ? "opacity-100" : "opacity-0"
      )}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className={clsx(
          "relative w-full max-w-md mx-4 bg-zinc-900 rounded-lg border border-zinc-700 shadow-2xl transform transition-all duration-150",
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-700">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-text-primary" />
            <h2 className="text-lg font-semibold text-text-primary">
              Équipements
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 transition-colors rounded-md text-text-secondary hover:text-text-primary hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {availableEquipment.length === 0 ? (
            <div className="py-8 text-center">
              <div className="mb-2 text-4xl">🔧</div>
              <p className="text-text-secondary">Aucun équipement disponible</p>
              <p className="mt-1 text-xs text-text-secondary">
                Configurez vos équipements depuis la page de configuration
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {availableEquipment.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onEquipmentSelect(item);
                    onClose();
                  }}
                  className="w-full p-3 text-left transition-colors border rounded-lg bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-zinc-600"
                >
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">
                      {getEquipmentIcon(item.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium truncate text-text-primary">
                          {item.name}
                        </h3>
                        <div
                          className={clsx(
                            "w-2 h-2 rounded-full",
                            getStatusColor(item.status)
                          )}
                        />
                      </div>
                      <p className="text-xs text-text-secondary">
                        {item.manufacturer} {item.model}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {getStatusText(item.status)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

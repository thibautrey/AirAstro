import { Settings, X } from "lucide-react";
import { useEffect, useState } from "react";

import { DetectedEquipment } from "../hooks/useEquipment";
import { clsx } from "clsx";

interface EquipmentSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  equipment: DetectedEquipment[];
  selectedEquipment: DetectedEquipment | null;
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

// Composant pour les paramètres d'une caméra
const CameraSettings = ({ equipment }: { equipment: DetectedEquipment }) => {
  const [exposure, setExposure] = useState(1);
  const [gain, setGain] = useState(0);
  const [temperature, setTemperature] = useState(-10);
  const [binning, setBinning] = useState("1x1");

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Paramètres de capture
        </h3>

        {/* Exposition */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Temps d'exposition: {exposure}s
          </label>
          <input
            type="range"
            min="0.001"
            max="300"
            step="0.001"
            value={exposure}
            onChange={(e) => setExposure(parseFloat(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none slider-thumb"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>1ms</span>
            <span>5min</span>
          </div>
        </div>

        {/* Gain */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Gain: {gain}
          </label>
          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={gain}
            onChange={(e) => setGain(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none slider-thumb"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>0</span>
            <span>100</span>
          </div>
        </div>

        {/* Binning */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Binning
          </label>
          <select
            value={binning}
            onChange={(e) => setBinning(e.target.value)}
            className="w-full p-2 bg-zinc-800 text-text-primary rounded-md border border-zinc-700 focus:border-cta-green focus:outline-none"
          >
            <option value="1x1">1×1</option>
            <option value="2x2">2×2</option>
            <option value="3x3">3×3</option>
            <option value="4x4">4×4</option>
          </select>
        </div>

        {/* Température (si caméra refroidie) */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Température cible: {temperature}°C
          </label>
          <input
            type="range"
            min="-30"
            max="30"
            step="1"
            value={temperature}
            onChange={(e) => setTemperature(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none slider-thumb"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>-30°C</span>
            <span>30°C</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant pour les paramètres d'une monture
const MountSettings = ({ equipment }: { equipment: DetectedEquipment }) => {
  const [trackingEnabled, setTrackingEnabled] = useState(true);
  const [slewRate, setSlewRate] = useState(3);
  const [guidingRate, setGuidingRate] = useState(50);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Paramètres de monture
        </h3>

        {/* Suivi */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            Suivi sidéral
          </label>
          <button
            onClick={() => setTrackingEnabled(!trackingEnabled)}
            className={clsx(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              trackingEnabled ? "bg-cta-green" : "bg-zinc-700"
            )}
          >
            <span
              className={clsx(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                trackingEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>

        {/* Vitesse de déplacement */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Vitesse de déplacement: {slewRate}x
          </label>
          <input
            type="range"
            min="1"
            max="9"
            step="1"
            value={slewRate}
            onChange={(e) => setSlewRate(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none slider-thumb"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>1x</span>
            <span>9x</span>
          </div>
        </div>

        {/* Vitesse de guidage */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Vitesse de guidage: {guidingRate}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            step="5"
            value={guidingRate}
            onChange={(e) => setGuidingRate(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none slider-thumb"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>10%</span>
            <span>100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Composant pour les paramètres d'un équipement focuser
const FocuserSettings = ({ equipment }: { equipment: DetectedEquipment }) => {
  const [position, setPosition] = useState(50000);
  const [stepSize, setStepSize] = useState(100);
  const [autoFocusEnabled, setAutoFocusEnabled] = useState(false);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Paramètres de mise au point
        </h3>

        {/* Position actuelle */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Position actuelle: {position}
          </label>
          <div className="flex gap-2">
            <button className="flex-1 p-2 bg-zinc-800 text-text-primary rounded-md hover:bg-zinc-700 transition-colors">
              ← Out
            </button>
            <button className="flex-1 p-2 bg-zinc-800 text-text-primary rounded-md hover:bg-zinc-700 transition-colors">
              In →
            </button>
          </div>
        </div>

        {/* Taille de pas */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text-secondary">
            Taille de pas: {stepSize}
          </label>
          <input
            type="range"
            min="1"
            max="1000"
            step="1"
            value={stepSize}
            onChange={(e) => setStepSize(parseInt(e.target.value))}
            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none slider-thumb"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>1</span>
            <span>1000</span>
          </div>
        </div>

        {/* Autofocus */}
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-text-secondary">
            Mise au point automatique
          </label>
          <button
            onClick={() => setAutoFocusEnabled(!autoFocusEnabled)}
            className={clsx(
              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
              autoFocusEnabled ? "bg-cta-green" : "bg-zinc-700"
            )}
          >
            <span
              className={clsx(
                "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                autoFocusEnabled ? "translate-x-6" : "translate-x-1"
              )}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

// Composant pour les paramètres par défaut
const DefaultSettings = ({ equipment }: { equipment: DetectedEquipment }) => {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-text-primary">
          Paramètres généraux
        </h3>

        <div className="text-center py-8">
          <div className="text-4xl mb-2">
            {getEquipmentIcon(equipment.type)}
          </div>
          <p className="text-text-secondary">
            Paramètres pour {equipment.name}
          </p>
          <p className="text-xs text-text-secondary mt-1">
            Configuration spécifique à venir
          </p>
        </div>
      </div>
    </div>
  );
};

export default function EquipmentSidebar({
  isOpen,
  onClose,
  equipment,
  selectedEquipment,
  onEquipmentSelect,
}: EquipmentSidebarProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 300);
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

  const renderEquipmentSettings = (equipment: DetectedEquipment) => {
    switch (equipment.type) {
      case "camera":
      case "guide-camera":
        return <CameraSettings equipment={equipment} />;
      case "mount":
        return <MountSettings equipment={equipment} />;
      case "focuser":
        return <FocuserSettings equipment={equipment} />;
      default:
        return <DefaultSettings equipment={equipment} />;
    }
  };

  return (
    <div
      className={clsx(
        "fixed inset-0 z-50 flex transition-all duration-300 ease-in-out",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Sidebar */}
      <div
        className={clsx(
          "relative ml-auto h-full bg-zinc-900 border-l border-zinc-700 shadow-2xl transform transition-all duration-300 ease-in-out flex",
          isOpen ? "translate-x-0" : "translate-x-full",
          "w-full max-w-4xl"
        )}
      >
        {/* Left Column - Equipment List */}
        <div className="w-80 border-r border-zinc-700 flex flex-col">
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
              className="p-1 text-text-secondary hover:text-text-primary rounded-md hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Equipment List */}
          <div className="flex-1 overflow-y-auto p-4">
            {availableEquipment.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">🔧</div>
                <p className="text-text-secondary">
                  Aucun équipement disponible
                </p>
                <p className="text-xs text-text-secondary mt-1">
                  Configurez vos équipements depuis la page de configuration
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableEquipment.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onEquipmentSelect(item)}
                    className={clsx(
                      "w-full p-3 text-left rounded-lg border transition-colors",
                      selectedEquipment?.id === item.id
                        ? "bg-cta-green/20 border-cta-green text-text-primary"
                        : "bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-zinc-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-2xl">
                        {getEquipmentIcon(item.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-text-primary truncate">
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

        {/* Right Column - Equipment Settings */}
        <div className="flex-1 flex flex-col">
          {selectedEquipment ? (
            <>
              {/* Header */}
              <div className="p-4 border-b border-zinc-700">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">
                    {getEquipmentIcon(selectedEquipment.type)}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {selectedEquipment.name}
                    </h3>
                    <p className="text-sm text-text-secondary">
                      {selectedEquipment.manufacturer} {selectedEquipment.model}
                    </p>
                  </div>
                  <div className="ml-auto flex items-center gap-2">
                    <div
                      className={clsx(
                        "w-3 h-3 rounded-full",
                        getStatusColor(selectedEquipment.status)
                      )}
                    />
                    <span className="text-sm text-text-secondary">
                      {getStatusText(selectedEquipment.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Settings Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {renderEquipmentSettings(selectedEquipment)}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <div className="text-4xl mb-2">⚙️</div>
                <p className="text-text-secondary">
                  Sélectionnez un équipement pour voir ses paramètres
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

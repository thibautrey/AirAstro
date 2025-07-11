import { DetectedEquipment } from "../hooks/useEquipment";

interface EquipmentCardProps {
  equipment: DetectedEquipment;
  onSetup: (deviceId: string) => void;
  onRestart: (deviceId: string) => void;
  isLoading?: boolean;
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
      return "text-green-400";
    case "configuring":
      return "text-yellow-400";
    case "error":
      return "text-red-400";
    case "disconnected":
    default:
      return "text-gray-400";
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

const getDriverStatusText = (
  driverStatus: DetectedEquipment["driverStatus"]
) => {
  switch (driverStatus) {
    case "running":
      return "Driver actif";
    case "installed":
      return "Driver installé";
    case "found":
      return "Driver disponible";
    case "not-found":
    default:
      return "Driver non trouvé";
  }
};

const getDriverStatusColor = (
  driverStatus: DetectedEquipment["driverStatus"]
) => {
  switch (driverStatus) {
    case "running":
      return "text-green-400";
    case "installed":
      return "text-blue-400";
    case "found":
      return "text-yellow-400";
    case "not-found":
    default:
      return "text-red-400";
  }
};

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 80) return "text-green-400";
  if (confidence >= 50) return "text-yellow-400";
  if (confidence >= 20) return "text-orange-400";
  return "text-red-400";
};

const getConfidenceText = (confidence: number) => {
  if (confidence >= 80) return "Élevée";
  if (confidence >= 50) return "Moyenne";
  if (confidence >= 20) return "Faible";
  return "Très faible";
};

const EquipmentCard = ({
  equipment,
  onSetup,
  onRestart,
  isLoading = false,
}: EquipmentCardProps) => {
  const handleSetup = () => {
    if (!isLoading && equipment.autoInstallable) {
      onSetup(equipment.id);
    }
  };

  const handleRestart = () => {
    if (!isLoading && equipment.driverStatus === "running") {
      onRestart(equipment.id);
    }
  };

  const showSetupButton =
    equipment.autoInstallable &&
    (equipment.driverStatus === "found" ||
      equipment.driverStatus === "installed") &&
    equipment.status !== "connected";

  const showRestartButton =
    equipment.driverStatus === "running" && equipment.status === "connected";

  return (
    <div className="p-3 transition-colors border rounded-lg bg-zinc-800 border-zinc-700 hover:border-zinc-600">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="text-lg">{getEquipmentIcon(equipment.type)}</div>
          <div>
            <h3 className="text-sm font-medium text-white">{equipment.name}</h3>
            <p className="text-xs text-gray-400">
              {equipment.manufacturer} {equipment.model}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-xs font-medium ${getStatusColor(
              equipment.status
            )}`}
          >
            {getStatusText(equipment.status)}
          </span>
          {equipment.confidence && (
            <div className="text-xs text-right">
              <span className={getConfidenceColor(equipment.confidence)}>
                {getConfidenceText(equipment.confidence)}
              </span>
              <span className="ml-1 text-gray-500">
                ({equipment.confidence}%)
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="mb-3 space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Connexion:</span>
          <span className="text-xs text-white capitalize">
            {equipment.connection}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Driver:</span>
          <span
            className={`text-xs ${getDriverStatusColor(
              equipment.driverStatus
            )}`}
          >
            {getDriverStatusText(equipment.driverStatus)}
          </span>
        </div>

        {equipment.errorMessage && (
          <div className="flex items-start justify-between">
            <span className="text-xs text-gray-400">Erreur:</span>
            <span
              className="text-xs text-right text-red-400 truncate max-w-32"
              title={equipment.errorMessage}
            >
              {equipment.errorMessage}
            </span>
          </div>
        )}
      </div>

      {(showSetupButton || showRestartButton) && (
        <div className="flex gap-2">
          {showSetupButton && (
            <button
              onClick={handleSetup}
              disabled={isLoading || equipment.status === "configuring"}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                isLoading || equipment.status === "configuring"
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800"
              }`}
            >
              {equipment.status === "configuring"
                ? "Configuration..."
                : "Configurer"}
            </button>
          )}

          {showRestartButton && (
            <button
              onClick={handleRestart}
              disabled={isLoading}
              className={`flex-1 py-1.5 px-3 rounded-md text-xs font-medium transition-colors ${
                isLoading
                  ? "bg-gray-600 text-gray-400 cursor-not-allowed"
                  : "bg-yellow-600 text-white hover:bg-yellow-700 active:bg-yellow-800"
              }`}
            >
              Redémarrer
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default EquipmentCard;

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
    <div className="bg-zinc-800 rounded-lg p-4 border border-zinc-700 hover:border-zinc-600 transition-colors">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{getEquipmentIcon(equipment.type)}</div>
          <div>
            <h3 className="font-semibold text-white">{equipment.name}</h3>
            <p className="text-sm text-gray-400">
              {equipment.manufacturer} {equipment.model}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={`text-sm font-medium ${getStatusColor(
              equipment.status
            )}`}
          >
            {getStatusText(equipment.status)}
          </span>
          {equipment.confidence && (
            <span className="text-xs text-gray-500">
              Confiance: {equipment.confidence}%
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Connexion:</span>
          <span className="text-sm text-white capitalize">
            {equipment.connection}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-400">Driver:</span>
          <span
            className={`text-sm ${getDriverStatusColor(
              equipment.driverStatus
            )}`}
          >
            {getDriverStatusText(equipment.driverStatus)}
          </span>
        </div>

        {equipment.errorMessage && (
          <div className="flex justify-between items-start">
            <span className="text-sm text-gray-400">Erreur:</span>
            <span
              className="text-sm text-red-400 text-right max-w-48 truncate"
              title={equipment.errorMessage}
            >
              {equipment.errorMessage}
            </span>
          </div>
        )}

        {equipment.lastSeen && (
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-400">Dernière détection:</span>
            <span className="text-sm text-gray-300">
              {equipment.lastSeen.toLocaleTimeString()}
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
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
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
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
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

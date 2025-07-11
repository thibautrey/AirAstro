import { FC } from "react";

interface EquipmentWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onContinue: () => void;
  equipmentCount: number;
  connectedCount: number;
}

const EquipmentWarningModal = ({
  isOpen,
  onClose,
  onContinue,
  equipmentCount,
  connectedCount,
}: EquipmentWarningModalProps) => {
  if (!isOpen) return null;

  const hasEquipment = equipmentCount > 0;
  const hasConnectedEquipment = connectedCount > 0;

  const getWarningMessage = () => {
    if (!hasEquipment) {
      return "Aucun équipement n'a été détecté sur votre système.";
    }
    if (!hasConnectedEquipment) {
      return "Aucun équipement n'est actuellement connecté et configuré.";
    }
    return "Certains équipements ne sont pas encore configurés.";
  };

  const getRecommendation = () => {
    if (!hasEquipment) {
      return "Il est recommandé de connecter et configurer vos équipements (monture, caméra, etc.) avant de continuer pour profiter pleinement de l'application.";
    }
    if (!hasConnectedEquipment) {
      return "Pour une expérience optimale, configurez vos équipements en utilisant la configuration automatique ou manuelle.";
    }
    return "Vous pouvez compléter la configuration plus tard, mais certaines fonctionnalités pourraient être limitées.";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md mx-4 border rounded-lg shadow-2xl bg-zinc-800 border-zinc-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-500/20">
              <svg
                className="w-5 h-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L5.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">
              Équipements non configurés
            </h3>
          </div>

          <div className="mb-6 space-y-4">
            <p className="text-sm text-gray-300">{getWarningMessage()}</p>

            <div className="p-3 border rounded-md bg-zinc-900 border-zinc-700">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Équipements détectés :</span>
                <span className="text-white">{equipmentCount}</span>
              </div>
              <div className="flex items-center justify-between mt-1 text-sm">
                <span className="text-gray-400">Équipements connectés :</span>
                <span
                  className={`font-medium ${
                    connectedCount > 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {connectedCount}
                </span>
              </div>
            </div>

            <p className="text-sm text-gray-400">{getRecommendation()}</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-300 transition-colors rounded-md bg-zinc-700 hover:bg-zinc-600"
            >
              Annuler
            </button>
            <button
              onClick={onContinue}
              className="flex-1 px-4 py-2 text-sm font-medium text-white transition-colors bg-yellow-600 rounded-md hover:bg-yellow-700"
            >
              Continuer quand même
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EquipmentWarningModal;

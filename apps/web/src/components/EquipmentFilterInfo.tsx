import { DetectedEquipment } from "../hooks/useEquipment";
import { useState } from "react";

interface EquipmentFilterInfoProps {
  equipment: DetectedEquipment[];
  showAllEquipment: boolean;
  onToggleFilter: (show: boolean) => void;
}

const EquipmentFilterInfo = ({
  equipment,
  showAllEquipment,
  onToggleFilter,
}: EquipmentFilterInfoProps) => {
  const [showDetails, setShowDetails] = useState(false);

  // Calculer les statistiques de filtrage
  const unknownEquipment = equipment.filter(
    (item) => item.type === "unknown" || item.confidence < 50
  );
  const lowConfidenceEquipment = equipment.filter(
    (item) => item.confidence < 10
  );
  const knownEquipment = equipment.filter(
    (item) => item.type !== "unknown" && item.confidence >= 50
  );

  if (showAllEquipment) {
    return (
      <div className="mb-4 p-3 bg-zinc-900/50 border border-zinc-700/50 rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-300">
              🔍 Affichage complet activé
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showDetails ? "Masquer" : "Détails"}
            </button>
          </div>
          <button
            onClick={() => onToggleFilter(false)}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Activer le filtrage
          </button>
        </div>

        {showDetails && (
          <div className="mt-2 pt-2 border-t border-zinc-700/50 text-xs text-gray-400 space-y-1">
            <div>• {knownEquipment.length} équipements identifiés</div>
            <div>• {unknownEquipment.length} équipements non identifiés</div>
            <div>
              • {lowConfidenceEquipment.length} contrôleurs/hubs potentiels
            </div>
          </div>
        )}
      </div>
    );
  }

  if (unknownEquipment.length > 0) {
    return (
      <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/30 rounded-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm text-blue-300">
              🛡️ {unknownEquipment.length} équipement(s) filtré(s)
            </span>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              {showDetails ? "Masquer" : "Détails"}
            </button>
          </div>
          <button
            onClick={() => onToggleFilter(true)}
            className="text-xs text-blue-400 hover:text-blue-300 underline"
          >
            Tout afficher
          </button>
        </div>

        {showDetails && (
          <div className="mt-2 pt-2 border-t border-blue-700/30 text-xs text-blue-400 space-y-1">
            <div>• Contrôleurs et hubs USB génériques</div>
            <div>• Adaptateurs série et bridges</div>
            <div>• Équipements de très faible confiance (&lt; 50%)</div>
            <div className="text-blue-300 mt-2">
              Ces équipements sont généralement des composants système non
              pertinents pour l'astronomie.
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
};

export default EquipmentFilterInfo;

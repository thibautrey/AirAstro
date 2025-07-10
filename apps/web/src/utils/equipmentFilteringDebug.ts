/**
 * Utilitaires pour tester et déboguer le filtrage des équipements
 */

import { DetectedEquipment } from "../hooks/useEquipment";

export interface EquipmentFilterStats {
  total: number;
  filtered: number;
  kept: number;
  byType: Record<string, number>;
  byConfidence: {
    high: number; // >= 80
    medium: number; // 50-79
    low: number; // < 50
  };
  filtered_reasons: string[];
}

/**
 * Analyse les équipements et fournit des statistiques de filtrage
 */
export function analyzeEquipmentFiltering(
  allEquipment: DetectedEquipment[],
  filteredEquipment: DetectedEquipment[]
): EquipmentFilterStats {
  const filtered = allEquipment.filter(
    (device) => !filteredEquipment.some((f) => f.id === device.id)
  );

  const stats: EquipmentFilterStats = {
    total: allEquipment.length,
    filtered: filtered.length,
    kept: filteredEquipment.length,
    byType: {},
    byConfidence: {
      high: 0,
      medium: 0,
      low: 0,
    },
    filtered_reasons: [],
  };

  // Analyser par type
  allEquipment.forEach((device) => {
    stats.byType[device.type] = (stats.byType[device.type] || 0) + 1;
  });

  // Analyser par confiance
  allEquipment.forEach((device) => {
    if (device.confidence >= 80) {
      stats.byConfidence.high++;
    } else if (device.confidence >= 50) {
      stats.byConfidence.medium++;
    } else {
      stats.byConfidence.low++;
    }
  });

  // Analyser les raisons de filtrage
  filtered.forEach((device) => {
    if (device.type === "unknown" && device.confidence < 50) {
      stats.filtered_reasons.push(
        `${device.name}: Type inconnu et confiance faible (${device.confidence}%)`
      );
    }
  });

  return stats;
}

/**
 * Détermine si un équipement serait filtré selon les règles actuelles
 */
export function wouldBeFiltered(device: DetectedEquipment): boolean {
  return device.type === "unknown" && device.confidence < 50;
}

/**
 * Génère un rapport de filtrage lisible
 */
export function generateFilteringReport(stats: EquipmentFilterStats): string {
  const report = [
    "📊 Rapport de Filtrage des Équipements",
    "=====================================",
    "",
    `📈 Statistiques générales:`,
    `   • Total d'équipements: ${stats.total}`,
    `   • Équipements affichés: ${stats.kept}`,
    `   • Équipements filtrés: ${stats.filtered}`,
    `   • Taux de filtrage: ${((stats.filtered / stats.total) * 100).toFixed(
      1
    )}%`,
    "",
    `🎯 Répartition par type:`,
    ...Object.entries(stats.byType).map(
      ([type, count]) => `   • ${type}: ${count} équipements`
    ),
    "",
    `🎪 Répartition par confiance:`,
    `   • Haute confiance (≥80%): ${stats.byConfidence.high}`,
    `   • Confiance moyenne (50-79%): ${stats.byConfidence.medium}`,
    `   • Confiance faible (<50%): ${stats.byConfidence.low}`,
    "",
    `🚫 Équipements filtrés:`,
    ...stats.filtered_reasons.map((reason) => `   • ${reason}`),
    "",
    `💡 Recommandations:`,
    stats.filtered_reasons.length > 0
      ? `   • ${stats.filtered_reasons.length} équipements ont été filtrés pour améliorer l'interface`
      : "   • Aucun équipement filtré - tous les équipements sont pertinents",
    stats.byConfidence.low > 0
      ? `   • ${stats.byConfidence.low} équipements ont une confiance faible et pourraient nécessiter une amélioration de la détection`
      : "   • Tous les équipements ont une confiance correcte",
  ];

  return report.join("\n");
}

/**
 * Hook pour déboguer le filtrage des équipements
 */
export function useEquipmentFilteringDebug() {
  const [debugMode, setDebugMode] = React.useState(false);
  const [stats, setStats] = React.useState<EquipmentFilterStats | null>(null);

  const analyzeFiltering = React.useCallback(
    (
      allEquipment: DetectedEquipment[],
      filteredEquipment: DetectedEquipment[]
    ) => {
      const analysisStats = analyzeEquipmentFiltering(
        allEquipment,
        filteredEquipment
      );
      setStats(analysisStats);

      if (debugMode) {
        console.log("🔍 Analyse du filtrage des équipements:");
        console.log(generateFilteringReport(analysisStats));
      }
    },
    [debugMode]
  );

  return {
    debugMode,
    setDebugMode,
    stats,
    analyzeFiltering,
    generateReport: stats ? () => generateFilteringReport(stats) : null,
  };
}

/**
 * Exemple d'utilisation pour déboguer le filtrage
 */
export function EquipmentFilteringDebugExample() {
  const { debugMode, setDebugMode, stats, analyzeFiltering, generateReport } =
    useEquipmentFilteringDebug();

  // Récupérer les équipements avec et sans filtrage
  const filteredEquipment = useEquipment({ includeUnknown: false });
  const allEquipment = useEquipment({ includeUnknown: true });

  // Analyser le filtrage quand les données changent
  React.useEffect(() => {
    if (
      allEquipment.equipment.length > 0 &&
      filteredEquipment.equipment.length >= 0
    ) {
      analyzeFiltering(allEquipment.equipment, filteredEquipment.equipment);
    }
  }, [allEquipment.equipment, filteredEquipment.equipment, analyzeFiltering]);

  return (
    <div className="equipment-filtering-debug">
      <div className="debug-controls">
        <label>
          <input
            type="checkbox"
            checked={debugMode}
            onChange={(e) => setDebugMode(e.target.checked)}
          />
          Mode debug (logs dans la console)
        </label>
      </div>

      {stats && (
        <div className="debug-stats">
          <h3>Statistiques de Filtrage</h3>
          <div className="stats-grid">
            <div>Total: {stats.total}</div>
            <div>Affichés: {stats.kept}</div>
            <div>Filtrés: {stats.filtered}</div>
            <div>
              Taux: {((stats.filtered / stats.total) * 100).toFixed(1)}%
            </div>
          </div>

          {generateReport && (
            <details>
              <summary>Rapport détaillé</summary>
              <pre>{generateReport()}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default {
  analyzeEquipmentFiltering,
  wouldBeFiltered,
  generateFilteringReport,
  useEquipmentFilteringDebug,
  EquipmentFilteringDebugExample,
};

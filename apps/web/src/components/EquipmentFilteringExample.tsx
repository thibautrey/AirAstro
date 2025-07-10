import * as React from 'react';
import { useState } from 'react';
import { useEquipment } from '../hooks/useEquipment';
import { DetectedEquipment } from '../hooks/useEquipment';

// Exemple d'utilisation du filtrage des équipements
export function EquipmentFilteringExample() {
  const [showUnknown, setShowUnknown] = useState(false);
  
  const { equipment, summary, loading, error } = useEquipment({
    enablePolling: true,
    pollingInterval: 30000,
    includeUnknown: showUnknown,
  });

  const handleToggleUnknown = () => {
    setShowUnknown(!showUnknown);
  };

  if (loading) {
    return <div>Chargement des équipements...</div>;
  }

  if (error) {
    return <div>Erreur: {error}</div>;
  }

  return (
    <div className="equipment-filtering-example">
      <h2>Équipements Détectés</h2>
      
      <div className="filter-controls">
        <label>
          <input
            type="checkbox"
            checked={showUnknown}
            onChange={handleToggleUnknown}
          />
          Afficher les équipements inconnus
        </label>
      </div>

      <div className="equipment-summary">
        <p>Total: {summary.totalCount} équipements</p>
        <p>Connectés: {summary.connectedCount}</p>
        <p>Mode: {showUnknown ? 'Tous les équipements' : 'Équipements pertinents uniquement'}</p>
      </div>

      <div className="equipment-list">
        {equipment.length === 0 ? (
          <p>Aucun équipement détecté</p>
        ) : (
          equipment.map((device) => (
            <EquipmentCard key={device.id} device={device} />
          ))
        )}
      </div>
    </div>
  );
}

// Composant pour afficher un équipement
function EquipmentCard({ device }: { device: DetectedEquipment }) {
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'camera': return '📷';
      case 'mount': return '🔭';
      case 'focuser': return '🎯';
      case 'filter-wheel': return '🎨';
      case 'guide-camera': return '📹';
      case 'dome': return '🏠';
      case 'weather': return '🌤️';
      case 'aux': return '🔧';
      default: return '❓';
    }
  };

  return (
    <div className="equipment-card border rounded-lg p-4 mb-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{getTypeIcon(device.type)}</span>
          <div>
            <h3 className="font-semibold">{device.name}</h3>
            <p className="text-sm text-gray-600">
              {device.manufacturer} - {device.model}
            </p>
          </div>
        </div>
        
        <div className="text-right">
          <div className={`text-sm font-medium ${getConfidenceColor(device.confidence)}`}>
            Confiance: {device.confidence}%
          </div>
          <div className="text-xs text-gray-500">
            {device.type} | {device.connection}
          </div>
        </div>
      </div>
      
      <div className="mt-2 flex items-center space-x-4">
        <span className={`px-2 py-1 rounded text-xs ${
          device.status === 'connected' 
            ? 'bg-green-100 text-green-800' 
            : device.status === 'error'
            ? 'bg-red-100 text-red-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {device.status}
        </span>
        
        <span className={`px-2 py-1 rounded text-xs ${
          device.autoInstallable 
            ? 'bg-blue-100 text-blue-800' 
            : 'bg-gray-100 text-gray-800'
        }`}>
          {device.autoInstallable ? 'Auto-installable' : 'Manuel'}
        </span>
        
        {device.confidence < 50 && (
          <span className="px-2 py-1 rounded text-xs bg-orange-100 text-orange-800">
            Confiance faible
          </span>
        )}
      </div>
      
      {device.errorMessage && (
        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          {device.errorMessage}
        </div>
      )}
    </div>
  );
}

export default EquipmentFilteringExample;

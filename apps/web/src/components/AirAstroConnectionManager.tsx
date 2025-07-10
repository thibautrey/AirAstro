import { useAirAstroUrl } from "../hooks/useAirAstroUrl";
import { useState } from "react";

export default function AirAstroConnectionManager() {
  const {
    baseUrl,
    detectionInfo,
    isDetecting,
    isOnline,
    error,
    detectAirAstro,
    setManualUrl,
    reset,
  } = useAirAstroUrl();

  const [manualUrl, setManualUrlInput] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const handleManualConnect = async () => {
    if (!manualUrl.trim()) return;

    const success = await setManualUrl(manualUrl.trim());
    if (success) {
      setShowManualInput(false);
      setManualUrlInput("");
    }
  };

  const handleReset = () => {
    reset();
    setShowManualInput(false);
    setManualUrlInput("");
  };

  if (baseUrl && isOnline) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-800 font-medium">
              Connecté à AirAstro
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-green-600 hover:text-green-800 underline"
          >
            Changer
          </button>
        </div>

        <div className="mt-2 text-sm text-green-700">
          <div>
            URL: <code className="bg-green-100 px-1 rounded">{baseUrl}</code>
          </div>
          {detectionInfo && (
            <div className="mt-1">
              Détecté via: {detectionInfo.method} • Dernière vérification:{" "}
              {detectionInfo.lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (isDetecting) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-blue-800 font-medium">
            Recherche d'AirAstro en cours...
          </span>
        </div>
        <div className="mt-2 text-sm text-blue-700">
          Scan automatique du réseau local et mDNS
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <span className="text-yellow-800 font-medium">
          AirAstro non détecté
        </span>
      </div>

      {error && (
        <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded p-2">
          {error}
        </div>
      )}

      <div className="space-y-3">
        <button
          onClick={detectAirAstro}
          disabled={isDetecting}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          🔍 Rechercher automatiquement
        </button>

        <div className="text-center text-sm text-gray-500">ou</div>

        {!showManualInput ? (
          <button
            onClick={() => setShowManualInput(true)}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          >
            📝 Saisir l'adresse manuellement
          </button>
        ) : (
          <div className="space-y-2">
            <input
              type="text"
              value={manualUrl}
              onChange={(e) => setManualUrlInput(e.target.value)}
              placeholder="http://airastro.local:3000 ou http://192.168.1.100:3000"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              onKeyPress={(e) => e.key === "Enter" && handleManualConnect()}
            />
            <div className="flex space-x-2">
              <button
                onClick={handleManualConnect}
                disabled={!manualUrl.trim() || isDetecting}
                className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
              >
                Se connecter
              </button>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualUrlInput("");
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <div className="font-medium mb-1">Adresses communes :</div>
        <div>• http://airastro.local (mDNS)</div>
        <div>• http://airastro.local:3000</div>
        <div>• http://192.168.x.x:3000 (réseau local)</div>
        <div>• http://10.42.0.1:3000 (hotspot Raspberry Pi)</div>
      </div>
    </div>
  );
}

import { useAirAstroUrl } from "../hooks/useAirAstroUrl";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

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
              {t('connected')}
            </span>
          </div>
          <button
            onClick={handleReset}
            className="text-sm text-green-600 hover:text-green-800 underline"
          >
            {t('change')}
          </button>
        </div>

        <div className="mt-2 text-sm text-green-700">
          <div>
            {t('url')}: <code className="bg-green-100 px-1 rounded">{baseUrl}</code>
          </div>
          {detectionInfo && (
            <div className="mt-1">
              {t('detectedVia')}: {detectionInfo.method} • {t('lastCheck')}: {" "}
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
            {t('searching')}
          </span>
        </div>
        <div className="mt-2 text-sm text-blue-700">{t('scanning')}</div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
        <span className="text-yellow-800 font-medium">{t('notDetected')}</span>
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
          🔍 {t('autoSearch')}
        </button>

        <div className="text-center text-sm text-gray-500">{t('or')}</div>

        {!showManualInput ? (
          <button
            onClick={() => setShowManualInput(true)}
            className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded hover:bg-gray-200"
          >
            📝 {t('manualAddress')}
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
                {t('connect')}
              </button>
              <button
                onClick={() => {
                  setShowManualInput(false);
                  setManualUrlInput("");
                }}
                className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 text-xs text-gray-500">
        <div className="font-medium mb-1">{t('commonAddresses')}</div>
        <div>{t('mdns')}</div>
        <div>{t('mdns3000')}</div>
        <div>{t('lan')}</div>
        <div>{t('hotspot')}</div>
      </div>
    </div>
  );
}

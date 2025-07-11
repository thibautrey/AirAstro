import { Camera, Clock, Download, Settings, Thermometer } from "lucide-react";

import CameraSelector from "../camera/CameraSelector";
import CaptureParameters from "../camera/CaptureParameters";
import CircularProgress from "../ui/CircularProgress";
import { clsx } from "clsx";
import { useCamera } from "../../hooks/useCamera";
import { useState } from "react";

export default function CameraRail() {
  const {
    cameraStatus,
    availableCameras,
    isLoading,
    error,
    selectCamera,
    updateParameters,
    startCapture,
    cancelCapture,
    setCooling,
  } = useCamera();

  const [showParameters, setShowParameters] = useState(false);
  const [showCameraSelector, setShowCameraSelector] = useState(false);

  const handleShutterClick = async () => {
    if (!cameraStatus?.isConnected) {
      alert("Aucune caméra connectée");
      return;
    }

    if (cameraStatus.isCapturing) {
      await cancelCapture();
    } else {
      try {
        await startCapture();
      } catch (error) {
        console.error("Erreur lors du démarrage de la capture:", error);
      }
    }
  };

  const handleCameraSelect = async (cameraName: string) => {
    try {
      await selectCamera(cameraName);
    } catch (error) {
      console.error("Erreur lors de la sélection de la caméra:", error);
    }
  };

  const handleParametersChange = async (parameters: any) => {
    try {
      await updateParameters(parameters);
    } catch (error) {
      console.error("Erreur lors de la mise à jour des paramètres:", error);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    } else if (seconds < 60) {
      return `${Math.round(seconds)}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.round(seconds % 60);
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 py-10 rounded-l w-18 bg-black/45 backdrop-blur-sm">
        <div className="w-8 h-8 border-b-2 rounded-full animate-spin border-cta-green"></div>
        <span className="text-xs text-text-secondary">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="relative flex flex-col items-center gap-6 pt-3 rounded-l w-18 bg-black/45 backdrop-blur-sm pb-histogram-bar">
      {/* Title */}
      <h3 className="text-sm font-semibold tracking-wider text-cta-green">
        PREVIEW
      </h3>

      {/* Camera Status */}
      <div className="flex flex-col items-center gap-2">
        <div
          className={clsx(
            "w-2 h-2 rounded-full",
            cameraStatus?.isConnected ? "bg-cta-green" : "bg-red-500"
          )}
        />
        <span className="text-xs text-text-secondary">
          {cameraStatus?.isConnected ? "Connecté" : "Déconnecté"}
        </span>
      </div>

      {/* Camera Selection */}
      <button
        onClick={() => setShowCameraSelector(!showCameraSelector)}
        className="p-2 transition-colors rounded text-text-secondary hover:text-text-primary hover:bg-white/10"
        title="Sélectionner caméra"
      >
        <Camera size={20} />
      </button>

      {/* Temperature Display */}
      {cameraStatus?.temperature !== undefined && (
        <div className="flex flex-col items-center gap-1">
          <Thermometer size={16} className="text-text-secondary" />
          <span className="text-xs text-text-secondary">
            {cameraStatus.temperature}°C
          </span>
        </div>
      )}

      {/* Binning option */}
      <div className="flex flex-col items-center gap-2">
        <label className="text-xs text-text-secondary">Bin</label>
        <select
          value={cameraStatus?.lastParameters?.binning || "1x1"}
          onChange={(e) => handleParametersChange({ binning: e.target.value })}
          disabled={cameraStatus?.isCapturing}
          className="px-2 py-1 text-xs border rounded bg-black/60 text-text-primary border-zinc-700/60 focus:border-cta-green focus:outline-none disabled:opacity-50"
        >
          <option value="1x1">1×1</option>
          <option value="2x2">2×2</option>
          <option value="3x3">3×3</option>
          <option value="4x4">4×4</option>
        </select>
      </div>

      {/* Main shutter button */}
      <button
        onClick={handleShutterClick}
        disabled={!cameraStatus?.isConnected}
        className={clsx(
          "w-13 h-13 rounded-full border-2 transition-all duration-300 flex items-center justify-center relative",
          cameraStatus?.isCapturing
            ? "border-cta-green bg-cta-green/30"
            : "border-zinc-400 hover:border-white hover:bg-white/10",
          !cameraStatus?.isConnected && "opacity-50 cursor-not-allowed"
        )}
        aria-label={
          cameraStatus?.isCapturing
            ? "Exposition en cours"
            : "Démarrer exposition"
        }
      >
        {cameraStatus?.isCapturing ? (
          <CircularProgress
            progress={cameraStatus.exposureProgress}
            size={44}
            strokeWidth={2}
            className="text-cta-green"
          />
        ) : (
          <div className="w-8 h-8 transition-all duration-300 rounded-full bg-zinc-400" />
        )}
      </button>

      {/* Exposure time remaining */}
      {cameraStatus?.isCapturing && (
        <div className="text-xs text-center text-text-secondary">
          <div>{formatTime(cameraStatus.exposureTimeRemaining)}</div>
          <div className="text-cta-green">restant</div>
        </div>
      )}

      {/* Sub-buttons */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setShowParameters(!showParameters)}
          className="p-2 transition-colors rounded text-text-secondary hover:text-text-primary hover:bg-white/10"
          aria-label="Paramètres d'exposition"
        >
          <Settings size={20} />
          <span className="block mt-1 text-xs">PARAM</span>
        </button>

        <button
          className="p-2 transition-colors rounded text-text-secondary hover:text-text-primary hover:bg-white/10"
          aria-label="Télécharger"
        >
          <Download size={20} />
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute p-2 text-xs text-red-400 rounded bottom-2 left-2 right-2 bg-red-900/30">
          {error}
        </div>
      )}

      {/* Camera Selector Modal */}
      {showCameraSelector && (
        <div className="absolute top-0 z-50 mr-2 border rounded shadow-lg right-full w-72 bg-black/90 border-zinc-700/60">
          <div className="p-4">
            <h4 className="mb-3 text-sm font-semibold text-text-primary">
              Sélectionner une caméra
            </h4>
            <CameraSelector
              cameras={availableCameras}
              selectedCamera={cameraStatus?.selectedCamera}
              onCameraSelect={handleCameraSelect}
              disabled={cameraStatus?.isCapturing}
            />
            <button
              onClick={() => setShowCameraSelector(false)}
              className="w-full mt-3 text-xs text-text-secondary hover:text-text-primary"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* Parameters Modal */}
      {showParameters && cameraStatus?.lastParameters && (
        <div className="absolute top-0 z-50 mr-2 border rounded shadow-lg right-full w-80 bg-black/90 border-zinc-700/60">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold text-text-primary">
                Paramètres de capture
              </h4>
              <button
                onClick={() => setShowParameters(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                ×
              </button>
            </div>
            <CaptureParameters
              parameters={cameraStatus.lastParameters}
              onParametersChange={handleParametersChange}
              disabled={cameraStatus.isCapturing}
            />
          </div>
        </div>
      )}
    </div>
  );
}

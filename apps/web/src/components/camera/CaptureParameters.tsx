import { useState, useEffect } from "react";
import { CameraParameters } from "../../services/camera.service";

interface CaptureParametersProps {
  parameters: CameraParameters;
  onParametersChange: (parameters: Partial<CameraParameters>) => void;
  disabled?: boolean;
}

export default function CaptureParameters({
  parameters,
  onParametersChange,
  disabled = false,
}: CaptureParametersProps) {
  const [localParams, setLocalParams] = useState<CameraParameters>(parameters);

  useEffect(() => {
    setLocalParams(parameters);
  }, [parameters]);

  const handleParameterChange = (key: keyof CameraParameters, value: any) => {
    const newParams = { ...localParams, [key]: value };
    setLocalParams(newParams);
    onParametersChange({ [key]: value });
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 1) {
      return `${Math.round(seconds * 1000)}ms`;
    } else if (seconds < 60) {
      return `${seconds}s`;
    } else {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0
        ? `${minutes}m ${remainingSeconds}s`
        : `${minutes}m`;
    }
  };

  return (
    <div className="space-y-4 p-4 bg-black/20 rounded-lg">
      <h3 className="text-sm font-semibold text-cta-green">
        Paramètres de Capture
      </h3>

      {/* Temps d'exposition */}
      <div className="space-y-2">
        <label className="block text-xs text-text-secondary">
          Exposition: {formatTime(localParams.exposure)}
        </label>
        <input
          type="range"
          min="0.001"
          max="300"
          step="0.001"
          value={localParams.exposure}
          onChange={(e) =>
            handleParameterChange("exposure", parseFloat(e.target.value))
          }
          disabled={disabled}
          className="w-full slider"
        />
        <div className="flex justify-between text-xs text-text-secondary">
          <span>1ms</span>
          <span>5min</span>
        </div>
      </div>

      {/* Gain */}
      <div className="space-y-2">
        <label className="block text-xs text-text-secondary">
          Gain: {localParams.gain}
        </label>
        <input
          type="range"
          min="0"
          max="100"
          step="1"
          value={localParams.gain}
          onChange={(e) =>
            handleParameterChange("gain", parseInt(e.target.value))
          }
          disabled={disabled}
          className="w-full slider"
        />
        <div className="flex justify-between text-xs text-text-secondary">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Binning */}
      <div className="space-y-2">
        <label className="block text-xs text-text-secondary">Binning</label>
        <select
          value={localParams.binning}
          onChange={(e) => handleParameterChange("binning", e.target.value)}
          disabled={disabled}
          className="w-full bg-black/60 text-text-primary text-xs px-2 py-1 rounded border border-zinc-700/60 focus:border-cta-green focus:outline-none"
        >
          <option value="1x1">1×1</option>
          <option value="2x2">2×2</option>
          <option value="3x3">3×3</option>
          <option value="4x4">4×4</option>
        </select>
      </div>

      {/* Type de frame */}
      <div className="space-y-2">
        <label className="block text-xs text-text-secondary">
          Type de Frame
        </label>
        <select
          value={localParams.frameType}
          onChange={(e) => handleParameterChange("frameType", e.target.value)}
          disabled={disabled}
          className="w-full bg-black/60 text-text-primary text-xs px-2 py-1 rounded border border-zinc-700/60 focus:border-cta-green focus:outline-none"
        >
          <option value="Light">Light</option>
          <option value="Dark">Dark</option>
          <option value="Flat">Flat</option>
          <option value="Bias">Bias</option>
        </select>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <label className="block text-xs text-text-secondary">Format</label>
        <select
          value={localParams.format}
          onChange={(e) => handleParameterChange("format", e.target.value)}
          disabled={disabled}
          className="w-full bg-black/60 text-text-primary text-xs px-2 py-1 rounded border border-zinc-700/60 focus:border-cta-green focus:outline-none"
        >
          <option value="FITS">FITS</option>
          <option value="TIFF">TIFF</option>
          <option value="RAW">RAW</option>
        </select>
      </div>

      {/* Qualité (pour TIFF) */}
      {localParams.format === "TIFF" && (
        <div className="space-y-2">
          <label className="block text-xs text-text-secondary">
            Qualité: {localParams.quality}%
          </label>
          <input
            type="range"
            min="1"
            max="100"
            step="1"
            value={localParams.quality}
            onChange={(e) =>
              handleParameterChange("quality", parseInt(e.target.value))
            }
            disabled={disabled}
            className="w-full slider"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>1%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Température de refroidissement */}
      {localParams.coolingTemperature !== undefined && (
        <div className="space-y-2">
          <label className="block text-xs text-text-secondary">
            Température: {localParams.coolingTemperature}°C
          </label>
          <input
            type="range"
            min="-30"
            max="30"
            step="1"
            value={localParams.coolingTemperature}
            onChange={(e) =>
              handleParameterChange(
                "coolingTemperature",
                parseInt(e.target.value)
              )
            }
            disabled={disabled}
            className="w-full slider"
          />
          <div className="flex justify-between text-xs text-text-secondary">
            <span>-30°C</span>
            <span>30°C</span>
          </div>
        </div>
      )}
    </div>
  );
}

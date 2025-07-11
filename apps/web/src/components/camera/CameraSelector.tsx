import { CameraInfo } from "../../services/camera.service";
import { useState } from "react";

interface CameraSelectorProps {
  cameras: CameraInfo[];
  selectedCamera?: string;
  onCameraSelect: (cameraName: string) => void;
  disabled?: boolean;
}

export default function CameraSelector({
  cameras,
  selectedCamera,
  onCameraSelect,
  disabled = false,
}: CameraSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleCameraSelect = (cameraName: string) => {
    onCameraSelect(cameraName);
    setIsOpen(false);
  };

  const selectedCameraInfo = cameras.find((c) => c.name === selectedCamera);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled || cameras.length === 0}
        className="w-full bg-black/60 text-text-primary text-sm px-3 py-2 rounded border border-zinc-700/60 focus:border-cta-green focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
      >
        <span>
          {selectedCamera ? selectedCamera : "Sélectionner une caméra"}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? "transform rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-black/90 border border-zinc-700/60 rounded shadow-lg z-50 max-h-60 overflow-y-auto hide-scrollbar">
          {cameras.length === 0 ? (
            <div className="p-3 text-text-secondary text-sm">
              Aucune caméra disponible
            </div>
          ) : (
            cameras.map((camera) => (
              <button
                key={camera.name}
                onClick={() => handleCameraSelect(camera.name)}
                className={`w-full text-left p-3 hover:bg-white/10 transition-colors ${
                  selectedCamera === camera.name ? "bg-cta-green/20" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {camera.name}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {camera.model} • {camera.driver}
                    </div>
                  </div>
                  {selectedCamera === camera.name && (
                    <svg
                      className="w-4 h-4 text-cta-green"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {selectedCameraInfo && (
        <div className="mt-2 p-2 bg-black/20 rounded text-xs text-text-secondary">
          <div className="grid grid-cols-2 gap-2">
            <div>
              Résolution: {selectedCameraInfo.sensorWidth}×
              {selectedCameraInfo.sensorHeight}
            </div>
            <div>Pixel: {selectedCameraInfo.pixelSize}µm</div>
            <div>
              Binning max: {selectedCameraInfo.maxBinning}×
              {selectedCameraInfo.maxBinning}
            </div>
            <div>
              Refroidissement: {selectedCameraInfo.hasCooling ? "Oui" : "Non"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

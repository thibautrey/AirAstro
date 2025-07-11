import { Star } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

export default function HistogramBar() {
  const [stretchValue, setStretchValue] = useState(32768);
  const [imagingState, setImagingState] = useState<
    "idle" | "capturing" | "processing"
  >("idle");

  // Données simulées - pas encore implémentées
  const stats = {
    max: 65535,
    min: 0,
    avg: 12847,
    std: 3456,
  };

  const getStateText = () => {
    switch (imagingState) {
      case "capturing":
        return "Capture en cours...";
      case "processing":
        return "Traitement...";
      default:
        return "En attente";
    }
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 flex items-center overflow-x-hidden overflow-y-auto divide-x h-histogram-bar bg-black/70 backdrop-blur-sm divide-zinc-700/60">
      {/* Constellation icon for plate solve - Non implémenté */}
      <div className="relative flex items-center justify-center w-16 opacity-30">
        <Star size={32} className="text-text-secondary" />
        <div className="absolute w-2 h-2 rounded-full -top-1 -right-1 bg-red-500/60" />
      </div>

      {/* Stats cluster with stretch slider - Données simulées */}
      <div className="relative flex items-center flex-1 gap-8 px-6">
        <div className="absolute px-2 py-1 text-xs rounded top-2 left-2 text-yellow-500/80 bg-yellow-500/10">
          Données simulées
        </div>
        <div className="grid grid-cols-4 gap-6 text-xs opacity-60">
          <div className="text-center">
            <div className="text-text-secondary">Max</div>
            <div className="font-mono text-text-primary">
              {stats.max.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-text-secondary">Min</div>
            <div className="font-mono text-text-primary">{stats.min}</div>
          </div>
          <div className="text-center">
            <div className="text-text-secondary">Avg</div>
            <div className="font-mono text-text-primary">
              {stats.avg.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-text-secondary">Std</div>
            <div className="font-mono text-text-primary">
              {stats.std.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Vertical stretch slider - Non implémenté */}
        <div className="flex flex-col items-center gap-2 opacity-30">
          <span className="text-xs text-text-secondary">Stretch</span>
          <div className="relative w-4 h-12">
            <input
              type="range"
              min="0"
              max="65535"
              value={stretchValue}
              onChange={(e) => setStretchValue(Number(e.target.value))}
              disabled={true}
              className="absolute inset-0 w-12 h-4 origin-center -rotate-90 bg-transparent appearance-none cursor-not-allowed slider"
              style={{
                background: `linear-gradient(to right, #00b331 0%, #00b331 ${
                  (stretchValue / 65535) * 100
                }%, #374151 ${(stretchValue / 65535) * 100}%, #374151 100%)`,
              }}
            />
          </div>
          <span className="font-mono text-xs text-text-primary">
            {stretchValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Right controls - Non implémentés */}
      <div className="flex items-center gap-4 px-6">
        <button
          disabled={true}
          className="text-sm cursor-not-allowed text-cta-green/30"
          onClick={() => {
            /* Auto stretch logic */
          }}
        >
          Auto
        </button>

        <button
          disabled={true}
          className="text-sm cursor-not-allowed text-text-primary/30"
          onClick={() => {
            /* Zoom logic */
          }}
        >
          Zoom
        </button>

        <div className="text-right">
          <div
            className={clsx(
              "text-xs font-medium",
              imagingState === "idle"
                ? "text-text-secondary"
                : imagingState === "capturing"
                ? "text-cta-green"
                : "text-yellow-500"
            )}
          >
            {getStateText()}
          </div>
        </div>
      </div>
    </div>
  );
}

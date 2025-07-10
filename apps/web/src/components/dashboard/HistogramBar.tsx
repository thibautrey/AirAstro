import { Star } from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

export default function HistogramBar() {
  const [stretchValue, setStretchValue] = useState(32768);
  const [imagingState, setImagingState] = useState<
    "idle" | "capturing" | "processing"
  >("idle");

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
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-black/70 backdrop-blur-sm flex items-center divide-x divide-zinc-700/60">
      {/* Constellation icon for plate solve */}
      <div className="flex items-center justify-center w-16">
        <Star size={32} className="text-text-secondary" />
      </div>

      {/* Stats cluster with stretch slider */}
      <div className="flex-1 flex items-center gap-8 px-6">
        <div className="grid grid-cols-4 gap-6 text-xs">
          <div className="text-center">
            <div className="text-text-secondary">Max</div>
            <div className="text-text-primary font-mono">
              {stats.max.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-text-secondary">Min</div>
            <div className="text-text-primary font-mono">{stats.min}</div>
          </div>
          <div className="text-center">
            <div className="text-text-secondary">Avg</div>
            <div className="text-text-primary font-mono">
              {stats.avg.toLocaleString()}
            </div>
          </div>
          <div className="text-center">
            <div className="text-text-secondary">Std</div>
            <div className="text-text-primary font-mono">
              {stats.std.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Vertical stretch slider */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-xs text-text-secondary">Stretch</span>
          <div className="relative h-12 w-4">
            <input
              type="range"
              min="0"
              max="65535"
              value={stretchValue}
              onChange={(e) => setStretchValue(Number(e.target.value))}
              className="absolute inset-0 w-12 h-4 -rotate-90 origin-center appearance-none bg-transparent cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #00b331 0%, #00b331 ${
                  (stretchValue / 65535) * 100
                }%, #374151 ${(stretchValue / 65535) * 100}%, #374151 100%)`,
              }}
            />
          </div>
          <span className="text-xs text-text-primary font-mono">
            {stretchValue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-4 px-6">
        <button
          className="text-cta-green hover:text-cta-green/80 text-sm transition-colors"
          onClick={() => {
            /* Auto stretch logic */
          }}
        >
          Auto
        </button>

        <button
          className="text-text-primary hover:text-white text-sm transition-colors"
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

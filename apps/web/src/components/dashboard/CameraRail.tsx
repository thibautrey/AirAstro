import { Clock, Download } from "lucide-react";

import { clsx } from "clsx";
import { useState } from "react";

export default function CameraRail() {
  const [isExposing, setIsExposing] = useState(false);
  const [binning, setBinning] = useState("1x1");

  const handleShutterClick = () => {
    setIsExposing(true);
    // Simuler une exposition
    setTimeout(() => setIsExposing(false), 3000);
  };

  return (
    <div className="w-18 bg-black/45 backdrop-blur-sm rounded-l flex flex-col items-center gap-6 py-10">
      {/* Title */}
      <h3 className="font-semibold text-sm text-cta-green tracking-wider">
        PREVIEW
      </h3>

      {/* Binning option */}
      <div className="flex flex-col items-center gap-2">
        <label className="text-xs text-text-secondary">Bin</label>
        <select
          value={binning}
          onChange={(e) => setBinning(e.target.value)}
          className="bg-black/60 text-text-primary text-xs px-2 py-1 rounded border border-zinc-700/60 focus:border-cta-green focus:outline-none"
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
        disabled={isExposing}
        className={clsx(
          "w-13 h-13 rounded-full border-2 transition-all duration-300 flex items-center justify-center",
          isExposing
            ? "border-cta-green bg-cta-green/30 animate-pulse"
            : "border-zinc-400 hover:border-white hover:bg-white/10"
        )}
        aria-label={isExposing ? "Exposition en cours" : "Démarrer exposition"}
      >
        <div
          className={clsx(
            "w-8 h-8 rounded-full transition-all duration-300",
            isExposing ? "bg-cta-green" : "bg-zinc-400"
          )}
        />
      </button>

      {/* Sub-buttons */}
      <div className="flex flex-col gap-3">
        <button
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
          aria-label="Exposition manuelle"
        >
          <Clock size={20} />
          <span className="block text-xs mt-1">EXP</span>
        </button>

        <button
          className="p-2 text-text-secondary hover:text-text-primary hover:bg-white/10 rounded transition-colors"
          aria-label="Télécharger"
        >
          <Download size={20} />
        </button>
      </div>
    </div>
  );
}

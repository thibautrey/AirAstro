import { BarChart3, Crosshair, Eye, Plus, Tags, Target } from "lucide-react";

import { clsx } from "clsx";
import { useState } from "react";

const modes = [
  { id: "hist", label: "Hist.", icon: BarChart3, implemented: false },
  { id: "guide", label: "Guide", icon: Crosshair, implemented: false },
  { id: "solve", label: "Solve", icon: Target, implemented: false },
  { id: "detect", label: "Detect", icon: Eye, implemented: false },
  { id: "annotate", label: "Annotate", icon: Tags, implemented: false },
  { id: "cross", label: "Cross", icon: Plus, implemented: false },
];

export default function ModeRail() {
  const [activeMode, setActiveMode] = useState("hist");

  return (
    <div className="flex flex-col items-center gap-4 py-8 rounded-r w-14 bg-black/40 backdrop-blur-sm">
      {modes.map(({ id, label, icon: Icon, implemented }) => (
        <button
          key={id}
          onClick={() => implemented && setActiveMode(id)}
          disabled={!implemented}
          className={clsx(
            "flex flex-col items-center gap-1 p-2 rounded transition-colors relative",
            !implemented && "opacity-30 cursor-not-allowed",
            implemented && activeMode === id
              ? "text-cta-green bg-cta-green/20"
              : implemented
              ? "text-text-secondary hover:text-text-primary hover:bg-white/10"
              : "text-text-secondary"
          )}
          aria-label={implemented ? label : `${label} (Non implémenté)`}
        >
          <div className="flex items-center justify-center w-7 h-7">
            <Icon size={20} />
          </div>
          <span className="pt-1 text-xs font-medium">{label}</span>
          {!implemented && (
            <div className="absolute inset-0 flex items-center justify-center rounded bg-black/20">
              <div className="w-1 h-1 rounded-full opacity-50 bg-text-secondary" />
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

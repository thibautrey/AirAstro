import { BarChart3, Crosshair, Eye, Plus, Tags, Target } from "lucide-react";

import { clsx } from "clsx";
import { useState } from "react";

const modes = [
  { id: "hist", label: "Hist.", icon: BarChart3 },
  { id: "guide", label: "Guide", icon: Crosshair },
  { id: "solve", label: "Solve", icon: Target },
  { id: "detect", label: "Detect", icon: Eye },
  { id: "annotate", label: "Annotate", icon: Tags },
  { id: "cross", label: "Cross", icon: Plus },
];

export default function ModeRail() {
  const [activeMode, setActiveMode] = useState("hist");

  return (
    <div className="w-14 bg-black/40 backdrop-blur-sm rounded-r flex flex-col items-center gap-4 py-8">
      {modes.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          onClick={() => setActiveMode(id)}
          className={clsx(
            "flex flex-col items-center gap-1 p-2 rounded transition-colors",
            activeMode === id
              ? "text-cta-green bg-cta-green/20"
              : "text-text-secondary hover:text-text-primary hover:bg-white/10"
          )}
          aria-label={label}
        >
          <div className="w-7 h-7 flex items-center justify-center">
            <Icon size={20} />
          </div>
          <span className="text-xs font-medium pt-1">{label}</span>
        </button>
      ))}
    </div>
  );
}

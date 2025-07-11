import { useEffect, useState } from "react";

import { clsx } from "clsx";

interface GuidingData {
  ra: number;
  dec: number;
  total: number;
  status: "stopped" | "guiding" | "settling";
}

export default function GuidingOverlay() {
  const [guidingData, setGuidingData] = useState<GuidingData>({
    ra: 0.0,
    dec: 0.0,
    total: 0.0,
    status: "stopped",
  });

  useEffect(() => {
    // Simuler des données de guidage qui changent - pas encore implémenté
    const interval = setInterval(() => {
      setGuidingData((prev) => ({
        ra: (Math.random() - 0.5) * 2,
        dec: (Math.random() - 0.5) * 2,
        total: Math.random() * 1.5,
        status: Math.random() > 0.7 ? "guiding" : prev.status,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = () => {
    switch (guidingData.status) {
      case "guiding":
        return "text-cta-green";
      case "settling":
        return "text-yellow-500";
      default:
        return "text-text-secondary";
    }
  };

  const getStatusText = () => {
    switch (guidingData.status) {
      case "guiding":
        return "Guidage actif";
      case "settling":
        return "Stabilisation";
      default:
        return "Arrêté";
    }
  };

  return (
    <div className="absolute top-4 left-4 w-38 h-25 bg-black/80 backdrop-blur-sm border border-zinc-700/60 rounded shadow-elevation opacity-60">
      <div className="p-3 space-y-1 relative">
        <div className="absolute -top-2 -right-2 text-xs text-yellow-500/80 bg-yellow-500/10 px-2 py-1 rounded">
          Simulé
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-text-secondary">RA:</span>
          <span
            className={clsx(
              "font-mono",
              Math.abs(guidingData.ra) > 1 ? "text-red-400" : "text-blue-400"
            )}
          >
            {guidingData.ra.toFixed(2)}"
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-text-secondary">DEC:</span>
          <span
            className={clsx(
              "font-mono",
              Math.abs(guidingData.dec) > 1 ? "text-red-400" : "text-blue-400"
            )}
          >
            {guidingData.dec.toFixed(2)}"
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-text-secondary">Tot:</span>
          <span className="font-mono text-text-primary">
            {guidingData.total.toFixed(2)}"
          </span>
        </div>

        <div className="pt-1 border-t border-zinc-700/40">
          <span className={clsx("text-xs font-medium", getStatusColor())}>
            {getStatusText()}
          </span>
        </div>
      </div>
    </div>
  );
}

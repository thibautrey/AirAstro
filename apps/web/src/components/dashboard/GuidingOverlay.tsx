import { useEffect, useRef, useState } from "react";

import { clsx } from "clsx";

interface GuidingData {
  ra: number;
  dec: number;
  total: number;
  status: "stopped" | "guiding" | "settling";
}

interface Position {
  x: number;
  y: number;
}

interface GuidingOverlayProps {
  isVisible?: boolean;
}

export default function GuidingOverlay({
  isVisible = true,
}: GuidingOverlayProps) {
  const [guidingData, setGuidingData] = useState<GuidingData>({
    ra: 0.0,
    dec: 0.0,
    total: 0.0,
    status: "stopped",
  });

  const [position, setPosition] = useState<Position>({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<Position>({ x: 0, y: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

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

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;

    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Limiter la position pour éviter que la modale sorte de l'écran
    const maxX = window.innerWidth - 152; // 152px est la largeur approximative de la modale
    const maxY = window.innerHeight - 100; // 100px est la hauteur approximative de la modale

    setPosition({
      x: Math.max(0, Math.min(newX, maxX)),
      y: Math.max(0, Math.min(newY, maxY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

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

  if (!isVisible) return null;

  return (
    <div
      ref={overlayRef}
      className={clsx(
        "absolute w-38 h-25 bg-black/80 backdrop-blur-sm border border-zinc-700/60 rounded shadow-elevation opacity-60 select-none",
        isDragging ? "cursor-grabbing" : "cursor-grab"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
      onMouseDown={handleMouseDown}
    >
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

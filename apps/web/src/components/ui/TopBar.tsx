import { useEffect, useState } from "react";

import { ChevronLeft } from "lucide-react";

interface TopBarProps {
  onBack?: () => void;
  status: "Connected" | "Connecting…" | "Lost";
  serialNumber?: string;
  appVersion?: string;
  onStatusClick?: () => void;
}

export default function TopBar({
  onBack,
  status,
  serialNumber = "AS-2024-001",
  appVersion = "v1.0.0",
  onStatusClick,
}: TopBarProps) {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Détecter si on est en mode PWA/standalone
    const standalone =
      (navigator as any).standalone === true ||
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches;

    setIsStandalone(standalone);
  }, []);

  const getStatusColor = () => {
    switch (status) {
      case "Connected":
        return "text-cta-green";
      case "Connecting…":
        return "text-yellow-400";
      case "Lost":
        return "text-brand-blue";
      default:
        return "text-text-secondary";
    }
  };

  return (
    <div
      className={`min-h-11 bg-black/70 backdrop-blur-sm overflow-x-auto ${
        isStandalone ? "safe-area-top" : ""
      }`}
    >
      <div className="flex items-center justify-between px-4 min-w-max min-h-11">
        {/* Left: Back button + wordmark */}
        <div className="flex items-center space-x-3 flex-shrink-0">
          {onBack && (
            <button
              onClick={onBack}
              className="text-text-primary hover:text-white transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <span className="text-text-primary font-semibold text-sm whitespace-nowrap">
            AirAstro
          </span>
        </div>

        {/* Center: Status */}
        <div className="flex-shrink-0 px-4">
          {onStatusClick ? (
            <button
              onClick={onStatusClick}
              className={`text-sm font-medium tracking-wide uppercase transition-colors hover:opacity-80 underline underline-offset-2 ${getStatusColor()}`}
            >
              {status}
            </button>
          ) : (
            <div
              className={`text-sm font-medium tracking-wide uppercase ${getStatusColor()}`}
            >
              {status}
            </div>
          )}
        </div>

        {/* Right: Serial & Version */}
        <div className="text-text-secondary text-xs space-x-2 flex-shrink-0 whitespace-nowrap">
          <span>{serialNumber}</span>
          <span>•</span>
          <span>{appVersion}</span>
        </div>
      </div>
    </div>
  );
}

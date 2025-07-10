import { ChevronLeft } from "lucide-react";

interface TopBarProps {
  onBack?: () => void;
  status: "Connected" | "Connecting…" | "Lost";
  serialNumber?: string;
  appVersion?: string;
}

export default function TopBar({
  onBack,
  status,
  serialNumber = "AS-2024-001",
  appVersion = "v1.0.0",
}: TopBarProps) {
  const getStatusColor = () => {
    switch (status) {
      case "Connected":
        return "text-cta-green";
      case "Connecting…":
        return "text-yellow-400";
      case "Lost":
        return "text-brand-red";
      default:
        return "text-text-secondary";
    }
  };

  return (
    <div className="h-11 bg-black/70 backdrop-blur-sm flex items-center justify-between px-4">
      {/* Left: Back button + wordmark */}
      <div className="flex items-center space-x-3">
        {onBack && (
          <button
            onClick={onBack}
            className="text-text-primary hover:text-white transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        <span className="text-text-primary font-semibold text-sm">
          AirAstro
        </span>
      </div>

      {/* Center: Status */}
      <div
        className={`text-sm font-medium tracking-wide uppercase ${getStatusColor()}`}
      >
        {status}
      </div>

      {/* Right: Serial & Version */}
      <div className="text-text-secondary text-xs space-x-2">
        <span>{serialNumber}</span>
        <span>•</span>
        <span>{appVersion}</span>
      </div>
    </div>
  );
}

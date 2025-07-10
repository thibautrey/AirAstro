import { MapPin, Navigation } from "lucide-react";

import { LocationData } from "../types/location";

interface LocationDisplayProps {
  location: LocationData | null;
  compact?: boolean;
  showAccuracy?: boolean;
  className?: string;
}

export default function LocationDisplay({
  location,
  compact = false,
  showAccuracy = false,
  className = "",
}: LocationDisplayProps) {
  if (!location) {
    return (
      <div
        className={`flex items-center gap-2 text-text-secondary ${className}`}
      >
        <MapPin className="w-4 h-4" />
        <span className="text-sm">Localisation non définie</span>
      </div>
    );
  }

  const formatCoordinate = (coord: number, type: "lat" | "lon"): string => {
    const isLat = type === "lat";
    const positive = coord >= 0;
    const direction = isLat ? (positive ? "N" : "S") : positive ? "E" : "O";

    return `${Math.abs(coord).toFixed(4)}°${direction}`;
  };

  const isRecent = () => {
    if (!location.timestamp) return false;
    const hoursSince = (Date.now() - location.timestamp) / (1000 * 60 * 60);
    return hoursSince < 1; // Moins d'une heure
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {location.method === "gps" ? (
          <Navigation className="w-4 h-4 text-brand-blue" />
        ) : (
          <MapPin className="w-4 h-4 text-brand-blue" />
        )}
        <span className="text-sm text-text-primary font-mono">
          {formatCoordinate(location.latitude, "lat")},{" "}
          {formatCoordinate(location.longitude, "lon")}
        </span>
        {location.method === "gps" && isRecent() && (
          <div
            className="w-2 h-2 bg-green-400 rounded-full"
            title="Position récente"
          />
        )}
      </div>
    );
  }

  return (
    <div
      className={`p-3 bg-zinc-800/50 border border-zinc-700 rounded-lg ${className}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {location.method === "gps" ? (
            <Navigation className="w-4 h-4 text-brand-blue" />
          ) : (
            <MapPin className="w-4 h-4 text-brand-blue" />
          )}
          <span className="text-sm font-medium text-text-primary">
            {location.method === "gps" ? "Position GPS" : "Position manuelle"}
          </span>
        </div>
        {location.method === "gps" && isRecent() && (
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 bg-green-400 rounded-full" />
            <span className="text-xs text-green-400">Récent</span>
          </div>
        )}
      </div>

      <div className="space-y-1">
        <div className="text-sm text-text-secondary">
          Latitude:{" "}
          <span className="text-text-primary font-mono">
            {formatCoordinate(location.latitude, "lat")}
          </span>
        </div>
        <div className="text-sm text-text-secondary">
          Longitude:{" "}
          <span className="text-text-primary font-mono">
            {formatCoordinate(location.longitude, "lon")}
          </span>
        </div>

        {showAccuracy && location.accuracy && (
          <div className="text-xs text-text-secondary">
            Précision: ±{Math.round(location.accuracy)}m
          </div>
        )}

        {location.timestamp && (
          <div className="text-xs text-text-secondary">
            Mise à jour:{" "}
            {new Date(location.timestamp).toLocaleString("fr-FR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        )}
      </div>
    </div>
  );
}

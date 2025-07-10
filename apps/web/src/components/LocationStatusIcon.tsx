import {
  AlertTriangle,
  Clock,
  MapPin,
  Navigation,
  XCircle,
} from "lucide-react";

interface LocationStatusIconProps {
  status:
    | "idle"
    | "checking"
    | "requesting"
    | "denied"
    | "unavailable"
    | "success"
    | "error";
  hasLocation: boolean;
  className?: string;
}

export default function LocationStatusIcon({
  status,
  hasLocation,
  className = "w-5 h-5",
}: LocationStatusIconProps) {
  if (hasLocation && status === "success") {
    return <Navigation className={`${className} text-green-400`} />;
  }

  switch (status) {
    case "checking":
    case "requesting":
      return <Clock className={`${className} text-yellow-400`} />;
    case "denied":
      return <XCircle className={`${className} text-red-400`} />;
    case "unavailable":
    case "error":
      return <AlertTriangle className={`${className} text-orange-400`} />;
    case "success":
      return <Navigation className={`${className} text-green-400`} />;
    default:
      return <MapPin className={`${className} text-brand-blue`} />;
  }
}

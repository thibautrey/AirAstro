export interface LocationData {
  latitude: number;
  longitude: number;
  accuracy?: number;
  method: "gps" | "manual";
  timestamp?: number;
}

export interface LocationHookResult {
  location: LocationData | null;
  isLoading: boolean;
  autoLocationStatus:
    | "idle"
    | "checking"
    | "requesting"
    | "denied"
    | "unavailable"
    | "success"
    | "error";
  updateLocation: (location: LocationData) => void;
  clearLocation: () => void;
  formatLocation: (location: LocationData | null) => string;
  getLocationName: (location: LocationData | null) => string;
  isLocationCurrent: (location: LocationData | null) => boolean;
  requestAutoLocation: () => void;
}

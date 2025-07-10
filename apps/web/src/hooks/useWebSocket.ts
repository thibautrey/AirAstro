import { useEffect, useState } from "react";
import { webSocketService } from "../services/websocket.service";

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleConnected = () => {
      setIsConnected(true);
      setError(null);
    };

    const handleDisconnected = () => {
      setIsConnected(false);
    };

    const handleError = (err: any) => {
      setError(err.message || "Erreur WebSocket");
    };

    webSocketService.on("connected", handleConnected);
    webSocketService.on("disconnected", handleDisconnected);
    webSocketService.on("error", handleError);

    // Tenter la connexion
    webSocketService.connect();

    return () => {
      webSocketService.off("connected", handleConnected);
      webSocketService.off("disconnected", handleDisconnected);
      webSocketService.off("error", handleError);
    };
  }, []);

  return {
    isConnected,
    error,
    emit: webSocketService.emit.bind(webSocketService),
    on: webSocketService.on.bind(webSocketService),
    off: webSocketService.off.bind(webSocketService),
  };
}

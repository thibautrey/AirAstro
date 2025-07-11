import {
  CameraEvent,
  IndiEvent,
  indiWebSocketService,
} from "../services/indi-websocket.service";
import { useEffect, useRef } from "react";

interface UseIndiWebSocketOptions {
  autoConnect?: boolean;
  onIndiEvent?: (event: IndiEvent) => void;
  onCameraEvent?: (event: CameraEvent) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
  onError?: (error: any) => void;
}

export function useIndiWebSocket({
  autoConnect = true,
  onIndiEvent,
  onCameraEvent,
  onConnected,
  onDisconnected,
  onError,
}: UseIndiWebSocketOptions = {}) {
  const cleanupFunctions = useRef<(() => void)[]>([]);

  useEffect(() => {
    if (autoConnect) {
      // Connecter au WebSocket
      indiWebSocketService.connect();
    }

    // Nettoyer les listeners précédents
    cleanupFunctions.current.forEach((cleanup) => cleanup());
    cleanupFunctions.current = [];

    // Configurer les listeners
    if (onIndiEvent) {
      const cleanup = indiWebSocketService.on("indi", onIndiEvent);
      cleanupFunctions.current.push(cleanup);
    }

    if (onCameraEvent) {
      const cleanup = indiWebSocketService.on("camera", onCameraEvent);
      cleanupFunctions.current.push(cleanup);
    }

    if (onConnected) {
      const cleanup = indiWebSocketService.on("connected", onConnected);
      cleanupFunctions.current.push(cleanup);
    }

    if (onDisconnected) {
      const cleanup = indiWebSocketService.on("disconnected", onDisconnected);
      cleanupFunctions.current.push(cleanup);
    }

    if (onError) {
      const cleanup = indiWebSocketService.on("error", onError);
      cleanupFunctions.current.push(cleanup);
    }

    return () => {
      // Nettoyer les listeners
      cleanupFunctions.current.forEach((cleanup) => cleanup());
      cleanupFunctions.current = [];
    };
  }, [
    autoConnect,
    onIndiEvent,
    onCameraEvent,
    onConnected,
    onDisconnected,
    onError,
  ]);

  return {
    isConnected: indiWebSocketService.isConnected(),
    connect: () => indiWebSocketService.connect(),
    disconnect: () => indiWebSocketService.disconnect(),
    service: indiWebSocketService,
  };
}

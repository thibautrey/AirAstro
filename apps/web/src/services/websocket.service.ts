// Interface pour WebSocket (sans dépendance socket.io pour l'instant)
export interface WebSocketClient {
  connect(): void;
  disconnect(): void;
  on(event: string, callback: (data: any) => void): void;
  emit(event: string, data?: any): void;
}

// Service WebSocket simple avec l'API native
export class SimpleWebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnected = false;

  constructor() {
    this.url = import.meta.env.MODE === 'production' 
      ? `ws://${window.location.host}/ws`
      : 'ws://localhost:3000/ws';
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);
      
      this.ws.onopen = () => {
        console.log('WebSocket connecté');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.emit('connected');
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.handleMessage(data);
        } catch (error) {
          console.error('Erreur de parsing WebSocket:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('WebSocket fermé');
        this.isConnected = false;
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('Erreur WebSocket:', error);
        this.emit('error', error);
      };
    } catch (error) {
      console.error('Erreur de connexion WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private handleMessage(data: any): void {
    const { event, payload } = data;
    const listeners = this.listeners.get(event);
    
    if (listeners) {
      listeners.forEach(callback => callback(payload));
    }
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      setTimeout(() => {
        this.reconnectAttempts++;
        console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    }
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: (data: any) => void): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  emit(event: string, data?: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, payload: data }));
    }
  }

  isConnectedToSocket(): boolean {
    return this.isConnected;
  }
}

// Instance singleton
export const webSocketService = new SimpleWebSocketService();

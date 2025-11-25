import WebSocket from 'ws';
import { RootSenseConfig, ErrorEvent, MetricEvent } from '../types';

export class WebSocketClient {
  private config: Required<RootSenseConfig>;
  private ws: WebSocket | null = null;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 10;
  private isConnecting: boolean = false;

  constructor(config: Required<RootSenseConfig>) {
    this.config = config;
    if (config.enableWebSocket) {
      this.connect();
    }
  }

  private connect(): void {
    if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    this.isConnecting = true;
    const wsUrl = this.config.websocketUrl.replace(/^https?/, 'ws') + '/stream';

    try {
      this.ws = new WebSocket(wsUrl, {
        headers: {
          'X-API-Key': this.config.apiKey,
        },
      });

      this.ws.on('open', () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        console.log('[RootSense] WebSocket connected');
      });

      this.ws.on('error', (error) => {
        this.isConnecting = false;
        console.error('[RootSense] WebSocket error:', error);
      });

      this.ws.on('close', () => {
        this.isConnecting = false;
        this.ws = null;
        this.scheduleReconnect();
      });

      this.ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('[RootSense] Error parsing WebSocket message:', error);
        }
      });
    } catch (error) {
      this.isConnecting = false;
      console.error('[RootSense] WebSocket connection error:', error);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[RootSense] Max WebSocket reconnect attempts reached');
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Exponential backoff, max 30s
    this.reconnectTimer = setTimeout(() => {
      this.reconnectAttempts++;
      this.connect();
    }, delay);
  }

  private handleMessage(message: unknown): void {
    // Handle incoming messages from server (e.g., configuration updates)
    // This can be extended based on backend requirements
    if (typeof message === 'object' && message !== null) {
      console.log('[RootSense] Received WebSocket message:', message);
    }
  }

  sendError(error: ErrorEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'error', data: error }));
      } catch (error) {
        console.error('[RootSense] Error sending error via WebSocket:', error);
      }
    }
  }

  sendMetrics(metrics: MetricEvent): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify({ type: 'metrics', data: metrics }));
      } catch (error) {
        console.error('[RootSense] Error sending metrics via WebSocket:', error);
      }
    }
  }

  close(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}


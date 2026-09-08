/**
 * WebSocket Service for Real-time Analytics Data Streaming
 * Handles live updates from MongoDB change streams
 */

import { useState, useEffect } from 'react';
import { WebSocketEvent, RealtimeMetrics } from '@/types/analytics';

type EventCallback = (data: any) => void;
type ConnectionCallback = (connected: boolean) => void;

export class AnalyticsWebSocket {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000; // Start with 1 second
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private eventListeners: Map<string, EventCallback[]> = new Map();
  private connectionListeners: ConnectionCallback[] = [];
  private isConnecting = false;
  private shouldReconnect = true;

  private readonly wsUrl: string;
  private readonly protocols: string[];

  constructor() {
    this.wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
    this.protocols = ['analytics-v1'];
  }

  // Connect to WebSocket server
  connect(token?: string): Promise<void> {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return Promise.resolve();
    }

    if (this.isConnecting) {
      console.log('WebSocket connection already in progress');
      return Promise.resolve();
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    return new Promise((resolve, reject) => {
      try {
        const url = token ? `${this.wsUrl}?token=${token}` : this.wsUrl;
        console.log(`Connecting to WebSocket: ${url}`);

        this.ws = new WebSocket(url, this.protocols);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectInterval = 1000;
          this.startHeartbeat();
          this.notifyConnectionListeners(true);
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const data: WebSocketEvent = JSON.parse(event.data);
            this.handleMessage(data);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.notifyConnectionListeners(false);
          
          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.notifyConnectionListeners(false);
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  // Disconnect WebSocket
  disconnect(): void {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
  }

  // Send message to server
  send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket not connected. Message not sent:', data);
    }
  }

  // Subscribe to real-time updates for specific property
  subscribeToProperty(propertyId: string): void {
    this.send({
      type: 'subscribe',
      channel: 'property_updates',
      property_id: propertyId
    });
  }

  // Unsubscribe from property updates
  unsubscribeFromProperty(propertyId: string): void {
    this.send({
      type: 'unsubscribe',
      channel: 'property_updates',
      property_id: propertyId
    });
  }

  // Subscribe to portfolio-wide updates
  subscribeToPortfolio(): void {
    this.send({
      type: 'subscribe',
      channel: 'portfolio_updates'
    });
  }

  // Subscribe to anomaly notifications
  subscribeToAnomalies(): void {
    this.send({
      type: 'subscribe',
      channel: 'anomaly_alerts'
    });
  }

  // Subscribe to AI insights
  subscribeToInsights(): void {
    this.send({
      type: 'subscribe',
      channel: 'ai_insights'
    });
  }

  // Add event listener
  addEventListener(eventType: string, callback: EventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, []);
    }
    this.eventListeners.get(eventType)!.push(callback);
  }

  // Remove event listener
  removeEventListener(eventType: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  // Add connection listener
  addConnectionListener(callback: ConnectionCallback): void {
    this.connectionListeners.push(callback);
  }

  // Remove connection listener
  removeConnectionListener(callback: ConnectionCallback): void {
    const index = this.connectionListeners.indexOf(callback);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  // Get connection status
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Private methods
  private handleMessage(data: WebSocketEvent): void {
    console.log('Received WebSocket message:', data);

    const listeners = this.eventListeners.get(data.type) || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });

    // Handle specific event types
    switch (data.type) {
      case 'realtime_update':
        this.handleRealtimeUpdate(data);
        break;
      case 'anomaly_detected':
        this.handleAnomalyDetected(data);
        break;
      case 'insight_generated':
        this.handleInsightGenerated(data);
        break;
      case 'data_refresh':
        this.handleDataRefresh(data);
        break;
      default:
        console.log('Unknown event type:', data.type);
    }
  }

  private handleRealtimeUpdate(data: WebSocketEvent): void {
    // Handle real-time metrics updates
    const propertyListeners = this.eventListeners.get('property_update') || [];
    propertyListeners.forEach(callback => {
      try {
        callback({
          property_id: data.property_id,
          metrics: data.data,
          timestamp: data.timestamp
        });
      } catch (error) {
        console.error('Error in property update callback:', error);
      }
    });
  }

  private handleAnomalyDetected(data: WebSocketEvent): void {
    // Handle anomaly detection alerts
    const anomalyListeners = this.eventListeners.get('anomaly_alert') || [];
    anomalyListeners.forEach(callback => {
      try {
        callback({
          anomaly: data.data,
          timestamp: data.timestamp,
          property_id: data.property_id
        });
      } catch (error) {
        console.error('Error in anomaly callback:', error);
      }
    });
  }

  private handleInsightGenerated(data: WebSocketEvent): void {
    // Handle new AI insights
    const insightListeners = this.eventListeners.get('ai_insight') || [];
    insightListeners.forEach(callback => {
      try {
        callback({
          insight: data.data,
          timestamp: data.timestamp,
          property_id: data.property_id
        });
      } catch (error) {
        console.error('Error in insight callback:', error);
      }
    });
  }

  private handleDataRefresh(data: WebSocketEvent): void {
    // Handle data refresh notifications
    const refreshListeners = this.eventListeners.get('data_refresh') || [];
    refreshListeners.forEach(callback => {
      try {
        callback({
          data_type: data.data.data_type,
          property_id: data.property_id,
          timestamp: data.timestamp
        });
      } catch (error) {
        console.error('Error in data refresh callback:', error);
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: 'ping', timestamp: new Date().toISOString() });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1), 30000);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.shouldReconnect && !this.isConnecting) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private notifyConnectionListeners(connected: boolean): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }
}

// Singleton instance
export const analyticsWebSocket = new AnalyticsWebSocket();

// React Hook for WebSocket usage
export const useAnalyticsWebSocket = () => {
  const [isConnected, setIsConnected] = useState(analyticsWebSocket.isConnected());
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);

  useEffect(() => {
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    const handleMessage = (data: WebSocketEvent) => {
      setLastMessage(data);
    };

    analyticsWebSocket.addConnectionListener(handleConnectionChange);
    analyticsWebSocket.addEventListener('realtime_update', handleMessage);
    analyticsWebSocket.addEventListener('anomaly_detected', handleMessage);
    analyticsWebSocket.addEventListener('insight_generated', handleMessage);

    return () => {
      analyticsWebSocket.removeConnectionListener(handleConnectionChange);
      analyticsWebSocket.removeEventListener('realtime_update', handleMessage);
      analyticsWebSocket.removeEventListener('anomaly_detected', handleMessage);
      analyticsWebSocket.removeEventListener('insight_generated', handleMessage);
    };
  }, []);

  const connect = async (token?: string) => {
    try {
      await analyticsWebSocket.connect(token);
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
    }
  };

  const disconnect = () => {
    analyticsWebSocket.disconnect();
  };

  const subscribeToProperty = (propertyId: string) => {
    analyticsWebSocket.subscribeToProperty(propertyId);
  };

  const unsubscribeFromProperty = (propertyId: string) => {
    analyticsWebSocket.unsubscribeFromProperty(propertyId);
  };

  const subscribeToPortfolio = () => {
    analyticsWebSocket.subscribeToPortfolio();
  };

  const subscribeToAnomalies = () => {
    analyticsWebSocket.subscribeToAnomalies();
  };

  const subscribeToInsights = () => {
    analyticsWebSocket.subscribeToInsights();
  };

  return {
    isConnected,
    lastMessage,
    connect,
    disconnect,
    subscribeToProperty,
    unsubscribeFromProperty,
    subscribeToPortfolio,
    subscribeToAnomalies,
    subscribeToInsights,
  };
};

// Export for direct usage
export default analyticsWebSocket;
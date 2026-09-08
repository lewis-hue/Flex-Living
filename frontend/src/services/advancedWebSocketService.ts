/**
 * Advanced Real-time Analytics WebSocket Service
 * Provides comprehensive real-time data streaming with React hooks integration
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketEvent, RealtimeMetrics, AnalyticsEvent, EventType, EventPriority } from '@/types/analytics';

type EventCallback = (data: any) => void;
type ConnectionCallback = (connected: boolean, error?: string) => void;
type MetricsCallback = (metrics: RealtimeMetrics) => void;

interface WebSocketConfig {
  url: string;
  protocols: string[];
  heartbeatInterval: number;
  maxReconnectAttempts: number;
  reconnectInterval: number;
  reconnectBackoffFactor: number;
  connectionTimeout: number;
}

interface ClientSubscription {
  id: string;
  type: 'property' | 'user' | 'event_type';
  value: string;
  filters?: Record<string, any>;
  active: boolean;
}

interface RealtimeState {
  isConnected: boolean;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error' | 'reconnecting';
  lastMessage: WebSocketEvent | null;
  metrics: RealtimeMetrics;
  subscriptions: ClientSubscription[];
  queuedMessages: number;
  errorCount: number;
  totalMessages: number;
}

interface BatchConfig {
  enabled: boolean;
  maxSize: number;
  timeout: number;
}

export class AdvancedAnalyticsWebSocket {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private connectionTimeout: NodeJS.Timeout | null = null;
  
  // Event system
  private eventListeners: Map<string, Set<EventCallback>> = new Map();
  private connectionListeners: Set<ConnectionCallback> = new Set();
  private metricsListeners: Set<MetricsCallback> = new Set();
  
  // State management
  private isConnecting = false;
  private shouldReconnect = true;
  private isManualDisconnect = false;
  
  // Batching
  private messageQueue: any[] = [];
  private batchConfig: BatchConfig = {
    enabled: true,
    maxSize: 50,
    timeout: 1000
  };
  private batchTimer: NodeJS.Timeout | null = null;
  
  // Metrics
  private metrics: RealtimeMetrics = {
    latency: 0,
    messageCount: 0,
    errorCount: 0,
    connectionUptime: 0,
    lastHeartbeat: null,
    throughput: 0,
    queueSize: 0
  };
  private metricsHistory: number[] = [];
  private connectionStartTime: number | null = null;
  
  constructor(customConfig?: Partial<WebSocketConfig>) {
    this.config = {
      url: customConfig?.url || import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
      protocols: customConfig?.protocols || ['analytics-v1'],
      heartbeatInterval: customConfig?.heartbeatInterval || 30000,
      maxReconnectAttempts: customConfig?.maxReconnectAttempts || 10,
      reconnectInterval: customConfig?.reconnectInterval || 1000,
      reconnectBackoffFactor: customConfig?.reconnectBackoffFactor || 1.5,
      connectionTimeout: customConfig?.connectionTimeout || 10000,
      ...customConfig
    };
  }

  // Core connection management
  async connect(token?: string, userId?: string): Promise<void> {
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
    this.isManualDisconnect = false;
    this.connectionStartTime = Date.now();
    this.reconnectAttempts = 0;

    return new Promise((resolve, reject) => {
      try {
        const url = this.buildUrl(token, userId);
        console.log(`Connecting to WebSocket: ${url}`);

        this.ws = new WebSocket(url, this.config.protocols);
        this.setupConnectionTimeout();

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.reconnectTimer && clearTimeout(this.reconnectTimer);
          this.connectionTimeout && clearTimeout(this.connectionTimeout);
          this.startHeartbeat();
          this.startMetricsCollection();
          this.notifyConnectionListeners(true);
          this.handleInitialSubscriptions();
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };

        this.ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          this.isConnecting = false;
          this.stopHeartbeat();
          this.stopMetricsCollection();
          this.notifyConnectionListeners(false, event.reason);
          
          if (!this.isManualDisconnect && this.shouldReconnect && this.reconnectAttempts < this.config.maxReconnectAttempts) {
            this.scheduleReconnect();
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.notifyConnectionListeners(false, 'Connection error');
          reject(error);
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.isManualDisconnect = true;
    this.stopHeartbeat();
    this.stopMetricsCollection();
    this.clearReconnectTimer();
    this.clearConnectionTimeout();
    this.clearBatchTimer();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  // URL and connection helpers
  private buildUrl(token?: string, userId?: string): string {
    const baseUrl = this.config.url;
    const params = new URLSearchParams();
    
    if (token) params.append('token', token);
    if (userId) params.append('user_id', userId);
    params.append('client_version', '2.0');
    params.append('features', 'batch,compression,heartbeat');
    
    const queryString = params.toString();
    return queryString ? `${baseUrl}?${queryString}` : baseUrl;
  }

  private setupConnectionTimeout(): void {
    this.connectionTimeout = setTimeout(() => {
      if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
        console.warn('Connection timeout');
        this.ws.close();
        this.isConnecting = false;
      }
    }, this.config.connectionTimeout);
  }

  // Message handling with batching
  private handleMessage(data: string): void {
    try {
      const message: WebSocketEvent = JSON.parse(data);
      this.updateMetrics(message);
      this.handleRealtimeMessage(message);
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
      this.metrics.errorCount++;
    }
  }

  private handleRealtimeMessage(message: WebSocketEvent): void {
    // Handle different message types
    switch (message.type) {
      case 'batch_update':
        this.handleBatchUpdate(message);
        break;
      case 'heartbeat':
        this.handleHeartbeat(message);
        break;
      case 'metrics_update':
        this.handleMetricsUpdate(message);
        break;
      case 'queued_messages':
        this.handleQueuedMessages(message);
        break;
      default:
        this.handleStandardEvent(message);
    }
  }

  private handleBatchUpdate(message: WebSocketEvent): void {
    if (message.data?.events && Array.isArray(message.data.events)) {
      message.data.events.forEach((event: any) => {
        this.handleStandardEvent({ ...message, data: event });
      });
    }
  }

  private handleHeartbeat(message: WebSocketEvent): void {
    this.metrics.lastHeartbeat = new Date().toISOString();
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({ 
        type: 'heartbeat_response', 
        timestamp: new Date().toISOString(),
        latency: Date.now() - new Date(message.timestamp).getTime()
      });
    }
  }

  private handleMetricsUpdate(message: WebSocketEvent): void {
    if (message.data?.metrics) {
      this.metrics = { ...this.metrics, ...message.data.metrics };
      this.notifyMetricsListeners(this.metrics);
    }
  }

  private handleQueuedMessages(message: WebSocketEvent): void {
    if (message.data?.messages && Array.isArray(message.data.messages)) {
      message.data.messages.forEach((queuedMessage: any) => {
        this.handleStandardEvent(queuedMessage);
      });
    }
  }

  private handleStandardEvent(message: WebSocketEvent): void {
    // Process event through listeners
    const listeners = this.eventListeners.get(message.type) || new Set();
    listeners.forEach(callback => {
      try {
        callback(message);
      } catch (error) {
        console.error('Error in event callback:', error);
      }
    });

    // Update last message
    this.setLastMessage(message);
  }

  // Batching system
  private send(data: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (this.batchConfig.enabled) {
        this.addToBatch(data);
      } else {
        this.ws.send(JSON.stringify(data));
        this.metrics.messageCount++;
      }
    } else {
      console.warn('WebSocket not connected. Message queued:', data);
      this.messageQueue.push(data);
      this.metrics.queueSize = this.messageQueue.length;
    }
  }

  private addToBatch(data: any): void {
    this.messageQueue.push(data);
    
    if (this.messageQueue.length >= this.batchConfig.maxSize) {
      this.flushBatch();
    } else {
      this.startBatchTimer();
    }
  }

  private startBatchTimer(): void {
    if (this.batchTimer) return;
    
    this.batchTimer = setTimeout(() => {
      this.flushBatch();
    }, this.batchConfig.timeout);
  }

  private flushBatch(): void {
    if (this.messageQueue.length === 0) return;
    
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const batchData = {
        type: 'batch_message',
        data: {
          messages: [...this.messageQueue],
          timestamp: new Date().toISOString()
        }
      };
      
      this.ws.send(JSON.stringify(batchData));
      this.metrics.messageCount += this.messageQueue.length;
      this.messageQueue = [];
      this.metrics.queueSize = 0;
    }
    
    this.clearBatchTimer();
  }

  private clearBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }
  }

  // Heartbeat management
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({ 
          type: 'heartbeat', 
          timestamp: new Date().toISOString() 
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Metrics collection
  private startMetricsCollection(): void {
    this.metricsCollectionInterval = setInterval(() => {
      this.updateMetricsHistory();
      this.calculateThroughput();
      this.notifyMetricsListeners(this.metrics);
    }, 5000);
  }

  private stopMetricsCollection(): void {
    if (this.metricsCollectionInterval) {
      clearInterval(this.metricsCollectionInterval);
      this.metricsCollectionInterval = null;
    }
  }

  private updateMetrics(message: WebSocketEvent): void {
    if (message.timestamp) {
      const now = Date.now();
      const messageTime = new Date(message.timestamp).getTime();
      this.metrics.latency = now - messageTime;
      this.metricsHistory.push(this.metrics.latency);
      
      // Keep only recent latency measurements
      if (this.metricsHistory.length > 100) {
        this.metricsHistory.shift();
      }
    }
    
    this.metrics.messageCount++;
  }

  private updateMetricsHistory(): void {
    if (this.metricsHistory.length > 0) {
      const avgLatency = this.metricsHistory.reduce((a, b) => a + b, 0) / this.metricsHistory.length;
      this.metrics.latency = avgLatency;
    }
  }

  private calculateThroughput(): void {
    // Calculate messages per second
    const now = Date.now();
    if (this.connectionStartTime) {
      const duration = (now - this.connectionStartTime) / 1000;
      this.metrics.throughput = this.metrics.messageCount / duration;
      this.metrics.connectionUptime = duration;
    }
  }

  // Reconnection logic
  private scheduleReconnect(): void {
    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(this.config.reconnectBackoffFactor, this.reconnectAttempts - 1),
      30000
    );
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      if (this.shouldReconnect && !this.isConnecting) {
        this.connect().catch(error => {
          console.error('Reconnection failed:', error);
        });
      }
    }, delay);
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearConnectionTimeout(): void {
    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }
  }

  // Subscription management
  private subscriptions: ClientSubscription[] = [];

  subscribeToProperty(propertyId: string, filters?: Record<string, any>): void {
    const subscription: ClientSubscription = {
      id: `property_${propertyId}_${Date.now()}`,
      type: 'property',
      value: propertyId,
      filters,
      active: true
    };
    
    this.subscriptions.push(subscription);
    this.send({
      type: 'subscribe',
      channel: 'property_updates',
      subscription: {
        id: subscription.id,
        property_id: propertyId,
        filters
      }
    });
  }

  unsubscribeFromProperty(propertyId: string): void {
    const subscription = this.subscriptions.find(
      sub => sub.type === 'property' && sub.value === propertyId && sub.active
    );
    
    if (subscription) {
      subscription.active = false;
      this.send({
        type: 'unsubscribe',
        channel: 'property_updates',
        subscription_id: subscription.id
      });
    }
  }

  subscribeToUser(userId: string): void {
    const subscription: ClientSubscription = {
      id: `user_${userId}_${Date.now()}`,
      type: 'user',
      value: userId,
      active: true
    };
    
    this.subscriptions.push(subscription);
    this.send({
      type: 'subscribe',
      channel: 'user_updates',
      subscription: {
        id: subscription.id,
        user_id: userId
      }
    });
  }

  subscribeToEventType(eventType: EventType): void {
    const subscription: ClientSubscription = {
      id: `event_${eventType}_${Date.now()}`,
      type: 'event_type',
      value: eventType,
      active: true
    };
    
    this.subscriptions.push(subscription);
    this.send({
      type: 'subscribe',
      channel: 'event_updates',
      subscription: {
        id: subscription.id,
        event_type: eventType
      }
    });
  }

  private handleInitialSubscriptions(): void {
    // Re-subscribe to all active subscriptions after reconnection
    this.subscriptions
      .filter(sub => sub.active)
      .forEach(subscription => {
        this.send({
          type: 'subscribe',
          channel: 'resubscribe',
          subscription: {
            id: subscription.id,
            ...subscription
          }
        });
      });
  }

  // Event system
  addEventListener(eventType: string, callback: EventCallback): void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(callback);
  }

  removeEventListener(eventType: string, callback: EventCallback): void {
    const listeners = this.eventListeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.eventListeners.delete(eventType);
      }
    }
  }

  addConnectionListener(callback: ConnectionCallback): void {
    this.connectionListeners.add(callback);
  }

  removeConnectionListener(callback: ConnectionCallback): void {
    this.connectionListeners.delete(callback);
  }

  addMetricsListener(callback: MetricsCallback): void {
    this.metricsListeners.add(callback);
  }

  removeMetricsListener(callback: MetricsCallback): void {
    this.metricsListeners.delete(callback);
  }

  // State setters
  private setLastMessage(message: WebSocketEvent): void {
    this.setState(prev => ({ ...prev, lastMessage: message }));
  }

  private setState(updater: (prev: RealtimeState) => RealtimeState): void {
    // This would typically integrate with React state management
    // For now, we'll just log the state changes
    const newState = updater(this.getCurrentState());
    this.currentState = newState;
  }

  // Notification methods
  private notifyConnectionListeners(connected: boolean, error?: string): void {
    this.connectionListeners.forEach(callback => {
      try {
        callback(connected, error);
      } catch (error) {
        console.error('Error in connection callback:', error);
      }
    });
  }

  private notifyMetricsListeners(metrics: RealtimeMetrics): void {
    this.metricsListeners.forEach(callback => {
      try {
        callback(metrics);
      } catch (error) {
        console.error('Error in metrics callback:', error);
      }
    });
  }

  // Utility methods
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getMetrics(): RealtimeMetrics {
    return { ...this.metrics };
  }

  getQueuedMessageCount(): number {
    return this.messageQueue.length;
  }

  getActiveSubscriptions(): ClientSubscription[] {
    return this.subscriptions.filter(sub => sub.active);
  }

  // State management (simplified)
  private currentState: RealtimeState = {
    isConnected: false,
    connectionStatus: 'disconnected',
    lastMessage: null,
    metrics: this.metrics,
    subscriptions: [],
    queuedMessages: 0,
    errorCount: 0,
    totalMessages: 0
  };

  private metricsCollectionInterval: NodeJS.Timeout | null = null;

  getCurrentState(): RealtimeState {
    return {
      ...this.currentState,
      isConnected: this.isConnected(),
      metrics: this.metrics,
      queuedMessages: this.messageQueue.length,
      errorCount: this.metrics.errorCount,
      totalMessages: this.metrics.messageCount
    };
  }
}

// Singleton instance
export const advancedAnalyticsWebSocket = new AdvancedAnalyticsWebSocket();

// Advanced React Hook for comprehensive real-time analytics
export const useAdvancedAnalyticsWebSocket = (autoConnect = true) => {
  const [state, setState] = useState<RealtimeState>({
    isConnected: false,
    connectionStatus: 'disconnected',
    lastMessage: null,
    metrics: {
      latency: 0,
      messageCount: 0,
      errorCount: 0,
      connectionUptime: 0,
      lastHeartbeat: null,
      throughput: 0,
      queueSize: 0
    },
    subscriptions: [],
    queuedMessages: 0,
    errorCount: 0,
    totalMessages: 0
  });

  const [isInitialized, setIsInitialized] = useState(false);

  // Connection management
  const connect = useCallback(async (token?: string, userId?: string) => {
    setState(prev => ({ ...prev, connectionStatus: 'connecting' }));
    try {
      await advancedAnalyticsWebSocket.connect(token, userId);
      setState(prev => ({ ...prev, connectionStatus: 'connected' }));
    } catch (error) {
      setState(prev => ({ ...prev, connectionStatus: 'error' }));
      throw error;
    }
  }, []);

  const disconnect = useCallback(() => {
    advancedAnalyticsWebSocket.disconnect();
    setState(prev => ({ 
      ...prev, 
      connectionStatus: 'disconnected',
      isConnected: false 
    }));
  }, []);

  // Event listeners
  useEffect(() => {
    if (!isInitialized && autoConnect) {
      setIsInitialized(true);
      connect().catch(console.error);
    }

    const handleConnectionChange = (connected: boolean, error?: string) => {
      setState(prev => ({
        ...prev,
        isConnected: connected,
        connectionStatus: connected ? 'connected' : 'disconnected',
        errorCount: error ? prev.errorCount + 1 : prev.errorCount
      }));
    };

    const handleMetricsUpdate = (metrics: RealtimeMetrics) => {
      setState(prev => ({
        ...prev,
        metrics,
        queuedMessages: advancedAnalyticsWebSocket.getQueuedMessageCount()
      }));
    };

    advancedAnalyticsWebSocket.addConnectionListener(handleConnectionChange);
    advancedAnalyticsWebSocket.addMetricsListener(handleMetricsUpdate);

    return () => {
      advancedAnalyticsWebSocket.removeConnectionListener(handleConnectionChange);
      advancedAnalyticsWebSocket.removeMetricsListener(handleMetricsUpdate);
    };
  }, [connect, autoConnect, isInitialized]);

  // Subscription methods
  const subscribeToProperty = useCallback((propertyId: string, filters?: Record<string, any>) => {
    advancedAnalyticsWebSocket.subscribeToProperty(propertyId, filters);
    setState(prev => ({
      ...prev,
      subscriptions: advancedAnalyticsWebSocket.getActiveSubscriptions()
    }));
  }, []);

  const unsubscribeFromProperty = useCallback((propertyId: string) => {
    advancedAnalyticsWebSocket.unsubscribeFromProperty(propertyId);
    setState(prev => ({
      ...prev,
      subscriptions: advancedAnalyticsWebSocket.getActiveSubscriptions()
    }));
  }, []);

  const subscribeToUser = useCallback((userId: string) => {
    advancedAnalyticsWebSocket.subscribeToUser(userId);
    setState(prev => ({
      ...prev,
      subscriptions: advancedAnalyticsWebSocket.getActiveSubscriptions()
    }));
  }, []);

  const subscribeToEventType = useCallback((eventType: EventType) => {
    advancedAnalyticsWebSocket.subscribeToEventType(eventType);
    setState(prev => ({
      ...prev,
      subscriptions: advancedAnalyticsWebSocket.getActiveSubscriptions()
    }));
  }, []);

  // Real-time data hooks
  const usePropertyUpdates = (propertyId: string) => {
    const [updates, setUpdates] = useState<any[]>([]);

    useEffect(() => {
      const handlePropertyUpdate = (data: any) => {
        if (data.property_id === propertyId) {
          setUpdates(prev => [...prev.slice(-49), data]); // Keep last 50 updates
        }
      };

      advancedAnalyticsWebSocket.addEventListener('property_update', handlePropertyUpdate);
      advancedAnalyticsWebSocket.addEventListener('analytics_event', handlePropertyUpdate);

      return () => {
        advancedAnalyticsWebSocket.removeEventListener('property_update', handlePropertyUpdate);
        advancedAnalyticsWebSocket.removeEventListener('analytics_event', handlePropertyUpdate);
      };
    }, [propertyId]);

    return updates;
  };

  const useSentimentChanges = (propertyId?: string) => {
    const [sentimentChanges, setSentimentChanges] = useState<any[]>([]);

    useEffect(() => {
      const handleSentimentChange = (data: any) => {
        if (!propertyId || data.property_id === propertyId) {
          setSentimentChanges(prev => [...prev.slice(-99), data]); // Keep last 100 sentiment changes
        }
      };

      advancedAnalyticsWebSocket.addEventListener('sentiment_changed', handleSentimentChange);
      advancedAnalyticsWebSocket.addEventListener('analytics_event', handleSentimentChange);

      return () => {
        advancedAnalyticsWebSocket.removeEventListener('sentiment_changed', handleSentimentChange);
        advancedAnalyticsWebSocket.removeEventListener('analytics_event', handleSentimentChange);
      };
    }, [propertyId]);

    return sentimentChanges;
  };

  const useAnomalyAlerts = () => {
    const [alerts, setAlerts] = useState<any[]>([]);

    useEffect(() => {
      const handleAnomalyAlert = (data: any) => {
        setAlerts(prev => [...prev, {
          ...data,
          timestamp: new Date().toISOString(),
          id: `alert_${Date.now()}_${Math.random()}`
        }]);
      };

      advancedAnalyticsWebSocket.addEventListener('anomaly_detected', handleAnomalyAlert);
      advancedAnalyticsWebSocket.addEventListener('system_alert', handleAnomalyAlert);

      return () => {
        advancedAnalyticsWebSocket.removeEventListener('anomaly_detected', handleAnomalyAlert);
        advancedAnalyticsWebSocket.removeEventListener('system_alert', handleAnomalyAlert);
      };
    }, []);

    return alerts;
  };

  const useAIInsights = (propertyId?: string) => {
    const [insights, setInsights] = useState<any[]>([]);

    useEffect(() => {
      const handleInsight = (data: any) => {
        if (!propertyId || data.property_id === propertyId) {
          setInsights(prev => [...prev.slice(-19), data]); // Keep last 20 insights
        }
      };

      advancedAnalyticsWebSocket.addEventListener('ai_insight_generated', handleInsight);
      advancedAnalyticsWebSocket.addEventListener('analytics_event', handleInsight);

      return () => {
        advancedAnalyticsWebSocket.removeEventListener('ai_insight_generated', handleInsight);
        advancedAnalyticsWebSocket.removeEventListener('analytics_event', handleInsight);
      };
    }, [propertyId]);

    return insights;
  };

  // Performance monitoring
  const usePerformanceMetrics = () => {
    const [performance, setPerformance] = useState({
      latency: 0,
      throughput: 0,
      errorRate: 0,
      connectionQuality: 'good' as 'excellent' | 'good' | 'poor' | 'disconnected'
    });

    useEffect(() => {
      const updatePerformance = () => {
        const metrics = advancedAnalyticsWebSocket.getMetrics();
        const errorRate = metrics.messageCount > 0 ? (metrics.errorCount / metrics.messageCount) * 100 : 0;
        
        let quality: 'excellent' | 'good' | 'poor' | 'disconnected' = 'disconnected';
        if (state.isConnected) {
          if (metrics.latency < 50 && errorRate < 1) quality = 'excellent';
          else if (metrics.latency < 200 && errorRate < 5) quality = 'good';
          else quality = 'poor';
        }

        setPerformance({
          latency: metrics.latency,
          throughput: metrics.throughput,
          errorRate,
          connectionQuality: quality
        });
      };

      const interval = setInterval(updatePerformance, 2000);
      updatePerformance(); // Initial update

      return () => clearInterval(interval);
    }, [state.isConnected]);

    return performance;
  };

  // Batch sending control
  const flushBatch = useCallback(() => {
    // This would need to be exposed in the WebSocket class
    console.log('Flush batch requested');
  }, []);

  const clearQueue = useCallback(() => {
    // This would need to be implemented in the WebSocket class
    console.log('Clear queue requested');
  }, []);

  return {
    // Connection state
    ...state,
    connect,
    disconnect,
    
    // Subscriptions
    subscribeToProperty,
    unsubscribeFromProperty,
    subscribeToUser,
    subscribeToEventType,
    
    // Real-time data hooks
    usePropertyUpdates,
    useSentimentChanges,
    useAnomalyAlerts,
    useAIInsights,
    
    // Performance monitoring
    usePerformanceMetrics,
    
    // Batch control
    flushBatch,
    clearQueue,
    
    // Utility methods
    getMetrics: () => advancedAnalyticsWebSocket.getMetrics(),
    getQueuedMessageCount: () => advancedAnalyticsWebSocket.getQueuedMessageCount(),
    getActiveSubscriptions: () => advancedAnalyticsWebSocket.getActiveSubscriptions(),
    isConnected: () => advancedAnalyticsWebSocket.isConnected()
  };
};

export default advancedAnalyticsWebSocket;
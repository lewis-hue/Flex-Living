/**
 * Core TypeScript interfaces for Flex Living Analytics Dashboard
 * Based on MongoDB analytics architecture
 */

// Base analytics data structures
export interface AnalyticsDataPoint {
  timestamp: string;
  value: number;
  property_id?: string;
  category?: string;
}

export interface PropertyAnalytics {
  property_id: string;
  property_name: string;
  average_rating: number;
  total_reviews: number;
  sentiment_score: number;
  performance_score: number;
  last_updated: string;
  trends: {
    rating_trend: 'up' | 'down' | 'stable';
    sentiment_trend: 'up' | 'down' | 'stable';
    review_count_trend: 'up' | 'down' | 'stable';
  };
}

// Sentiment Analysis Types
export interface SentimentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  confidence: number;
  emotional_indicators: string[];
  sentiment_drivers: string[];
  intensity: 'low' | 'medium' | 'high';
  context_dependent: boolean;
  recommendation: string;
  processing_service: 'groq' | 'gemini';
  processed_at: string;
}

export interface SentimentTrend {
  date: string;
  positive_count: number;
  negative_count: number;
  neutral_count: number;
  total_reviews: number;
  average_score: number;
  property_id?: string;
}

// Enhanced Review Types
export interface EnhancedReview {
  id: string;
  property_id: string;
  property_name: string;
  source_platform: 'hostaway' | 'google' | 'airbnb' | 'direct';
  rating: number;
  public_review: string;
  guest_name?: string;
  review_date: string;
  sentiment_analysis: SentimentAnalysis;
  topics?: {
    main_topics: string[];
    service_aspects: {
      cleanliness: string;
      communication: string;
      location: string;
      value: string;
      amenities: string;
      staff: string;
    };
    topic_sentiment: Record<string, string>;
    importance_scores: Record<string, number>;
    emerging_trends: string[];
    actionable_insights: string[];
  };
  ai_insights?: {
    business_impact: 'low' | 'medium' | 'high';
    guest_satisfaction_level: number;
    risk_assessment: {
      risk_level: 'low' | 'medium' | 'high';
      risk_factors: string[];
      mitigation_suggestions: string[];
    };
    improvement_opportunities: Array<{
      area: string;
      priority: 'high' | 'medium' | 'low';
      action: string;
      expected_impact: string;
    }>;
    positive_reinforcement: string[];
    predictive_indicators: {
      future_satisfaction: 'positive' | 'negative' | 'neutral';
      retention_likelihood: number;
      recommendation_likelihood: number;
    };
    competitive_analysis: string;
    manager_action_items: string[];
  };
  created_at: string;
  updated_at: string;
}

// Manager Performance Types
export interface ManagerPerformance {
  manager_id: string;
  manager_name: string;
  property_ids: string[];
  performance_metrics: {
    response_rate: number;
    average_response_time: number;
    resolution_rate: number;
    guest_satisfaction_score: number;
    review_ratings_avg: number;
    comment_quality_score: number;
  };
  gantt_data: Array<{
    task: string;
    start: string;
    end: string;
    progress: number;
    assignee: string;
  }>;
  scorecard: {
    strengths: string[];
    areas_for_improvement: string[];
    recommendations: string[];
    performance_trend: 'improving' | 'declining' | 'stable';
  };
  period_start: string;
  period_end: string;
}

// Anomaly Detection Types
export interface AnomalyDetection {
  id: string;
  property_id?: string;
  anomaly_type: 'rating_drop' | 'sentiment_shift' | 'review_volume_spike' | 'keyword_anomaly';
  severity: 'low' | 'medium' | 'high' | 'critical';
  detected_at: string;
  description: string;
  affected_metrics: string[];
  confidence_score: number;
  recommended_actions: string[];
  status: 'detected' | 'investigating' | 'resolved' | 'dismissed';
  assigned_to?: string;
  resolved_at?: string;
}

// AI Insights and Recommendations
export interface AIInsight {
  id: string;
  type: 'trend' | 'opportunity' | 'risk' | 'recommendation' | 'prediction';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  confidence: number;
  impact_score: number;
  affected_properties: string[];
  suggested_actions: Array<{
    action: string;
    priority: 'low' | 'medium' | 'high';
    estimated_impact: string;
    timeline: string;
    resources_required: string;
  }>;
  generated_at: string;
  expires_at?: string;
  status: 'active' | 'dismissed' | 'implemented';
}

// Portfolio Analytics
export interface PortfolioAnalytics {
  portfolio_id: string;
  portfolio_name: string;
  total_properties: number;
  active_properties: number;
  overall_metrics: {
    average_rating: number;
    total_reviews: number;
    positive_sentiment_percentage: number;
    guest_satisfaction_score: number;
    occupancy_rate: number;
    revenue_impact: number;
  };
  property_rankings: Array<{
    property_id: string;
    property_name: string;
    rank: number;
    performance_score: number;
    key_differentiator: string;
  }>;
  trend_analysis: {
    period_comparison: {
      current_period: string;
      previous_period: string;
      rating_change: number;
      sentiment_change: number;
      review_count_change: number;
    };
    predictions: {
      next_quarter_rating: number;
      growth_opportunities: string[];
      risk_factors: string[];
    };
  };
  strategic_recommendations: Array<{
    recommendation: string;
    priority: 'high' | 'medium' | 'low';
    expected_roi: string;
    timeline: string;
    resources_required: string;
  }>;
  competitive_analysis: string;
  market_positioning: string;
  generated_at: string;
}

// Chart Data Types
export interface ChartDataPoint {
  name: string;
  value: number;
  category?: string;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  date: string;
  [key: string]: number | string;
}

export interface HeatmapData {
  x: string;
  y: string;
  value: number;
  intensity: number;
}

// WebSocket Event Types
export interface WebSocketEvent {
  type: 'realtime_update' | 'anomaly_detected' | 'insight_generated' | 'data_refresh' | 'batch_update' | 'heartbeat' | 'metrics_update' | 'queued_messages' | 'analytics_event';
  event_type: string;
  data: any;
  timestamp: string;
  property_id?: string;
  user_id?: string;
}

export interface RealtimeMetrics {
  property_id: string;
  live_rating: number;
  live_sentiment: number;
  new_reviews_count: number;
  last_update: string;
  // Additional real-time metrics for WebSocket
  latency: number;
  messageCount: number;
  errorCount: number;
  connectionUptime: number;
  lastHeartbeat: string | null;
  throughput: number;
  queueSize: number;
}

// Event processing types
export enum EventType {
  REVIEW_CREATED = "review_created",
  REVIEW_UPDATED = "review_updated",
  SENTIMENT_CHANGED = "sentiment_changed",
  PROPERTY_UPDATED = "property_updated",
  AI_INSIGHT_GENERATED = "ai_insight_generated",
  ANOMALY_DETECTED = "anomaly_detected",
  SYSTEM_ALERT = "system_alert",
  PERFORMANCE_UPDATE = "performance_update",
  PORTFOLIO_UPDATE = "portfolio_update"
}

export enum EventPriority {
  CRITICAL = 1,
  HIGH = 2,
  NORMAL = 3,
  LOW = 4
}

export interface AnalyticsEvent {
  event_id: string;
  event_type: EventType;
  priority: EventPriority;
  property_id?: string;
  user_id?: string;
  data: any;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
  retry_count: number;
  created_at: string;
}

// Filter and Search Types
export interface AnalyticsFilter {
  date_range: {
    start: string;
    end: string;
  };
  property_ids: string[];
  sentiment_types: ('positive' | 'negative' | 'neutral')[];
  rating_range: {
    min: number;
    max: number;
  };
  sources: string[];
  managers: string[];
  metrics: string[];
}

export interface SearchQuery {
  query: string;
  filters: AnalyticsFilter;
  sort_by: string;
  sort_order: 'asc' | 'desc';
  limit: number;
  offset: number;
}

// Export Types
export interface ExportRequest {
  format: 'pdf' | 'csv' | 'xlsx';
  data_types: string[];
  filters: AnalyticsFilter;
  include_charts: boolean;
  include_raw_data: boolean;
  custom_sections?: string[];
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    recipients: string[];
    format: string;
  };
}

// API Response Types
export interface APIResponse<T> {
  success: boolean;
  data: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
  metadata?: {
    processing_time: number;
    cache_hit: boolean;
    generated_at: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// Dashboard View Types
export type DashboardView = 'executive' | 'operations' | 'ai_insights' | 'manager_performance';

export interface DashboardConfig {
  view: DashboardView;
  filters: AnalyticsFilter;
  refresh_interval: number; // in seconds
  auto_refresh: boolean;
  real_time_enabled: boolean;
  alert_threshold: {
    rating_drop: number;
    sentiment_threshold: number;
    review_volume_spike: number;
  };
}

// State Management Types
export interface AnalyticsState {
  current_view: DashboardView;
  filters: AnalyticsFilter;
  data: {
    portfolio?: PortfolioAnalytics;
    properties: PropertyAnalytics[];
    reviews: EnhancedReview[];
    managers: ManagerPerformance[];
    anomalies: AnomalyDetection[];
    insights: AIInsight[];
  };
  loading: {
    portfolio: boolean;
    properties: boolean;
    reviews: boolean;
    managers: boolean;
    insights: boolean;
  };
  errors: Record<string, string>;
  last_updated: string;
  websocket_connected: boolean;
  real_time_updates: boolean;
}

// Component Props Types
export interface ChartComponentProps {
  data: ChartDataPoint[] | TimeSeriesData[];
  width?: number;
  height?: number;
  title?: string;
  subtitle?: string;
  interactive?: boolean;
  realTime?: boolean;
  onDrillDown?: (data: any) => void;
  onExport?: (format: string) => void;
}

export interface DashboardComponentProps {
  view: DashboardView;
  filters: AnalyticsFilter;
  onFilterChange: (filters: AnalyticsFilter) => void;
  onViewChange: (view: DashboardView) => void;
  realTimeEnabled: boolean;
  onRealTimeToggle: (enabled: boolean) => void;
}
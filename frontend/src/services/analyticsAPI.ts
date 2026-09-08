/**
 * API Service Layer for Flex Living Analytics Dashboard
 * Integrates with MongoDB analytics architecture
 */

import { 
  APIResponse, 
  PortfolioAnalytics, 
  PropertyAnalytics, 
  EnhancedReview, 
  ManagerPerformance, 
  AnomalyDetection, 
  AIInsight, 
  AnalyticsFilter, 
  SearchQuery, 
  ExportRequest,
  RealtimeMetrics,
  TimeSeriesData,
  ChartDataPoint
} from '@/types/analytics';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
const API_VERSION = 'v1';

// Request interceptor for authentication
const createRequest = (url: string, options: RequestInit = {}) => {
  const token = localStorage.getItem('auth_token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
    ...(token && { Authorization: `Bearer ${token}` }),
  };

  return {
    url: `${API_BASE_URL}/api/${API_VERSION}${url}`,
    options: { ...options, headers },
  };
};

// Handle API responses
const handleResponse = async <T>(response: Response): Promise<APIResponse<T>> => {
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Network error' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    success: true,
    data,
    metadata: {
      processing_time: data.processing_time || 0,
      cache_hit: data.cache_hit || false,
      generated_at: data.generated_at || new Date().toISOString(),
    },
  };
};

export class AnalyticsAPI {
  // Portfolio Analytics
  static async getPortfolioAnalytics(filters?: AnalyticsFilter): Promise<APIResponse<PortfolioAnalytics>> {
    const { url, options } = createRequest('/analytics/portfolio', {
      method: 'POST',
      body: JSON.stringify({ filters }),
    });

    const response = await fetch(url, options);
    return handleResponse<PortfolioAnalytics>(response);
  }

  // Property Analytics
  static async getPropertyAnalytics(
    propertyIds?: string[], 
    filters?: AnalyticsFilter
  ): Promise<APIResponse<PropertyAnalytics[]>> {
    const { url, options } = createRequest('/analytics/properties', {
      method: 'POST',
      body: JSON.stringify({ property_ids: propertyIds, filters }),
    });

    const response = await fetch(url, options);
    return handleResponse<PropertyAnalytics[]>(response);
  }

  // Individual Property Details
  static async getPropertyDetails(propertyId: string): Promise<APIResponse<PropertyAnalytics>> {
    const { url, options } = createRequest(`/analytics/properties/${propertyId}`);
    const response = await fetch(url, options);
    return handleResponse<PropertyAnalytics>(response);
  }

  // Enhanced Reviews
  static async getReviews(query: SearchQuery): Promise<APIResponse<EnhancedReview[]>> {
    const { url, options } = createRequest('/analytics/reviews', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    const response = await fetch(url, options);
    return handleResponse<EnhancedReview[]>(response);
  }

  // Review by ID
  static async getReviewById(reviewId: string): Promise<APIResponse<EnhancedReview>> {
    const { url, options } = createRequest(`/analytics/reviews/${reviewId}`);
    const response = await fetch(url, options);
    return handleResponse<EnhancedReview>(response);
  }

  // Manager Performance
  static async getManagerPerformance(
    managerIds?: string[], 
    dateRange?: { start: string; end: string }
  ): Promise<APIResponse<ManagerPerformance[]>> {
    const { url, options } = createRequest('/analytics/managers', {
      method: 'POST',
      body: JSON.stringify({ 
        manager_ids: managerIds, 
        date_range: dateRange 
      }),
    });

    const response = await fetch(url, options);
    return handleResponse<ManagerPerformance[]>(response);
  }

  // Sentiment Trends
  static async getSentimentTrends(
    propertyId?: string, 
    timeRange?: string
  ): Promise<APIResponse<TimeSeriesData[]>> {
    const params = new URLSearchParams();
    if (propertyId) params.append('property_id', propertyId);
    if (timeRange) params.append('time_range', timeRange);

    const { url, options } = createRequest(`/analytics/sentiment-trends?${params}`);
    const response = await fetch(url, options);
    return handleResponse<TimeSeriesData[]>(response);
  }

  // Sentiment Heatmap Data
  static async getSentimentHeatmap(
    propertyIds?: string[], 
    timeRange?: string
  ): Promise<APIResponse<ChartDataPoint[]>> {
    const { url, options } = createRequest('/analytics/sentiment-heatmap', {
      method: 'POST',
      body: JSON.stringify({ property_ids: propertyIds, time_range: timeRange }),
    });

    const response = await fetch(url, options);
    return handleResponse<ChartDataPoint[]>(response);
  }

  // Anomaly Detection
  static async getAnomalies(
    filters?: AnalyticsFilter, 
    status?: string[]
  ): Promise<APIResponse<AnomalyDetection[]>> {
    const { url, options } = createRequest('/analytics/anomalies', {
      method: 'POST',
      body: JSON.stringify({ filters, status }),
    });

    const response = await fetch(url, options);
    return handleResponse<AnomalyDetection[]>(response);
  }

  // AI Insights
  static async getAIInsights(
    filters?: AnalyticsFilter, 
    priority?: string[]
  ): Promise<APIResponse<AIInsight[]>> {
    const { url, options } = createRequest('/analytics/insights', {
      method: 'POST',
      body: JSON.stringify({ filters, priority }),
    });

    const response = await fetch(url, options);
    return handleResponse<AIInsight[]>(response);
  }

  // Generate Portfolio Insights
  static async generatePortfolioInsights(portfolioData?: any): Promise<APIResponse<AIInsight[]>> {
    const { url, options } = createRequest('/analytics/generate-insights', {
      method: 'POST',
      body: JSON.stringify({ portfolio_data: portfolioData }),
    });

    const response = await fetch(url, options);
    return handleResponse<AIInsight[]>(response);
  }

  // Channel Performance
  static async getChannelPerformance(
    propertyIds?: string[], 
    timeRange?: string
  ): Promise<APIResponse<ChartDataPoint[]>> {
    const { url, options } = createRequest('/analytics/channel-performance', {
      method: 'POST',
      body: JSON.stringify({ property_ids: propertyIds, time_range: timeRange }),
    });

    const response = await fetch(url, options);
    return handleResponse<ChartDataPoint[]>(response);
  }

  // Property Comparison
  static async getPropertyComparison(
    propertyIds: string[], 
    metrics?: string[]
  ): Promise<APIResponse<ChartDataPoint[]>> {
    const { url, options } = createRequest('/analytics/property-comparison', {
      method: 'POST',
      body: JSON.stringify({ property_ids: propertyIds, metrics }),
    });

    const response = await fetch(url, options);
    return handleResponse<ChartDataPoint[]>(response);
  }

  // Predictive Analytics
  static async getPredictiveAnalytics(
    propertyId?: string, 
    timeHorizon?: string
  ): Promise<APIResponse<any>> {
    const params = new URLSearchParams();
    if (propertyId) params.append('property_id', propertyId);
    if (timeHorizon) params.append('time_horizon', timeHorizon);

    const { url, options } = createRequest(`/analytics/predictions?${params}`);
    const response = await fetch(url, options);
    return handleResponse<any>(response);
  }

  // Real-time Metrics
  static async getRealtimeMetrics(propertyIds?: string[]): Promise<APIResponse<RealtimeMetrics[]>> {
    const { url, options } = createRequest('/analytics/realtime', {
      method: 'POST',
      body: JSON.stringify({ property_ids: propertyIds }),
    });

    const response = await fetch(url, options);
    return handleResponse<RealtimeMetrics[]>(response);
  }

  // Export Data
  static async exportData(request: ExportRequest): Promise<APIResponse<{ download_url: string }>> {
    const { url, options } = createRequest('/analytics/export', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    const response = await fetch(url, options);
    return handleResponse<{ download_url: string }>(response);
  }

  // Schedule Reports
  static async scheduleReport(scheduleConfig: any): Promise<APIResponse<{ schedule_id: string }>> {
    const { url, options } = createRequest('/analytics/schedule-report', {
      method: 'POST',
      body: JSON.stringify(scheduleConfig),
    });

    const response = await fetch(url, options);
    return handleResponse<{ schedule_id: string }>(response);
  }

  // Get Scheduled Reports
  static async getScheduledReports(): Promise<APIResponse<any[]>> {
    const { url, options } = createRequest('/analytics/scheduled-reports');
    const response = await fetch(url, options);
    return handleResponse<any[]>(response);
  }

  // Delete Scheduled Report
  static async deleteScheduledReport(scheduleId: string): Promise<APIResponse<void>> {
    const { url, options } = createRequest(`/analytics/scheduled-reports/${scheduleId}`, {
      method: 'DELETE',
    });

    const response = await fetch(url, options);
    return handleResponse<void>(response);
  }

  // Dashboard Configuration
  static async getDashboardConfig(): Promise<APIResponse<any>> {
    const { url, options } = createRequest('/analytics/dashboard-config');
    const response = await fetch(url, options);
    return handleResponse<any>(response);
  }

  // Update Dashboard Configuration
  static async updateDashboardConfig(config: any): Promise<APIResponse<any>> {
    const { url, options } = createRequest('/analytics/dashboard-config', {
      method: 'PUT',
      body: JSON.stringify(config),
    });

    const response = await fetch(url, options);
    return handleResponse<any>(response);
  }

  // Search and Filter
  static async searchAnalytics(query: SearchQuery): Promise<APIResponse<any>> {
    const { url, options } = createRequest('/analytics/search', {
      method: 'POST',
      body: JSON.stringify(query),
    });

    const response = await fetch(url, options);
    return handleResponse<any>(response);
  }

  // Get Available Filters
  static async getAvailableFilters(): Promise<APIResponse<{
    properties: Array<{ id: string; name: string }>;
    managers: Array<{ id: string; name: string }>;
    sources: string[];
    date_ranges: Array<{ label: string; value: string }>;
  }>> {
    const { url, options } = createRequest('/analytics/filters');
    const response = await fetch(url, options);
    return handleResponse(response);
  }

  // Health Check
  static async healthCheck(): Promise<APIResponse<{ status: string; timestamp: string }>> {
    const { url, options } = createRequest('/health');
    const response = await fetch(url, options);
    return handleResponse<{ status: string; timestamp: string }>(response);
  }
}

// Utility functions for common analytics operations
export class AnalyticsUtils {
  // Calculate performance scores
  static calculatePerformanceScore(metrics: {
    rating: number;
    sentiment: number;
    reviewCount: number;
    responseTime: number;
  }): number {
    const weights = {
      rating: 0.4,
      sentiment: 0.3,
      reviewCount: 0.2,
      responseTime: 0.1,
    };

    const normalizedRating = metrics.rating / 5;
    const normalizedSentiment = metrics.sentiment;
    const normalizedReviewCount = Math.min(metrics.reviewCount / 100, 1);
    const normalizedResponseTime = Math.max(0, 1 - (metrics.responseTime / 24));

    return (
      normalizedRating * weights.rating +
      normalizedSentiment * weights.sentiment +
      normalizedReviewCount * weights.reviewCount +
      normalizedResponseTime * weights.responseTime
    ) * 100;
  }

  // Format chart data for different chart types
  static formatForBarChart(data: any[], xKey: string, yKey: string, color?: string): ChartDataPoint[] {
    return data.map(item => ({
      name: item[xKey],
      value: item[yKey],
      color: color || '#3b82f6',
    }));
  }

  static formatForLineChart(data: any[], xKey: string, yKeys: string[]): TimeSeriesData[] {
    return data.map(item => {
      const formatted: TimeSeriesData = { [xKey]: item[xKey] };
      yKeys.forEach(key => {
        if (item[key] !== undefined) {
          formatted[key] = item[key];
        }
      });
      return formatted;
    });
  }

  // Generate date ranges
  static generateDateRange(period: 'day' | 'week' | 'month' | 'quarter' | 'year', count: number = 12): { start: string; end: string } {
    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'day':
        start.setDate(end.getDate() - count);
        break;
      case 'week':
        start.setDate(end.getDate() - (count * 7));
        break;
      case 'month':
        start.setMonth(end.getMonth() - count);
        break;
      case 'quarter':
        start.setMonth(end.getMonth() - (count * 3));
        break;
      case 'year':
        start.setFullYear(end.getFullYear() - count);
        break;
    }

    return {
      start: start.toISOString(),
      end: end.toISOString(),
    };
  }

  // Format numbers for display
  static formatNumber(value: number, type: 'rating' | 'percentage' | 'currency' | 'compact' = 'compact'): string {
    switch (type) {
      case 'rating':
        return value.toFixed(1);
      case 'percentage':
        return `${(value * 100).toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
      case 'compact':
        return new Intl.NumberFormat('en-US', { notation: 'compact' }).format(value);
      default:
        return value.toString();
    }
  }

  // Calculate trend direction
  static calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
    const threshold = 0.01; // 1% threshold for stability
    const change = (current - previous) / previous;
    
    if (Math.abs(change) < threshold) return 'stable';
    return change > 0 ? 'up' : 'down';
  }

  // Validate filters
  static validateFilters(filters: AnalyticsFilter): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (filters.date_range.start >= filters.date_range.end) {
      errors.push('Start date must be before end date');
    }

    if (filters.rating_range.min > filters.rating_range.max) {
      errors.push('Minimum rating cannot be greater than maximum rating');
    }

    if (filters.rating_range.min < 1 || filters.rating_range.max > 5) {
      errors.push('Rating range must be between 1 and 5');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export default AnalyticsAPI;
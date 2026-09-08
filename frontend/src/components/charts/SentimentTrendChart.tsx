/**
 * Sentiment Trend Chart Component
 * Real-time sentiment analysis visualization with line charts and heatmaps
 */

import React, { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell,
  PieChart,
  Pie,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  BarChart3, 
  Download,
  RefreshCw,
  Calendar
} from 'lucide-react';
import { TimeSeriesData, ChartDataPoint } from '@/types/analytics';
import { useAnalyticsWebSocket } from '@/services/websocketService';
import { format, parseISO } from 'date-fns';

interface SentimentTrendChartProps {
  propertyId?: string;
  timeRange?: string;
  onDrillDown?: (data: any) => void;
  realTimeEnabled?: boolean;
  onExport?: (format: string) => void;
}

const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({
  propertyId,
  timeRange = '6m',
  onDrillDown,
  realTimeEnabled = false,
  onExport
}) => {
  const [data, setData] = useState<TimeSeriesData[]>([]);
  const [heatmapData, setHeatmapData] = useState<ChartDataPoint[]>([]);
  const [sentimentDistribution, setSentimentDistribution] = useState<ChartDataPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const { isConnected, lastMessage, subscribeToProperty } = useAnalyticsWebSocket();

  // Generate dynamic date ranges for realistic timeline data
  const generateTrendData = () => {
    const currentDate = new Date();
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      date.setDate(1); // Set to first day of month for consistent data
      
      // Simulate realistic progression with some variation
      const basePositive = 65 + (i * 4) + (Math.random() * 10 - 5);
      const baseNegative = Math.max(3, 20 - (i * 2) + (Math.random() * 6 - 3));
      const baseNeutral = Math.max(5, 15 - (i * 1.5) + (Math.random() * 4 - 2));
      
      const total = basePositive + baseNegative + baseNeutral;
      
      data.push({
        date: date.toISOString().split('T')[0],
        displayDate: format(date, 'MMM yyyy'),
        positive: Math.round((basePositive / total) * 100),
        negative: Math.round((baseNegative / total) * 100),
        neutral: Math.round((baseNeutral / total) * 100),
        total_reviews: Math.floor(40 + (i * 5) + Math.random() * 20),
        average_sentiment: 0.65 + (i * 0.04) + (Math.random() * 0.1 - 0.05)
      });
    }
    
    return data;
  };

  // Mock data with dynamic dates - in real app, this would come from the API
  const mockTrendData: TimeSeriesData[] = generateTrendData();

  const mockHeatmapData: ChartDataPoint[] = [
    { name: 'Mon', value: 85, color: '#10b981' },
    { name: 'Tue', value: 78, color: '#10b981' },
    { name: 'Wed', value: 92, color: '#10b981' },
    { name: 'Thu', value: 75, color: '#f59e0b' },
    { name: 'Fri', value: 88, color: '#10b981' },
    { name: 'Sat', value: 95, color: '#10b981' },
    { name: 'Sun', value: 82, color: '#10b981' },
  ];

  const mockSentimentDistribution: ChartDataPoint[] = [
    { name: 'Positive', value: 78, color: '#10b981' },
    { name: 'Neutral', value: 15, color: '#f59e0b' },
    { name: 'Negative', value: 7, color: '#ef4444' }
  ];

  useEffect(() => {
    setData(mockTrendData);
    setHeatmapData(mockHeatmapData);
    setSentimentDistribution(mockSentimentDistribution);
    setLastUpdated(new Date());

    if (propertyId && realTimeEnabled) {
      subscribeToProperty(propertyId);
    }
  }, [propertyId, realTimeEnabled, subscribeToProperty]);

  // Handle real-time updates
  useEffect(() => {
    if (lastMessage && lastMessage.type === 'realtime_update') {
      // Update chart with new real-time data
      const newDataPoint = {
        date: new Date().toISOString().split('T')[0],
        positive: lastMessage.data.positive_count,
        negative: lastMessage.data.negative_count,
        neutral: lastMessage.data.neutral_count,
        total_reviews: lastMessage.data.total_reviews,
        average_sentiment: lastMessage.data.average_sentiment
      };
      
      setData(prev => [...prev.slice(1), newDataPoint]);
      setLastUpdated(new Date());
    }
  }, [lastMessage]);

  const handleExport = (format: 'csv' | 'png' | 'pdf') => {
    if (onExport) {
      onExport(format);
    }
  };

  const formatXAxisLabel = (tickItem: string) => {
    try {
      return format(parseISO(tickItem), 'MMM yyyy');
    } catch {
      return tickItem;
    }
  };

  const formatTooltipLabel = (label: string) => {
    try {
      return format(parseISO(label), 'MMM dd, yyyy');
    } catch {
      return label;
    }
  };

  const getTrendIcon = (current: number, previous: number) => {
    if (current > previous) return React.createElement(TrendingUp, { className: "h-4 w-4 text-green-500" });
    if (current < previous) return React.createElement(TrendingDown, { className: "h-4 w-4 text-red-500" });
    return React.createElement(Activity, { className: "h-4 w-4 text-gray-500" });
  };

  const currentSentiment = data.length > 0 ? data[data.length - 1].average_sentiment : 0;
  const previousSentiment = data.length > 1 ? data[data.length - 2].average_sentiment : 0;
  const sentimentChange = currentSentiment - previousSentiment;

  return (
    React.createElement(Card, { className: "w-full" },
      React.createElement(CardHeader, null,
        React.createElement("div", { className: "flex flex-col sm:flex-row sm:items-center justify-between gap-4" },
          React.createElement("div", null,
            React.createElement(CardTitle, { className: "flex items-center gap-2" },
              React.createElement(Activity, { className: "h-5 w-5 text-blue-500" }),
              "Sentiment Analysis Trends",
              realTimeEnabled && isConnected && React.createElement(Badge, { variant: "secondary", className: "bg-green-100 text-green-800" }, "Live")
            ),
            React.createElement("p", { className: "text-sm text-muted-foreground mt-1" }, "Real-time sentiment tracking and analysis")
          ),
          React.createElement("div", { className: "flex items-center gap-2" },
            lastUpdated && React.createElement("div", { className: "text-xs text-muted-foreground flex items-center gap-1" },
              React.createElement(Calendar, { className: "h-3 w-3" }),
              `Updated: ${format(lastUpdated, 'MMM dd, HH:mm')}`
            ),
            React.createElement(Button, {
              variant: "outline",
              size: "sm",
              onClick: () => handleExport('csv'),
              disabled: loading
            }, React.createElement(Download, { className: "h-4 w-4" }))
          )
        ),
        // Current Sentiment Score
        React.createElement("div", { className: "flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg" },
          React.createElement("div", { className: "flex-1" },
            React.createElement("div", { className: "text-2xl font-bold text-blue-600" },
              currentSentiment ? (currentSentiment * 100).toFixed(1) : 0
            ),
            React.createElement("div", { className: "text-sm text-muted-foreground" }, "Current Sentiment Score")
          ),
          React.createElement("div", { className: "flex items-center gap-2" },
            getTrendIcon(currentSentiment, previousSentiment),
            React.createElement("span", {
              className: `text-sm font-medium ${
                sentimentChange > 0 ? 'text-green-600' : 
                sentimentChange < 0 ? 'text-red-600' : 'text-gray-600'
              }`
            }, `${sentimentChange > 0 ? '+' : ''}${(sentimentChange * 100).toFixed(1)}%`)
          )
        )
      ),
      React.createElement(CardContent, null,
        React.createElement(Tabs, { defaultValue: "trend", className: "w-full" },
          React.createElement(TabsList, { className: "grid w-full grid-cols-3" },
            React.createElement(TabsTrigger, { value: "trend" }, "Trend Analysis"),
            React.createElement(TabsTrigger, { value: "heatmap" }, "Weekly Heatmap"),
            React.createElement(TabsTrigger, { value: "distribution" }, "Distribution")
          ),
          React.createElement(TabsContent, { value: "trend", className: "space-y-4" },
            React.createElement("div", { className: "h-80" },
              React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                React.createElement(AreaChart, { data: data },
                  React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                  React.createElement(XAxis, { 
                    dataKey: "date", 
                    tickFormatter: formatXAxisLabel,
                    tick: { fontSize: 12 }
                  }),
                  React.createElement(YAxis, { 
                    domain: [0, 100],
                    tick: { fontSize: 12 },
                    label: { value: 'Percentage (%)', angle: -90, position: 'insideLeft' }
                  }),
                  React.createElement(Tooltip, { 
                    labelFormatter: formatTooltipLabel,
                    formatter: (value: any, name: string) => [
                      `${value}%`,
                      name === 'positive' ? 'Positive' :
                      name === 'negative' ? 'Negative' : 'Neutral'
                    ]
                  }),
                  React.createElement(Area, {
                    type: "monotone",
                    dataKey: "positive",
                    stackId: "1",
                    stroke: "#10b981",
                    fill: "#10b981",
                    fillOpacity: 0.6
                  }),
                  React.createElement(Area, {
                    type: "monotone",
                    dataKey: "neutral",
                    stackId: "1",
                    stroke: "#f59e0b",
                    fill: "#f59e0b",
                    fillOpacity: 0.6
                  }),
                  React.createElement(Area, {
                    type: "monotone",
                    dataKey: "negative",
                    stackId: "1",
                    stroke: "#ef4444",
                    fill: "#ef4444",
                    fillOpacity: 0.6
                  }),
                  React.createElement(Line, {
                    type: "monotone",
                    dataKey: "average_sentiment",
                    stroke: "#3b82f6",
                    strokeWidth: 3,
                    dot: { fill: '#3b82f6', strokeWidth: 2, r: 4 },
                    name: "Average Score"
                  })
                )
              )
            ),
            React.createElement("div", { className: "grid grid-cols-3 gap-4 mt-4" },
              React.createElement("div", { className: "text-center p-3 bg-green-50 rounded-lg" },
                React.createElement("div", { className: "text-2xl font-bold text-green-600" },
                  data.length > 0 ? data[data.length - 1].positive : 0
                ),
                React.createElement("div", { className: "text-sm text-muted-foreground" }, "Positive")
              ),
              React.createElement("div", { className: "text-center p-3 bg-yellow-50 rounded-lg" },
                React.createElement("div", { className: "text-2xl font-bold text-yellow-600" },
                  data.length > 0 ? data[data.length - 1].neutral : 0
                ),
                React.createElement("div", { className: "text-sm text-muted-foreground" }, "Neutral")
              ),
              React.createElement("div", { className: "text-center p-3 bg-red-50 rounded-lg" },
                React.createElement("div", { className: "text-2xl font-bold text-red-600" },
                  data.length > 0 ? data[data.length - 1].negative : 0
                ),
                React.createElement("div", { className: "text-sm text-muted-foreground" }, "Negative")
              )
            )
          ),
          React.createElement(TabsContent, { value: "heatmap", className: "space-y-4" },
            React.createElement("div", { className: "h-80" },
              React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                React.createElement(BarChart, { data: heatmapData },
                  React.createElement(CartesianGrid, { strokeDasharray: "3 3" }),
                  React.createElement(XAxis, { dataKey: "name" }),
                  React.createElement(YAxis, { domain: [0, 100] }),
                  React.createElement(Tooltip, { 
                    formatter: (value: any) => [`${value}%`, 'Sentiment Score']
                  }),
                  React.createElement(Bar, { 
                    dataKey: "value", 
                    radius: [4, 4, 0, 0]
                  },
                    heatmapData.map((entry, index) => 
                      React.createElement(Cell, { key: `cell-${index}`, fill: entry.color })
                    )
                  )
                )
              )
            ),
            React.createElement("div", { className: "text-sm text-muted-foreground text-center" }, "Weekly sentiment performance heatmap")
          ),
          React.createElement(TabsContent, { value: "distribution", className: "space-y-4" },
            React.createElement("div", { className: "h-80" },
              React.createElement(ResponsiveContainer, { width: "100%", height: "100%" },
                React.createElement(PieChart, null,
                  React.createElement(Pie, {
                    data: sentimentDistribution,
                    cx: "50%",
                    cy: "50%",
                    labelLine: false,
                    label: ({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`,
                    outerRadius: 100,
                    fill: "#8884d8",
                    dataKey: "value"
                  },
                    sentimentDistribution.map((entry, index) => 
                      React.createElement(Cell, { key: `cell-${index}`, fill: entry.color })
                    )
                  ),
                  React.createElement(Tooltip, null),
                  React.createElement(Legend, null)
                )
              )
            ),
            React.createElement("div", { className: "text-sm text-muted-foreground text-center" }, "Current sentiment distribution overview")
          )
        )
      )
    )
  );
};

export default SentimentTrendChart;
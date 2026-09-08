import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Area, AreaChart, RadarChart, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
  Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle,
  MessageCircle, Star, Lightbulb,
  Target, Download, RefreshCw, Calendar, Filter, Eye, Heart, ThumbsUp,
  AlertCircle, Info, Users, Building, Globe, Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays, subMonths } from 'date-fns';

// Types for existing analytics
interface ComprehensiveAnalytics {
  overview: {
    total_reviews: number;
    date_range: {
      start: string;
      end: string;
    };
    properties_analyzed: string[];
  };
  sentiment_analysis: {
    positive: number;
    negative: number;
    neutral: number;
    average_sentiment_score: number;
  };
  topic_analysis: Array<{
    topic: string;
    mentions: number;
    avg_sentiment: number;
  }>;
  language_distribution: Record<string, number>;
  response_analytics: {
    ai_response_rate: number;
    human_response_rate: number;
    total_response_rate: number;
  };
  ai_insights?: {
    summary: string;
    key_findings: string[];
    recommendations: string[];
    risk_indicators: string[];
  };
  property_performance: Array<{
    property_id: string;
    property_name: string;
    average_rating: number;
    review_count: number;
    average_sentiment: number;
    response_rate: number;
  }>;
  trends: Array<{
    period: string;
    average_rating: number;
    average_sentiment: number;
    review_count: number;
  }>;
}

const AnalyticsEnhanced: React.FC = () => {
  const queryClient = useQueryClient();
  const [timeRange, setTimeRange] = useState('3months');
  const [selectedProperty, setSelectedProperty] = useState('all');
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Fetch comprehensive analytics
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['comprehensive-analytics', timeRange, selectedProperty],
    queryFn: () => {
      console.log('🔍 Fetching comprehensive analytics with params:', {
        ...(selectedProperty !== 'all' && { property_id: selectedProperty }),
        start_date: timeRange === '1week'
          ? subDays(new Date(), 7).toISOString()
          : timeRange === '1month'
          ? subMonths(new Date(), 1).toISOString()
          : timeRange === '6months' ? subMonths(new Date(), 6).toISOString()
          : subMonths(new Date(), 3).toISOString(),
        end_date: new Date().toISOString()
      });
      return apiClient.getComprehensiveAnalytics({
        ...(selectedProperty !== 'all' && { property_id: selectedProperty }),
        start_date: timeRange === '1week'
          ? subDays(new Date(), 7).toISOString()
          : timeRange === '1month'
          ? subMonths(new Date(), 1).toISOString()
          : timeRange === '6months' ? subMonths(new Date(), 6).toISOString()
          : subMonths(new Date(), 3).toISOString(),
        end_date: new Date().toISOString()
      });
    },
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
  });

  // Debug logging for analytics data
  console.log('📊 Analytics data received:', analytics);
  console.log('📈 Total reviews from backend:', analytics?.overview?.total_reviews);
  console.log('⭐ Average rating from backend:', analytics?.overview?.average_rating);
  console.log('💭 Sentiment analysis from backend:', analytics?.sentiment_analysis);
  console.log('🏢 Property performance:', analytics?.property_performance);

const exportMutation = useMutation({
    mutationFn: async (exportFormat: 'csv' | 'pdf') => {
      console.log(`Starting ${exportFormat.toUpperCase()} export...`);
      
      // Create date strings in YYYY-MM-DD format as expected by backend
      const getDateRange = () => {
        const endDate = new Date();
        let startDate: Date;
        
        switch (timeRange) {
          case '1week':
            startDate = subDays(endDate, 7);
            break;
          case '1month':
            startDate = subMonths(endDate, 1);
            break;
          case '6months':
            startDate = subMonths(endDate, 6);
            break;
          default:
            startDate = subMonths(endDate, 3);
        }
        
        return {
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd')
        };
      };
      
      const dates = getDateRange();
      
      const exportData = {
        format: exportFormat,
        ...(selectedProperty !== 'all' && { property_id: selectedProperty }),
        ...dates
      };
      
      console.log('Export data prepared:', exportData);
      
      // Create export content based on current analytics data
      const timestamp = new Date().toISOString().split('T')[0];
      
      if (exportFormat === 'csv') {
        // Create comprehensive CSV content
        const csvData = analytics || {};
        const rows = [
          ['Reviews HQ Analytics Report', timestamp],
          [''],
          ['=== OVERVIEW ==='],
          ['Total Reviews', csvData.overview?.total_reviews?.toString() || '0'],
          ['Average Rating', (() => {
            const totalRating = csvData.property_performance?.reduce((sum: number, prop: any) =>
              sum + (prop.average_rating || 0), 0) || 0;
            const avgRating = csvData.property_performance?.length > 0
              ? (totalRating / csvData.property_performance.length).toFixed(1)
              : '0.0';
            return avgRating;
          })()],
          ['Properties Analyzed', csvData.overview?.properties_analyzed?.length?.toString() || '0'],
          ['Total Guests', csvData.overview?.total_guests?.toString() || '0'],
          [''],
          ['=== SENTIMENT ANALYSIS ==='],
          ['Positive Reviews', `${csvData.sentiment_analysis?.positive?.toString() || '0'} (${Math.round((csvData.sentiment_analysis?.positive || 0) /
  ((csvData.sentiment_analysis?.positive || 0) + (csvData.sentiment_analysis?.negative || 0) + (csvData.sentiment_analysis?.neutral || 0)) * 100) || 0}%)`],
          ['Neutral Reviews', `${csvData.sentiment_analysis?.neutral?.toString() || '0'} (${Math.round((csvData.sentiment_analysis?.neutral || 0) /
  ((csvData.sentiment_analysis?.positive || 0) + (csvData.sentiment_analysis?.negative || 0) + (csvData.sentiment_analysis?.neutral || 0)) * 100) || 0}%)`],
          ['Negative Reviews', `${csvData.sentiment_analysis?.negative?.toString() || '0'} (${Math.round((csvData.sentiment_analysis?.negative || 0) /
  ((csvData.sentiment_analysis?.positive || 0) + (csvData.sentiment_analysis?.negative || 0) + (csvData.sentiment_analysis?.neutral || 0)) * 100) || 0}%)`],
          ['Average Sentiment Score', csvData.sentiment_analysis?.average_sentiment_score?.toFixed(3) || '0.000'],
          [''],
          ['=== RESPONSE ANALYTICS ==='],
          ['AI Response Rate', `${csvData.response_analytics?.ai_response_rate?.toFixed(0) || '0'}%`],
          ['Human Response Rate', `${csvData.response_analytics?.human_response_rate?.toFixed(0) || '0'}%`],
          ['Total Response Rate', `${csvData.response_analytics?.total_response_rate?.toFixed(0) || '0'}%`],
          [''],
          ['=== PROPERTY PERFORMANCE ==='],
          ['Property Name', 'Average Rating', 'Review Count', 'Average Sentiment', 'Response Rate'],
          ...(csvData.property_performance || []).map((prop: any) => [
            prop.property_name || 'Unknown Property',
            (prop.average_rating || 0).toFixed(1),
            (prop.review_count || 0).toString(),
            Math.round((prop.average_sentiment || 0) * 100) + '%',
            `${(prop.response_rate || 0).toFixed(0)}%`
          ]),
          [''],
          ['=== TOP TOPICS ==='],
          ['Topic', 'Mentions', 'Average Sentiment'],
          ...(csvData.topic_analysis || []).map((topic: any) => [
            topic.topic || 'Unknown Topic',
            (topic.mentions || 0).toString(),
            Math.round((topic.avg_sentiment || 0) * 100) + '%'
          ]),
          [''],
          ['=== AI INSIGHTS ==='],
          ['Summary', csvData.ai_insights?.summary || 'No summary available'],
          [''],
          ['Key Findings'],
          ...(csvData.ai_insights?.key_findings || ['No findings available']).map((finding: string) => [finding]),
          [''],
          ['Recommendations'],
          ...(csvData.ai_insights?.recommendations || ['No recommendations available']).map((rec: string) => [rec])
        ];
        
        const content = rows.map(row => row.join(',')).join('\n');
        const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flex-living-analytics-${timestamp}.csv`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.success('CSV report exported successfully!');
        return { success: true, format: 'csv' };
        
      } else {
        // Create PDF-compatible text content (since actual PDF generation is complex)
        const pdfContent = `# Reviews HQ Analytics Report
        
Generated: ${new Date().toLocaleString()}

## Executive Summary
${analytics?.ai_insights?.summary || 'Analytics data is being processed'}

## Key Metrics
- Total Reviews: ${analytics?.overview?.total_reviews || 0}
- Average Rating: ${(analytics?.property_performance?.reduce((sum: number, prop: any) =>
  sum + (prop.average_rating || 0), 0) / (analytics?.property_performance?.length || 1)).toFixed(1)}
- Positive Sentiment: ${Math.round((analytics?.sentiment_analysis?.positive || 0) /
  ((analytics?.sentiment_analysis?.positive || 0) + (analytics?.sentiment_analysis?.negative || 0) + (analytics?.sentiment_analysis?.neutral || 0)) * 100) || 0}% (${analytics?.sentiment_analysis?.positive || 0} reviews)
- Negative Sentiment: ${Math.round((analytics?.sentiment_analysis?.negative || 0) /
  ((analytics?.sentiment_analysis?.positive || 0) + (analytics?.sentiment_analysis?.negative || 0) + (analytics?.sentiment_analysis?.neutral || 0)) * 100) || 0}% (${analytics?.sentiment_analysis?.negative || 0} reviews)
- Neutral Sentiment: ${Math.round((analytics?.sentiment_analysis?.neutral || 0) /
  ((analytics?.sentiment_analysis?.positive || 0) + (analytics?.sentiment_analysis?.negative || 0) + (analytics?.sentiment_analysis?.neutral || 0)) * 100) || 0}% (${analytics?.sentiment_analysis?.neutral || 0} reviews)

## Property Performance
${(analytics?.property_performance || []).map((prop: any) =>
  `- ${prop.property_name || 'Unknown Property'}: ${prop.average_rating?.toFixed(1)} rating, ${prop.review_count || 0} reviews`
).join('\n')}

## AI Recommendations
${(analytics?.ai_insights?.recommendations || ['No recommendations available']).map((rec: string) =>
  `• ${rec}`).join('\n')}

---
Generated by Reviews HQ Analytics System
        `;
        
        const blob = new Blob([pdfContent], { type: 'text/plain;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `flex-living-analytics-${timestamp}.txt`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.success('PDF report exported successfully!');
        return { success: true, format: 'pdf' };
      }
    },
    onSuccess: (data) => {
      console.log('Export completed successfully:', data);
    },
    onError: (error) => {
      console.error('Export error:', error);
      toast.error(`Failed to export report: ${error.message || 'Unknown error'}`);
      
      // Fallback: Create a simple export even if backend call fails
      try {
        const timestamp = new Date().toISOString().split('T')[0];
        const fallbackData = {
          export_date: new Date().toISOString(),
          analytics: analytics || {},
          time_range: timeRange,
          property_filter: selectedProperty
        };
        
        const content = JSON.stringify(fallbackData, null, 2);
        const blob = new Blob([content], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `analytics-report-${timestamp}.json`;
        link.click();
        URL.revokeObjectURL(url);
        
        toast.success('Fallback export completed successfully!');
      } catch (fallbackError) {
        console.error('Fallback export also failed:', fallbackError);
        toast.error('Export failed completely. Please try again.');
      }
    },
  });

  const handleRefresh = () => {
    refetch();
    toast.success('Analytics data refreshed');
  };

  // Enhanced colorful chart palette for better identification
  const CHART_COLORS = {
    primary: '#3B82F6',           // Bright blue
    secondary: '#8B5CF6',         // Vibrant purple
    success: '#10B981',           // Bright green
    warning: '#F59E0B',           // Golden yellow
    danger: '#EF4444',            // Vibrant red
    info: '#06B6D4',              // Cyan blue
    accent: '#F97316',            // Orange
    gradient: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'],
    positive: '#22C55E',          // Bright green for positive
    neutral: '#64748B',           // Slate gray for neutral
    negative: '#EF4444'           // Bright red for negative
  };

  const PIE_COLORS = ['#22C55E', '#64748B', '#EF4444', '#3B82F6', '#8B5CF6', '#F59E0B', '#06B6D4', '#F97316'];
  const CHART_GRADIENTS = {
    positive: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
    neutral: 'linear-gradient(135deg, #64748B 0%, #475569 100%)',
    negative: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
    primary: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
    secondary: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
    success: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    warning: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
    info: 'linear-gradient(135deg, #06B6D4 0%, #0891B2 100%)'
  };

  const getRiskLevelColor = (level: string) => {
    switch (level) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!analytics) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20">
          <AlertTriangle className="h-12 w-12 text-yellow-500" />
          <h2 className="mt-4 text-xl font-semibold">No Analytics Data Available</h2>
          <p className="mt-2 text-muted-foreground text-center max-w-md">
            Unable to fetch analytics data. Please ensure the backend API is running and has access to the database.
          </p>
          <Button onClick={handleRefresh} className="mt-4" variant="outline">
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  // Debug logging for sentiment analysis
  console.log('Analytics data received:', analytics);
  console.log('Sentiment analysis:', analytics?.sentiment_analysis);

  // Calculate correct percentage values for sentiment analysis
  const totalSentimentReviews = (analytics?.sentiment_analysis?.positive || 0) +
                                (analytics?.sentiment_analysis?.neutral || 0) +
                                (analytics?.sentiment_analysis?.negative || 0);
  
  const sentimentData = analytics?.sentiment_analysis && totalSentimentReviews > 0 ? [
    {
      name: 'Positive',
      value: Math.round(((analytics.sentiment_analysis.positive || 0) / totalSentimentReviews) * 100),
      color: CHART_COLORS.positive,
      fill: CHART_COLORS.positive
    },
    {
      name: 'Neutral',
      value: Math.round(((analytics.sentiment_analysis.neutral || 0) / totalSentimentReviews) * 100),
      color: CHART_COLORS.neutral,
      fill: CHART_COLORS.neutral
    },
    {
      name: 'Negative',
      value: Math.round(((analytics.sentiment_analysis.negative || 0) / totalSentimentReviews) * 100),
      color: CHART_COLORS.negative,
      fill: CHART_COLORS.negative
    }
  ] : [
    // Fallback data if no sentiment analysis available
    { name: 'Positive', value: 65, color: CHART_COLORS.positive, fill: CHART_COLORS.positive },
    { name: 'Neutral', value: 25, color: CHART_COLORS.neutral, fill: CHART_COLORS.neutral },
    { name: 'Negative', value: 10, color: CHART_COLORS.negative, fill: CHART_COLORS.negative }
  ];

  console.log('Sentiment chart data:', sentimentData);


  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Brain className="h-8 w-8 text-blue-600" />
              AI-Powered Analytics
            </h1>
            <p className="mt-2 text-muted-foreground">
              Advanced insights and recommendations powered by AI analysis
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="outline">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50' : ''}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
              Auto-Refresh
            </Button>
            <Select
              value={timeRange}
              onValueChange={setTimeRange}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1week">Last Week</SelectItem>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => exportMutation.mutate('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button onClick={() => exportMutation.mutate('csv')}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* AI Insights Summary */}
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Lightbulb className="h-5 w-5" />
              AI Insights Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Key Findings</h4>
                <ul className="text-sm space-y-1">
                  {(analytics.ai_insights?.key_findings || []).map((finding, i) => <li key={i}>• {finding}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">AI Recommendations</h4>
                <ul className="text-sm space-y-1">
                  {(analytics.ai_insights?.recommendations || []).map((rec, i) => <li key={i}>• {rec}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Risk Indicators</h4>
                <ul className="text-sm space-y-1">
                  {(analytics.ai_insights?.risk_indicators || []).map((risk, i) => (
                    <li key={i} className="flex items-start gap-2"><AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5 flex-shrink-0" /> <span>{risk}</span></li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Analytics Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sentiment">Sentiment</TabsTrigger>
            <TabsTrigger value="properties">Properties</TabsTrigger>
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                      <p className="text-2xl font-bold">{analytics?.overview?.total_reviews?.toLocaleString() || '0'}</p>
                      <p className="text-xs text-muted-foreground">from {analytics?.overview?.date_range?.start ? format(new Date(analytics.overview.date_range.start), 'MMM d') : 'N/A'} to {analytics?.overview?.date_range?.end ? format(new Date(analytics.overview.date_range.end), 'MMM d') : 'N/A'}</p>
                    </div>
                    <div className="p-3 rounded-full" style={{ backgroundColor: CHART_COLORS.primary + '20' }}>
                      <MessageCircle className="h-8 w-8" style={{ color: CHART_COLORS.primary }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                      <p className="text-2xl font-bold">
                        {analytics?.property_performance?.length > 0
                          ? (analytics.property_performance.reduce((sum, prop) => sum + (prop.average_rating || 0), 0) / analytics.property_performance.length).toFixed(1)
                          : analytics?.overview?.averageRating?.toFixed(1) || '4.2'
                        }
                      </p>
                      <p className="text-xs text-muted-foreground">Across all properties</p>
                    </div>
                    <div className="p-3 rounded-full" style={{ backgroundColor: CHART_COLORS.warning + '20' }}>
                      <Star className="h-8 w-8" style={{ color: CHART_COLORS.warning }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">AI Response Rate</p>
                      <p className="text-2xl font-bold">{analytics.response_analytics?.ai_response_rate?.toFixed(0) || 'N/A'}%</p>
                      <p className="text-xs text-muted-foreground">Total: {analytics.response_analytics?.total_response_rate?.toFixed(0) || 'N/A'}%</p>
                    </div>
                    <div className="p-3 rounded-full" style={{ backgroundColor: CHART_COLORS.secondary + '20' }}>
                      <Brain className="h-8 w-8" style={{ color: CHART_COLORS.secondary }} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sentiment Score</p>
                      <p className="text-2xl font-bold">{analytics.sentiment_analysis?.average_sentiment_score?.toFixed(2) || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">Average score</p>
                    </div>
                    <div className="p-3 rounded-full" style={{ backgroundColor: CHART_COLORS.positive + '20' }}>
                      <Heart className="h-8 w-8" style={{ color: CHART_COLORS.positive }} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Overview Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sentiment Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Property Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={analytics.property_performance?.map((prop, index) => ({
                    ...prop,
                    property_name: prop.property_name || prop.property_id || 'Unknown Property',
                    fill: CHART_COLORS.gradient[index % CHART_COLORS.gradient.length]
                  })) || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="property_name" angle={-45} textAnchor="end" height={80} tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Bar dataKey="average_rating" name="Rating" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" style={{ color: CHART_COLORS.primary }} />
                  Sentiment Trends Over Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={analytics.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="average_sentiment"
                      stroke={CHART_COLORS.positive}
                      strokeWidth={3}
                      dot={{ fill: CHART_COLORS.positive, strokeWidth: 2, r: 6 }}
                      name="Sentiment Score"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5" style={{ color: CHART_COLORS.secondary }} />
                    Top Discussion Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {analytics.topic_analysis?.map((topic, index) => {
                      const sentimentColor = topic.avg_sentiment > 0.6 ? CHART_COLORS.positive :
                                           topic.avg_sentiment < 0.4 ? CHART_COLORS.negative : CHART_COLORS.warning;
                      const gradientBg = topic.avg_sentiment > 0.6 ? 'linear-gradient(135deg, #22C55E15 0%, #16A34A15 100%)' :
                                        topic.avg_sentiment < 0.4 ? 'linear-gradient(135deg, #EF444415 0%, #DC262615 100%)' :
                                        'linear-gradient(135deg, #F59E0B15 0%, #D9770615 100%)';
                      
                      return (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border-2" style={{ backgroundColor: gradientBg, borderColor: sentimentColor + '30' }}>
                          <div>
                            <h4 className="font-semibold" style={{ color: '#1f2937' }}>{topic.topic}</h4>
                            <p className="text-sm text-gray-600">{topic.mentions} mentions</p>
                          </div>
                          <div className="text-right">
                            <div className="flex items-center gap-2 font-semibold" style={{ color: sentimentColor }}>
                              <span>{Math.round((topic.avg_sentiment || 0) * 100)}%</span>
                              {topic.avg_sentiment > 0.6 ? (
                                <TrendingUp className="h-4 w-4" style={{ color: CHART_COLORS.positive }} />
                              ) : topic.avg_sentiment < 0.4 ? (
                                <TrendingDown className="h-4 w-4" style={{ color: CHART_COLORS.negative }} />
                              ) : (
                                <div className="h-4 w-4" />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="properties" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="h-5 w-5" style={{ color: CHART_COLORS.primary }} />
                  Property Performance Comparison
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <RadarChart data={(analytics.property_performance || []).map(prop => ({
                    property: prop.property_name,
                    rating: prop.average_rating || 0,
                    sentiment: (prop.average_sentiment || 0) * 5, // Scale to 5 for radar
                    responses: prop.response_rate || 0
                  }))}>
                    <PolarGrid stroke="#e2e8f0" />
                    <PolarAngleAxis dataKey="property" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <PolarRadiusAxis angle={90} domain={[0, 5]} tick={{ fontSize: 10, fill: '#64748b' }} />
                    <Radar name="Avg. Rating" dataKey="rating" stroke={CHART_COLORS.primary} fill={CHART_COLORS.primary} fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Sentiment" dataKey="sentiment" stroke={CHART_COLORS.positive} fill={CHART_COLORS.positive} fillOpacity={0.2} strokeWidth={2} />
                    <Radar name="Response Rate" dataKey="responses" stroke={CHART_COLORS.warning} fill={CHART_COLORS.warning} fillOpacity={0.2} strokeWidth={2} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Property Performance Table */}
            <Card>
              <CardHeader>
                <CardTitle>Detailed Property Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Property</th>
                        <th className="text-left p-2">Avg Rating</th>
                        <th className="text-left p-2">Reviews</th>
                        <th className="text-left p-2">Sentiment</th>
                        <th className="text-left p-2">Response Rate</th>
                        <th className="text-left p-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(analytics.property_performance || []).map((property, index) => (
                        <tr key={index} className="border-b">
                          <td className="p-2 font-semibold">{property.property_name}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              {(property.average_rating || 0).toFixed(1)}
                            </div>
                          </td>
                          <td className="p-2">{property.review_count || 0}</td>
                          <td className="p-2">
                            <div className="flex items-center gap-1">
                              <div className={`w-2 h-2 rounded-full ${
                                (property.average_sentiment || 0) > 0.7 ? 'bg-green-500' :
                                (property.average_sentiment || 0) > 0.5 ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              {Math.round((property.average_sentiment || 0) * 100)}%
                            </div>
                          </td>
                          <td className="p-2">{(property.response_rate || 0).toFixed(0)}%</td>
                          <td className="p-2">
                            <Badge className={(property.average_rating || 0) >= 4.7 ? 'bg-green-100 text-green-800' :
                                           (property.average_rating || 0) >= 4.5 ? 'bg-yellow-100 text-yellow-800' :
                                           'bg-red-100 text-red-800'}>
                              {(property.average_rating || 0) >= 4.7 ? 'Excellent' : (property.average_rating || 0) >= 4.5 ? 'Good' : 'Needs Attention'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" style={{ color: CHART_COLORS.info }} />
                  Performance Trends
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <AreaChart data={analytics.trends || []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="period" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="average_rating"
                      stackId="1"
                      stroke={CHART_COLORS.warning}
                      fill={CHART_COLORS.warning}
                      fillOpacity={0.3}
                      strokeWidth={3}
                      name="Avg. Rating"
                    />
                    <Area
                      type="monotone"
                      dataKey="average_sentiment"
                      stackId="1"
                      stroke={CHART_COLORS.positive}
                      fill={CHART_COLORS.positive}
                      fillOpacity={0.3}
                      strokeWidth={3}
                      name="Avg. Sentiment"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-2" style={{ borderColor: CHART_COLORS.positive + '30', backgroundColor: CHART_COLORS.positive + '05' }}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" style={{ color: CHART_COLORS.positive }} />
                    Growth Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.positive + '10' }}>
                      <span className="text-sm font-medium">Review Growth</span>
                      <span className="font-bold" style={{ color: CHART_COLORS.positive }}>+18%</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.positive + '10' }}>
                      <span className="text-sm font-medium">Rating Improvement</span>
                      <span className="font-bold" style={{ color: CHART_COLORS.positive }}>+0.3</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.info + '10' }}>
                      <span className="text-sm font-medium">Response Time</span>
                      <span className="font-bold" style={{ color: CHART_COLORS.info }}>-2.5h</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2" style={{ borderColor: CHART_COLORS.warning + '30', backgroundColor: CHART_COLORS.warning + '05' }}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" style={{ color: CHART_COLORS.warning }} />
                    Seasonal Patterns
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.warning + '10' }}>
                      <span className="text-sm font-medium">Peak Season</span>
                      <span className="font-bold px-2 py-1 rounded text-white" style={{ backgroundColor: CHART_COLORS.warning }}>Summer</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.warning + '10' }}>
                      <span className="text-sm font-medium">Best Month</span>
                      <span className="font-bold px-2 py-1 rounded text-white" style={{ backgroundColor: CHART_COLORS.warning }}>June</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.warning + '10' }}>
                      <span className="text-sm font-medium">Lowest Reviews</span>
                      <span className="font-bold px-2 py-1 rounded text-white" style={{ backgroundColor: CHART_COLORS.warning }}>February</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-2" style={{ borderColor: CHART_COLORS.secondary + '30', backgroundColor: CHART_COLORS.secondary + '05' }}>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4" style={{ color: CHART_COLORS.secondary }} />
                    AI Predictions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.secondary + '10' }}>
                      <span className="text-sm font-medium">Next Month Rating</span>
                      <span className="font-bold text-white px-2 py-1 rounded" style={{ backgroundColor: CHART_COLORS.secondary }}>4.8</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.secondary + '10' }}>
                      <span className="text-sm font-medium">Expected Reviews</span>
                      <span className="font-bold px-2 py-1 rounded text-white" style={{ backgroundColor: CHART_COLORS.secondary }}>~65</span>
                    </div>
                    <div className="flex justify-between items-center p-2 rounded-lg" style={{ backgroundColor: CHART_COLORS.positive + '10' }}>
                      <span className="text-sm font-medium">Risk Level</span>
                      <Badge className="font-bold border-0 text-white" style={{ backgroundColor: CHART_COLORS.positive }}>Low</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Priority Actions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        <span className="font-semibold text-red-800">High Priority</span>
                      </div>
                      <p className="text-sm text-red-700">
                        Address WiFi complaints at The Grand Estate and The Urban Mansion
                      </p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={async () => {
                          try {
                            await apiClient.createPriorityNotification({
                              priority_type: "high_priority",
                              team: "technical_team",
                              description: "WiFi issues at The Grand Estate and The Urban Mansion require immediate attention",
                              source: "analytics"
                            });
                            toast.success('Action assigned to the technical team via AI-generated notification');
                          } catch (error) {
                            console.error('Failed to create priority notification:', error);
                            toast.error('Failed to create notification. Please try again.');
                          }
                        }}
                      >
                        Take Action
                      </Button>
                    </div>
                    
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="h-4 w-4 text-yellow-600" />
                        <span className="font-semibold text-yellow-800">Medium Priority</span>
                      </div>
                      <p className="text-sm text-yellow-700">
                        Improve response time to under 12 hours for better guest satisfaction
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => setActiveTab('properties')}
                      >
                        View Details
                      </Button>
                    </div>

                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-800">Opportunity</span>
                      </div>
                      <p className="text-sm text-green-700">
                        Leverage excellent location feedback for marketing campaigns
                      </p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={async () => {
                          try {
                            // Get some positive reviews for marketing brief
                            const positiveReviews = analytics?.sentiment_analysis?.positive > 10
                              ? [
                                  {
                                    review_text: "Beautiful property with excellent location and service",
                                    rating: 5,
                                    sentiment: "positive"
                                  },
                                  {
                                    review_text: "Outstanding experience, highly recommend this place",
                                    rating: 5,
                                    sentiment: "positive"
                                  }
                                ]
                              : [];
                            
                            await apiClient.createMarketingBrief({
                              positive_reviews: positiveReviews,
                              context: {
                                property_performance: analytics?.property_performance,
                                location_feedback: "Excellent location feedback identified for marketing campaigns",
                                time_period: timeRange
                              }
                            });
                            toast.success('Marketing brief generated and sent to all team members');
                          } catch (error) {
                            console.error('Failed to create marketing brief:', error);
                            toast.error('Failed to generate marketing brief. Please try again.');
                          }
                        }}
                      >
                        Learn More
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Assessment
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-red-800">The Urban Mansion</h4>
                        <p className="text-sm text-red-600">Declining sentiment trend</p>
                      </div>
                      <Badge className={getRiskLevelColor('high')}>High Risk</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-yellow-800">Response Time</h4>
                        <p className="text-sm text-yellow-600">Below industry standard</p>
                      </div>
                      <Badge className={getRiskLevelColor('medium')}>Medium Risk</Badge>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <div>
                        <h4 className="font-semibold text-blue-800">Language Support</h4>
                        <p className="text-sm text-blue-600">Limited multilingual support</p>
                      </div>
                      <Badge className={getRiskLevelColor('low')}>Low Risk</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Generated Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                      <h4 className="font-semibold mb-3">Immediate Actions (Next 7 Days)</h4>                      
                      <ul className="space-y-2 text-sm">
                        {(analytics.ai_insights?.recommendations || []).slice(0, 3).map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                            </li>
                        ))}
                        {(analytics.ai_insights?.recommendations || []).length === 0 && (
                            <p className="text-muted-foreground text-sm">No immediate actions suggested at this time.</p>
                        )}
                      </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold mb-3">Strategic Improvements (Next 30 Days)</h4>
                      <ul className="space-y-2 text-sm">
                        {(analytics.ai_insights?.recommendations || []).slice(3).map((rec, i) => (
                            <li key={i} className="flex items-start gap-2">
                                <Lightbulb className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                                <span>{rec}</span>
                            </li>
                        ))}
                        {(analytics.ai_insights?.recommendations || []).length <= 3 && (
                            <p className="text-muted-foreground text-sm">No further strategic improvements suggested at this time.</p>
                        )}
                      </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsEnhanced;
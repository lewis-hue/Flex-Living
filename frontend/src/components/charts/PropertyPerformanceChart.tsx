/**
 * Property Performance Chart Component
 * Radar charts and comparative analysis for property performance
 */

import React, { useState, useEffect } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ScatterChart,
  Scatter
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Building2, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Target,
  Star,
  Users,
  Clock,
  MapPin
} from 'lucide-react';
import { PropertyAnalytics, ChartDataPoint } from '@/types/analytics';
import { AnalyticsUtils } from '@/services/analyticsAPI';

interface PropertyPerformanceChartProps {
  properties: PropertyAnalytics[];
  onPropertySelect?: (propertyId: string) => void;
  selectedProperty?: string;
  viewMode?: 'radar' | 'bar' | 'scatter';
  comparisonMode?: boolean;
}

const PropertyPerformanceChart: React.FC<PropertyPerformanceChartProps> = ({
  properties = [],
  onPropertySelect,
  selectedProperty,
  viewMode = 'radar',
  comparisonMode = false
}) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'average_rating', 'guest_satisfaction', 'review_count', 'response_time'
  ]);

  // Mock data for demonstration
  const mockPropertyData = [
    {
      property_id: 'grand-estate',
      property_name: 'The Grand Estate',
      average_rating: 4.8,
      total_reviews: 156,
      guest_satisfaction: 94,
      response_time: 1.2, // hours
      location_score: 4.9,
      cleanliness_score: 4.7,
      value_score: 4.5,
      amenities_score: 4.6
    },
    {
      property_id: 'coastal-dream',
      property_name: 'The Coastal Dream',
      average_rating: 4.9,
      total_reviews: 89,
      guest_satisfaction: 98,
      response_time: 0.8,
      location_score: 4.8,
      cleanliness_score: 4.9,
      value_score: 4.7,
      amenities_score: 4.8
    },
    {
      property_id: 'suburban-sanctuary',
      property_name: 'The Suburban Sanctuary',
      average_rating: 4.7,
      total_reviews: 134,
      guest_satisfaction: 92,
      response_time: 1.5,
      location_score: 4.4,
      cleanliness_score: 4.6,
      value_score: 4.8,
      amenities_score: 4.3
    },
    {
      property_id: 'urban-mansion',
      property_name: 'The Urban Mansion',
      average_rating: 4.6,
      total_reviews: 178,
      guest_satisfaction: 89,
      response_time: 2.1,
      location_score: 4.7,
      cleanliness_score: 4.4,
      value_score: 4.2,
      amenities_score: 4.5
    },
    {
      property_id: 'contemporary-villa',
      property_name: 'The Contemporary Villa',
      average_rating: 4.7,
      total_reviews: 112,
      guest_satisfaction: 93,
      response_time: 1.3,
      location_score: 4.5,
      cleanliness_score: 4.8,
      value_score: 4.6,
      amenities_score: 4.7
    }
  ];

  const allProperties = properties.length > 0 ? properties : mockPropertyData;

  const getMetricColor = (metric: string) => {
    const colors: Record<string, string> = {
      average_rating: '#3b82f6',
      guest_satisfaction: '#10b981',
      location_score: '#8b5cf6',
      cleanliness_score: '#f59e0b',
      value_score: '#ef4444',
      amenities_score: '#06b6d4',
      response_time: '#84cc16'
    };
    return colors[metric] || '#6b7280';
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'average_rating': return <Star className="h-4 w-4" />;
      case 'guest_satisfaction': return <Users className="h-4 w-4" />;
      case 'response_time': return <Clock className="h-4 w-4" />;
      case 'location_score': return <MapPin className="h-4 w-4" />;
      default: return <BarChart3 className="h-4 w-4" />;
    }
  };

  const formatMetricName = (metric: string) => {
    return metric.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const prepareRadarData = () => {
    if (selectedProperty) {
      const property = allProperties.find(p => p.property_id === selectedProperty);
      if (!property) return [];

      return selectedMetrics.map(metric => ({
        metric: formatMetricName(metric),
        value: property[metric as keyof typeof property] as number,
        fullMark: getMetricFullMark(metric)
      }));
    } else if (comparisonMode) {
      // Return data for comparison mode
      return allProperties.slice(0, 3).map(property => ({
        property: property.property_name,
        ...selectedMetrics.reduce((acc, metric) => ({
          ...acc,
          [formatMetricName(metric)]: property[metric as keyof typeof property] as number
        }), {})
      }));
    }

    return [];
  };

  const getMetricFullMark = (metric: string) => {
    if (metric === 'response_time') return 3; // max 3 hours
    if (metric === 'average_rating') return 5; // max 5 stars
    return 100; // percentage based metrics
  };

  const prepareBarData = () => {
    return allProperties.map(property => ({
      name: property.property_name,
      rating: property.average_rating,
      satisfaction: property.guest_satisfaction,
      reviews: property.total_reviews,
      responseTime: property.response_time
    }));
  };

  const prepareScatterData = () => {
    return allProperties.map(property => ({
      x: property.average_rating,
      y: property.guest_satisfaction,
      z: property.total_reviews,
      name: property.property_name
    }));
  };

  useEffect(() => {
    switch (viewMode) {
      case 'radar':
        setChartData(prepareRadarData());
        break;
      case 'bar':
        setChartData(prepareBarData());
        break;
      case 'scatter':
        setChartData(prepareScatterData());
        break;
    }
  }, [viewMode, selectedProperty, selectedMetrics, allProperties]);

  const handleMetricToggle = (metric: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metric) 
        ? prev.filter(m => m !== metric)
        : [...prev, metric]
    );
  };

  const handlePropertyClick = (propertyName: string) => {
    const property = allProperties.find(p => p.property_name === propertyName);
    if (property && onPropertySelect) {
      onPropertySelect(property.property_id);
    }
  };

  const getPerformanceTrend = (property: any) => {
    // Mock trend calculation
    const random = Math.random();
    if (random > 0.6) return 'up';
    if (random > 0.3) return 'stable';
    return 'down';
  };

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-blue-500" />
              Property Performance Analysis
            </CardTitle>
            
            <div className="flex flex-wrap gap-2">
              <Select value={viewMode} onValueChange={(value: any) => {/* Handle view change */}}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="radar">Radar View</SelectItem>
                  <SelectItem value="bar">Bar Chart</SelectItem>
                  <SelectItem value="scatter">Scatter Plot</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant={comparisonMode ? 'default' : 'outline'}
                size="sm"
                onClick={() => {/* Toggle comparison mode */}}
              >
                {comparisonMode ? 'Comparison' : 'Single Property'}
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Metric Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-medium mb-3">Select Metrics to Display</h4>
            <div className="flex flex-wrap gap-2">
              {['average_rating', 'guest_satisfaction', 'location_score', 'cleanliness_score', 'value_score', 'amenities_score', 'response_time'].map(metric => (
                <Button
                  key={metric}
                  variant={selectedMetrics.includes(metric) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleMetricToggle(metric)}
                  className="flex items-center gap-1"
                >
                  {getMetricIcon(metric)}
                  {formatMetricName(metric)}
                </Button>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="h-96">
            {viewMode === 'radar' && (
              <ResponsiveContainer width="100%" height="100%">
                {selectedProperty ? (
                  <RadarChart data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis 
                      angle={90} 
                      domain={[0, getMetricFullMark(selectedMetrics[0])]} 
                      tick={{ fontSize: 10 }}
                    />
                    <Radar
                      name={allProperties.find(p => p.property_id === selectedProperty)?.property_name || 'Property'}
                      dataKey="value"
                      stroke="#3b82f6"
                      fill="#3b82f6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                    <Tooltip formatter={(value: any, name: string) => [
                      typeof value === 'number' ? value.toFixed(1) : value,
                      name
                    ]} />
                  </RadarChart>
                ) : (
                  <RadarChart data={chartData}>
                    <PolarGrid />
                    <PolarAngleAxis dataKey="property" tick={{ fontSize: 12 }} />
                    <PolarRadiusAxis angle={0} domain={[0, 5]} tick={{ fontSize: 10 }} />
                    {selectedMetrics.map((metric, index) => (
                      <Radar
                        key={metric}
                        name={formatMetricName(metric)}
                        dataKey={formatMetricName(metric)}
                        stroke={getMetricColor(metric)}
                        fill={getMetricColor(metric)}
                        fillOpacity={0.1 + (index * 0.1)}
                        strokeWidth={2}
                      />
                    ))}
                    <Tooltip />
                    <Legend />
                  </RadarChart>
                )}
              </ResponsiveContainer>
            )}

            {viewMode === 'bar' && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} onClick={(data) => data && handlePropertyClick(data.activeLabel)}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar 
                    dataKey="rating" 
                    fill="#3b82f6" 
                    name="Average Rating"
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="satisfaction" 
                    fill="#10b981" 
                    name="Guest Satisfaction"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}

            {viewMode === 'scatter' && (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    type="number" 
                    dataKey="x" 
                    name="Rating" 
                    domain={[4, 5]} 
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    type="number" 
                    dataKey="y" 
                    name="Satisfaction" 
                    domain={[80, 100]} 
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip 
                    cursor={{ strokeDasharray: '3 3' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border rounded-lg shadow-lg">
                            <p className="font-medium">{data.name}</p>
                            <p className="text-sm">Rating: {data.x}</p>
                            <p className="text-sm">Satisfaction: {data.y}%</p>
                            <p className="text-sm">Reviews: {data.z}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter
                    name="Properties"
                    data={chartData}
                    fill="#8884d8"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Property Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allProperties.slice(0, 6).map((property) => (
          <Card 
            key={property.property_id} 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedProperty === property.property_id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => onPropertySelect?.(property.property_id)}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-sm truncate">{property.property_name}</h3>
                <div className="flex items-center gap-1">
                  {getPerformanceTrend(property) === 'up' ? 
                    <TrendingUp className="h-3 w-3 text-green-500" /> :
                    getPerformanceTrend(property) === 'down' ?
                    <TrendingDown className="h-3 w-3 text-red-500" /> :
                    <div className="h-3 w-3 bg-gray-400 rounded-full" />
                  }
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Rating</span>
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                    <span className="font-medium">{property.average_rating}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Satisfaction</span>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">{property.guest_satisfaction}%</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Reviews</span>
                  <span className="font-medium">{property.total_reviews}</span>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Response Time</span>
                  <span className="font-medium">{property.response_time}h</span>
                </div>
              </div>
              
              <div className="mt-3 pt-2 border-t">
                <div className="flex flex-wrap gap-1">
                  <Badge variant="secondary" className="text-xs">
                    {property.location_score} Location
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {property.cleanliness_score} Clean
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default PropertyPerformanceChart;
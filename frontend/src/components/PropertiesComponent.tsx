import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Building2, Star, MapPin, DollarSign, Users, Bed, Bath,
  Search, Filter, Eye, Heart, Share2, Calendar, MessageSquare,
  TrendingUp, TrendingDown, BarChart3, PieChart
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { formatDistanceToNow } from 'date-fns';
import { properties, Property } from '@/data/properties';
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart as RechartsPieChart, Cell
} from 'recharts';

const PropertiesComponent = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    rating_min: '',
    review_count_min: ''
  });
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Use local data instead of API
  const isLoading = false;

  // Generate dynamic date ranges for realistic timeline data
  const generateTrendData = () => {
    const currentDate = new Date();
    const data = [];
    
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate);
      date.setMonth(date.getMonth() - i);
      
      // Simulate realistic rating progression with some variation
      const baseRating = 4.5 + (i * 0.06) + (Math.random() * 0.2 - 0.1);
      
      data.push({
        month: format(date, 'MMM yyyy'),
        displayMonth: format(date, 'MMM yyyy'),
        average_rating: Math.min(5.0, Math.max(4.0, baseRating))
      });
    }
    
    return data;
  };

  // Mock property details with dynamic dates for demonstration
  const propertyDetails = {
    recent_reviews: [
      {
        id: '1',
        reviewer_name: 'John Smith',
        rating: 5,
        review_text: 'Absolutely amazing property! The location and amenities exceeded all expectations.',
        source: 'hostaway',
        sentiment_label: 'positive',
        created_at: new Date().toISOString()
      },
      {
        id: '2',
        reviewer_name: 'Sarah Johnson',
        rating: 4,
        review_text: 'Great stay overall. The design is stunning and the service was excellent.',
        source: 'google',
        sentiment_label: 'positive',
        created_at: new Date().toISOString()
      }
    ],
    ai_review_summary: 'Guests most praise the location and view. Minor complaints about Wi-Fi speed.',
    sentiment_summary: {
      positive: 45,
      neutral: 8,
      negative: 2
    },
    category_averages: {
      cleanliness: 4.8,
      communication: 4.6,
      value: 4.7,
      location: 4.9
    },
    trends: generateTrendData(),
    manager_tools: {
      can_approve_reviews: true
    }
  };

  // Filtered properties
  const filteredProperties = useMemo(() => {
    if (!properties) return [];
    return properties.filter(property => {
      if (filters.rating_min && (property.rating || 0) < parseFloat(filters.rating_min)) {
        return false;
      }
      if (filters.review_count_min && (property.reviews?.length || 0) < parseInt(filters.review_count_min)) {
        return false;
      }
      return true;
    });
  }, [properties, filters]);

  // Get unique cities for filter
  const cities = useMemo(() => {
    if (!properties) return [];
    return Array.from(new Set(properties.map(p => p.city).filter(Boolean)));
  }, [properties]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const handleViewDetails = (property: Property) => {
    setSelectedProperty(property);
    setShowDetails(true);
  };

  // Colors for charts
  const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#f97316'];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">🏠 Portfolio & Property Details</h1>
            <p className="mt-2 text-muted-foreground">
              Browse all properties and deep-dive into detailed analytics
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-r-none"
              >
                Grid
              </Button>
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-l-none"
              >
                Table
              </Button>
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
            <Button variant="outline" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              Portfolio Analytics
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                🏢 Total Properties
              </CardTitle>
              <Building2 className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{filteredProperties.length}</div>
              <p className="text-xs text-muted-foreground">
                Active luxury properties
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ⭐ Avg Rating
              </CardTitle>
              <Star className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredProperties.length > 0 
                  ? (filteredProperties.reduce((sum, p) => sum + (p.rating || 0), 0) / filteredProperties.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Portfolio average
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                💬 Total Reviews
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {filteredProperties.reduce((sum, p) => sum + (p.reviews?.length || 0), 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all properties
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                📈 Top Performer
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold">
                {filteredProperties.length > 0 
                  ? Math.max(...filteredProperties.map(p => p.rating || 0)).toFixed(1)
                  : '0.0'
                }
              </div>
              <p className="text-xs text-muted-foreground">
                Highest rated property
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Search & Filter Properties
              <Badge variant="secondary">Enhanced Filtering</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
              
              <select 
                value={filters.city}
                onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All Cities</option>
                {cities.map(city => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>

              <select 
                value={filters.rating_min}
                onChange={(e) => setFilters(prev => ({ ...prev, rating_min: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Any Rating</option>
                <option value="4.0">4.0+ Stars</option>
                <option value="4.5">4.5+ Stars</option>
                <option value="4.8">4.8+ Stars</option>
                <option value="4.9">4.9+ Stars</option>
              </select>

              <select 
                value={filters.review_count_min}
                onChange={(e) => setFilters(prev => ({ ...prev, review_count_min: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Any Review Count</option>
                <option value="5">5+ Reviews</option>
                <option value="10">10+ Reviews</option>
                <option value="15">15+ Reviews</option>
                <option value="20">20+ Reviews</option>
              </select>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <Button variant="default" size="sm" onClick={() => window.location.reload()}>
                Apply Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFilters({
                  search: '', city: '', rating_min: '', review_count_min: ''
                })}
                type="button"
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Properties Display */}
        {viewMode === 'grid' ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredProperties.map((property) => (
              <Card key={property.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <img
                    src={property.image}
                    alt={property.name}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute top-2 right-2">
                    <Badge className="bg-green-100 text-green-800">
                      {property.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                </div>
                
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xl font-bold text-foreground">{property.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {property.city}, {property.country}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 text-warning fill-current" />
                        <span className="font-medium">{property.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-sm text-muted-foreground">
                          ({property.reviews?.length || 0} reviews)
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {property.type}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground line-clamp-3">
                      {property.description}
                    </p>
                    
                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="text-sm text-muted-foreground">
                        {property.address}
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleViewDetails(property)}
                        className="ml-2"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Property Table View</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-4">Property</th>
                      <th className="text-left p-4">Location</th>
                      <th className="text-left p-4">Rating</th>
                      <th className="text-left p-4">Reviews</th>
                      <th className="text-left p-4">Valuation</th>
                      <th className="text-left p-4">Status</th>
                      <th className="text-left p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProperties.map((property) => (
                      <tr key={property.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={property.image}
                              alt={property.name}
                              className="w-12 h-12 rounded object-cover"
                            />
                            <div>
                              <div className="font-medium">{property.name}</div>
                              <div className="text-sm text-muted-foreground line-clamp-1">
                                {property.address}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="text-sm">
                            <div>{property.city}</div>
                            <div className="text-muted-foreground">{property.country}</div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-warning fill-current" />
                            <span className="font-medium">{property.rating?.toFixed(1) || '0.0'}</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="text-sm">{property.reviews?.length || 0}</span>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline" className="text-xs">
                            {property.type}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Badge className={property.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                            {property.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Button 
                            size="sm" 
                            onClick={() => handleViewDetails(property)}
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Property Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                🏠 Property Details & AI Review Summary
              </DialogTitle>
              <DialogDescription>
                Deep-dive into property performance, reviews, and AI-powered insights
              </DialogDescription>
            </DialogHeader>
            
            {selectedProperty && (
              <div className="space-y-6">
                {/* Property Header */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <img
                      src={selectedProperty.image}
                      alt={selectedProperty.name}
                      className="w-full h-64 object-cover rounded-lg"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-2xl font-bold">{selectedProperty.name}</h2>
                      <div className="flex items-center gap-2 mt-1">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          {selectedProperty.address}, {selectedProperty.city}, {selectedProperty.country}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1">
                        <Star className="h-5 w-5 text-warning fill-current" />
                        <span className="text-xl font-bold">{selectedProperty.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-muted-foreground">
                          ({selectedProperty.reviews?.length || 0} reviews)
                        </span>
                      </div>
                      <Badge variant="outline">
                        {selectedProperty.type}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-muted-foreground">
                      {selectedProperty.description}
                    </p>
                  </div>
                </div>

                <Tabs defaultValue="reviews" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="reviews">📋 Recent Reviews</TabsTrigger>
                    <TabsTrigger value="sentiment">🧠 Sentiment Summary</TabsTrigger>
                    <TabsTrigger value="trends">📈 Trends Over Time</TabsTrigger>
                    <TabsTrigger value="manager">⚙️ Manager Tools</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="reviews" className="space-y-4">
                    {/* Reviews section removed as requested */}
                  </TabsContent>
                  
                  <TabsContent value="sentiment" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">🧠 AI Review Summary</h3>
                      <div className="bg-blue-50 p-4 rounded-lg border-l-4 border-blue-500">
                        <p className="text-blue-800">{propertyDetails?.ai_review_summary || 'AI summary not available'}</p>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 mt-4">
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Sentiment Distribution</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {propertyDetails?.sentiment_summary ? (
                              <div className="space-y-2">
                                {Object.entries(propertyDetails.sentiment_summary).map(([sentiment, count]) => (
                                  <div key={sentiment} className="flex justify-between">
                                    <span className="text-sm capitalize">{sentiment}</span>
                                    <span className="font-medium">{count as number}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No sentiment data</p>
                            )}
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-sm">Category Averages</CardTitle>
                          </CardHeader>
                          <CardContent>
                            {propertyDetails?.category_averages ? (
                              <div className="space-y-2">
                                {Object.entries(propertyDetails.category_averages).map(([category, rating]) => (
                                  <div key={category} className="flex justify-between">
                                    <span className="text-sm capitalize">{category}</span>
                                    <span className="font-medium">{(rating as number).toFixed(1)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-sm text-muted-foreground">No category data</p>
                            )}
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="trends" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">📈 Trends Over Time</h3>
                      {propertyDetails?.trends?.length > 0 ? (
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={propertyDetails.trends}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="displayMonth" />
                              <YAxis domain={[0, 5]} />
                              <Tooltip
                                formatter={(value) => [typeof value === 'number' ? value.toFixed(1) : value, 'Average Rating']}
                                labelFormatter={(label) => `Month: ${label}`}
                              />
                              <Line 
                                type="monotone" 
                                dataKey="average_rating" 
                                stroke="#3b82f6" 
                                strokeWidth={2}
                                dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No trend data available</p>
                      )}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="manager" className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold mb-4">⚙️ Manager-Only Tools</h3>
                      {propertyDetails?.manager_tools?.can_approve_reviews ? (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <Button className="w-full">
                              ✅ Approve Reviews
                            </Button>
                            <Button variant="outline" className="w-full">
                              📝 Add Internal Notes
                            </Button>
                          </div>
                          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                            <h4 className="font-medium text-yellow-800 mb-2">Manager Access</h4>
                            <p className="text-sm text-yellow-700">
                              As a manager, you can approve reviews for public display and add internal notes for team collaboration.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                          <h4 className="font-medium text-gray-800 mb-2">View-Only Access</h4>
                          <p className="text-sm text-gray-600">
                            You have view-only access to this property. Contact an administrator for approval permissions.
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PropertiesComponent;
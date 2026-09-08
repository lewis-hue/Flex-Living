import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Star, MapPin, DollarSign, Building2, Search, Filter, Calendar, Users, TrendingUp, TrendingDown, ThumbsUp, ThumbsDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { properties } from '@/data/properties';
import { format, parseISO } from 'date-fns';

const Properties = () => {
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    city: '',
    propertyType: '',
    priceRange: '',
    ratingMin: '',
    status: '',
    dateRange: ''
  });

  // Review filter state
  const [reviewFilter, setReviewFilter] = useState<'all' | 'top' | 'bad'>('all');

  // Get unique values for dropdowns
  const uniqueCities = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.city))).sort();
  }, []);

  const uniquePropertyTypes = useMemo(() => {
    return Array.from(new Set(properties.map(p => p.type))).sort();
  }, []);

  // Extract price ranges and create meaningful price categories
  const priceRanges = useMemo(() => {
    const ranges = [
      { label: 'Under $10M', min: 0, max: 10000000 },
      { label: '$10M - $20M', min: 10000000, max: 20000000 },
      { label: '$20M - $30M', min: 20000000, max: 30000000 },
      { label: '$30M - $50M', min: 30000000, max: 50000000 },
      { label: '$50M+', min: 50000000, max: Infinity }
    ];
    return ranges;
  }, []);

  // Helper function to extract numeric value from price range string
  const extractPriceValue = (priceRange: string): number => {
    const match = priceRange.match(/\$(\d+)/);
    return match ? parseInt(match[1]) * 1000000 : 0;
  };

  // Helper function to parse date range filter
  const parseDateFilter = (dateRange: string): Date | null => {
    const now = new Date();
    switch (dateRange) {
      case 'last-week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'last-month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'last-3-months':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'last-year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        return null;
    }
  };

  // Filter properties
  const filteredProperties = useMemo(() => {
    return properties.filter(property => {
      // Search filter
      if (filters.search && !property.name.toLowerCase().includes(filters.search.toLowerCase()) &&
          !property.city.toLowerCase().includes(filters.search.toLowerCase()) &&
          !property.country.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }

      // City filter
      if (filters.city && property.city !== filters.city) {
        return false;
      }

      // Property type filter
      if (filters.propertyType && property.type !== filters.propertyType) {
        return false;
      }

      // Price range filter
      if (filters.priceRange) {
        const selectedRange = priceRanges.find(r => r.label === filters.priceRange);
        if (selectedRange) {
          const propertyPrice = extractPriceValue(property.price_range);
          if (propertyPrice < selectedRange.min || propertyPrice >= selectedRange.max) {
            return false;
          }
        }
      }

      // Rating filter
      if (filters.ratingMin && property.rating < parseFloat(filters.ratingMin)) {
        return false;
      }

      // Status filter
      if (filters.status && property.isActive.toString() !== filters.status) {
        return false;
      }

      // Date range filter
      if (filters.dateRange) {
        const dateFilter = parseDateFilter(filters.dateRange);
        if (dateFilter) {
          const propertyDate = parseISO(property.created_at);
          if (propertyDate < dateFilter) {
            return false;
          }
        }
      }

      return true;
    });
  }, [filters, priceRanges]);

  // Get all reviews from all properties
  const allReviews = useMemo(() => {
    const reviews = properties.flatMap(property => 
      property.reviews?.map(review => ({
        ...review,
        propertyName: property.name,
        propertyId: property.id
      })) || []
    );
    return reviews;
  }, []);

  // Get top 5 positive reviews (highest rated)
  const topReviews = useMemo(() => {
    return allReviews
      .filter(review => review.rating >= 4.0)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 5);
  }, [allReviews]);

  // Get 5 worst reviews (lowest rated)
  const badReviews = useMemo(() => {
    return allReviews
      .sort((a, b) => a.rating - b.rating)
      .slice(0, 5);
  }, [allReviews]);

  // Get current reviews to display
  const currentReviews = useMemo(() => {
    switch (reviewFilter) {
      case 'top':
        return topReviews;
      case 'bad':
        return badReviews;
      default:
        return [];
    }
  }, [reviewFilter, topReviews, badReviews]);

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      search: '',
      city: '',
      propertyType: '',
      priceRange: '',
      ratingMin: '',
      status: '',
      dateRange: ''
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Properties</h1>
          <p className="mt-2 text-muted-foreground">
            Explore our luxury property portfolio with real-time ratings and detailed descriptions
          </p>
        </div>

        {/* Filters Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filter Properties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search properties..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>

              {/* City Filter */}
              <Select value={filters.city} onValueChange={(value) => setFilters(prev => ({ ...prev, city: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Cities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Cities</SelectItem>
                  {uniqueCities.map(city => (
                    <SelectItem key={city} value={city}>{city}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Property Type Filter */}
              <Select value={filters.propertyType} onValueChange={(value) => setFilters(prev => ({ ...prev, propertyType: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniquePropertyTypes.map(type => (
                    <SelectItem key={type} value={type} className="capitalize">{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Price Range Filter */}
              <Select value={filters.priceRange} onValueChange={(value) => setFilters(prev => ({ ...prev, priceRange: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Prices" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Prices</SelectItem>
                  {priceRanges.map(range => (
                    <SelectItem key={range.label} value={range.label}>{range.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Rating Filter */}
              <Select value={filters.ratingMin} onValueChange={(value) => setFilters(prev => ({ ...prev, ratingMin: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Rating</SelectItem>
                  <SelectItem value="3.0">3.0+ Stars</SelectItem>
                  <SelectItem value="3.5">3.5+ Stars</SelectItem>
                  <SelectItem value="4.0">4.0+ Stars</SelectItem>
                  <SelectItem value="4.5">4.5+ Stars</SelectItem>
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="true">Active</SelectItem>
                  <SelectItem value="false">Inactive</SelectItem>
                </SelectContent>
              </Select>

              {/* Date Range Filter */}
              <Select value={filters.dateRange} onValueChange={(value) => setFilters(prev => ({ ...prev, dateRange: value === "all" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Date" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Date</SelectItem>
                  <SelectItem value="last-week">Last Week</SelectItem>
                  <SelectItem value="last-month">Last Month</SelectItem>
                  <SelectItem value="last-3-months">Last 3 Months</SelectItem>
                  <SelectItem value="last-year">Last Year</SelectItem>
                </SelectContent>
              </Select>

              {/* Clear Filters Button */}
              <Button variant="outline" onClick={clearFilters} className="w-full">
                Clear Filters
              </Button>
            </div>

            <div className="text-sm text-muted-foreground">
              Showing {filteredProperties.length} of {properties.length} properties
            </div>
          </CardContent>
        </Card>

        {/* Reviews Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Property Reviews Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 mb-4">
              <Button
                variant={reviewFilter === 'all' ? 'default' : 'outline'}
                onClick={() => setReviewFilter('all')}
                size="sm"
              >
                All Reviews
              </Button>
              <Button
                variant={reviewFilter === 'top' ? 'default' : 'outline'}
                onClick={() => setReviewFilter('top')}
                size="sm"
                className="text-green-600"
              >
                <ThumbsUp className="h-4 w-4 mr-1" />
                Top Reviews (5)
              </Button>
              <Button
                variant={reviewFilter === 'bad' ? 'default' : 'outline'}
                onClick={() => setReviewFilter('bad')}
                size="sm"
                className="text-red-600"
              >
                <ThumbsDown className="h-4 w-4 mr-1" />
                Bad Reviews (5)
              </Button>
            </div>

            {/* Reviews section removed as requested */}
          </CardContent>
        </Card>

        {/* Properties Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="h-full transition-all hover:shadow-lg overflow-hidden">
              <img
                src={property.image}
                alt={property.name}
                className="w-full h-48 object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = '/images/property-placeholder.svg';
                }}
              />

              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-warning text-warning" />
                    <span className="font-semibold">
                      {property.rating?.toFixed(1) || 'N/A'}
                    </span>
                  </div>
                </div>
                <CardTitle className="mt-4 line-clamp-2">{property.name}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Price and Location */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-lg font-bold text-primary">
                    <DollarSign className="h-5 w-5" />
                    <span>{property.price_range || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>
                      {property.address}, {property.city}, {property.country}
                    </span>
                  </div>
                </div>

                {/* Property Type and Status */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="capitalize">
                    {property.type}
                  </Badge>
                  <Badge variant={property.isActive ? 'default' : 'secondary'}>
                    {property.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>

                {/* Details and View Button */}
                <div className="flex items-center justify-between pt-2 border-t">
                  <div className="text-sm text-muted-foreground">
                    Listed: {format(parseISO(property.created_at), 'MMM dd, yyyy')}
                  </div>
                  <Link
                    to={`/properties/${property.property_id}`}
                    className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 transition-colors"
                  >
                    View Details →
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredProperties.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No properties found</h3>
              <p className="text-muted-foreground">
                Try adjusting your filters to see more results.
              </p>
              <Button onClick={clearFilters} className="mt-4">
                Clear All Filters
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Properties;

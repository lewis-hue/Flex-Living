import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, MapPin, Bed, Bath, Users, Star, Calendar,
  MessageCircle, TrendingUp, TrendingDown, Eye, Edit,
  ExternalLink, Phone, Mail, Clock, BarChart3, PieChart,
  Bot, Globe, Heart, ThumbsUp, Lightbulb, RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, format } from 'date-fns';

interface PropertyDetails {
  id: string;
  name: string;
  address: string;
  property_type: string;
  city?: string;
  state?: string;
  country?: string;
  price_range: string;
  description: string;
  amenities: string[];
  photos: string[];
  max_guests: number;
  bedrooms: number;
  bathrooms: number;
  is_active: boolean;
  
  // Statistics
  average_rating: number;
  total_reviews: number;
  total_likes: number;
  total_comments: number;
  sentiment_distribution: {
    positive: number;
    negative: number;
    neutral: number;
  };
  recent_reviews: any[];
  monthly_stats: {
    month: string;
    reviews_count: number;
    average_rating: number;
    sentiment_score: number;
  }[];
}

interface PropertyReview {
  id: string;
  guest_name: string;
  rating: number;
  public_review: string;
  sentiment_label: string;
  topics: string[];
  submitted_at: string;
  has_ai_response: boolean;
  has_human_response: boolean;
  likes_count: number;
  helpful_count: number;
  language?: string;
}

const PropertyDetail: React.FC = () => {
  const { propertyId } = useParams<{ propertyId: string }>();
  const navigate = useNavigate();

  // Hardcoded property descriptions
  const propertyDescriptions: Record<string, { description: string; sellingPoints: { category: string; details: string }[] }> = {
    "prop_001": {
      description: "🏰 Property Description: 'The Grand Estate'\n\nNestled within the prestigious enclave of Greenwich, Connecticut, The Grand Estate is an architectural masterpiece that seamlessly blends timeless European sophistication with modern luxury. Spanning over 22,000 square feet of meticulously designed living space, this estate exemplifies grandeur, privacy, and craftsmanship at the highest level.\n\nFrom the moment you approach through the wrought-iron gates, a tree-lined driveway leads you to an impressive cobblestone motor court and a stately façade reminiscent of a refined French château. Inside, hand-carved moldings, soaring 30-foot ceilings, and imported Italian marble floors create an atmosphere of unparalleled elegance.\n\nThe residence features nine ensuite bedrooms, each designed with bespoke detailing, marble fireplaces, and private balconies overlooking manicured gardens. The primary suite is a sanctuary of indulgence — complete with a private terrace, spa-inspired bathroom with onyx finishes, and dual dressing rooms fit for couture collections.\n\nEntertainment and relaxation are at the core of The Grand Estate. Enjoy a private home theater, temperature-controlled wine cellar, fitness pavilion, and an indoor swimming pool with skylit ceiling. Outdoors, formal gardens flow into a resort-style infinity pool, al fresco dining terraces, and a guesthouse equipped for extended stays.\n\nCutting-edge smart home automation, a private elevator, and 24/7 security systems provide the highest levels of comfort and peace of mind.\n\nWhether hosting elite gatherings, retreating in solitude, or experiencing family life in grand style, The Grand Estate stands as a timeless expression of luxury living.",
      sellingPoints: [
        { category: "Location", details: "Prime Greenwich address, surrounded by nature preserves and world-class estates." },
        { category: "Architecture", details: "French château-inspired design with modern functionality." },
        { category: "Size & Layout", details: "22,000 sq ft with 9 ensuite bedrooms, 12 bathrooms, and multiple entertainment spaces." },
        { category: "Amenities", details: "Home theater, indoor pool, gym, spa, wine cellar, guesthouse, and smart home automation." },
        { category: "Outdoor Features", details: "Landscaped gardens, infinity pool, terraces, and panoramic estate views." },
        { category: "Luxury Finishes", details: "Imported marble, hand-carved woodwork, custom chandeliers, floor-to-ceiling windows." },
        { category: "Lifestyle Appeal", details: "Perfect for entertaining, private family living, or as a long-term luxury investment." }
      ]
    },
    "prop_002": {
      description: "🏖️ Property Description: 'The Coastal Dream'\n\nThis exquisite beachfront home defines luxury coastal living with its sleek, contemporary design and unparalleled access to a pristine white-sand beach. The architecture emphasizes a seamless connection between the indoors and the breathtaking ocean vista, achieved through expansive sliding glass doors that completely open, creating a vast al fresco living space.\n\nThe upper level features floor-to-ceiling windows and a glass-railed balcony, offering panoramic views of the turquoise waters and swaying palm trees. Natural wood siding and a clean, minimalist aesthetic blend harmoniously with the tranquil surroundings.\n\nA generous wooden deck extends directly onto the sand, providing ample space for sunbathing, entertaining, or simply enjoying the ocean breeze. Inside, the decor is light and airy, featuring natural textures, high-end finishes, and an open-concept layout that maximizes the stunning views.\n\nThis property is perfect for those seeking an exclusive, private retreat where the beach becomes an extension of their home, ideal for a luxurious vacation lifestyle or a permanent residence for ocean lovers.",
      sellingPoints: [
        { category: "Location", details: "Prime Malibu beachfront with direct sand access." },
        { category: "Architecture", details: "Contemporary design with seamless indoor-outdoor flow." },
        { category: "Size & Layout", details: "5,000+ sq ft with open-concept living spaces." },
        { category: "Amenities", details: "Ocean views from every room, private deck, and beach access." },
        { category: "Outdoor Features", details: "Direct beach access, wooden deck, and oceanfront relaxation areas." },
        { category: "Luxury Finishes", details: "Natural wood, glass railings, and premium coastal finishes." },
        { category: "Lifestyle Appeal", details: "Perfect for beach lovers and coastal luxury living." }
      ]
    },
    "prop_003": {
      description: "🏡 Property Description: 'The Suburban Sanctuary'\n\nNestled in an exclusive gated community, this stunning modern retreat offers the perfect blend of luxury and comfort. The architectural design seamlessly integrates indoor and outdoor living spaces, featuring floor-to-ceiling windows that flood the interior with natural light.\n\nThe open-concept layout connects the living room, dining area, and gourmet kitchen, creating an ideal space for entertaining and family gatherings. The property boasts meticulously landscaped grounds with a resort-style backyard featuring a sparkling infinity pool, spa, and outdoor kitchen.\n\nMultiple terraces and balconies provide multiple outdoor living areas, each offering unique views of the surrounding hills and cityscape. The master suite includes a private balcony, walk-in closet, and spa-like bathroom. Additional features include a wine cellar, home theater, and smart home technology throughout.\n\nThis property represents the pinnacle of suburban luxury living.",
      sellingPoints: [
        { category: "Location", details: "Exclusive gated community in Beverly Hills." },
        { category: "Architecture", details: "Modern design with indoor-outdoor integration." },
        { category: "Size & Layout", details: "4,500 sq ft with open-concept living." },
        { category: "Amenities", details: "Infinity pool, spa, outdoor kitchen, wine cellar, home theater." },
        { category: "Outdoor Features", details: "Resort-style backyard, multiple terraces, and landscaped gardens." },
        { category: "Luxury Finishes", details: "Floor-to-ceiling windows, premium materials, smart home technology." },
        { category: "Lifestyle Appeal", details: "Ideal for family living and sophisticated entertaining." }
      ]
    },
    "prop_004": {
      description: "🏙️ Property Description: 'The Urban Mansion'\n\nThis impressive urban mansion showcases sophisticated architecture with contemporary flair and timeless elegance. The property features a striking facade with carefully proportioned windows, elegant stonework, and tasteful architectural details that create visual interest while maintaining a sense of grandeur.\n\nThe interior spaces are thoughtfully designed with high ceilings, premium finishes, and an abundance of natural light streaming through strategically placed windows. Each room offers unique architectural features including custom millwork, designer fixtures, and carefully curated materials that create a cohesive and luxurious atmosphere.\n\nThe property includes multiple living areas designed for both intimate family moments and grand entertaining, featuring formal dining spaces, comfortable sitting rooms, and a gourmet kitchen equipped with the finest appliances. Multiple outdoor terraces and balconies provide elevated city views, creating perfect spaces for relaxation and entertainment while showcasing the surrounding urban landscape.",
      sellingPoints: [
        { category: "Location", details: "Prime Manhattan location with city views." },
        { category: "Architecture", details: "Contemporary urban design with elegant stonework." },
        { category: "Size & Layout", details: "6,000 sq ft with multiple living areas." },
        { category: "Amenities", details: "City views, formal dining, gourmet kitchen, and premium finishes." },
        { category: "Outdoor Features", details: "Multiple terraces and balconies with urban views." },
        { category: "Luxury Finishes", details: "Custom millwork, designer fixtures, high ceilings." },
        { category: "Lifestyle Appeal", details: "Perfect for urban luxury living and entertaining." }
      ]
    },
    "prop_005": {
      description: "🏠 Property Description: 'The Contemporary Villa'\n\nThis stunning contemporary villa represents the pinnacle of modern architectural design and luxury living. The clean lines, open spaces, and floor-to-ceiling windows create a seamless connection between indoor and outdoor environments. The property features an innovative layout that maximizes natural light and creates dramatic visual connections throughout the space.\n\nThe master suite includes a private terrace, walk-in closet, and spa-like bathroom with premium finishes. Additional amenities include a wine storage area, home gym, and multiple entertainment spaces. The property is designed for those who appreciate cutting-edge design, premium materials, and sophisticated lifestyle amenities.",
      sellingPoints: [
        { category: "Location", details: "Prime Los Angeles location." },
        { category: "Architecture", details: "Contemporary design with clean lines and open spaces." },
        { category: "Size & Layout", details: "4,200 sq ft with innovative layout." },
        { category: "Amenities", details: "Wine storage, home gym, entertainment spaces." },
        { category: "Outdoor Features", details: "Private terrace and outdoor living areas." },
        { category: "Luxury Finishes", details: "Floor-to-ceiling windows, premium materials." },
        { category: "Lifestyle Appeal", details: "Modern luxury living with sophisticated amenities." }
      ]
    },
    "prop_006": {
      description: "🏰 Property Description: 'The Elegant Estate'\n\nThis remarkable elegant estate combines classical architectural elements with modern luxury amenities. The property features sophisticated design details, premium materials, and thoughtful spatial planning that creates both grand entertaining areas and intimate private spaces.\n\nThe main residence includes multiple formal rooms, a gourmet kitchen, and extensive living areas designed for sophisticated entertaining. The grounds feature meticulously landscaped gardens, outdoor entertainment areas, and premium recreational facilities. The property represents the perfect fusion of traditional elegance and contemporary luxury, offering a sophisticated lifestyle in an exclusive setting.",
      sellingPoints: [
        { category: "Location", details: "Exclusive Greenwich location." },
        { category: "Architecture", details: "Classical elements with modern luxury." },
        { category: "Size & Layout", details: "8,000 sq ft with formal rooms and extensive living areas." },
        { category: "Amenities", details: "Gourmet kitchen, formal entertaining spaces." },
        { category: "Outdoor Features", details: "Landscaped gardens and outdoor entertainment areas." },
        { category: "Luxury Finishes", details: "Premium materials and sophisticated design." },
        { category: "Lifestyle Appeal", details: "Traditional elegance meets contemporary luxury." }
      ]
    },
    "prop_007": {
      description: "🏔️ Property Description: 'The Mountain Retreat'\n\nThis exceptional mountain retreat offers the perfect blend of luxury and comfort in a prestigious Aspen location. The property features an open-concept design with high-end finishes, premium appliances, and thoughtful architectural details throughout.\n\nThe grounds include a resort-style backyard with pool, spa, and entertainment areas designed for family living and social gatherings. Multiple terraces and outdoor spaces provide the perfect setting for both relaxation and entertainment, while the interior spaces offer elegant yet comfortable living areas.\n\nThe master suite includes luxury amenities and private outdoor access, while additional spaces include home entertainment areas, wine storage, and premium finishes throughout. This property represents the ultimate in mountain luxury living.",
      sellingPoints: [
        { category: "Location", details: "Prime Aspen mountain location." },
        { category: "Architecture", details: "Mountain retreat design with luxury finishes." },
        { category: "Size & Layout", details: "5,500 sq ft with open-concept living." },
        { category: "Amenities", details: "Pool, spa, entertainment areas, wine storage." },
        { category: "Outdoor Features", details: "Mountain views, terraces, and resort-style backyard." },
        { category: "Luxury Finishes", details: "Premium appliances and high-end finishes." },
        { category: "Lifestyle Appeal", details: "Perfect for mountain luxury and family gatherings." }
      ]
    },
    "prop_008": {
      description: "🏗️ Property Description: 'The Architectural Masterpiece'\n\nThis architectural masterpiece showcases innovative design principles and exceptional attention to detail. The property features a unique architectural style that combines contemporary elements with timeless sophistication. The design emphasizes natural light, open spaces, and seamless indoor-outdoor flow.\n\nThe property includes multiple living areas, a gourmet kitchen, and luxury amenities throughout. Premium materials, custom finishes, and thoughtful spatial planning create a sophisticated living environment. The property also features multiple outdoor spaces designed for entertainment and relaxation, showcasing the surrounding landscape.\n\nThis represents a rare opportunity to own a truly unique and architecturally significant property.",
      sellingPoints: [
        { category: "Location", details: "Prime San Francisco location." },
        { category: "Architecture", details: "Innovative design with contemporary and timeless elements." },
        { category: "Size & Layout", details: "7,000 sq ft with multiple living areas." },
        { category: "Amenities", details: "Gourmet kitchen and luxury amenities throughout." },
        { category: "Outdoor Features", details: "Multiple outdoor spaces with landscape views." },
        { category: "Luxury Finishes", details: "Premium materials and custom finishes." },
        { category: "Lifestyle Appeal", details: "Unique architectural significance and sophisticated living." }
      ]
    },
    "prop_009": {
      description: "🌴 Property Description: 'The Luxury Haven'\n\nThis exceptional luxury haven represents the pinnacle of sophisticated living with its meticulously designed architecture and attention to detail. The property showcases premium materials, custom finishes, and innovative design elements throughout.\n\nThe grand foyer features marble flooring, a sweeping staircase, and elegant lighting that sets the tone for the entire residence. The open-concept main living areas include a state-of-the-art kitchen with professional-grade appliances, multiple living spaces designed for both intimate family moments and grand entertaining, and floor-to-ceiling windows that offer stunning views.\n\nThe master suite includes a private sitting area, walk-in closet, and luxurious bathroom with premium fixtures. Additional features include a library, home office, wine storage, and multiple outdoor terraces. The grounds are professionally landscaped with resort-style amenities including a pool, spa, and entertainment pavilion.",
      sellingPoints: [
        { category: "Location", details: "Prime Miami location." },
        { category: "Architecture", details: "Meticulously designed with premium materials." },
        { category: "Size & Layout", details: "6,800 sq ft with grand foyer and sweeping staircase." },
        { category: "Amenities", details: "State-of-the-art kitchen, library, home office, wine storage." },
        { category: "Outdoor Features", details: "Multiple terraces, pool, spa, entertainment pavilion." },
        { category: "Luxury Finishes", details: "Marble flooring, premium fixtures, floor-to-ceiling windows." },
        { category: "Lifestyle Appeal", details: "Sophisticated living with resort-style amenities." }
      ]
    }
  };
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('overview');
  const [reviewsFilter, setReviewsFilter] = useState('all');
  const [selectedReview, setSelectedReview] = useState<any>(null);
  const [aiResponseEnabled, setAiResponseEnabled] = useState(true);
  const [customInstructions, setCustomInstructions] = useState('');

  // Fetch property details
  const { data: property, isLoading: propertyLoading, refetch: refetchProperty } = useQuery({
    queryKey: ['property-details', propertyId],
    queryFn: () => apiClient.getPropertyDetails(propertyId!),
    enabled: !!propertyId,
  });

  // Fetch property reviews
  const { data: reviewsData, isLoading: reviewsLoading } = useQuery({
    queryKey: ['property-reviews', propertyId, reviewsFilter],
    queryFn: () => apiClient.getEnhancedReviews({ 
      property_id: propertyId, 
      limit: 50,
      ...(reviewsFilter !== 'all' && { sentiment: reviewsFilter })
    }),
    enabled: !!propertyId,
  });

  const reviews = reviewsData?.reviews || [];

  // AI Response generation mutation
  const generateAiResponseMutation = useMutation({
    mutationFn: (reviewId: string) =>
      apiClient.generateAIResponse(reviewId, aiResponseEnabled, customInstructions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-reviews'] });
      toast.success('AI response generated successfully!');
    },
    onError: () => {
      toast.error('Failed to generate AI response');
    },
  });

  // Add human response mutation
  const addHumanResponseMutation = useMutation({
    mutationFn: ({ reviewId, responseText }: { reviewId: string; responseText: string }) =>
      apiClient.addHumanResponse(reviewId, responseText),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-reviews'] });
      toast.success('Response added successfully!');
      setSelectedReview(null);
    },
    onError: () => {
      toast.error('Failed to add response');
    },
  });

  // Translation mutation
  const translateMutation = useMutation({
    mutationFn: ({ reviewId, targetLanguage }: { reviewId: string; targetLanguage: string }) =>
      apiClient.translateReview(reviewId, targetLanguage),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['property-reviews'] });
      toast.success(`Review translated to ${variables.targetLanguage}`);
    },
    onError: () => {
      toast.error('Translation failed');
    },
  });

  // Review engagement mutation
  const addEngagementMutation = useMutation({
    mutationFn: ({ reviewId, engagementType }: { reviewId: string; engagementType: string }) =>
      apiClient.addReviewEngagement(reviewId, engagementType),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property-reviews'] });
    },
  });

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatRating = (rating: number) => {
    return rating.toFixed(1);
  };

  if (propertyLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  if (!property) {
    return (
      <DashboardLayout>
        <div className="text-center py-20">
          <p className="text-muted-foreground">Property not found</p>
          <Button onClick={() => navigate('/properties')} className="mt-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Properties
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{property.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <p className="text-muted-foreground">{property.address}</p>
                {property.is_active && (
                  <Badge className="bg-green-100 text-green-800">Active</Badge>
                )}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetchProperty()}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline">
              <Edit className="mr-2 h-4 w-4" />
              Edit Property
            </Button>
            <Button>
              <ExternalLink className="mr-2 h-4 w-4" />
              View Public Page
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <p className="text-2xl font-bold">{formatRating(property.average_rating)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <TrendingUp className="h-8 w-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Reviews</p>
                  <p className="text-2xl font-bold">{property.total_reviews}</p>
                </div>
                <MessageCircle className="h-8 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Engagement</p>
                  <p className="text-2xl font-bold">{property.total_likes + property.total_comments}</p>
                </div>
                <BarChart3 className="h-8 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Price Range</p>
                  <p className="text-lg font-semibold">{property.price_range}</p>
                </div>
                <TrendingUp className="h-8 w-4 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reviews">Reviews ({property.total_reviews})</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Property Images */}
            {property.photos && property.photos.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Property Images</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {property.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo.startsWith('http') ? photo : `/properties/${photo}`}
                          alt={`${property.name} - Image ${index + 1}`}
                          className="w-full h-48 object-cover rounded-lg transition-transform group-hover:scale-105"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = '/images/property-placeholder.svg';
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Property Description */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Overview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-muted-foreground whitespace-pre-line">
                    {propertyDescriptions[propertyId || '']?.description || property.description}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">Up to {property.max_guests} guests</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bed className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{property.bedrooms} bedrooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Bath className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{property.bathrooms} bathrooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{property.property_type}</span>
                    </div>
                  </div>

                  {propertyDescriptions[propertyId || '']?.sellingPoints && (
                    <div>
                      <h4 className="font-semibold mb-2">💎 Key Selling Points</h4>
                      <div className="space-y-2">
                        {propertyDescriptions[propertyId || ''].sellingPoints.map((point, index) => (
                          <div key={index} className="flex flex-col gap-1">
                            <span className="font-medium text-sm">{point.category}:</span>
                            <span className="text-sm text-muted-foreground">{point.details}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Review section removed as requested */}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="space-y-6">
            {/* Reviews Filter */}
            <Card>
              <CardHeader>
                <CardTitle>Reviews Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <Select value={reviewsFilter} onValueChange={setReviewsFilter}>
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Reviews</SelectItem>
                      <SelectItem value="positive">Positive</SelectItem>
                      <SelectItem value="neutral">Neutral</SelectItem>
                      <SelectItem value="negative">Negative</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-muted-foreground">
                    {reviews.length} reviews found
                  </span>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="ai-assistance-detail"
                      checked={aiResponseEnabled}
                      onChange={(e) => setAiResponseEnabled(e.target.checked)}
                    />
                    <label htmlFor="ai-assistance-detail" className="text-sm">
                      <Bot className="mr-1 h-4 w-4 inline" />
                      AI Assistance
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Reviews List */}
            <Card>
              <CardContent className="p-0">
                {reviewsLoading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                  </div>
                ) : reviews && reviews.length > 0 ? (
                  <div className="divide-y">
                    {reviews.map((review: PropertyReview) => (
                      <div key={review.id} className="p-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{review.guest_name}</span>
                              <div className="flex items-center">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-muted'
                                    }`}
                                  />
                                ))}
                              </div>
                              <Badge className={getSentimentColor(review.sentiment_label)}>
                                {review.sentiment_label}
                              </Badge>
                              {review.language && review.language !== 'en' && (
                                <Badge variant="secondary">
                                  <Globe className="mr-1 h-3 w-3" />
                                  {review.language}
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm">{review.public_review}</p>
                            {review.topics && review.topics.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {review.topics.map((topic, i) => (
                                  <Badge key={i} variant="outline" className="text-xs">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{formatDistanceToNow(new Date(review.submitted_at), { addSuffix: true })}</span>
                              <div className="flex items-center gap-2">
                                <span>{review.likes_count} likes</span>
                                <span>{review.helpful_count} helpful</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {/* Translate Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => translateMutation.mutate({ reviewId: review.id, targetLanguage: 'en' })}
                              disabled={translateMutation.isPending}
                            >
                              <Globe className="h-4 w-4" />
                            </Button>

                            {/* AI Response Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => generateAiResponseMutation.mutate(review.id)}
                              disabled={generateAiResponseMutation.isPending}
                            >
                              <Bot className="h-4 w-4" />
                            </Button>

                            {/* Respond Button */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedReview(review)}
                            >
                              <MessageCircle className="h-4 w-4" />
                            </Button>

                            {/* Engagement Buttons */}
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addEngagementMutation.mutate({ reviewId: review.id, engagementType: 'like' })}
                              >
                                <Heart className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => addEngagementMutation.mutate({ reviewId: review.id, engagementType: 'helpful' })}
                              >
                                <ThumbsUp className="h-4 w-4" />
                              </Button>
                            </div>

                            {review.has_ai_response && (
                              <Badge className="bg-blue-100 text-blue-800">AI</Badge>
                            )}
                            {review.has_human_response && (
                              <Badge className="bg-green-100 text-green-800">Human</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 text-center text-muted-foreground">
                    No reviews found for this property
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sentiment Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Sentiment Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span>Positive</span>
                      </div>
                      <span className="font-semibold">{property.sentiment_distribution.positive}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                        <span>Neutral</span>
                      </div>
                      <span className="font-semibold">{property.sentiment_distribution.neutral}%</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span>Negative</span>
                      </div>
                      <span className="font-semibold">{property.sentiment_distribution.negative}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Monthly Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {property.monthly_stats?.slice(0, 6).map((stat, index) => (
                      <div key={index} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{stat.month}</span>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{stat.reviews_count} reviews</span>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                              <span>{formatRating(stat.average_rating)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          {stat.sentiment_score > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-500" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="details" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Property Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Property ID</p>
                      <p className="font-mono">{property.id}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Status</p>
                      <Badge className={property.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                        {property.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Type</p>
                      <p className="capitalize">{property.property_type?.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Max Guests</p>
                      <p>{property.max_guests}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bedrooms</p>
                      <p>{property.bedrooms}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Bathrooms</p>
                      <p>{property.bathrooms}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{property.address}</p>
                      {property.city && property.state && (
                        <p className="text-sm text-muted-foreground">
                          {property.city}, {property.state}
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Review Response Dialog */}
        <Dialog open={!!selectedReview} onOpenChange={() => setSelectedReview(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Respond to Review</DialogTitle>
            </DialogHeader>
            {selectedReview && (
              <div className="space-y-4">
                <div className="bg-secondary p-4 rounded-lg">
                  <h4 className="font-semibold">{selectedReview.guest_name}</h4>
                  <p className="text-sm text-muted-foreground">{selectedReview.public_review}</p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Add Your Response</label>
                  <Textarea
                    placeholder="Write a professional response to this review..."
                    className="min-h-20"
                    onChange={(e) => {
                      setSelectedReview({
                        ...selectedReview,
                        human_response_text: e.target.value
                      });
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      if (selectedReview.human_response_text) {
                        addHumanResponseMutation.mutate({
                          reviewId: selectedReview.id,
                          responseText: selectedReview.human_response_text
                        });
                      }
                    }}
                    disabled={!selectedReview.human_response_text || addHumanResponseMutation.isPending}
                  >
                    {addHumanResponseMutation.isPending ? 'Submitting...' : 'Submit Response'}
                  </Button>
                  <Button variant="outline" onClick={() => setSelectedReview(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default PropertyDetail;

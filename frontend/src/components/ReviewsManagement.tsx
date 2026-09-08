import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Building2, MessageSquare, Star, Clock, CheckCircle, XCircle, 
  Search, Filter, Download, MoreVertical, Eye, AlertTriangle,
  ThumbsUp, ThumbsDown, Brain, RefreshCw
} from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { formatDistanceToNow } from 'date-fns';
import { apiClient, ReviewWithProperty } from '@/lib/api';
import { useState, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

const ReviewsManagement = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State management
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    property_id: '',
    source: '',
    sentiment: '',
    rating_min: '',
    rating_max: '',
    status: '',
    search: '',
    start_date: '',
    end_date: ''
  });
  
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [reviewDetails, setReviewDetails] = useState<ReviewWithProperty | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch reviews with filters
  const { data: reviewsData, isLoading, refetch } = useQuery({
    queryKey: ['reviews', filters],
    queryFn: () => apiClient.getReviews(filters),
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: (reviewIds: string[]) => apiClient.bulkApproveReviews(reviewIds),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `${data.modified_count} reviews approved successfully`,
      });
      setSelectedReviews([]);
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Single approve mutation
  const approveMutation = useMutation({
    mutationFn: (id: string) => apiClient.approveReview(id),
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Review approved successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Single reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => 
      apiClient.rejectReview(id, reason),
    onSuccess: () => {
      toast({
        title: "Success", 
        description: "Review rejected successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Hostaway sync mutation
  const syncMutation = useMutation({
    mutationFn: () => apiClient.fetchHostawayReviews({
      start_date: filters.start_date,
      end_date: filters.end_date
    }),
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: `Synced ${data.total_count} reviews from Hostaway`,
      });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Handlers
  const handleSelectReview = (reviewId: string, checked: boolean) => {
    if (checked) {
      setSelectedReviews(prev => [...prev, reviewId]);
    } else {
      setSelectedReviews(prev => prev.filter(id => id !== reviewId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedReviews(reviewsData?.reviews.map(r => r.id) || []);
    } else {
      setSelectedReviews([]);
    }
  };

  const handleBulkApprove = () => {
    if (selectedReviews.length > 0) {
      bulkApproveMutation.mutate(selectedReviews);
    }
  };

  const handleViewDetails = (review: ReviewWithProperty) => {
    setReviewDetails(review);
    setShowDetails(true);
  };

  // AI Analysis for reviews
  const getAISummary = (review: ReviewWithProperty) => {
    const sentimentEmoji = review.sentiment_label === 'positive' ? '😊' : 
                          review.sentiment_label === 'negative' ? '😞' : '😐';
    
    return {
      sentiment: sentimentEmoji,
      confidence: review.sentiment_score ? Math.abs(review.sentiment_score * 100).toFixed(0) : '0',
      topics: review.topics?.slice(0, 3).join(', ') || 'No topics identified'
    };
  };

  // Filtered and paginated data
  const filteredReviews = useMemo(() => {
    if (!reviewsData?.reviews) return [];
    return reviewsData.reviews;
  }, [reviewsData?.reviews]);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">All Guest Reviews Management</h1>
            <p className="mt-2 text-muted-foreground">
              Central hub to manage, view, and approve reviews
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => syncMutation.mutate()}
              disabled={syncMutation.isPending}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
              📥 Import from Hostaway
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                📋 Total Reviews
              </CardTitle>
              <MessageSquare className="h-4 w-4 text-chart-2" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{reviewsData?.total_count || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ⏳ Pending Approval
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {filteredReviews.filter(r => r.status === 'pending').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                ✅ Approved
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {filteredReviews.filter(r => r.is_approved).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                🚩 Flagged
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredReviews.filter(r => r.is_flagged).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔍 Search & Filter
              <Badge variant="secondary">Advanced Filtering</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search reviews..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  className="pl-9"
                />
              </div>
              
              <Select value={filters.property_id} onValueChange={(value) => setFilters(prev => ({ ...prev, property_id: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Properties" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Properties</SelectItem>
                  {Array.from(new Set(filteredReviews.map(r => r.property?.name))).map(name => (
                    <SelectItem key={name} value={name || ''}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filters.source} onValueChange={(value) => setFilters(prev => ({ ...prev, source: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Channels" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Channels</SelectItem>
                  <SelectItem value="hostaway">Hostaway</SelectItem>
                  <SelectItem value="google">Google</SelectItem>
                  <SelectItem value="airbnb">Airbnb</SelectItem>
                  <SelectItem value="booking">Booking.com</SelectItem>
                  <SelectItem value="direct">Direct</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.sentiment} onValueChange={(value) => setFilters(prev => ({ ...prev, sentiment: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Sentiments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sentiments</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.rating_min} onValueChange={(value) => setFilters(prev => ({ ...prev, rating_min: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Min Rating" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Any Rating</SelectItem>
                  <SelectItem value="1">1+ Stars</SelectItem>
                  <SelectItem value="2">2+ Stars</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="5">5 Stars</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value, page: 1 }))}>
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-4 mt-4">
              <Button onClick={() => refetch()} variant="default" size="sm">
                Apply Filters
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setFilters({
                  page: 1, limit: 20, property_id: '', source: '', sentiment: '',
                  rating_min: '', rating_max: '', status: '', search: '',
                  start_date: '', end_date: ''
                })}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedReviews.length > 0 && (
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">
                  {selectedReviews.length} review{selectedReviews.length > 1 ? 's' : ''} selected
                </span>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={handleBulkApprove}
                    disabled={bulkApproveMutation.isPending}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Bulk Approve
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setSelectedReviews([])}>
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reviews Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>📋 Review Table</CardTitle>
              <div className="text-sm text-muted-foreground">
                Page {filters.page} of {reviewsData?.total_pages || 1}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        checked={selectedReviews.length === filteredReviews.length && filteredReviews.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Guest</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Property</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Sentiment</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReviews.length > 0 ? (
                    filteredReviews.map((review) => {
                      const aiSummary = getAISummary(review);
                      return (
                        <TableRow key={review.id} className="hover:bg-muted/50">
                          <TableCell>
                            <Checkbox
                              checked={selectedReviews.includes(review.id)}
                              onCheckedChange={(checked) => handleSelectReview(review.id, checked as boolean)}
                            />
                          </TableCell>
                          
                          <TableCell>
                            <div>
                              <div className="font-medium">{review.reviewer_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {review.review_text.length > 50 
                                  ? `${review.review_text.substring(0, 50)}...` 
                                  : review.review_text
                                }
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-warning fill-current" />
                              <span className="font-medium">{review.rating}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm">{review.property?.name || 'Unknown'}</span>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {review.source}
                            </Badge>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{aiSummary.sentiment}</span>
                              <div className="text-xs">
                                <div className="font-medium">{aiSummary.confidence}%</div>
                                <div className="text-muted-foreground">{aiSummary.topics}</div>
                              </div>
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {review.is_approved ? (
                                <Badge className="bg-green-100 text-green-800">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Approved
                                </Badge>
                              ) : review.status === 'pending' ? (
                                <Badge variant="outline" className="text-warning border-warning">
                                  <Clock className="h-3 w-3 mr-1" />
                                  Pending
                                </Badge>
                              ) : (
                                <Badge variant="destructive">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Rejected
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(review.created_at), 'MMM dd, yyyy')}
                            </div>
                          </TableCell>
                          
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewDetails(review)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              
                              {!review.is_approved && review.status === 'pending' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => approveMutation.mutate(review.id)}
                                    disabled={approveMutation.isPending}
                                    className="text-green-600 hover:text-green-700"
                                  >
                                    <ThumbsUp className="h-4 w-4" />
                                  </Button>
                                  
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => rejectMutation.mutate({ id: review.id })}
                                    disabled={rejectMutation.isPending}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <ThumbsDown className="h-4 w-4" />
                                  </Button>
                                </>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                        No reviews found matching the current filters
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            {reviewsData && reviewsData.total_pages > 1 && (
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Showing {((filters.page - 1) * filters.limit) + 1} to {Math.min(filters.page * filters.limit, reviewsData.total_count)} of {reviewsData.total_count} reviews
                </div>
                
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={!reviewsData.has_prev}
                  >
                    Previous
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={!reviewsData.has_next}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Review Details Dialog */}
        <Dialog open={showDetails} onOpenChange={setShowDetails}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>🧠 AI Analysis on Hover/Click</DialogTitle>
              <DialogDescription>
                Quick AI-generated summary per review
              </DialogDescription>
            </DialogHeader>
            
            {reviewDetails && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">Guest Information</h4>
                    <p className="text-sm text-muted-foreground">{reviewDetails.reviewer_name}</p>
                    <p className="text-sm text-muted-foreground">{reviewDetails.reviewer_email}</p>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">Rating & Source</h4>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-warning fill-current" />
                      <span>{reviewDetails.rating}/5</span>
                      <Badge variant="outline">{reviewDetails.source}</Badge>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold">Review Text</h4>
                  <p className="text-sm bg-muted p-3 rounded">{reviewDetails.review_text}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold">AI Sentiment Analysis</h4>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        {reviewDetails.sentiment_label === 'positive' ? '😊' : 
                         reviewDetails.sentiment_label === 'negative' ? '😞' : '😐'}
                        <span className="capitalize">{reviewDetails.sentiment_label || 'neutral'}</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {reviewDetails.sentiment_score ? Math.abs(reviewDetails.sentiment_score * 100).toFixed(0) : 0}%
                      </p>
                    </div>
                  </div>
                  
                  <div>
                    <h4 className="font-semibold">Extracted Topics</h4>
                    <div className="flex flex-wrap gap-1">
                      {reviewDetails.topics?.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic}
                        </Badge>
                      )) || <span className="text-sm text-muted-foreground">No topics identified</span>}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold">AI Insight</h4>
                  <p className="text-sm bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                    {reviewDetails.sentiment_label === 'positive' 
                      ? "Positive sentiment, highlights communication and service quality." 
                      : reviewDetails.sentiment_label === 'negative'
                      ? "Negative sentiment, may need attention to service aspects."
                      : "Neutral sentiment, standard guest experience."
                    }
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default ReviewsManagement;
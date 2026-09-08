import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { apiClient } from '@/lib/api';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Bookmark,
  Star,
  MessageSquare,
  Trash2,
  Clock,
  Filter,
  Download,
  Share2,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SavedReview {
  id: string;
  review_id: string;
  guest_id: string;
  property_id: string;
  rating: number;
  review_text: string;
  sentiment: string;
  created_at: string;
  bookmarked_at: string;
  engagement_id: string;
  has_manager_response?: boolean;
  response_count?: number;
  manager_response_details?: any;
}

const SavedReviews: React.FC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [filters, setFilters] = useState({
    page: 1,
    limit: 20,
    sort_by: 'bookmarked_at',
    sort_order: 'desc' as 'asc' | 'desc',
    sentiment_filter: 'all',
    property_filter: 'all'
  });
  
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [selectedReview, setSelectedReview] = useState<SavedReview | null>(null);

  // Fetch saved reviews using apiClient
  const { data: savedReviewsData, isLoading, refetch } = useQuery({
    queryKey: ['saved-reviews', filters],
    queryFn: () => apiClient.getSavedReviews({
      page: filters.page,
      limit: filters.limit
    }),
  });

  const savedReviews = savedReviewsData?.reviews || [];

  // Remove bookmark mutation (unbookmark - return to main list)
  const removeBookmarkMutation = useMutation({
    mutationFn: async (engagementId: string) => {
      return await apiClient.removeEngagement(engagementId);
    },
    onSuccess: () => {
      // Invalidate all relevant query caches
      queryClient.invalidateQueries({ queryKey: ['saved-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-comprehensive'] });
      
      toast({
        title: "Success",
        description: "Review returned to main reviews list",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove bookmark",
        variant: "destructive"
      });
    }
  });
  
  // Complete deletion mutation (remove from entire application)
  const deleteReviewMutation = useMutation({
    mutationFn: async ({ reviewId, deletionType, reason }: {
      reviewId: string;
      deletionType: 'soft' | 'hard';
      reason?: string;
    }) => {
      if (deletionType === 'soft') {
        return await apiClient.softDeleteReview(reviewId, reason);
      } else {
        return await apiClient.hardDeleteReview(reviewId);
      }
    },
    onSuccess: (data: any) => {
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['saved-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['enhanced-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['archived-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-comprehensive'] });
      queryClient.invalidateQueries({ queryKey: ['analytics-dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['overview-dashboard'] });
      
      // Handle different response types
      let details = '';
      if ('engagements_removed' in data) {
        // Soft delete response
        details = data.engagements_removed > 0 || data.responses_removed > 0
          ? `${data.engagements_removed} bookmark(s) and ${data.responses_removed} response(s) removed.`
          : 'Review and all related data removed.';
      } else if ('deleted_items' in data) {
        // Hard delete response
        const items = data.deleted_items;
        details = `Removed: ${items.review ? 'review' : ''} ${items.engagements} bookmark(s), ${items.responses} response(s), ${items.analytics} analytics record(s).`;
      }
      
      toast({
        title: "Success",
        description: `Review deleted from entire application. ${details}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete review",
        variant: "destructive"
      });
    }
  });

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800';
      case 'negative': return 'bg-red-100 text-red-800';
      case 'neutral': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const safeFormatDate = (dateString: string | null | undefined, fallback: string = 'Date not available'): string => {
    if (!dateString) return fallback;
    
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallback;
    
    return date.toLocaleDateString();
  };

  const formatBookmarkDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRemoveBookmark = (engagementId: string) => {
    if (window.confirm('This will remove the review from saved items and return it to the main reviews list. Continue?')) {
      removeBookmarkMutation.mutate(engagementId);
    }
  };
  
  const handleSoftDelete = (reviewId: string) => {
    if (window.confirm('This will completely delete the review from the entire application. This action cannot be undone. Continue?')) {
      deleteReviewMutation.mutate({
        reviewId,
        deletionType: 'soft',
        reason: 'User requested complete deletion from saved reviews'
      });
    }
  };
  
  const handleHardDelete = (reviewId: string) => {
    if (window.confirm('This will PERMANENTLY delete the review from the entire application with no backup. This action cannot be undone. Are you absolutely sure?')) {
      deleteReviewMutation.mutate({
        reviewId,
        deletionType: 'hard'
      });
    }
  };

  // Navigation functions for saved reviews
  const goToNextReview = () => {
    if (currentReviewIndex < savedReviews.length - 1) {
      setCurrentReviewIndex(currentReviewIndex + 1);
      setSelectedReview(savedReviews[currentReviewIndex + 1]);
    }
  };

  const goToPreviousReview = () => {
    if (currentReviewIndex > 0) {
      setCurrentReviewIndex(currentReviewIndex - 1);
      setSelectedReview(savedReviews[currentReviewIndex - 1]);
    }
  };
  
  const handleReviewSelect = (review: SavedReview) => {
    const reviewIndex = savedReviews.findIndex(r => r.id === review.id);
    setCurrentReviewIndex(reviewIndex);
    setSelectedReview(review);
  };

  const handleExportSaved = () => {
    // Create CSV content
    const csvContent = "data:text/csv;charset=utf-8," 
      + "Property,Guest,Rating,Sentiment,Review Date,Saved Date,Review Text\n"
      + savedReviews.map(review => 
          `"${review.property_id}","${review.guest_id}",${review.rating},"${review.sentiment}","${safeFormatDate(review.created_at)}","${formatBookmarkDate(review.bookmarked_at)}","${review.review_text.replace(/"/g, '""')}"`
        ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `saved-reviews-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "Saved reviews exported to CSV",
    });
  };

  const shareSavedReviews = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Saved Reviews - Reviews HQ',
          text: `I have ${savedReviews.length} saved reviews for business insights.`,
          url: window.location.href,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link Copied",
        description: "Saved reviews link copied to clipboard",
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Bookmark className="h-8 w-8 text-primary" />
              Saved Reviews
            </h1>
            <p className="mt-2 text-muted-foreground">
              Reviews you've bookmarked for future reference and business insights
            </p>
            {savedReviewsData?.total_count > 0 && (
              <div className="mt-1 text-sm text-muted-foreground">
                {savedReviews.length > 0 && (
                  <span>Page {savedReviewsData.page} of {savedReviewsData.total_pages}</span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            {/* Page Navigation */}
            <div className="flex gap-1">
              <Button
                onClick={() => setFilters({ ...filters, page: Math.max(1, filters.page - 1) })}
                disabled={(savedReviewsData?.page || 1) <= 1}
                variant="outline"
                size="sm"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={() => setFilters({ ...filters, page: (savedReviewsData?.page || 1) + 1 })}
                disabled={(savedReviewsData?.page || 1) >= (savedReviewsData?.total_pages || 1)}
                variant="outline"
                size="sm"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
            <Button onClick={handleExportSaved} variant="outline" disabled={savedReviews.length === 0}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
            <Button onClick={shareSavedReviews} variant="outline" disabled={savedReviews.length === 0}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button onClick={() => refetch()} variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Saved</CardTitle>
              <Bookmark className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{savedReviewsData?.total_count || 0}</div>
              <p className="text-xs text-muted-foreground">Reviews bookmarked</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
              <Star className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {savedReviews.length > 0 
                  ? (savedReviews.reduce((sum, review) => sum + review.rating, 0) / savedReviews.length).toFixed(1)
                  : '0.0'
                }
              </div>
              <p className="text-xs text-muted-foreground">Average of saved reviews</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {savedReviews.filter(review => {
                  const savedDate = new Date(review.bookmarked_at);
                  const weekAgo = new Date();
                  weekAgo.setDate(weekAgo.getDate() - 7);
                  return savedDate > weekAgo;
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">Saved this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Saved Reviews List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Saved Reviews ({savedReviewsData?.total_count || 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : savedReviews && savedReviews.length > 0 ? (
              <div className="divide-y">
                {savedReviews.map((review: SavedReview) => (
                  <div
                    key={review.id}
                    className={`p-6 transition-colors cursor-pointer ${
                      review.id === selectedReview?.id
                        ? 'bg-primary/10 border-l-4 border-l-primary'
                        : 'hover:bg-secondary/50'
                    }`}
                    onClick={() => handleReviewSelect(review)}
                  >
                    <div className="space-y-4">
                      {/* Review Content and Actions */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Bookmark className="h-4 w-4 text-primary fill-current" />
                            <span className="text-xs text-muted-foreground">
                              Saved on {formatBookmarkDate(review.bookmarked_at)}
                            </span>
                            {review.id === selectedReview?.id && (
                              <Badge className="bg-primary text-primary-foreground">Selected</Badge>
                            )}
                          </div>
                          <p className="text-foreground font-medium mb-2">{review.review_text}</p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {review.rating && (
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
                              <span className="ml-1 text-sm text-muted-foreground">
                                {review.rating}/5
                              </span>
                            </div>
                          )}
                          <Button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveBookmark(review.engagement_id);
                            }}
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            title="Remove Bookmark (Return to Main List)"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Review Metadata */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Guest:</span>
                          <span>{review.guest_id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Property:</span>
                          <span>{review.property_id}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">Review Date:</span>
                          <span>{safeFormatDate(review.created_at)}</span>
                        </div>
                        <Badge className={getSentimentColor(review.sentiment)}>
                          {review.sentiment}
                        </Badge>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2 pt-2 border-t">
                        <Link to={`/dashboard/reviews?reviewId=${review.id}`}>
                          <Button variant="outline" size="sm">
                            <MessageSquare className="mr-2 h-4 w-4" />
                            View & Respond
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveBookmark(review.engagement_id);
                          }}
                        >
                          <Bookmark className="mr-2 h-4 w-4" />
                          Remove Bookmark
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSoftDelete(review.id);
                          }}
                          title="Complete deletion (with backup)"
                          disabled={deleteReviewMutation.isPending}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHardDelete(review.id);
                          }}
                          title="Permanent deletion (no backup)"
                          disabled={deleteReviewMutation.isPending}
                          className="border-red-200 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Permanent
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center">
                <Bookmark className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No saved reviews yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start bookmarking reviews to keep track of important feedback for your business insights.
                </p>
                <div className="flex gap-2 justify-center">
                  <Link to="/dashboard/reviews">
                    <Button>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Browse Reviews
                    </Button>
                  </Link>
                  <Button onClick={() => refetch()} variant="outline">
                    <Filter className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pagination Info */}
        {savedReviewsData && savedReviewsData.total_count > 0 && (
          <div className="text-center text-sm text-muted-foreground">
            Showing {savedReviews.length} of {savedReviewsData.total_count} saved reviews
            (Page {savedReviewsData.page} of {savedReviewsData.total_pages})
          </div>
        )}

        {/* Tips Section */}
        {savedReviews.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <h4 className="font-semibold">💡 Tips for Using Saved Reviews</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>• Save reviews with specific feedback for follow-up actions</p>
                  <p>• Bookmark negative reviews to track resolution progress</p>
                  <p>• Keep positive reviews for marketing and training purposes</p>
                  <p>• Export saved reviews for quarterly business analysis</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default SavedReviews;
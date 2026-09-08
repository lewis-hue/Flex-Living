import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MessageSquare, Star, Clock } from 'lucide-react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => apiClient.getDashboardStats(),
  });

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: 'Total Reviews',
      value: stats?.totalReviews || 0,
      icon: MessageSquare,
      color: 'text-chart-2',
    },
    {
      title: 'Average Rating',
      value: stats?.averageRating?.toFixed(1) || '0.0',
      icon: Star,
      color: 'text-warning',
    },
    {
      title: 'Pending Reviews',
      value: stats?.pendingReviews || 0,
      icon: Clock,
      color: 'text-destructive',
    },
    {
      title: 'Approved Reviews',
      value: stats?.approvedReviews || 0,
      icon: Building2,
      color: 'text-primary',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard Overview</h1>
          <p className="mt-2 text-muted-foreground">
            Monitor your property performance and guest reviews
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat) => (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Sentiment Breakdown */}
        {stats?.sentimentDistribution && Object.keys(stats.sentimentDistribution).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Sentiment Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(stats.sentimentDistribution).map(([sentiment, count]) => (
                  <div key={sentiment} className="flex items-center gap-3">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                      sentiment === 'positive' ? 'bg-success/10' :
                      sentiment === 'negative' ? 'bg-destructive/10' : 'bg-warning/10'
                    }`}>
                      <span className="text-2xl">
                        {sentiment === 'positive' ? '😊' :
                         sentiment === 'negative' ? '😞' : '😐'}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground capitalize">{sentiment}</p>
                      <p className={`text-2xl font-bold ${
                        sentiment === 'positive' ? 'text-success' :
                        sentiment === 'negative' ? 'text-destructive' : 'text-warning'
                      }`}>
                        {count}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Reviews */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.recentReviews?.slice(0, 5).map((review) => (
                <Link
                  key={review.id || review._id || `review-${String(review.created_at || review.submitted_at)}`}
                  to={`/dashboard/reviews?reviewId=${review.id || review._id}`}
                  state={{ openResponse: true }}
                  className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-secondary cursor-pointer"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{review.reviewer_name || review.guest_name}</p>
                      {review.property && (
                        <span className="text-xs text-muted-foreground">
                          {review.property.name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-warning text-warning'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.created_at || review.submitted_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {review.review_text || review.public_review}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {review.sentiment_label && (
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        review.sentiment_label === 'positive'
                          ? 'bg-green-100 text-green-800'
                          : review.sentiment_label === 'negative'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {review.sentiment_label}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">View & Respond →</span>
                  </div>
                </Link>
              ))}
              {(!stats?.recentReviews || stats.recentReviews.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No recent reviews found
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;

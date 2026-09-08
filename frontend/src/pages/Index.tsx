import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiClient } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Star, MapPin, Calendar, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import flexLogo from '@/assets/flex-logo.webp';

const Index = () => {
  const { user, isAuthenticated } = useAuth();
  const [properties, setProperties] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [propertiesData, reviewsData] = await Promise.all([
          apiClient.getProperties(),
          apiClient.getReviews()
        ]);
        setProperties(propertiesData.properties.slice(0, 6));
        setReviews(reviewsData.reviews.slice(0, 6));
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <img src={flexLogo} alt="Reviews HQ" className="h-16 w-auto mx-auto mb-4" />
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img src={flexLogo} alt="Reviews HQ" className="h-10 w-auto" />
              <h1 className="text-2xl font-bold">Reviews HQ</h1>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <span className="text-sm text-muted-foreground">Welcome, {user?.full_name}</span>
                  <Link to="/dashboard">
                    <Button>Dashboard</Button>
                  </Link>
                </>
              ) : (
                <div className="space-x-2">
                  <Link to="/login">
                    <Button variant="outline">Sign In</Button>
                  </Link>
                  <Link to="/signup">
                    <Button>Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 bg-gradient-to-r from-primary/10 to-secondary/10">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-4">Welcome to Reviews HQ</h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Discover amazing properties and read authentic reviews from real guests.
            Manage your property reviews with our comprehensive dashboard.
          </p>
          {!isAuthenticated && (
            <Link to="/signup">
              <Button size="lg" className="text-lg px-8 py-3">
                Get Started
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Properties Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-8">Featured Properties</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {properties.map((property) => (
              <Card key={property.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="truncate">{property.name}</span>
                    <Badge variant="secondary">{property.property_type}</Badge>
                  </CardTitle>
                  <CardDescription className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    {property.address}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      Added {new Date(property.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <Link to={`/property/${property.id}`}>
                    <Button className="w-full mt-4" variant="outline">
                      View Details
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
          {properties.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No properties available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Reviews Section */}
      <section className="py-16 bg-secondary/5">
        <div className="container mx-auto px-4">
          <h3 className="text-3xl font-bold text-center mb-8">Latest Reviews</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reviews.map((review) => (
              <Card key={review.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{review.reviewer_name}</CardTitle>
                    <div className="flex items-center">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400 mr-1" />
                      <span className="font-semibold">{review.rating}</span>
                    </div>
                  </div>
                  <CardDescription>
                    {review.property?.name || 'Property'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4 line-clamp-3">{review.review_text}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    <Badge variant={review.is_approved ? "default" : "secondary"}>
                      {review.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {reviews.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No reviews available yet.</p>
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <img src={flexLogo} alt="Reviews HQ" className="h-8 w-auto" />
            <span className="text-lg font-semibold">Reviews HQ</span>
          </div>
          <p className="text-muted-foreground">
            © 2024 Reviews HQ. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;

import { useParams, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { properties } from '@/data/properties';
import { Star, MapPin, DollarSign, Building2, Calendar, User, ArrowLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const PropertyDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const property = properties.find(p => p.property_id === id);

  if (!property) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900">Property Not Found</h2>
            <p className="mt-2 text-muted-foreground">
              The property you're looking for doesn't exist or has been removed.
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Back Button */}
        <Button
          variant="ghost"
          className="mb-4 -ml-4 text-muted-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Properties
        </Button>

        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold">{property.name}</h1>
            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{property.address}, {property.city}, {property.country}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-5 w-5 text-yellow-400 fill-yellow-400" />
                <span className="text-lg font-bold">{property.rating?.toFixed(1) || 'N/A'}</span>
              </div>
              <div className="text-sm text-muted-foreground">
                ({property.reviews?.length || 0} reviews)
              </div>
            </div>
            <Badge variant="outline" className="capitalize">
              {property.type}
            </Badge>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column - Images */}
          <div className="space-y-4">
            <img
              src={property.image}
              alt={property.name}
              className="w-full aspect-video object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = '/images/property-placeholder.svg';
              }}
            />
          </div>

          {/* Right Column - Details */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-xl font-bold text-primary">
              <DollarSign className="h-6 w-6" />
              <span>{property.price_range}</span>
            </div>

            <div className="prose max-w-none">
              <h3 className="text-lg font-semibold mb-2">About this property</h3>
              <p className="text-muted-foreground">{property.description}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Listed</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(property.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Reviews</p>
                  <p className="text-sm text-muted-foreground">
                    {property.reviews?.length || 0} total
                  </p>
                </div>
              </div>
            </div>

            {/* Reviews section removed as requested */}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default PropertyDetails;
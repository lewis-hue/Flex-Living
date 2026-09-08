import React from 'react';
import { Link } from 'react-router-dom'; // Import Link for navigation
import { properties } from '../data/properties'; // Import static properties data

// Basic styling, you can adapt this to your project's CSS framework
const styles: { [key: string]: React.CSSProperties } = {
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '2rem',
    padding: '2rem',
  },
  card: {
    border: '1px solid #ddd',
    borderRadius: '8px',
    overflow: 'hidden',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  image: {
    width: '100%',
    height: '200px',
    objectFit: 'cover',
  },
  content: {
    padding: '1rem',
  },
};

const PropertyList: React.FC = () => {
  // Use static properties data - no API calls needed
  const propertiesList = properties;

  return (
    <div style={styles.grid}>
      {propertiesList.map((property) => (
        <Link to={`/properties/${property.property_id}`} key={property.property_id} style={{ textDecoration: 'none', color: 'inherit' }}>
          <div style={styles.card}>
            {/* Use static image path from property data */}
            <img src={property.image} alt={property.name} style={styles.image} onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = '/images/property-placeholder.svg';
            }} />
            <div style={styles.content}>
              <h3>{property.name}</h3>
              <p>{property.city}, {property.country}</p>
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
};

export default PropertyList;

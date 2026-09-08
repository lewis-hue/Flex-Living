export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string; // ISO 8601 date string
  reply?: {
    author: string; // e.g., 'username' or 'Admin'
    comment: string;
    date: string;
  };
}

export interface Property {
  id: string;
  property_id: string;
  name: string;
  address: string;
  city: string;
  country: string;
  type: string;
  price_range: string;
  rating: number;
  created_at: string;
  updated_at: string;
  isActive: boolean;
  description: string;
  image: string;
  reviews?: Review[];
}

export const properties: Property[] = [
  {
    id: "prop_001",
    property_id: "prop_001",
    name: "The Architectural Masterpiece",
    address: "88 Skyline Drive",
    city: "Los Angeles",
    country: "USA",
    type: "penthouse",
    price_range: "$25M - $60M+",
    rating: 3.53,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Architectural Masterpiece.png",
    description: "🏗 The Architectural Masterpiece — Manhattan, New York\n\nA landmark in contemporary design, The Architectural Masterpiece redefines urban luxury. Its geometric façade and soaring glass atrium make it a city showpiece, while the interiors feature sculptural lighting, floating staircases, and a rooftop sky lounge with 360° skyline views.\n\nSelling Points:\n\n• Award-winning modernist design by leading architects\n• Penthouse-level fitness studio and rooftop garden\n• Automated lighting and climate systems\n• Concierge and private elevator access",
    reviews: Array(34).fill(null).map((_, i) => ({
      id: `review_prop_001_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "A truly exceptional property with outstanding amenities and service.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_002",
    property_id: "prop_002",
    name: "The Coastal Dream",
    address: "14 Oceanfront Avenue",
    city: "Malibu",
    country: "USA",
    type: "villa",
    price_range: "$18M - $45M",
    rating: 3.59,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Coastal Dream.png",
    description: "🌊 The Coastal Dream — Malibu, California\n\nWhere sky meets sea, The Coastal Dream offers front-row ocean living with floor-to-ceiling glass walls that erase the boundary between indoors and outdoors. Every room captures endless Pacific views, while soft white interiors and natural stone finishes create a serene modern retreat.\n\nSelling Points:\n\n• Private beach access and infinity-edge pool\n• Expansive decks for entertaining and sunset dining\n• Energy-efficient smart glass façades\n• Steps from Malibu's exclusive dining and surf spots",
    reviews: Array(38).fill(null).map((_, i) => ({
      id: `review_prop_002_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "Stunning beachfront location with impeccable design and comfort.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_003",
    property_id: "prop_003",
    name: "The Contemporary Villa",
    address: "21 Palm Grove Lane",
    city: "Miami",
    country: "USA",
    type: "villa",
    price_range: "$12M - $35M",
    rating: 3.33,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Contemporary Villa.png",
    description: "🏘 The Contemporary Villa — Los Angeles, California\n\nSculpted for the modern aesthete, The Contemporary Villa celebrates simplicity and open space. Every room flows seamlessly into the next, framed by glass walls and landscaped courtyards that fill the home with California sunlight.\n\nSelling Points:\n\n• Minimalist architecture with Italian finishes\n• Outdoor cinema and reflection pool\n• Fully automated security and lighting systems\n• Minutes from Beverly Hills and Sunset Boulevard",
    reviews: Array(31).fill(null).map((_, i) => ({
      id: `review_prop_003_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "Contemporary luxury at its finest with breathtaking city views.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_004",
    property_id: "prop_004",
    name: "The Elegant Estate",
    address: "19 Kingsborough Road",
    city: "London",
    country: "UK",
    type: "estate",
    price_range: "£10M - £40M",
    rating: 3.71,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Elegant Estate.png",
    description: "🌳 The Elegant Estate — London, UK\n\nSteeped in classic charm, The Elegant Estate offers graceful architecture and meticulously landscaped gardens. It's a symbol of heritage reimagined for modern luxury living.\n\nSelling Points:\n\n• Hand-crafted wrought-iron details and marble floors\n• Grand ballroom and formal dining room\n• Expansive veranda and rose gardens\n• Private guest cottage on property",
    reviews: Array(36).fill(null).map((_, i) => ({
      id: `review_prop_004_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "Classic British elegance meets modern luxury in this stunning estate.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_005",
    property_id: "prop_005",
    name: "The Grand Estate",
    address: "1234 Estate Lane",
    city: "Greenwich",
    country: "USA",
    type: "villa",
    price_range: "$15M - $50M+",
    rating: 3.85,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Grand Estate.png",
    description: "🏛 The Grand Estate — Greenwich, Connecticut\n\nAn icon of timeless sophistication, The Grand Estate blends French château grandeur with modern refinement. Set on sprawling manicured grounds, it features marble reception halls, a grand double staircase, private spa, indoor pool, and panoramic terraces overlooking lush Connecticut countryside. A statement home for those who command excellence in every detail.\n\nSelling Points:\n\n• 20,000+ sq. ft. of classical architecture\n• Indoor spa & heated lap pool\n• Dual chef's kitchens with premium European appliances\n• Smart-home automation across the entire residence",
    reviews: Array(39).fill(null).map((_, i) => ({
      id: `review_prop_005_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "Timeless sophistication and grandeur in every detail.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_006",
    property_id: "prop_006",
    name: "The Luxury Haven",
    address: "77 Serenity Boulevard",
    city: "Dubai",
    country: "UAE",
    type: "mansion",
    price_range: "$30M - $75M",
    rating: 3.54,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Luxury Haven.png",
    description: "🏖 The Luxury Haven — Dubai, UAE\n\nA masterpiece of glass, light, and tropical energy, The Luxury Haven merges beachfront indulgence with contemporary design. Open layouts, reflective pools, and resort-style amenities make it a true sanctuary for the modern elite.\n\nSelling Points:\n\n• Direct oceanfront access and rooftop infinity pool\n• Full wellness suite with gym and sauna\n• Smart climate control optimized for coastal weather\n• Near Dubai's premier entertainment and art districts",
    reviews: Array(32).fill(null).map((_, i) => ({
      id: `review_prop_006_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "A tropical paradise with unmatched luxury amenities.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_007",
    property_id: "prop_007",
    name: "The Mountain Retreat",
    address: "65 Aspen Ridge Trail",
    city: "Aspen",
    country: "USA",
    type: "chalet",
    price_range: "$10M - $28M",
    rating: 3.37,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Mountain Retreat.png",
    description: "🏞 The Mountain Retreat — Aspen, Colorado\n\nA haven of peace and luxury, The Mountain Retreat is nestled among snow-capped peaks and pine forests. Combining rustic timber aesthetics with cutting-edge comfort, it delivers an intimate alpine escape ideal for all seasons.\n\nSelling Points:\n\n• Floor-to-ceiling stone fireplace and panoramic windows\n• Heated driveways and ski-in/ski-out access\n• Private wellness spa with sauna and jacuzzi\n• State-of-the-art insulation and eco-heating",
    reviews: Array(33).fill(null).map((_, i) => ({
      id: `review_prop_007_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "Cozy mountain retreat with perfect blend of rustic and luxury.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_008",
    property_id: "prop_008",
    name: "The Suburban Sanctuary",
    address: "91 Willow Creek Drive",
    city: "Toronto",
    country: "Canada",
    type: "house",
    price_range: "$5M - $15M",
    rating: 3.51,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Suburban Sanctuary.png",
    description: "🏡 The Suburban Sanctuary — Austin, Texas\n\nDesigned for comfort and connection, The Suburban Sanctuary offers expansive living amidst the tranquility of nature. Warm wood tones, open-plan interiors, and wraparound verandas make this the perfect family retreat just minutes from the city.\n\nSelling Points:\n\n• Energy-efficient solar roofing\n• Open living spaces with natural lighting\n• Outdoor kitchen and entertainment deck\n• Secure gated community with parks and trails",
    reviews: Array(30).fill(null).map((_, i) => ({
      id: `review_prop_008_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "Perfect suburban oasis with modern comforts and great location.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  },
  {
    id: "prop_009",
    property_id: "prop_009",
    name: "The Urban Mansion",
    address: "9 Park Avenue",
    city: "New York",
    country: "USA",
    type: "mansion",
    price_range: "$20M - $55M",
    rating: 3.47,
    created_at: "2025-11-09T09:00:00Z",
    updated_at: "2025-11-09T09:00:00Z",
    isActive: true,
    image: "/properties/The Urban Mansion.png",
    description: "🏙 The Urban Mansion — Chicago, Illinois\n\nBold and elegant, The Urban Mansion fuses historic architecture with modern refinement. Behind its limestone façade lies a world of curated art, fine craftsmanship, and luxurious living spaces that celebrate urban prestige.\n\nSelling Points:\n\n• Restored 19th-century exterior with modern interiors\n• Private cinema and wine cellar\n• Rooftop terrace with skyline views\n• Full smart-home integration",
    reviews: Array(40).fill(null).map((_, i) => ({
      id: `review_prop_009_${i + 1}`,
      author: `Guest ${i + 1}`,
      rating: 4 + Math.random(),
      comment: "Urban luxury redefined with spectacular skyline views.",
      date: new Date(2025, 10, 9 - i).toISOString()
    }))
  }
];
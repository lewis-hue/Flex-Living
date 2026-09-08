import { Property } from '../data/properties';

// The base URL for your backend API.
// This should come from an environment variable in a real app.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'; // Or your configured backend URL

// Ensure the API URL always has the v1 prefix for consistency
const ensureApiV1Prefix = (endpoint: string) => {
  if (endpoint.startsWith('/v1/')) {
    return endpoint;
  }
  if (endpoint.startsWith('/')) {
    return `/api/v1${endpoint}`;
  }
  return `/api/v1/${endpoint}`;
};

/** Data structure for overview stats, matching the backend model. */
export interface OverviewStats {
  property_count: number;
  analyzed_reviews_count: number;
  positive_sentiment_percentage: number;
  open_issues_count: number;
}

/** Data structure for a single point in the sentiment trend chart. */
export interface SentimentTrendPoint {
  date: string;
  positive: number;
  neutral: number;
  negative: number;
}

/** Data structure for a single topic in the topic analysis chart. */
export interface TopicAnalysisPoint {
  topic: string;
  count: number;
}
/**
 * Fetches all properties from the backend API.
 *
 * @returns A promise that resolves to an array of properties.
 * @throws Will throw an error if the network request fails.
 */
export const fetchProperties = async (): Promise<Property[]> => {
  try {
    // Assuming your endpoint is at /api/properties
    const response = await fetch(`${API_BASE_URL}/properties`);

    if (!response.ok) {
      throw new Error(`Failed to fetch properties: ${response.statusText}`);
    }

    const data: Property[] = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching properties:", error);
    // In a real app, you might want to handle this error more gracefully
    // For now, we return an empty array to prevent the app from crashing.
    return [];
  }
};

/**
 * Fetches properties from the new collection.
 *
 * @returns A promise that resolves to properties data.
 */
export const getProperties = async () => {
  try {
    const response = await fetch(ensureApiV1Prefix('/properties'));

    if (!response.ok) {
      throw new Error(`Failed to fetch properties: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching properties:", error);
    return { properties: [] };
  }
};

/**
 * Fetches property details from the new collection.
 *
 * @param propertyId The property ID to fetch details for.
 * @returns A promise that resolves to property details.
 */
export const getPropertyDetails = async (propertyId: string) => {
  try {
    const response = await fetch(`${API_BASE_URL}/v1/properties/${propertyId}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch property details: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching property details:", error);
    return null;
  }
};

/**
 * Fetches platform analytics from the new collection.
 *
 * @returns A promise that resolves to analytics data.
 */
export const getPlatformAnalytics = async () => {
  try {
    const response = await fetch(ensureApiV1Prefix('/analytics/platform'));

    if (!response.ok) {
      throw new Error(`Failed to fetch analytics: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching analytics:", error);
    return null;
  }
};

/**
 * Fetches aggregated overview statistics from the backend API.
 * 
 * @returns A promise that resolves to the overview stats object.
 */
export const fetchOverviewStats = async (): Promise<OverviewStats | null> => {
  try {
    const response = await fetch(`${API_BASE_URL}/overview/stats`);

    if (!response.ok) {
      throw new Error(`Failed to fetch overview stats: ${response.statusText}`);
    }

    const data: OverviewStats = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching overview stats:", error);
    return null; // Return null on error to be handled by the component
  }
};

/**
 * Fetches sentiment trend data from the backend.
 * 
 * @returns A promise that resolves to an array of sentiment trend points.
 */
export const fetchSentimentTrends = async (): Promise<SentimentTrendPoint[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/sentiment-trends`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sentiment trends: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching sentiment trends:", error);
    return []; // Return empty array on error
  }
};

/**
 * Fetches topic analysis data from the backend.
 * 
 * @returns A promise that resolves to an array of topic analysis points.
 */
export const fetchTopicAnalysis = async (): Promise<TopicAnalysisPoint[]> => {
  try {
    const response = await fetch(`${API_BASE_URL}/analytics/topic-analysis`);
    if (!response.ok) {
      throw new Error(`Failed to fetch topic analysis: ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching topic analysis:", error);
    return []; // Return empty array on error
  }
};

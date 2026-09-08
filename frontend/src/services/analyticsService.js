import axios from 'axios';

const API_URL = 'http://localhost:8080/api';

export const analyticsService = {
  // Get analytics for a specific property
  async getPropertyAnalytics(propertyId) {
    try {
      const response = await axios.get(`${API_URL}/analytics/property/${propertyId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching property analytics:', error);
      throw error;
    }
  },

  // Get analytics for all properties
  async getAllPropertiesAnalytics() {
    try {
      const response = await axios.get(`${API_URL}/analytics/properties`);
      return response.data;
    } catch (error) {
      console.error('Error fetching all properties analytics:', error);
      throw error;
    }
  },

  // Get reviews for a specific property
  async getPropertyReviews(propertyId) {
    try {
      const response = await axios.get(`${API_URL}/analytics/reviews/${propertyId}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching property reviews:', error);
      throw error;
    }
  }
};
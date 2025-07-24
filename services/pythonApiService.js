const axios = require('axios');

class PythonApiService {
  constructor() {
    this.baseURL = 'http://localhost:8000';
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  async getListings(filters = {}) {
    try {
      const params = new URLSearchParams();
      
      if (filters.city) params.append('city', filters.city);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.propertyType) params.append('property_type', filters.propertyType);
      if (filters.bedrooms) params.append('bedrooms', filters.bedrooms);
      if (filters.bathrooms) params.append('bathrooms', filters.bathrooms);
      
      // Default limit for general listings
      params.append('limit', '50');
      
      const response = await this.client.get(`/listings?${params.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Error fetching listings from Python API:', error.message);
      return [];
    }
  }

  async getListingById(mlsId) {
    try {
      const response = await this.client.get(`/listings/${mlsId}`);
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching listing by ID from Python API:', error.message);
      return null;
    }
  }

  async getFeaturedListings() {
    try {
      // Get first 6 listings as featured
      const response = await this.client.get('/listings?limit=6');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching featured listings from Python API:', error.message);
      return [];
    }
  }

  async advancedSearch(searchCriteria) {
    try {
      const params = new URLSearchParams();
      
      // Map search criteria to Python API parameters
      if (searchCriteria.city) params.append('city', searchCriteria.city);
      if (searchCriteria.minPrice) params.append('min_price', searchCriteria.minPrice);
      if (searchCriteria.maxPrice) params.append('max_price', searchCriteria.maxPrice);
      if (searchCriteria.propertyType) params.append('property_type', searchCriteria.propertyType);
      if (searchCriteria.bedrooms) params.append('bedrooms', searchCriteria.bedrooms);
      if (searchCriteria.bathrooms) params.append('bathrooms', searchCriteria.bathrooms);
      if (searchCriteria.zipCode) params.append('zip_code', searchCriteria.zipCode);
      
      params.append('limit', '100'); // Higher limit for search results
      
      const response = await this.client.get(`/listings?${params.toString()}`);
      return response.data || [];
    } catch (error) {
      console.error('Error performing advanced search on Python API:', error.message);
      return [];
    }
  }

  async getNearbyListings(latitude, longitude, radius = 5) {
    try {
      // For now, return general listings since our Python API doesn't have geo search
      // This could be enhanced later with geographic filtering
      const response = await this.client.get('/listings?limit=20');
      return response.data || [];
    } catch (error) {
      console.error('Error fetching nearby listings from Python API:', error.message);
      return [];
    }
  }

  async getSoldListings(filters = {}) {
    try {
      // For now, return empty array since our current data doesn't include sold listings
      // This could be enhanced when sold listing data is available
      return [];
    } catch (error) {
      console.error('Error fetching sold listings from Python API:', error.message);
      return [];
    }
  }

  // Health check method
  async healthCheck() {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Python API health check failed:', error.message);
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new PythonApiService();
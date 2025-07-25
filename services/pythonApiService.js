const axios = require('axios');
const mockDataService = require('./mockDataService');

class PythonApiService {
  constructor() {
    this.baseURL = process.env.PYTHON_API_URL || 'https://web-production-35090.up.railway.app';
    this.useFallback = process.env.NODE_ENV === 'production' && !process.env.PYTHON_API_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (this.useFallback) {
      console.log('🔄 Python API not available in production, using mock data fallback');
    } else {
      console.log('🐍 Python API configured at:', this.baseURL);
    }
  }

  async getListings(filters = {}) {
    if (this.useFallback) {
      return await mockDataService.getListings(filters);
    }
    
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
      
      // Handle the Python API response format
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching listings from Python API, falling back to mock data:', error.message);
      return await mockDataService.getListings(filters);
    }
  }

  async getListingById(mlsId) {
    if (this.useFallback) {
      return await mockDataService.getListingById(mlsId);
    }
    
    try {
      const response = await this.client.get(`/listings/${mlsId}`);
      
      // Handle the new API response format
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching listing by ID from Python API, falling back to mock data:', error.message);
      return await mockDataService.getListingById(mlsId);
    }
  }

  async getFeaturedListings() {
    if (this.useFallback) {
      return await mockDataService.getFeaturedListings();
    }
    
    try {
      // Use the dedicated featured endpoint
      const response = await this.client.get('/listings/featured/all');
      
      // Handle the new API response format
      if (response.data && response.data.success && response.data.data && response.data.data.data) {
        return response.data.data.data;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching featured listings from Python API, falling back to mock data:', error.message);
      return await mockDataService.getFeaturedListings();
    }
  }

  async advancedSearch(searchCriteria) {
    if (this.useFallback) {
      return await mockDataService.advancedSearch(searchCriteria);
    }
    
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
      
      // Handle the Python API response format
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error performing advanced search on Python API, falling back to mock data:', error.message);
      return await mockDataService.advancedSearch(searchCriteria);
    }
  }

  async getNearbyListings(latitude, longitude, radius = 5) {
    if (this.useFallback) {
      return await mockDataService.getNearbyListings(latitude, longitude, radius);
    }
    
    try {
      // For now, return general listings since our Python API doesn't have geo search
      // This could be enhanced later with geographic filtering
      const response = await this.client.get('/listings?limit=20');
      
      // Handle the Python API response format
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching nearby listings from Python API, falling back to mock data:', error.message);
      return await mockDataService.getNearbyListings(latitude, longitude, radius);
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
    if (this.useFallback) {
      return { status: 'ok', message: 'Using mock data fallback' };
    }
    
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
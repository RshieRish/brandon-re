const axios = require('axios');
const mockDataService = require('./mockDataService');

class PythonApiService {
  constructor() {
    this.baseURL = process.env.PYTHON_API_URL || 'https://web-production-35090.up.railway.app';
    this.useFallback = process.env.NODE_ENV === 'production' && !process.env.PYTHON_API_URL;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 5000, // Reduced timeout for faster fallback
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Simple cache for API responses
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    if (this.useFallback) {
      console.log('🔄 Python API not available in production, using mock data fallback');
    } else {
      console.log('🐍 Python API configured at:', this.baseURL);
    }
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('📦 Using cached data for:', key);
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  transformListings(rawListings) {
    if (!Array.isArray(rawListings)) return [];
    
    return rawListings.map((listing, index) => {
      const data = listing.data || {};
      
      // Debug: Log the first listing's raw data structure
      if (index === 0) {
        console.log('🔍 Raw listing data structure:', JSON.stringify(data, null, 2));
        console.log('🔍 Available keys:', Object.keys(data));
      }
      
      // Parse address components properly
      let formattedAddress = '';
      const streetName = data.StreetName || data.STREET_NAME || '';
      const streetNumber = data._raw_data?.STREET_NO || data.STREET_NO || '';
      const city = data.City || data.CITY || '';
      const state = data.StateOrProvince || data.State || data.STATE || 'MA';
      const zipCode = data.PostalCode || data.ZIP_CODE || '';
      
      // Properly format address: "Number StreetName"
      if (streetNumber && streetName) {
        formattedAddress = `${streetNumber} ${streetName}`;
      } else if (streetName) {
        formattedAddress = streetName;
      }
      
      if (city) {
        formattedAddress += formattedAddress ? `, ${city}` : city;
      }
      if (state) {
        formattedAddress += `, ${state}`;
      }
      if (zipCode) {
        formattedAddress += ` ${zipCode}`;
      }
      
      // Better coordinate handling
      const latitude = parseFloat(data.Latitude || data.LAT || data._raw_data?.LATITUDE) || null;
      const longitude = parseFloat(data.Longitude || data.LNG || data.LON || data._raw_data?.LONGITUDE) || null;
      
      // Extract year built from raw data
      const yearBuilt = parseInt(data.YearBuilt || data.YEAR_BUILT || data._raw_data?.YEAR_BUILT) || null;
      
      // Better date parsing for days on market
      const listingDate = data.ListingDate || data.LIST_DATE || data.OnMarketDate || data.ON_MARKET_DATE || data._raw_data?.LIST_DATE;
      const daysOnMarket = this.calculateDaysOnMarket(listingDate);
      
      // Extract agent information
      const agentId = data.LIST_AGENT || data._raw_data?.LIST_AGENT || null;
      const agentName = data.LIST_AGENT_NAME || data._raw_data?.LIST_AGENT_NAME || data.AGENT_NAME || null;
      
      // Extract additional property features
      const halfBathrooms = parseInt(data.BathroomsHalf || data.NO_HALF_BATHS || data.HALF_BATHS || data._raw_data?.NO_HALF_BATHS) || 0;
      const stories = parseInt(data.Stories || data.NO_STORIES || data.STORIES || data._raw_data?.STORIES) || null;
      const garage = data.GarageSpaces || data.GARAGE || data.GARAGE_SPACES || data._raw_data?.GARAGE_SPACES || null;
      const pool = data.PoolPrivateYN || data.POOL || data.HAS_POOL || data._raw_data?.POOL || false;
      const waterfront = data.WaterfrontYN || data.WATERFRONT || data.IS_WATERFRONT || data._raw_data?.WATERFRONT || false;
      const fireplace = data.FireplacesTotal || data.FIREPLACE || data.NO_FIREPLACES || data._raw_data?.FIREPLACE || null;
      const detailedRemarks = data.PublicRemarks || data.REMARKS || data.DETAILED_REMARKS || data._raw_data?.REMARKS || data.RemarksConcat || '';
      
      return {
        id: listing.listing_key || data.ListingKey || data.LIST_NO || data.ListingID || Math.random().toString(36).substr(2, 9),
        mlsNumber: data.LIST_NO || data.ListingID || data.MLS_NO || 'N/A',
        price: parseInt(data.ListPrice || data.LIST_PRICE) || 0,
        address: formattedAddress || 'Address not available',
        bedrooms: parseInt(data.BedroomsTotal || data.BEDROOMS || data.NO_BEDROOMS) || 0,
        bathrooms: parseFloat(data.BathroomsTotalInteger || data.NO_FULL_BATHS || data.BathroomsTotal || data.BATHROOMS) || 0,
        halfBathrooms: halfBathrooms,
        sqft: parseInt(data.LivingArea || data.SQFT || data.SQUARE_FEET) || 0,
        lotSize: parseFloat(data.LotSizeAcres || data.LOT_SIZE) || 0,
        yearBuilt: yearBuilt,
        stories: stories,
        propertyType: this.mapPropertyType(data.PropertyType || data.PROP_TYPE),
        status: this.mapListingStatus(data.ListingStatus || data.STATUS),
        images: this.generateMLSImages(data.LIST_NO || data.ListingID || data.MLS_NO, 5),
        lat: latitude || 42.6667, // Default to Boston area if no coordinates
        lng: longitude || -71.3020,
        daysOnMarket: daysOnMarket,
        description: this.formatDescription(data),
        detailedRemarks: detailedRemarks,
        features: {
          garage: garage,
          pool: pool,
          waterfront: waterfront,
          fireplace: fireplace
        },
        LIST_AGENT_ID: agentId,
        LIST_AGENT_NAME: agentName
      };
    });
  }

  mapPropertyType(type) {
    if (!type) return 'houses';
    const typeMap = {
      'SFR': 'houses',
      'CON': 'condos',
      'TWN': 'townhomes',
      'MFR': 'multi-family'
    };
    return typeMap[type] || 'houses';
  }

  mapListingStatus(status) {
    if (!status) return 'sale';
    const statusMap = {
      'ACT': 'sale',
      'SOLD': 'sold',
      'RENT': 'rent'
    };
    return statusMap[status] || 'sale';
  }

  generateMLSImages(mlsNumber, count = 5) {
    if (!mlsNumber) return ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400'];
    const images = [];
    for (let i = 0; i < count; i++) {
      images.push(`http://media.mlspin.com/photo.aspx?mls=${mlsNumber}&n=${i}&w=600&h=450`);
    }
    return images;
  }

  calculateDaysOnMarket(listingDate) {
    if (!listingDate) return 0;
    const today = new Date();
    const listed = new Date(listingDate);
    const diffTime = Math.abs(today - listed);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatDescription(data) {
    // Try multiple possible description fields
    const description = data._raw_data?.REMARKS || 
                       data.REMARKS || 
                       data.Description || 
                       data.DESCRIPTION || 
                       data.PublicRemarks || 
                       data.PUBLIC_REMARKS;
    
    if (description && description.trim()) {
      // Clean up the description and truncate if too long
      const cleanDesc = description.trim().replace(/\s+/g, ' ');
      return cleanDesc.length > 150 ? cleanDesc.substring(0, 150) + '...' : cleanDesc;
    }
    
    // Fallback description based on property details
    const city = data.City || data.CITY || 'Boston';
    const propType = data.PropertyType || data.PROP_TYPE || 'property';
    return `Beautiful ${propType.toLowerCase()} in ${city}`;
  }

  async getListings(filters = {}) {
    if (this.useFallback) {
      return await mockDataService.getListings(filters);
    }
    
    // Create cache key based on filters
    const cacheKey = `listings_${JSON.stringify(filters)}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      console.log('🚀 Fetching listings from Python API...');
      const startTime = Date.now();
      
      const params = new URLSearchParams();
      
      if (filters.city) params.append('city', filters.city);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.propertyType) params.append('property_type', filters.propertyType);
      if (filters.bedrooms) params.append('bedrooms', filters.bedrooms);
      if (filters.bathrooms) params.append('bathrooms', filters.bathrooms);
      
      // Request maximum available listings to ensure we get all CN222505 listings
      params.append('limit', '25000');
      
      const response = await this.client.get(`/listings?${params.toString()}`);
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Python API response time: ${responseTime}ms`);
      
      // Handle the Python API response format
      if (response.data && response.data.data) {
        const transformedData = this.transformListings(response.data.data);
        // Cache the result
        this.setCachedData(cacheKey, transformedData);
        console.log(`✅ Cached ${transformedData.length} listings`);
        return transformedData;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('⚠️ Python API timeout/error, falling back to mock data:', error.message);
      const mockData = await mockDataService.getListings(filters);
      // Cache mock data temporarily
      this.setCachedData(cacheKey, mockData.data);
      return mockData.data;
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
    
    // Check cache first
    const cacheKey = 'featured_listings';
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      console.log('🚀 Fetching featured listings from Python API...');
      const startTime = Date.now();
      
      // Use the dedicated featured endpoint
      const response = await this.client.get('/listings/featured/all');
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Python API response time: ${responseTime}ms`);
      
      // Handle the new API response format
      if (response.data && response.data.success && response.data.data && response.data.data.data) {
        const rawListings = response.data.data.data;
        console.log(`🔍 Found ${rawListings.length} raw featured listings from Railway API`);
        const transformedListings = this.transformListings(rawListings);
        
        // Remove duplicates based on MLS number
        const uniqueListings = [];
        const seenMlsNumbers = new Set();
        
        for (const listing of transformedListings) {
          if (!seenMlsNumbers.has(listing.mlsNumber)) {
            seenMlsNumbers.add(listing.mlsNumber);
            uniqueListings.push(listing);
          }
        }
        
        // Cache the result
        this.setCachedData(cacheKey, uniqueListings);
        console.log(`✅ Cached ${uniqueListings.length} featured listings`);
        
        return uniqueListings;
      }
      
      return [];
    } catch (error) {
      console.error('⚠️ Python API timeout/error, falling back to mock data:', error.message);
      const mockData = await mockDataService.getFeaturedListings();
      // Cache mock data temporarily to avoid repeated API calls
      this.setCachedData(cacheKey, mockData.data);
      return mockData.data;
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
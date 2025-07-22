const axios = require('axios');
const { listingsCache, citiesCache, statsCache, generateCacheKey, formatListingData } = require('../utils/helpers');

class IDXService {
  constructor() {
    this.baseURL = process.env.IDX_API_URL || 'https://api.idxbroker.com';
    this.apiKey = process.env.IDX_API_KEY;
    this.partnerKey = process.env.IDX_PARTNER_KEY;
    this.defaultHeaders = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'accesskey': this.apiKey,
      'outputtype': 'json'
    };
  }

  // Make authenticated request to IDX API
  async makeRequest(endpoint, params = {}, useCache = true, cacheInstance = listingsCache) {
    try {
      // Generate cache key
      const cacheKey = generateCacheKey(endpoint, params);
      
      // Check cache first
      if (useCache) {
        const cachedData = cacheInstance.get(cacheKey);
        if (cachedData) {
          console.log(`Cache hit for ${endpoint}`);
          return cachedData;
        }
      }

      // Add partner key to params
      const requestParams = {
        ...params,
        key: this.partnerKey
      };

      console.log(`Making IDX API request to ${endpoint}`);
      const response = await axios.get(`${this.baseURL}${endpoint}`, {
        headers: this.defaultHeaders,
        params: requestParams,
        timeout: 10000 // 10 second timeout
      });

      const data = response.data;
      
      // Cache the response
      if (useCache && data) {
        cacheInstance.set(cacheKey, data);
      }

      return data;
    } catch (error) {
      console.error(`IDX API Error for ${endpoint}:`, error.message);
      
      if (error.response) {
        // IDX API returned an error response
        throw new Error(`IDX API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
      } else if (error.request) {
        // Request was made but no response received
        throw new Error('IDX API is not responding. Please try again later.');
      } else {
        // Something else happened
        throw new Error(`IDX Request Error: ${error.message}`);
      }
    }
  }

  // Get all listings with filters
  async getListings(filters = {}) {
    const {
      page = 1,
      limit = 20,
      city,
      minPrice,
      maxPrice,
      propertyType = 'sfr',
      bedrooms,
      bathrooms,
      sqftMin,
      sqftMax
    } = filters;

    const params = {
      pt: propertyType,
      lp: minPrice,
      hp: maxPrice,
      bd: bedrooms,
      ba: bathrooms,
      sqft: sqftMin,
      sqftmax: sqftMax,
      ccz: 'city',
      city: city,
      st: 'MA', // Massachusetts
      pg: page,
      lm: limit
    };

    // Remove undefined params
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key];
      }
    });

    const data = await this.makeRequest('/clients/search', params);
    
    // Format the listings data
    if (data && Array.isArray(data)) {
      return data.map(listing => formatListingData(listing));
    }
    
    return data;
  }

  // Get single listing by MLS ID
  async getListingById(mlsId) {
    if (!mlsId) {
      throw new Error('MLS ID is required');
    }

    const data = await this.makeRequest(`/clients/listing/${mlsId}`);
    return formatListingData(data);
  }

  // Get featured listings
  async getFeaturedListings() {
    const data = await this.makeRequest('/clients/featured');
    
    if (data && Array.isArray(data)) {
      return data.map(listing => formatListingData(listing));
    }
    
    return data;
  }

  // Get cities in Massachusetts
  async getCities() {
    const data = await this.makeRequest('/clients/cities', { st: 'MA' }, true, citiesCache);
    return data;
  }

  // Get property types
  async getPropertyTypes() {
    const data = await this.makeRequest('/clients/propertytypes', {}, true, citiesCache);
    return data;
  }

  // Get market statistics
  async getMarketStats(city = null) {
    const params = {
      st: 'MA'
    };
    
    if (city) {
      params.city = city;
    }

    const data = await this.makeRequest('/clients/marketstatistics', params, true, statsCache);
    return data;
  }

  // Get sold listings for market analysis
  async getSoldListings(filters = {}) {
    const {
      city,
      minPrice,
      maxPrice,
      propertyType = 'sfr',
      daysBack = 90
    } = filters;

    const params = {
      pt: propertyType,
      lp: minPrice,
      hp: maxPrice,
      ccz: 'city',
      city: city,
      st: 'MA',
      status: 'sold',
      daysback: daysBack
    };

    // Remove undefined params
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key];
      }
    });

    const data = await this.makeRequest('/clients/sold', params);
    
    if (data && Array.isArray(data)) {
      return data.map(listing => formatListingData(listing));
    }
    
    return data;
  }

  // Get listing photos
  async getListingPhotos(mlsId) {
    if (!mlsId) {
      throw new Error('MLS ID is required');
    }

    const data = await this.makeRequest(`/clients/listing/${mlsId}/images`);
    return data;
  }

  // Search listings with advanced criteria
  async advancedSearch(searchCriteria) {
    const {
      keywords,
      city,
      minPrice,
      maxPrice,
      propertyType,
      bedrooms,
      bathrooms,
      sqftMin,
      sqftMax,
      yearBuiltMin,
      yearBuiltMax,
      lotSizeMin,
      lotSizeMax,
      hasPool,
      hasGarage,
      waterfront,
      page = 1
    } = searchCriteria;

    const params = {
      pt: propertyType || 'sfr',
      lp: minPrice,
      hp: maxPrice,
      bd: bedrooms,
      ba: bathrooms,
      sqft: sqftMin,
      sqftmax: sqftMax,
      yb: yearBuiltMin,
      ybmax: yearBuiltMax,
      acres: lotSizeMin,
      acresmax: lotSizeMax,
      pool: hasPool ? 'Y' : undefined,
      garage: hasGarage ? 'Y' : undefined,
      waterfront: waterfront ? 'Y' : undefined,
      ccz: 'city',
      city: city,
      st: 'MA',
      pg: page
    };

    // Add keyword search if provided
    if (keywords) {
      params.q = keywords;
    }

    // Remove undefined params
    Object.keys(params).forEach(key => {
      if (params[key] === undefined || params[key] === '') {
        delete params[key];
      }
    });

    const data = await this.makeRequest('/clients/search', params);
    
    if (data && Array.isArray(data)) {
      return data.map(listing => formatListingData(listing));
    }
    
    return data;
  }

  // Get nearby listings
  async getNearbyListings(latitude, longitude, radius = 5) {
    const params = {
      lat: latitude,
      lng: longitude,
      radius: radius,
      st: 'MA'
    };

    const data = await this.makeRequest('/clients/nearby', params);
    
    if (data && Array.isArray(data)) {
      return data.map(listing => formatListingData(listing));
    }
    
    return data;
  }

  // Clear all caches
  clearCache() {
    listingsCache.clear();
    citiesCache.clear();
    statsCache.clear();
    console.log('All IDX caches cleared');
  }

  // Get cache statistics
  getCacheStats() {
    return {
      listings: listingsCache.size(),
      cities: citiesCache.size(),
      stats: statsCache.size()
    };
  }
}

module.exports = new IDXService();
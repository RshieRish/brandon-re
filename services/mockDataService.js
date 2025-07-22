// Mock Real Estate Data Service - No API keys required!
// This service provides realistic sample data for Massachusetts real estate listings

const { formatListingData, massachusettsCities } = require('../utils/helpers');

// Mock listing data for Massachusetts cities including Dracut
const mockListings = [
  {
    mlsNumber: 'MA001234',
    listPrice: 485000,
    address: '123 Main Street',
    cityName: 'Dracut',
    state: 'MA',
    zipcode: '01826',
    countyName: 'Middlesex',
    propType: 'Single Family Residential',
    bedrooms: 3,
    totalBaths: 2,
    halfBaths: 1,
    sqFt: 1850,
    acres: 0.25,
    yearBuilt: 2015,
    stories: 2,
    propStatus: 'Active',
    listingDate: '2024-01-15',
    daysOnMarket: 45,
    mlsAreaMajor: 'Greater Lowell',
    subdivision: 'Meadowbrook Estates',
    remarksConcat: 'Beautiful colonial home with modern updates, granite countertops, hardwood floors throughout.',
    garage: 2,
    pool: false,
    waterfront: false,
    fireplaces: 1,
    latitude: 42.6667,
    longitude: -71.3162,
    listingAgent: 'Sarah Johnson',
    listingOffice: 'Century 21 Dracut',
    listingOfficePhone: '(978) 555-0123',
    featuredImage: 'https://via.placeholder.com/400x300/4a90e2/ffffff?text=Beautiful+Colonial+Home',
    lastModified: '2024-01-20T10:30:00Z'
  },
  {
    mlsNumber: 'MA001235',
    listPrice: 325000,
    address: '456 Oak Avenue',
    cityName: 'Dracut',
    state: 'MA',
    zipcode: '01826',
    countyName: 'Middlesex',
    propType: 'Condominium',
    bedrooms: 2,
    totalBaths: 2,
    halfBaths: 0,
    sqFt: 1200,
    acres: 0,
    yearBuilt: 2010,
    stories: 1,
    propStatus: 'Active',
    listingDate: '2024-01-10',
    daysOnMarket: 50,
    mlsAreaMajor: 'Greater Lowell',
    subdivision: 'Riverside Commons',
    remarksConcat: 'Spacious 2-bedroom condo with updated kitchen, in-unit laundry, and community amenities.',
    garage: 1,
    pool: true,
    waterfront: false,
    fireplaces: 0,
    latitude: 42.6701,
    longitude: -71.3201,
    listingAgent: 'Mike Thompson',
    listingOffice: 'RE/MAX Dracut',
    listingOfficePhone: '(978) 555-0124',
    featuredImage: 'https://via.placeholder.com/400x300/50c878/ffffff?text=Modern+Condo',
    lastModified: '2024-01-18T14:15:00Z'
  },
  {
    mlsNumber: 'MA001236',
    listPrice: 675000,
    address: '789 Elm Street',
    cityName: 'Dracut',
    state: 'MA',
    zipcode: '01826',
    countyName: 'Middlesex',
    propType: 'Single Family Residential',
    bedrooms: 4,
    totalBaths: 3,
    halfBaths: 1,
    sqFt: 2400,
    acres: 0.5,
    yearBuilt: 2018,
    stories: 2,
    propStatus: 'Active',
    listingDate: '2024-01-05',
    daysOnMarket: 55,
    mlsAreaMajor: 'Greater Lowell',
    subdivision: 'Highland Estates',
    remarksConcat: 'Stunning 4-bedroom home with open floor plan, chef\'s kitchen, master suite with walk-in closet.',
    garage: 2,
    pool: false,
    waterfront: false,
    fireplaces: 2,
    latitude: 42.6634,
    longitude: -71.3089,
    listingAgent: 'Lisa Chen',
    listingOffice: 'Coldwell Banker Dracut',
    listingOfficePhone: '(978) 555-0125',
    featuredImage: 'https://via.placeholder.com/400x300/ff6b6b/ffffff?text=Luxury+Home',
    lastModified: '2024-01-22T09:45:00Z'
  }
];

// Generate additional mock listings for other MA cities
const generateMockListings = (count = 100) => {
  const listings = [...mockListings];
  const propertyTypes = ['Single Family Residential', 'Condominium', 'Townhouse', 'Multi-Family'];
  const agents = ['John Smith', 'Mary Wilson', 'David Brown', 'Jennifer Davis', 'Robert Miller'];
  const offices = ['Century 21', 'RE/MAX', 'Coldwell Banker', 'Keller Williams', 'Berkshire Hathaway'];
  
  for (let i = 0; i < count; i++) {
    const city = massachusettsCities[Math.floor(Math.random() * massachusettsCities.length)];
    const propType = propertyTypes[Math.floor(Math.random() * propertyTypes.length)];
    const bedrooms = Math.floor(Math.random() * 5) + 1;
    const bathrooms = Math.floor(Math.random() * 3) + 1;
    const sqFt = Math.floor(Math.random() * 2000) + 800;
    const price = Math.floor(Math.random() * 800000) + 200000;
    const yearBuilt = Math.floor(Math.random() * 50) + 1970;
    
    listings.push({
      mlsNumber: `MA${String(1237 + i).padStart(6, '0')}`,
      listPrice: price,
      address: `${Math.floor(Math.random() * 999) + 1} ${['Main', 'Oak', 'Elm', 'Pine', 'Maple'][Math.floor(Math.random() * 5)]} ${
        ['Street', 'Avenue', 'Road', 'Lane', 'Drive'][Math.floor(Math.random() * 5)]
      }`,
      cityName: city,
      state: 'MA',
      zipcode: String(Math.floor(Math.random() * 9000) + 1000),
      countyName: ['Middlesex', 'Essex', 'Worcester', 'Norfolk', 'Plymouth'][Math.floor(Math.random() * 5)],
      propType,
      bedrooms,
      totalBaths: bathrooms,
      halfBaths: Math.floor(Math.random() * 2),
      sqFt,
      acres: Math.random() * 2,
      yearBuilt,
      stories: Math.floor(Math.random() * 3) + 1,
      propStatus: Math.random() > 0.1 ? 'Active' : 'Pending',
      listingDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      daysOnMarket: Math.floor(Math.random() * 120),
      mlsAreaMajor: `Greater ${city}`,
      subdivision: `${['Meadow', 'Highland', 'River', 'Park', 'Garden'][Math.floor(Math.random() * 5)]} ${
        ['Brook', 'View', 'Ridge', 'Commons', 'Estates'][Math.floor(Math.random() * 5)]
      }`,
      remarksConcat: `Beautiful ${propType.toLowerCase()} with ${bedrooms} bedrooms and ${bathrooms} bathrooms. Recently updated with modern amenities.`,
      garage: Math.floor(Math.random() * 3),
      pool: Math.random() > 0.8,
      waterfront: Math.random() > 0.9,
      fireplaces: Math.floor(Math.random() * 3),
      latitude: 42.3 + Math.random() * 0.5,
      longitude: -71.1 - Math.random() * 0.5,
      listingAgent: agents[Math.floor(Math.random() * agents.length)],
      listingOffice: `${offices[Math.floor(Math.random() * offices.length)]} ${city}`,
      listingOfficePhone: `(${Math.floor(Math.random() * 900) + 100}) 555-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
      featuredImage: `https://via.placeholder.com/400x300/${['4a90e2', '50c878', 'ff6b6b', 'ffa500', '9b59b6'][Math.floor(Math.random() * 5)]}/ffffff?text=${encodeURIComponent(propType)}`,
      lastModified: new Date().toISOString()
    });
  }
  
  return listings;
};

// Generate all mock listings
const allMockListings = generateMockListings(200);

// Mock service methods
class MockDataService {
  // Get all listings with filters
  async getListings(filters = {}) {
    let listings = [...allMockListings];
    
    // Apply filters
    if (filters.city) {
      listings = listings.filter(listing => 
        listing.cityName.toLowerCase() === filters.city.toLowerCase()
      );
    }
    
    if (filters.minPrice) {
      listings = listings.filter(listing => listing.listPrice >= parseInt(filters.minPrice));
    }
    
    if (filters.maxPrice) {
      listings = listings.filter(listing => listing.listPrice <= parseInt(filters.maxPrice));
    }
    
    if (filters.bedrooms) {
      listings = listings.filter(listing => listing.bedrooms >= parseInt(filters.bedrooms));
    }
    
    if (filters.bathrooms) {
      listings = listings.filter(listing => listing.totalBaths >= parseInt(filters.bathrooms));
    }
    
    if (filters.propertyType) {
      const typeMap = {
        'sfr': 'Single Family Residential',
        'cnd': 'Condominium',
        'twn': 'Townhouse',
        'mfr': 'Multi-Family'
      };
      const fullType = typeMap[filters.propertyType] || filters.propertyType;
      listings = listings.filter(listing => listing.propType === fullType);
    }
    
    // Pagination
    const page = parseInt(filters.page) || 1;
    const limit = parseInt(filters.limit) || 20;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    
    const paginatedListings = listings.slice(startIndex, endIndex);
    
    // Format listings
    const formattedListings = paginatedListings.map(formatListingData);
    
    return {
      success: true,
      data: formattedListings,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(listings.length / limit),
        totalItems: listings.length,
        itemsPerPage: limit
      }
    };
  }
  
  // Get single listing by MLS ID
  async getListingById(mlsId) {
    const listing = allMockListings.find(l => l.mlsNumber === mlsId);
    
    if (!listing) {
      return {
        success: false,
        message: 'Listing not found'
      };
    }
    
    return {
      success: true,
      data: formatListingData(listing)
    };
  }
  
  // Get featured listings
  async getFeaturedListings(limit = 10) {
    const featured = allMockListings
      .filter(listing => listing.listPrice > 400000)
      .sort((a, b) => b.listPrice - a.listPrice)
      .slice(0, limit);
    
    return {
      success: true,
      data: featured.map(formatListingData)
    };
  }
  
  // Get cities
  async getCities() {
    return {
      success: true,
      data: massachusettsCities.sort()
    };
  }
  
  // Get property types
  async getPropertyTypes() {
    return {
      success: true,
      data: {
        'sfr': 'Single Family Residential',
        'cnd': 'Condominium',
        'twn': 'Townhouse',
        'mfr': 'Multi-Family',
        'lnd': 'Land',
        'com': 'Commercial'
      }
    };
  }
  
  // Get market statistics
  async getMarketStats(city = null) {
    let listings = allMockListings;
    
    if (city) {
      listings = listings.filter(l => l.cityName.toLowerCase() === city.toLowerCase());
    }
    
    const prices = listings.map(l => l.listPrice);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const medianPrice = prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)];
    
    return {
      success: true,
      data: {
        totalListings: listings.length,
        averagePrice: Math.round(avgPrice),
        medianPrice: Math.round(medianPrice),
        priceRange: {
          min: Math.min(...prices),
          max: Math.max(...prices)
        },
        averageDaysOnMarket: Math.round(
          listings.reduce((sum, l) => sum + l.daysOnMarket, 0) / listings.length
        ),
        city: city || 'Massachusetts'
      }
    };
  }
  
  // Advanced search
  async advancedSearch(searchParams) {
    return this.getListings(searchParams);
  }
  
  // Get nearby listings
  async getNearbyListings(lat, lng, radius = 5, limit = 10) {
    // Simple distance calculation for mock data
    const nearby = allMockListings
      .map(listing => {
        const distance = Math.sqrt(
          Math.pow(listing.latitude - lat, 2) + Math.pow(listing.longitude - lng, 2)
        ) * 69; // Rough miles conversion
        return { ...listing, distance };
      })
      .filter(listing => listing.distance <= radius)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);
    
    return {
      success: true,
      data: nearby.map(listing => ({
        ...formatListingData(listing),
        distance: Math.round(listing.distance * 10) / 10
      }))
    };
  }
  
  // Get sold listings
  async getSoldListings(filters = {}) {
    // Mock sold listings (modify some active listings to sold)
    const soldListings = allMockListings
      .slice(0, 50)
      .map(listing => ({
        ...listing,
        propStatus: 'Sold',
        soldPrice: listing.listPrice * (0.95 + Math.random() * 0.1), // 95-105% of list price
        soldDate: new Date(Date.now() - Math.random() * 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      }));
    
    let filtered = soldListings;
    
    if (filters.city) {
      filtered = filtered.filter(listing => 
        listing.cityName.toLowerCase() === filters.city.toLowerCase()
      );
    }
    
    const limit = parseInt(filters.limit) || 20;
    
    return {
      success: true,
      data: filtered.slice(0, limit).map(listing => ({
        ...formatListingData(listing),
        soldPrice: listing.soldPrice,
        soldDate: listing.soldDate
      }))
    };
  }
  
  // Cache management methods (mock implementation)
  getCacheStats() {
    return {
      totalListings: allMockListings.length,
      cities: massachusettsCities.length,
      lastUpdated: new Date().toISOString(),
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
  
  clearCache() {
    // In a real implementation, this would clear cached data
    // For mock service, we just return success
    return {
      success: true,
      message: 'Mock cache cleared (no actual cache to clear)'
    };
  }
}

module.exports = new MockDataService();
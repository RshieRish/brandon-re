const axios = require('axios');

// Format price for display
const formatPrice = (price) => {
  if (!price) return 'Price upon request';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(price);
};

// Format square footage
const formatSquareFeet = (sqft) => {
  if (!sqft) return 'N/A';
  return new Intl.NumberFormat('en-US').format(sqft) + ' sq ft';
};

// Calculate price per square foot
const calculatePricePerSqft = (price, sqft) => {
  if (!price || !sqft) return null;
  return Math.round(price / sqft);
};

// Format listing data for consistent API response
const formatListingData = (listing) => {
  if (!listing) return null;
  
  return {
    id: listing.listingID || listing.id,
    mlsNumber: listing.listingID,
    address: {
      street: listing.address,
      city: listing.cityName,
      state: listing.state || 'MA',
      zipCode: listing.zipcode,
      county: listing.countyName
    },
    price: {
      amount: listing.listPrice,
      formatted: formatPrice(listing.listPrice),
      pricePerSqft: calculatePricePerSqft(listing.listPrice, listing.sqFt)
    },
    property: {
      type: listing.propType,
      bedrooms: listing.bedrooms,
      bathrooms: listing.totalBaths,
      halfBaths: listing.halfBaths,
      squareFeet: listing.sqFt,
      squareFeetFormatted: formatSquareFeet(listing.sqFt),
      lotSize: listing.acres,
      yearBuilt: listing.yearBuilt,
      stories: listing.stories
    },
    listing: {
      status: listing.propStatus,
      listDate: listing.listingDate,
      daysOnMarket: listing.daysOnMarket,
      mlsArea: listing.mlsAreaMajor,
      subdivision: listing.subdivision
    },
    images: {
      featured: listing.image?.thumb || listing.featuredImage,
      gallery: listing.images || []
    },
    description: listing.remarksConcat || listing.description,
    features: {
      garage: listing.garage,
      pool: listing.pool,
      waterfront: listing.waterfront,
      fireplace: listing.fireplaces
    },
    coordinates: {
      latitude: listing.latitude,
      longitude: listing.longitude
    },
    agent: {
      name: listing.listingAgent,
      office: listing.listingOffice,
      phone: listing.listingOfficePhone
    },
    updatedAt: listing.lastModified || listing.updated
  };
};

// Massachusetts cities for validation
const massachusettsCities = [
  'Boston', 'Worcester', 'Springfield', 'Cambridge', 'Lowell',
  'Brockton', 'New Bedford', 'Quincy', 'Lynn', 'Fall River',
  'Newton', 'Lawrence', 'Somerville', 'Framingham', 'Haverhill',
  'Waltham', 'Malden', 'Brookline', 'Plymouth', 'Medford',
  'Taunton', 'Chicopee', 'Weymouth', 'Revere', 'Peabody',
  'Methuen', 'Barnstable', 'Pittsfield', 'Attleboro', 'Everett',
  'Salem', 'Westfield', 'Leominster', 'Fitchburg', 'Beverly',
  'Holyoke', 'Marlborough', 'Woburn', 'Amherst', 'Chelsea',
  'Braintree', 'Dartmouth', 'Randolph', 'Natick', 'Gloucester',
  'Dracut', 'Acton', 'Andover', 'Arlington', 'Billerica',
  'Burlington', 'Chelmsford', 'Concord', 'Lexington', 'Medway',
  'Milford', 'Reading', 'Stoneham', 'Tewksbury', 'Wakefield',
  'Watertown', 'Winchester', 'Wilmington', 'North Reading'
];

// Validate Massachusetts city
const isValidMassachusettsCity = (city) => {
  if (!city) return true; // Allow empty city for all listings
  return massachusettsCities.some(validCity => 
    validCity.toLowerCase() === city.toLowerCase()
  );
};

// Property type mappings for IDX
const propertyTypeMap = {
  'single-family': 'sfr',
  'condo': 'cnd',
  'townhouse': 'twn',
  'multi-family': 'mfr',
  'land': 'lnd',
  'commercial': 'com',
  'rental': 'rnl'
};

// Get IDX property type code
const getPropertyTypeCode = (type) => {
  return propertyTypeMap[type] || 'sfr';
};

// Cache implementation (simple in-memory cache)
class SimpleCache {
  constructor(ttl = 300000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }
  
  set(key, value) {
    const expiry = Date.now() + this.ttl;
    this.cache.set(key, { value, expiry });
  }
  
  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  clear() {
    this.cache.clear();
  }
  
  size() {
    return this.cache.size;
  }
}

// Create cache instances
const listingsCache = new SimpleCache(300000); // 5 minutes
const citiesCache = new SimpleCache(3600000); // 1 hour
const statsCache = new SimpleCache(1800000); // 30 minutes

// Generate cache key
const generateCacheKey = (prefix, params) => {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {});
  
  return `${prefix}:${JSON.stringify(sortedParams)}`;
};

// Pagination helper
const getPaginationInfo = (page, limit, total) => {
  const currentPage = parseInt(page) || 1;
  const itemsPerPage = parseInt(limit) || 20;
  const totalPages = Math.ceil(total / itemsPerPage);
  const hasNext = currentPage < totalPages;
  const hasPrev = currentPage > 1;
  
  return {
    currentPage,
    itemsPerPage,
    totalPages,
    totalItems: total,
    hasNext,
    hasPrev,
    nextPage: hasNext ? currentPage + 1 : null,
    prevPage: hasPrev ? currentPage - 1 : null
  };
};

// Validate search parameters
const validateSearchParams = (params) => {
  const errors = [];
  
  if (params.minPrice && params.maxPrice && 
      parseInt(params.minPrice) > parseInt(params.maxPrice)) {
    errors.push('Minimum price cannot be greater than maximum price');
  }
  
  if (params.bedrooms && (isNaN(params.bedrooms) || params.bedrooms < 0)) {
    errors.push('Bedrooms must be a positive number');
  }
  
  if (params.bathrooms && (isNaN(params.bathrooms) || params.bathrooms < 0)) {
    errors.push('Bathrooms must be a positive number');
  }
  
  if (params.city && !isValidMassachusettsCity(params.city)) {
    errors.push('Invalid Massachusetts city');
  }
  
  return errors;
};

module.exports = {
  formatPrice,
  formatSquareFeet,
  calculatePricePerSqft,
  formatListingData,
  massachusettsCities,
  isValidMassachusettsCity,
  propertyTypeMap,
  getPropertyTypeCode,
  SimpleCache,
  listingsCache,
  citiesCache,
  statsCache,
  generateCacheKey,
  getPaginationInfo,
  validateSearchParams
};
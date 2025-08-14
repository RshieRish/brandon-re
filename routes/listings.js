const express = require('express');
const router = express.Router();
const mockDataService = require('../services/mockDataService');
const idxService = require('../services/idxService');
const pythonApiService = require('../services/pythonApiService');
const { validateSearchParams, getPaginationInfo } = require('../utils/helpers');
const { searchLimiter } = require('../middleware');

// Use Python API service for real MLS data
const dataService = pythonApiService;

// Map frontend status values to MLS status codes
function mapFrontendStatusToMLS(frontendStatus) {
  const statusMapping = {
    'sale': ['ACT', 'CTG', 'NEW', 'PCG', 'BOM', 'EXT'],  // For Sale
    'rent': ['RAC'],  // For Rent
    'sold': ['SOLD']  // Sold
  };
  
  return statusMapping[frontendStatus] || [frontendStatus];
}

console.log('🔧 Using PYTHON API data service for real MLS data');
console.log('📡 Connecting to Python API at', process.env.PYTHON_API_URL || 'http://localhost:8000');

// Health check for Python API
pythonApiService.healthCheck().then(health => {
  console.log('🏥 Python API Health:', health.status || 'OK');
}).catch(err => {
  console.warn('⚠️  Python API health check failed:', err.message);
});

// Get all listings with filters
router.get('/', async (req, res) => {
  try {
    console.log('🚀 Listings API called with query:', req.query);
    const { city, minPrice, maxPrice, propertyType, bedrooms, bathrooms, page = 1, limit = 10, status, exclude_sold } = req.query;
    
    // Cap limit to prevent timeouts
    const cappedLimit = Math.min(parseInt(limit), 50);
    
    // Handle multiple status parameters (status can be a string or array)
    let statusArray = null;
    if (status) {
      const statusValues = Array.isArray(status) ? status : [status];
      // Map frontend status values to MLS status codes
      statusArray = [];
      for (const statusValue of statusValues) {
        const mlsStatuses = mapFrontendStatusToMLS(statusValue);
        statusArray.push(...mlsStatuses);
      }
      console.log('🎯 Status mapping:', { frontend: status, mapped: statusArray });
      console.log('🔍 StatusArray length:', statusArray.length, 'Multiple status?', statusArray.length > 1);
    }
    
    const baseFilters = {
      city,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      propertyType,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      exclude_sold: exclude_sold === 'true',
      limit: cappedLimit,
      offset: (parseInt(page) - 1) * cappedLimit
    };
    
    let result;
    
    // For multiple status codes (like 'sale'), we need to get total count and paginated results
    if (statusArray && statusArray.length > 1) {
      console.log('🔍 Getting counts for sale statuses:', statusArray);
      
      // Get total count for all sale statuses combined (only count, not data)
      const countPromises = statusArray.map(async (statusCode) => {
        try {
          const result = await dataService.getListings({ ...baseFilters, status: statusCode, limit: 10000, offset: 0 });
          const dataLength = result.data ? result.data.length : 0;
          const totalCount = result.totalCount || 0;
          // Use data length as it's more reliable than totalCount from the API
          const count = dataLength > 0 ? dataLength : totalCount;
          console.log(`📊 Status ${statusCode}: ${count} listings (data: ${dataLength}, totalCount: ${totalCount})`);
          return count;
        } catch (error) {
          console.error(`❌ Error getting count for status ${statusCode}:`, error.message);
          return 0;
        }
      });
      
      const counts = await Promise.all(countPromises);
      const totalCount = counts.reduce((sum, count) => sum + count, 0);
      console.log('📈 Total sale count:', totalCount, 'from counts:', counts);
      
      // Get actual listings from primary status (ACT) for pagination
      const primaryStatus = statusArray[0]; // Use ACT as primary for 'sale'
      const listingsResult = await dataService.getListings({
        ...baseFilters,
        status: primaryStatus
      });
      
      result = {
        data: listingsResult.data || listingsResult || [],
        totalCount: totalCount
      };
    } else {
      // Single status or no status filter
      const filters = {
        ...baseFilters,
        status: statusArray && statusArray.length === 1 ? statusArray[0] : statusArray
      };
      
      // For single status, also get accurate count using high limit
      const countResult = await dataService.getListings({
        ...filters,
        limit: 10000,
        offset: 0
      });
      
      const actualCount = countResult.data ? countResult.data.length : (countResult.totalCount || 0);
      console.log(`📊 Single status count: ${actualCount} listings (data: ${countResult.data?.length || 0}, totalCount: ${countResult.totalCount || 0})`);
      
      // Get paginated results
      const listingsResult = await dataService.getListings(filters);
      
      result = {
        data: listingsResult.data || listingsResult || [],
        totalCount: actualCount
      };
    }
    
    // Handle both old format (array) and new format (object with data/totalCount)
    const listings = result.data || result || [];
    const totalCount = result.totalCount || listings.length;
    
    // Return paginated results
    res.json({
      success: true,
      data: {
        data: listings,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / cappedLimit),
          totalItems: totalCount,
          itemsPerPage: cappedLimit
        }
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch listings',
      message: error.message
    });
  }
});

// Get featured listings (must be before /:mlsId route)
router.get('/featured/all', async (req, res) => {
  try {
    const featuredListings = await dataService.getFeaturedListings();
    
    res.json({
      success: true,
      data: {
        data: featuredListings
      }
    });
  } catch (error) {
    console.error('Error fetching featured listings:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load featured listings at this time'
    });
  }
});

// Get counts by status - MUST be before /:mlsId route to avoid conflicts
router.get('/counts/by-status', async (req, res) => {
  try {
    const { city, minPrice, maxPrice, propertyType, bedrooms, bathrooms } = req.query;
    
    const baseFilters = {
      city,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      propertyType,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      limit: 1, // Only need count, not actual data
      offset: 0
    };
    
    // Get counts for each status using actual MLS status codes with high limits for accuracy
    // Get accurate counts for all sale statuses combined
    const [allCount, actCount, ctgCount, newCount, pcgCount, bomCount, extCount, rentCount, soldCount] = await Promise.all([
      // All active listings (exclude sold) - use high limit for accurate count
      dataService.getListings({ ...baseFilters, exclude_sold: true, limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      // Individual sale status counts to get accurate total - use high limit
      dataService.getListings({ ...baseFilters, status: 'ACT', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      dataService.getListings({ ...baseFilters, status: 'CTG', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      dataService.getListings({ ...baseFilters, status: 'NEW', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      dataService.getListings({ ...baseFilters, status: 'PCG', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      dataService.getListings({ ...baseFilters, status: 'BOM', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      dataService.getListings({ ...baseFilters, status: 'EXT', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      // For rent listings (RAC) - use high limit
      dataService.getListings({ ...baseFilters, status: 'RAC', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      }),
      // Sold listings - use high limit
      dataService.getListings({ ...baseFilters, status: 'SOLD', limit: 10000 }).then(result => {
        const dataLength = result.data ? result.data.length : 0;
        const totalCount = result.totalCount || 0;
        return dataLength > 0 ? dataLength : totalCount;
      })
    ]);
    
    // Sum up all sale status counts for accurate total
    const saleCount = actCount + ctgCount + newCount + pcgCount + bomCount + extCount;
    
    console.log('📊 Status counts:', { all: allCount, sale: saleCount, rent: rentCount, sold: soldCount });
    
    res.json({
      success: true,
      data: {
        all: allCount,
        sale: saleCount,
        rent: rentCount,
        sold: soldCount
      }
    });
  } catch (error) {
    console.error('Error fetching status counts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch status counts',
      message: error.message
    });
  }
});

// Get single listing by MLS ID
router.get('/:mlsId', async (req, res) => {
  try {
    const { mlsId } = req.params;
    const listing = await dataService.getListingById(mlsId);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }
    
    res.json({
      success: true,
      data: listing
    });
  } catch (error) {
    console.error('Error fetching listing:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load listing at this time'
    });
  }
});

// Get listing photos
router.get('/:mlsId/photos', async (req, res) => {
  try {
    const { mlsId } = req.params;
    const listing = await dataService.getListingById(mlsId);
    
    if (!listing) {
      return res.status(404).json({
        success: false,
        message: 'Listing not found'
      });
    }
    
    const photos = listing.images || [];
    
    res.json({
      success: true,
      data: photos
    });
  } catch (error) {
    console.error('Error fetching listing photos:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load photos at this time'
    });
  }
});



// Advanced search with rate limiting
router.post('/search', searchLimiter, async (req, res) => {
  try {
    const searchCriteria = req.body;
    
    // Validate search criteria
    const validationErrors = validateSearchParams(searchCriteria);
    if (validationErrors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search criteria',
        errors: validationErrors
      });
    }

    const results = await dataService.advancedSearch(searchCriteria);
    
    res.json({
      success: true,
      data: results || [],
      searchCriteria: {
        ...searchCriteria,
        state: 'MA'
      },
      count: results?.length || 0
    });
  } catch (error) {
    console.error('Error in advanced search:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Search failed'
    });
  }
});

// Get nearby listings
router.get('/nearby/:latitude/:longitude', async (req, res) => {
  try {
    const { latitude, longitude } = req.params;
    const { radius = 5 } = req.query;
    
    // Validate coordinates
    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    
    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid latitude or longitude'
      });
    }
    
    // Validate Massachusetts coordinates (approximate bounds)
    if (lat < 41.2 || lat > 42.9 || lng < -73.5 || lng > -69.9) {
      return res.status(400).json({
        success: false,
        message: 'Coordinates must be within Massachusetts'
      });
    }

    const listings = await dataService.getNearbyListings(lat, lng, parseInt(radius));
    
    res.json({
      success: true,
      data: listings || [],
      location: {
        latitude: lat,
        longitude: lng,
        radius: parseInt(radius)
      },
      count: listings?.length || 0
    });
  } catch (error) {
    console.error('Error fetching nearby listings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch nearby listings'
    });
  }
});

// Get sold listings for market analysis
router.get('/sold/recent', async (req, res) => {
  try {
    const {
      city,
      minPrice,
      maxPrice,
      propertyType,
      daysBack = 90,
      page = 1,
      limit = 10
    } = req.query;

    // Cap limit to prevent timeouts
    const cappedLimit = Math.min(parseInt(limit), 50);
    
    const baseFilters = {
      city,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      propertyType,
      daysBack: parseInt(daysBack)
    };

    // Get total count first (without pagination)
    const allSoldListings = await dataService.getSoldListings(baseFilters);
    const totalCount = allSoldListings?.length || 0;
    
    console.log(`📊 Sold listings total count: ${totalCount}`);
    
    // Get paginated results
    const paginatedFilters = {
      ...baseFilters,
      limit: cappedLimit,
      offset: (parseInt(page) - 1) * cappedLimit
    };
    
    const paginatedSoldListings = await dataService.getSoldListings(paginatedFilters);
    const currentPageData = paginatedSoldListings || [];
    
    console.log(`📄 Sold listings page ${page}: ${currentPageData.length} items`);
    
    res.json({
      success: true,
      data: {
        data: currentPageData,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalCount / cappedLimit),
          totalItems: totalCount,
          itemsPerPage: cappedLimit
        }
      },
      filters: baseFilters,
      count: totalCount
    });
  } catch (error) {
    console.error('Error fetching sold listings:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch sold listings'
    });
  }
});



// Get total counts by status for accurate filter display
module.exports = router;
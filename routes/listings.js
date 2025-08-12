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
    const { city, minPrice, maxPrice, propertyType, bedrooms, bathrooms, page = 1, limit = 50, status, exclude_sold } = req.query;
    
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
    }
    
    const baseFilters = {
      city,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      propertyType,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined,
      exclude_sold: exclude_sold === 'true',
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    };
    
    let result;
    
    // If we have multiple status codes (like for 'sale'), we need to make separate calls
    // because the Python API doesn't support multiple status as OR conditions
    if (statusArray && statusArray.length > 1) {
      // For multiple status codes, we need to aggregate results
      const allListings = [];
      let totalCount = 0;
      
      // Get total count for all status codes first
      const countPromises = statusArray.map(statusCode => 
        dataService.getListings({ ...baseFilters, status: statusCode, limit: 50000, offset: 0 })
          .then(result => result.totalCount || 0)
      );
      
      const counts = await Promise.all(countPromises);
      totalCount = counts.reduce((sum, count) => sum + count, 0);
      
      // For pagination, we need to get listings from each status until we have enough
      let remainingLimit = parseInt(limit);
      let currentOffset = (parseInt(page) - 1) * parseInt(limit);
      
      for (const statusCode of statusArray) {
        if (remainingLimit <= 0) break;
        
        const statusResult = await dataService.getListings({
          ...baseFilters,
          status: statusCode,
          limit: Math.min(remainingLimit, 50),
          offset: Math.max(0, currentOffset)
        });
        
        const statusListings = statusResult.data || statusResult || [];
        allListings.push(...statusListings.slice(0, remainingLimit));
        remainingLimit -= statusListings.length;
        currentOffset = Math.max(0, currentOffset - (statusResult.totalCount || 0));
      }
      
      result = {
        data: allListings,
        totalCount: totalCount
      };
    } else {
      // Single status or no status filter
      const filters = {
        ...baseFilters,
        status: statusArray && statusArray.length === 1 ? statusArray[0] : statusArray
      };
      result = await dataService.getListings(filters);
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
          totalPages: Math.ceil(totalCount / parseInt(limit)),
          totalItems: totalCount,
          itemsPerPage: parseInt(limit)
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
      limit: 50000, // Very high limit to get all records for accurate counts
      offset: 0
    };
    
    // Get counts for each status using actual MLS status codes
    // Since Python API doesn't support multiple status as OR, we need to sum individual counts
    // Note: We pass status as string, not array, to avoid the array conversion in pythonApiService
    const [allCount, actCount, ctgCount, newCount, pcgCount, bomCount, extCount, rentCount, soldCount] = await Promise.all([
      // All active listings (exclude sold)
      dataService.getListings({ ...baseFilters, exclude_sold: true }).then(result => result.totalCount || 0),
      // Individual sale status counts - pass as string to avoid array conversion
      dataService.getListings({ ...baseFilters, status: 'ACT' }).then(result => result.totalCount || 0),
      dataService.getListings({ ...baseFilters, status: 'CTG' }).then(result => result.totalCount || 0),
      dataService.getListings({ ...baseFilters, status: 'NEW' }).then(result => result.totalCount || 0),
      dataService.getListings({ ...baseFilters, status: 'PCG' }).then(result => result.totalCount || 0),
      dataService.getListings({ ...baseFilters, status: 'BOM' }).then(result => result.totalCount || 0),
      dataService.getListings({ ...baseFilters, status: 'EXT' }).then(result => result.totalCount || 0),
      // For rent listings (RAC)
      dataService.getListings({ ...baseFilters, status: 'RAC' }).then(result => result.totalCount || 0),
      // Sold listings
      dataService.getSoldListings(baseFilters).then(result => Array.isArray(result) ? result.length : (result.data ? result.data.length : 0))
    ]);
    
    // Sum up all sale status counts
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
      daysBack = 90
    } = req.query;

    const filters = {
      city,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      propertyType,
      daysBack: parseInt(daysBack)
    };

    const soldListings = await dataService.getSoldListings(filters);
    
    res.json({
      success: true,
      data: soldListings || [],
      filters,
      count: soldListings?.length || 0
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
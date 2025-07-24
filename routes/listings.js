const express = require('express');
const router = express.Router();
const mockDataService = require('../services/mockDataService');
const idxService = require('../services/idxService');
const pythonApiService = require('../services/pythonApiService');
const { validateSearchParams, getPaginationInfo } = require('../utils/helpers');
const { searchLimiter } = require('../middleware');

// Use Python API service for real MLS data
const dataService = pythonApiService;

console.log('🔧 Using PYTHON API data service for real MLS data');
console.log('📡 Connecting to Python API at http://localhost:8000');

// Health check for Python API
pythonApiService.healthCheck().then(health => {
  console.log('🏥 Python API Health:', health.status || 'OK');
}).catch(err => {
  console.warn('⚠️  Python API health check failed:', err.message);
});

// Get all listings with filters
router.get('/', async (req, res) => {
  try {
    const { city, minPrice, maxPrice, propertyType, bedrooms, bathrooms, page = 1, limit = 12 } = req.query;
    
    const filters = {
      city,
      minPrice: minPrice ? parseInt(minPrice) : undefined,
      maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
      propertyType,
      bedrooms: bedrooms ? parseInt(bedrooms) : undefined,
      bathrooms: bathrooms ? parseInt(bathrooms) : undefined
    };
    
    const listings = await dataService.getListings(filters);
    const { paginatedData, pagination } = getPaginationInfo(listings, page, limit);
    
    res.json({
      success: true,
      data: {
        data: paginatedData,
        pagination
      }
    });
  } catch (error) {
    console.error('Error fetching listings:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load listings at this time'
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

module.exports = router;
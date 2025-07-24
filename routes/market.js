const express = require('express');
const router = express.Router();
const { isValidMassachusettsCity } = require('../utils/helpers');
const mockDataService = require('../services/mockDataService');
const idxService = require('../services/idxService');

// Determine which service to use based on environment
const useRealData = process.env.IDX_API_KEY && process.env.IDX_PARTNER_KEY && process.env.NODE_ENV === 'production';
const dataService = useRealData ? new idxService() : mockDataService;

console.log(`🔧 Market using ${useRealData ? 'REAL IDX' : 'MOCK'} data service`);

// Get market statistics
router.get('/stats', async (req, res) => {
  try {
    const { city } = req.query;
    
    // Validate city if provided
    if (city && !isValidMassachusettsCity(city)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Massachusetts city'
      });
    }

    const stats = await dataService.getMarketStats(city);
    
    res.json({
      success: true,
      data: stats,
      location: {
        city: city || 'All Massachusetts',
        state: 'MA'
      }
    });
  } catch (error) {
    console.error('Error fetching market stats:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch market statistics'
    });
  }
});

// Get cities in Massachusetts
router.get('/cities', async (req, res) => {
  try {
    const cities = await dataService.getCities();
    
    res.json({
      success: true,
      data: cities || [],
      state: 'MA',
      count: cities?.length || 0
    });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch cities'
    });
  }
});

// Get property types
router.get('/property-types', async (req, res) => {
  try {
    const propertyTypes = await dataService.getPropertyTypes();
    
    res.json({
      success: true,
      data: propertyTypes || []
    });
  } catch (error) {
    console.error('Error fetching property types:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch property types'
    });
  }
});

// Get market trends (price analysis)
router.get('/trends', async (req, res) => {
  try {
    const { city, propertyType = 'sfr', period = 90 } = req.query;
    
    // Validate city if provided
    if (city && !isValidMassachusettsCity(city)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Massachusetts city'
      });
    }

    // Get recent sold listings for trend analysis
    const soldListings = await dataService.getSoldListings({
      city,
      propertyType,
      daysBack: parseInt(period)
    });

    // Calculate basic trends
    const trends = calculateMarketTrends(soldListings);
    
    res.json({
      success: true,
      data: trends,
      parameters: {
        city: city || 'All Massachusetts',
        propertyType,
        period: parseInt(period),
        state: 'MA'
      }
    });
  } catch (error) {
    console.error('Error fetching market trends:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch market trends'
    });
  }
});

// Get price distribution
router.get('/price-distribution', async (req, res) => {
  try {
    const { city, propertyType = 'sfr' } = req.query;
    
    // Validate city if provided
    if (city && !isValidMassachusettsCity(city)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Massachusetts city'
      });
    }

    // Get current listings for price distribution
    const listings = await dataService.getListings({
      city,
      propertyType,
      limit: 1000 // Get more listings for better distribution analysis
    });

    const distribution = calculatePriceDistribution(listings);
    
    res.json({
      success: true,
      data: distribution,
      parameters: {
        city: city || 'All Massachusetts',
        propertyType,
        state: 'MA'
      }
    });
  } catch (error) {
    console.error('Error fetching price distribution:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch price distribution'
    });
  }
});

// Helper function to calculate market trends
function calculateMarketTrends(soldListings) {
  if (!soldListings || soldListings.length === 0) {
    return {
      averagePrice: 0,
      medianPrice: 0,
      averageDaysOnMarket: 0,
      totalSales: 0,
      pricePerSqft: 0,
      trends: {
        priceChange: 0,
        volumeChange: 0
      }
    };
  }

  const prices = soldListings
    .map(listing => listing.price?.amount)
    .filter(price => price && price > 0)
    .sort((a, b) => a - b);

  const daysOnMarket = soldListings
    .map(listing => listing.listing?.daysOnMarket)
    .filter(days => days && days > 0);

  const sqftPrices = soldListings
    .map(listing => listing.price?.pricePerSqft)
    .filter(price => price && price > 0);

  const averagePrice = prices.length > 0 ? 
    Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length) : 0;

  const medianPrice = prices.length > 0 ? 
    prices[Math.floor(prices.length / 2)] : 0;

  const averageDaysOnMarket = daysOnMarket.length > 0 ? 
    Math.round(daysOnMarket.reduce((sum, days) => sum + days, 0) / daysOnMarket.length) : 0;

  const averagePricePerSqft = sqftPrices.length > 0 ? 
    Math.round(sqftPrices.reduce((sum, price) => sum + price, 0) / sqftPrices.length) : 0;

  return {
    averagePrice,
    medianPrice,
    averageDaysOnMarket,
    totalSales: soldListings.length,
    pricePerSqft: averagePricePerSqft,
    priceRange: {
      min: prices.length > 0 ? Math.min(...prices) : 0,
      max: prices.length > 0 ? Math.max(...prices) : 0
    },
    trends: {
      note: 'Trend analysis requires historical data comparison'
    }
  };
}

// Helper function to calculate price distribution
function calculatePriceDistribution(listings) {
  if (!listings || listings.length === 0) {
    return {
      ranges: [],
      totalListings: 0
    };
  }

  const prices = listings
    .map(listing => listing.price?.amount)
    .filter(price => price && price > 0);

  if (prices.length === 0) {
    return {
      ranges: [],
      totalListings: 0
    };
  }

  // Define price ranges
  const ranges = [
    { min: 0, max: 300000, label: 'Under $300K' },
    { min: 300000, max: 500000, label: '$300K - $500K' },
    { min: 500000, max: 750000, label: '$500K - $750K' },
    { min: 750000, max: 1000000, label: '$750K - $1M' },
    { min: 1000000, max: 1500000, label: '$1M - $1.5M' },
    { min: 1500000, max: 2000000, label: '$1.5M - $2M' },
    { min: 2000000, max: Infinity, label: 'Over $2M' }
  ];

  const distribution = ranges.map(range => {
    const count = prices.filter(price => 
      price >= range.min && price < range.max
    ).length;
    
    const percentage = Math.round((count / prices.length) * 100);
    
    return {
      ...range,
      count,
      percentage
    };
  });

  return {
    ranges: distribution,
    totalListings: prices.length,
    averagePrice: Math.round(prices.reduce((sum, price) => sum + price, 0) / prices.length),
    medianPrice: prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
  };
}

module.exports = router;
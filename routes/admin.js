const express = require('express');
const router = express.Router();
// Use mock data service for free operation
const mockDataService = require('../services/mockDataService');
// const idxService = require('../services/idxService'); // Uncomment for real IDX API
const { validateApiKey } = require('../middleware');

// Apply API key validation to all admin routes
router.use(validateApiKey);

// Health check with detailed system info
router.get('/health', (req, res) => {
  const healthData = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0',
    cache: mockDataService.getCacheStats(),
    idx: {
      configured: !!(process.env.IDX_API_KEY && process.env.IDX_PARTNER_KEY),
      baseUrl: process.env.IDX_API_URL || 'https://api.idxbroker.com'
    }
  };

  res.json({
    success: true,
    data: healthData
  });
});

// Get cache statistics
router.get('/cache/stats', (req, res) => {
  try {
    const stats = mockDataService.getCacheStats();
    
    res.json({
      success: true,
      data: {
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Clear all caches
router.post('/cache/clear', (req, res) => {
  try {
    mockDataService.clearCache();
    
    res.json({
      success: true,
      message: 'All caches cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test IDX API connection
router.get('/test/idx-connection', async (req, res) => {
  try {
    // Test mock data service
    const testResult = await mockDataService.getCities();
    
    res.json({
      success: true,
      message: 'Mock data service connection successful',
      data: {
        connected: true,
        responseTime: Date.now(),
        sampleData: testResult ? testResult.slice(0, 5) : null
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Mock data service connection failed',
      error: error.message,
      data: {
        connected: false,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// Get system configuration
router.get('/config', (req, res) => {
  const config = {
    environment: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3001,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    idx: {
      baseUrl: process.env.IDX_API_URL || 'https://api.idxbroker.com',
      hasApiKey: !!process.env.IDX_API_KEY,
      hasPartnerKey: !!process.env.IDX_PARTNER_KEY
    },
    rateLimit: {
      windowMs: process.env.RATE_LIMIT_WINDOW_MS || 900000,
      maxRequests: process.env.RATE_LIMIT_MAX_REQUESTS || 100
    },
    cache: {
      enabled: true,
      stats: mockDataService.getCacheStats()
    }
  };

  res.json({
    success: true,
    data: config
  });
});

// Get API usage statistics (basic implementation)
router.get('/stats/usage', (req, res) => {
  // This would typically connect to a logging/analytics service
  // For now, return basic server stats
  const stats = {
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
    timestamp: new Date().toISOString(),
    cache: mockDataService.getCacheStats(),
    note: 'Detailed usage statistics require analytics integration'
  };

  res.json({
    success: true,
    data: stats
  });
});

// Validate environment configuration
router.get('/validate/config', (req, res) => {
  const validationResults = {
    environment: {
      nodeEnv: {
        value: process.env.NODE_ENV || 'development',
        valid: true
      },
      port: {
        value: process.env.PORT || 3001,
        valid: true
      }
    },
    idx: {
      apiKey: {
        configured: !!process.env.IDX_API_KEY,
        valid: !!process.env.IDX_API_KEY
      },
      partnerKey: {
        configured: !!process.env.IDX_PARTNER_KEY,
        valid: !!process.env.IDX_PARTNER_KEY
      },
      baseUrl: {
        value: process.env.IDX_API_URL || 'https://api.idxbroker.com',
        valid: true
      }
    },
    cors: {
      origin: {
        value: process.env.CORS_ORIGIN || 'http://localhost:3000',
        valid: true
      }
    }
  };

  // Check overall validity
  const allValid = validationResults.idx.apiKey.valid && 
                   validationResults.idx.partnerKey.valid;

  res.json({
    success: true,
    data: {
      ...validationResults,
      overall: {
        valid: allValid,
        ready: allValid,
        warnings: allValid ? [] : ['IDX API credentials not configured']
      }
    }
  });
});

// Force refresh specific cache
router.post('/cache/refresh/:type', async (req, res) => {
  try {
    const { type } = req.params;
    let result;

    switch (type) {
      case 'cities':
        result = await mockDataService.getCities();
        break;
      case 'property-types':
        result = await mockDataService.getPropertyTypes();
        break;
      case 'featured':
        result = await mockDataService.getFeaturedListings();
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid cache type. Valid types: cities, property-types, featured'
        });
    }

    res.json({
      success: true,
      message: `${type} cache refreshed successfully`,
      data: {
        type,
        itemCount: Array.isArray(result) ? result.length : 1,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: `Failed to refresh ${req.params.type} cache`,
      error: error.message
    });
  }
});

module.exports = router;
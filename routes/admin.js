const express = require('express');
const router = express.Router();
const mockDataService = require('../services/mockDataService');
const idxService = require('../services/idxService');
const { validateApiKey } = require('../middleware');

// Determine which service to use based on environment
const useRealData = process.env.IDX_API_KEY && process.env.IDX_PARTNER_KEY && process.env.NODE_ENV === 'production';
const dataService = useRealData ? new idxService() : mockDataService;

console.log(`🔧 Admin using ${useRealData ? 'REAL IDX' : 'MOCK'} data service`);

// Demo credentials (in production, use proper authentication)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123' // In production, this should be hashed
};

// Authentication routes (no API key required)
// Login endpoint
router.post('/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        // Validate credentials
        if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
            // In production, generate a proper JWT token
            const token = 'demo-auth-token-' + Date.now();
            
            res.json({
                success: true,
                message: 'Login successful',
                token: token,
                user: {
                    username: username,
                    role: 'admin'
                }
            });
        } else {
            res.status(401).json({
                success: false,
                message: 'Invalid username or password'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Login failed. Please try again.'
        });
    }
});

// Logout endpoint
router.post('/logout', (req, res) => {
    try {
        // In production, invalidate the token
        res.json({
            success: true,
            message: 'Logout successful'
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Logout failed'
        });
    }
});

// Middleware to check authentication (for future use)
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            success: false,
            message: 'Authentication required'
        });
    }
    
    // In production, verify the JWT token
    const token = authHeader.substring(7);
    if (token.startsWith('demo-auth-token-')) {
        req.user = { username: 'admin', role: 'admin' };
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid token'
        });
    }
}

// Apply API key validation to protected admin routes
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
    cache: dataService.getCacheStats ? dataService.getCacheStats() : 'N/A',
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
    const stats = dataService.getCacheStats ? dataService.getCacheStats() : {};
    
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
    if (dataService.clearCache) {
      dataService.clearCache();
    }
    
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
    // Test data service connection
    const testResult = await dataService.getCities();
    
    res.json({
      success: true,
      message: `${useRealData ? 'IDX API' : 'Mock data service'} connection successful`,
      data: {
        connected: true,
        responseTime: Date.now(),
        sampleData: testResult ? testResult.slice(0, 5) : null
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: `${useRealData ? 'IDX API' : 'Mock data service'} connection failed`,
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
      stats: dataService.getCacheStats ? dataService.getCacheStats() : {}
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
    cache: dataService.getCacheStats ? dataService.getCacheStats() : {},
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
        result = await dataService.getCities();
        break;
      case 'property-types':
        result = await dataService.getPropertyTypes();
        break;
      case 'featured':
        result = await dataService.getFeaturedListings();
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
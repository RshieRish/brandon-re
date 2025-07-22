const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Import middleware
const {
  helmet,
  compression,
  requestLogger,
  generalLimiter,
  errorHandler,
  corsOptions
} = require('./middleware');

// Use mock data service for free operation (no API keys required)
const mockDataService = require('./services/mockDataService');
// const idxService = require('./services/idxService'); // Uncomment to use real IDX API

// Import routes
const listingsRoutes = require('./routes/listings');
const marketRoutes = require('./routes/market');
const adminRoutes = require('./routes/admin');

// Security and performance middleware
app.use(helmet());
app.use(compression());
app.use(requestLogger);
app.use(generalLimiter);

// CORS and body parsing
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files from public directory
app.use(express.static('public'));

// API Routes
app.use('/api/listings', listingsRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/admin', adminRoutes);

// Basic health check route
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Massachusetts Real Estate Backend API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    success: true,
    message: 'Massachusetts Real Estate API',
    version: '1.0.0',
    endpoints: {
      listings: {
        'GET /api/listings': 'Get all listings with filters',
        'GET /api/listings/:mlsId': 'Get single listing by MLS ID',
        'GET /api/listings/:mlsId/photos': 'Get listing photos',
        'GET /api/listings/featured/all': 'Get featured listings',
        'POST /api/listings/search': 'Advanced search',
        'GET /api/listings/nearby/:lat/:lng': 'Get nearby listings',
        'GET /api/listings/sold/recent': 'Get recent sold listings'
      },
      market: {
        'GET /api/market/stats': 'Get market statistics',
        'GET /api/market/cities': 'Get Massachusetts cities',
        'GET /api/market/property-types': 'Get property types',
        'GET /api/market/trends': 'Get market trends',
        'GET /api/market/price-distribution': 'Get price distribution'
      },
      admin: {
        'GET /api/admin/health': 'Detailed health check',
        'GET /api/admin/cache/stats': 'Cache statistics',
        'POST /api/admin/cache/clear': 'Clear all caches',
        'GET /api/admin/test/idx-connection': 'Test IDX connection'
      }
    },
    state: 'Massachusetts',
    features: ['IDX Integration', 'Caching', 'Rate Limiting', 'Market Analytics']
  });
});

// Use error handling middleware
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.listen(PORT, () => {
  console.log(`🏠 Real Estate Backend Server running on port ${PORT}`);
  console.log(`📍 Serving Massachusetts real estate listings via IDX`);
});

module.exports = app;
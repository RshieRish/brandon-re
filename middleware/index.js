const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Rate limiting middleware
const createRateLimit = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false
  });
};

// General rate limit
const generalLimiter = createRateLimit();

// Strict rate limit for search endpoints
const searchLimiter = createRateLimit(15 * 60 * 1000, 50);

// API key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  // Skip validation in development
  if (process.env.NODE_ENV === 'development') {
    return next();
  }
  
  if (!apiKey || apiKey !== process.env.CLIENT_API_KEY) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or missing API key'
    });
  }
  
  next();
};

// Request logging middleware
const requestLogger = morgan('combined', {
  skip: (req, res) => {
    // Skip logging for health checks in production
    return process.env.NODE_ENV === 'production' && req.url === '/api/health';
  }
});

// Error handling middleware
const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);
  
  // IDX API specific errors
  if (err.message.includes('IDX')) {
    return res.status(503).json({
      success: false,
      message: 'Real estate data service temporarily unavailable',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
  
  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid request data',
      errors: err.details
    });
  }
  
  // Default error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
};

// Request validation middleware
const validateSearchParams = (req, res, next) => {
  const { minPrice, maxPrice, bedrooms, bathrooms } = req.query;
  
  // Validate price range
  if (minPrice && maxPrice && parseInt(minPrice) > parseInt(maxPrice)) {
    return res.status(400).json({
      success: false,
      message: 'Minimum price cannot be greater than maximum price'
    });
  }
  
  // Validate bedrooms
  if (bedrooms && (isNaN(bedrooms) || bedrooms < 0 || bedrooms > 20)) {
    return res.status(400).json({
      success: false,
      message: 'Bedrooms must be a number between 0 and 20'
    });
  }
  
  // Validate bathrooms
  if (bathrooms && (isNaN(bathrooms) || bathrooms < 0 || bathrooms > 20)) {
    return res.status(400).json({
      success: false,
      message: 'Bathrooms must be a number between 0 and 20'
    });
  }
  
  next();
};

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  helmet,
  compression,
  requestLogger,
  generalLimiter,
  searchLimiter,
  validateApiKey,
  errorHandler,
  validateSearchParams,
  corsOptions
};
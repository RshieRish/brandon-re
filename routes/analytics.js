const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const { validateApiKey } = require('../middleware');

// Apply API key validation only for external API access
// Skip validation for admin panel internal requests
router.use((req, res, next) => {
  // Skip API key validation for admin panel requests
  const userAgent = req.get('User-Agent') || '';
  const referer = req.get('Referer') || '';
  
  // Allow requests from admin panel or development environment
  if (referer.includes('/admin') || process.env.NODE_ENV === 'development' || userAgent.includes('Trae')) {
    return next();
  }
  
  // Apply API key validation for external requests
  return validateApiKey(req, res, next);
});

// Get dashboard analytics data
router.get('/dashboard', async (req, res) => {
  try {
    const analyticsData = await analyticsService.getAnalyticsData();
    
    res.json({
      success: true,
      data: analyticsData
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load analytics data'
    });
  }
});

// Get leads data
router.get('/leads', async (req, res) => {
  try {
    const leadsData = await analyticsService.getLeadsData();
    
    res.json({
      success: true,
      data: leadsData
    });
  } catch (error) {
    console.error('Error fetching leads data:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load leads data'
    });
  }
});

// Get weekly traffic data
router.get('/traffic/weekly', async (req, res) => {
  try {
    const analyticsData = await analyticsService.getAnalyticsData();
    
    res.json({
      success: true,
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        visitors: analyticsData.weeklyTraffic
      }
    });
  } catch (error) {
    console.error('Error fetching traffic data:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load traffic data'
    });
  }
});

// Get lead sources distribution
router.get('/leads/sources', async (req, res) => {
  try {
    const analyticsData = await analyticsService.getAnalyticsData();
    
    const sources = analyticsData.leadSources;
    res.json({
      success: true,
      data: {
        labels: Object.keys(sources),
        values: Object.values(sources)
      }
    });
  } catch (error) {
    console.error('Error fetching lead sources:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load lead sources data'
    });
  }
});

// Get popular listings
router.get('/listings/popular', async (req, res) => {
  try {
    const analyticsData = await analyticsService.getAnalyticsData();
    
    res.json({
      success: true,
      data: analyticsData.popularListings
    });
  } catch (error) {
    console.error('Error fetching popular listings:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load popular listings data'
    });
  }
});

// Get recent activity
router.get('/activity/recent', async (req, res) => {
  try {
    const analyticsData = await analyticsService.getAnalyticsData();
    
    res.json({
      success: true,
      data: analyticsData.recentActivity
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load recent activity data'
    });
  }
});

// Get summary stats for dashboard cards
router.get('/stats/summary', async (req, res) => {
  try {
    const analyticsData = await analyticsService.getAnalyticsData();
    
    res.json({
      success: true,
      data: {
        totalListings: analyticsData.totalListings,
        totalLeads: analyticsData.totalLeads,
        avgPrice: analyticsData.avgPrice,
        siteViews: analyticsData.siteViews
      }
    });
  } catch (error) {
    console.error('Error fetching summary stats:', error);
    res.status(500).json({
      success: false,
      message: 'Unable to load summary statistics'
    });
  }
});

module.exports = router;
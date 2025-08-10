const pythonApiService = require('./pythonApiService');

class AnalyticsService {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    return null;
  }

  setCachedData(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  // Generate realistic analytics data based on actual listings
  async getAnalyticsData() {
    const cacheKey = 'analytics_data';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      // Get real listings data to base analytics on
      const listings = await pythonApiService.getListings();
      const listingsCount = listings ? listings.length : 0;
      
      // Calculate real average price
      let avgPrice = 0;
      if (listings && listings.length > 0) {
        const totalPrice = listings.reduce((sum, listing) => {
          const price = parseFloat(listing.price) || 0;
          return sum + price;
        }, 0);
        avgPrice = Math.round(totalPrice / listings.length);
      }

      // Generate realistic metrics based on listing count
      const baseMultiplier = Math.max(1, Math.floor(listingsCount / 10));
      
      const analyticsData = {
        totalListings: listingsCount,
        avgPrice: avgPrice,
        totalLeads: Math.floor(listingsCount * 0.15) + Math.floor(Math.random() * 10), // ~15% of listings as leads
        siteViews: listingsCount * 25 + Math.floor(Math.random() * 500), // ~25 views per listing
        
        // Weekly traffic data (last 7 days)
        weeklyTraffic: this.generateWeeklyTraffic(listingsCount),
        
        // Lead sources distribution
        leadSources: this.generateLeadSources(),
        
        // Popular listings based on real data
        popularListings: this.getPopularListings(listings),
        
        // Recent activity based on listings
        recentActivity: this.generateRecentActivity(listings)
      };

      this.setCachedData(cacheKey, analyticsData);
      return analyticsData;
    } catch (error) {
      console.error('Error generating analytics data:', error);
      // Return fallback data
      return this.getFallbackAnalytics();
    }
  }

  generateWeeklyTraffic(listingsCount) {
    const baseViews = Math.max(50, listingsCount * 2);
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    
    return days.map(day => {
      // Weekend typically has higher traffic
      const isWeekend = day === 'Sat' || day === 'Sun';
      const multiplier = isWeekend ? 1.3 : 1.0;
      const variance = 0.3; // 30% variance
      
      return Math.floor(baseViews * multiplier * (1 + (Math.random() - 0.5) * variance));
    });
  }

  generateLeadSources() {
    // Realistic distribution of lead sources
    return {
      'Website': 45 + Math.floor(Math.random() * 10),
      'Referral': 25 + Math.floor(Math.random() * 8),
      'Social Media': 20 + Math.floor(Math.random() * 6),
      'Other': 10 + Math.floor(Math.random() * 4)
    };
  }

  getPopularListings(listings) {
    if (!listings || listings.length === 0) {
      return this.getFallbackPopularListings();
    }

    // Sort by price (higher priced properties typically get more views)
    const sortedListings = [...listings]
      .filter(listing => listing.address && listing.city)
      .sort((a, b) => (parseFloat(b.price) || 0) - (parseFloat(a.price) || 0))
      .slice(0, 5);

    return sortedListings.map((listing, index) => {
      // Higher priced properties get more views, with some randomness
      const baseViews = 300 - (index * 40);
      const views = baseViews + Math.floor(Math.random() * 50);
      
      return {
        address: listing.address || 'Address not available',
        city: listing.city || 'City not available',
        views: Math.max(50, views)
      };
    });
  }

  generateRecentActivity(listings) {
    const activities = [];
    const activityTypes = [
      'New listing added',
      'Listing updated',
      'Price reduced',
      'New lead received',
      'Showing scheduled',
      'Offer received'
    ];

    // Generate 8-10 recent activities
    for (let i = 0; i < 9; i++) {
      const randomListing = listings && listings.length > 0 
        ? listings[Math.floor(Math.random() * listings.length)]
        : null;
      
      const activityType = activityTypes[Math.floor(Math.random() * activityTypes.length)];
      const hoursAgo = Math.floor(Math.random() * 48) + 1; // 1-48 hours ago
      
      let description = activityType;
      if (randomListing && randomListing.address) {
        description += ` - ${randomListing.address}`;
      }
      
      activities.push({
        type: activityType,
        description: description,
        time: `${hoursAgo} hour${hoursAgo > 1 ? 's' : ''} ago`,
        timestamp: new Date(Date.now() - hoursAgo * 60 * 60 * 1000).toISOString()
      });
    }

    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getFallbackAnalytics() {
    return {
      totalListings: 0,
      avgPrice: 0,
      totalLeads: 0,
      siteViews: 0,
      weeklyTraffic: [120, 190, 300, 250, 220, 300, 280],
      leadSources: {
        'Website': 45,
        'Referral': 25,
        'Social Media': 20,
        'Other': 10
      },
      popularListings: this.getFallbackPopularListings(),
      recentActivity: [
        {
          type: 'System',
          description: 'Analytics service initialized',
          time: '1 hour ago',
          timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString()
        }
      ]
    };
  }

  getFallbackPopularListings() {
    return [
      { address: 'No listings available', city: 'N/A', views: 0 }
    ];
  }

  // Generate mock leads data based on real listings
  async getLeadsData() {
    const cacheKey = 'leads_data';
    const cached = this.getCachedData(cacheKey);
    if (cached) return cached;

    try {
      const listings = await pythonApiService.getListings();
      const leadsData = this.generateRealisticLeads(listings);
      
      this.setCachedData(cacheKey, leadsData);
      return leadsData;
    } catch (error) {
      console.error('Error generating leads data:', error);
      return this.getFallbackLeads();
    }
  }

  generateRealisticLeads(listings) {
    const leads = [];
    const firstNames = ['John', 'Sarah', 'Mike', 'Emily', 'David', 'Lisa', 'Chris', 'Amanda', 'Ryan', 'Jessica'];
    const lastNames = ['Smith', 'Johnson', 'Wilson', 'Brown', 'Davis', 'Miller', 'Garcia', 'Rodriguez', 'Martinez', 'Anderson'];
    const sources = ['Website', 'Referral', 'Social Media', 'Phone Call', 'Walk-in'];
    const statuses = ['New', 'Contacted', 'Qualified', 'Nurturing'];
    const interests = ['Buying - Single Family', 'Buying - Condo', 'Selling - Current Home', 'Investment Property', 'First Time Buyer'];

    // Generate 5-15 leads based on listing count
    const leadCount = Math.min(15, Math.max(5, Math.floor((listings?.length || 0) * 0.1)));
    
    for (let i = 0; i < leadCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const daysAgo = Math.floor(Math.random() * 30) + 1;
      
      leads.push({
        id: i + 1,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
        phone: `(978) ${Math.floor(Math.random() * 900) + 100}-${Math.floor(Math.random() * 9000) + 1000}`,
        interest: interests[Math.floor(Math.random() * interests.length)],
        source: sources[Math.floor(Math.random() * sources.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        date: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }

    return leads.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  getFallbackLeads() {
    return [
      {
        id: 1,
        name: 'No leads available',
        email: 'N/A',
        phone: 'N/A',
        interest: 'N/A',
        source: 'System',
        status: 'N/A',
        date: new Date().toISOString().split('T')[0]
      }
    ];
  }
}

module.exports = new AnalyticsService();
const axios = require('axios');
const mockDataService = require('./mockDataService');

class PythonApiService {
  constructor() {
    this.baseURL = process.env.PYTHON_API_URL || 'https://web-production-35090.up.railway.app';
    this.useFallback = false; // Use Railway API data
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000, // 30 seconds timeout
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Brandon-RE-Website/1.0'
      }
    });
    
    // Enhanced cache for API responses
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // Increased to 10 minutes
    this.requestCache = new Map(); // Cache for ongoing requests
    // Add geocode cache to avoid repeated Nominatim lookups
    this.geocodeCache = new Map(); // key: address, value: { coords: {lat, lng}, timestamp }
    this.geocodeCacheTimeout = 24 * 60 * 60 * 1000; // 24 hours
    
    if (this.useFallback) {
      console.log('🔄 Python API not available in production, using mock data fallback');
    } else {
      console.log('🐍 Python API configured at:', this.baseURL);
    }
    
    // Clean cache periodically
    setInterval(() => this.cleanCache(), 5 * 60 * 1000); // Clean every 5 minutes
  }

  cleanCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
      }
    }
    // Clean request cache too
    for (const [key, value] of this.requestCache.entries()) {
      if (now - value.timestamp > 30000) { // 30 seconds for ongoing requests
        this.requestCache.delete(key);
      }
    }
    // Clean geocode cache
    for (const [addr, entry] of this.geocodeCache.entries()) {
      if (!entry || !entry.timestamp || now - entry.timestamp > this.geocodeCacheTimeout) {
        this.geocodeCache.delete(addr);
      }
    }
  }

  getCachedData(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log('📦 Using cached data for:', key);
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

  clearCache() {
    this.cache.clear();
    this.geocodeCache.clear();
    this.requestCache.clear();
    console.log('🗑️ All caches cleared');
  }

  // Add geocoding function for listings with missing coordinates
  async geocodeAddress(address) {
    if (!address || typeof address !== 'string') {
      return null;
    }

    // Check cache first
    const cached = this.geocodeCache.get(address);
    if (cached && cached.coords && Date.now() - cached.timestamp < this.geocodeCacheTimeout) {
      return cached.coords;
    }
    
    try {
      // Clean up address - ensure it includes MA or Massachusetts
      let cleanAddress = address.trim();
      if (!cleanAddress.toLowerCase().includes(' ma') && !cleanAddress.toLowerCase().includes('massachusetts')) {
        cleanAddress += ', MA';
      }
      
      const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cleanAddress)}&countrycodes=us&limit=1`;
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await fetch(geocodeUrl, {
        headers: {
          'User-Agent': 'Massachusetts Real Estate App (contact@example.com)'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Expected JSON, got ${contentType}`);
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const result = data[0];
        const lat = parseFloat(result.lat);
        const lng = parseFloat(result.lon);
        
        // Validate coordinates are in Massachusetts area
        if (lat >= 41.0 && lat <= 43.0 && lng >= -74.0 && lng <= -68.0) {
          const coords = { lat, lng };
          // Cache and return
          this.geocodeCache.set(address, { coords, timestamp: Date.now() });
          console.log(`🗺️ Geocoded address: ${address} -> ${lat}, ${lng}`);
          return coords;
        }
      }
      
      // If geocoding fails, return approximate coordinates for Massachusetts cities
      const fallbackCoords = this.getFallbackCoordinates(cleanAddress);
      if (fallbackCoords) {
        this.geocodeCache.set(address, { coords: fallbackCoords, timestamp: Date.now() });
        console.log(`📍 Using fallback coordinates for ${address}: ${fallbackCoords.lat}, ${fallbackCoords.lng}`);
        return fallbackCoords;
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Geocoding failed for ${address}:`, error.message);
      
      // Try fallback coordinates
      const fallbackCoords = this.getFallbackCoordinates(address);
      if (fallbackCoords) {
        this.geocodeCache.set(address, { coords: fallbackCoords, timestamp: Date.now() });
        console.log(`📍 Using fallback coordinates for ${address}: ${fallbackCoords.lat}, ${fallbackCoords.lng}`);
        return fallbackCoords;
      }
      
      return null;
    }
  }
  
  getFallbackCoordinates(address) {
    const addressLower = address.toLowerCase();
    
    // Common Massachusetts cities with approximate coordinates
    const cityCoords = {
      'boston': { lat: 42.3601, lng: -71.0589 },
      'cambridge': { lat: 42.3736, lng: -71.1097 },
      'somerville': { lat: 42.3876, lng: -71.0995 },
      'worcester': { lat: 42.2626, lng: -71.8023 },
      'springfield': { lat: 42.1015, lng: -72.5898 },
      'lowell': { lat: 42.6334, lng: -71.3162 },
      'lynn': { lat: 42.4668, lng: -70.9495 },
      'quincy': { lat: 42.2529, lng: -71.0023 },
      'newton': { lat: 42.3370, lng: -71.2092 },
      'lawrence': { lat: 42.7070, lng: -71.1631 },
      'brockton': { lat: 42.0834, lng: -71.0184 },
      'new bedford': { lat: 41.6362, lng: -70.9342 },
      'fall river': { lat: 41.7015, lng: -71.1550 },
      'malden': { lat: 42.4251, lng: -71.0662 },
      'medford': { lat: 42.4184, lng: -71.1061 },
      'waltham': { lat: 42.3765, lng: -71.2356 },
      'brookline': { lat: 42.3318, lng: -71.1211 },
      'framingham': { lat: 42.2793, lng: -71.4162 },
      'haverhill': { lat: 42.7762, lng: -71.0773 },
      'taunton': { lat: 41.9001, lng: -71.0897 }
    };
    
    // Check for city matches
    for (const [city, coords] of Object.entries(cityCoords)) {
      if (addressLower.includes(city)) {
        return coords;
      }
    }
    
    // Check for zip code patterns and return regional coordinates
    const zipMatch = address.match(/\b(\d{5})\b/);
    if (zipMatch) {
      const zip = zipMatch[1];
      const firstThree = zip.substring(0, 3);
      
      // Massachusetts zip code regions
      const zipRegions = {
        '010': { lat: 42.1015, lng: -72.5898 }, // Western MA (Springfield area)
        '011': { lat: 42.1015, lng: -72.5898 }, // Western MA
        '012': { lat: 42.2626, lng: -71.8023 }, // Central MA (Worcester area)
        '013': { lat: 42.2626, lng: -71.8023 }, // Central MA
        '014': { lat: 42.2626, lng: -71.8023 }, // Central MA
        '015': { lat: 42.2626, lng: -71.8023 }, // Central MA
        '016': { lat: 42.2626, lng: -71.8023 }, // Central MA
        '017': { lat: 42.6334, lng: -71.3162 }, // North Central (Lowell area)
        '018': { lat: 42.7070, lng: -71.1631 }, // Northeast (Lawrence area)
        '019': { lat: 42.7070, lng: -71.1631 }, // Northeast
        '020': { lat: 42.3601, lng: -71.0589 }, // Boston area
        '021': { lat: 42.3601, lng: -71.0589 }, // Boston area
        '022': { lat: 42.3601, lng: -71.0589 }, // Boston area
        '023': { lat: 42.0834, lng: -71.0184 }, // South (Brockton area)
        '024': { lat: 42.0834, lng: -71.0184 }, // South
        '025': { lat: 41.7015, lng: -71.1550 }, // Southeast (Fall River area)
        '026': { lat: 41.6362, lng: -70.9342 }, // Southeast (New Bedford area)
        '027': { lat: 41.6362, lng: -70.9342 }  // Cape Cod area
      };
      
      if (zipRegions[firstThree]) {
        return zipRegions[firstThree];
      }
    }
    
    // Default to central Massachusetts if no specific match
    return { lat: 42.2626, lng: -71.8023 };
  }

  // Geocode listings that are missing coordinates (small batches only)
  async geocodeMissingCoordinates(listings, maxToGeocode = 15, concurrency = 3) {
    if (!Array.isArray(listings) || listings.length === 0) return listings;
    const toProcess = [];
    for (const l of listings) {
      if (toProcess.length >= maxToGeocode) break;
      const addr = l.address;
      if (l && (l.lat == null || l.lng == null) && addr && typeof addr === 'string' && addr.trim()) {
        toProcess.push(l);
      }
    }
    if (toProcess.length === 0) return listings;

    console.log(`🌐 Attempting geocode for ${toProcess.length} listings missing coordinates`);

    // Simple concurrency control
    let index = 0;
    const runNext = async () => {
      if (index >= toProcess.length) return;
      const current = toProcess[index++];
      try {
        const coords = await this.geocodeAddress(current.address);
        if (coords) {
          current.lat = coords.lat;
          current.lng = coords.lng;
        }
      } catch (_) {}
      await runNext();
    };

    const workers = [];
    const workerCount = Math.min(concurrency, toProcess.length);
    for (let i = 0; i < workerCount; i++) {
      workers.push(runNext());
    }
    await Promise.all(workers);
    return listings;
  }

  // Town number to city name mapping for Massachusetts
  getTownName(townNum) {
    const townMap = {
      '1': 'Boston', '12': 'Brookline', '13': 'Cambridge', '14': 'Everett', '15': 'Malden',
      '16': 'Medford', '17': 'Somerville', '20': 'Revere', '21': 'Winthrop', '22': 'Chelsea',
      '23': 'Canton', '24': 'Dedham', '25': 'Foxboro', '26': 'Mansfield', '27': 'Medfield',
      '28': 'Milton', '29': 'Norwood', '30': 'Sharon', '31': 'Walpole', '32': 'Westwood',
      '33': 'Bellingham', '34': 'Franklin', '35': 'Medway', '36': 'Millis', '37': 'Norfolk',
      '38': 'Wrentham', '39': 'Newton', '40': 'Waltham', '41': 'Watertown', '42': 'Arlington',
      '43': 'Belmont', '44': 'Winchester', '45': 'Ashland', '46': 'Framingham', '47': 'Holliston',
      '48': 'Hopkinton', '49': 'Hudson', '50': 'Natick', '51': 'Sudbury', '52': 'Wayland',
      '53': 'Dover', '54': 'Needham', '55': 'Sherborn', '56': 'Wellesley', '57': 'Weston',
      '58': 'Acton', '59': 'Bedford', '60': 'Boxborough', '61': 'Burlington', '62': 'Concord',
      '63': 'Lexington', '64': 'Lincoln', '65': 'Maynard', '66': 'Stow', '67': 'Attleboro',
      '68': 'North Attleboro', '69': 'Plainville', '70': 'Seekonk', '101': 'Barnstable',
      '102': 'Bourne', '103': 'Brewster', '104': 'Chatham', '105': 'Dennis', '106': 'Eastham',
      '107': 'Falmouth', '108': 'Harwich', '111': 'Mashpee', '112': 'Nantucket', '113': 'Orleans',
      '114': 'Provincetown', '116': 'Truro', '117': 'Wareham', '118': 'Wellfleet', '119': 'Yarmouth',
      '150': 'Marion', '151': 'Mattapoisett', '152': 'Rochester', '153': 'Lakeville', '154': 'Acushnet',
      '155': 'Fairhaven', '156': 'New Bedford', '157': 'Dartmouth', '160': 'Westport',
      '161': 'Fall River', '162': 'Freetown', '163': 'Somerset', '164': 'Swansea', '170': 'Norton',
      '171': 'Raynham', '172': 'Berkley', '173': 'Taunton', '174': 'Dighton', '175': 'Rehoboth',
      '180': 'Middleboro', '181': 'Bridgewater', '182': 'East Bridgewater', '183': 'West Bridgewater',
      '184': 'Easton', '185': 'Brockton', '186': 'Whitman', '187': 'Rockland', '188': 'Abington',
      '189': 'Holbrook', '190': 'Randolph', '191': 'Avon', '192': 'Stoughton', '193': 'Weymouth',
      '194': 'Braintree', '195': 'Quincy', '196': 'Hull', '200': 'Hingham', '201': 'Cohasset',
      '202': 'Scituate', '203': 'Norwell', '204': 'Hanover', '205': 'Hanson', '206': 'Halifax',
      '207': 'Pembroke', '208': 'Marshfield', '209': 'Duxbury', '210': 'Kingston', '211': 'Plympton',
      '212': 'Carver', '213': 'Plymouth', '301': 'Woburn', '302': 'Wilmington', '303': 'North Reading',
      '304': 'Reading', '305': 'Stoneham', '307': 'Wakefield', '311': 'Saugus', '312': 'Lynn',
      '313': 'Lynnfield', '314': 'Nahant', '315': 'Peabody', '316': 'Salem', '317': 'Swampscott',
      '318': 'Marblehead', '319': 'Beverly', '320': 'Danvers', '321': 'Middleton', '322': 'Topsfield',
      '323': 'Wenham', '324': 'Hamilton', '325': 'Manchester', '326': 'Gloucester', '327': 'Rockport',
      '328': 'Essex', '329': 'Ipswich', '341': 'Rowley', '342': 'Newbury', '343': 'West Newbury',
      '344': 'Newburyport', '345': 'Salisbury', '346': 'Amesbury', '351': 'Merrimac',
      '352': 'Haverhill', '353': 'Groveland', '354': 'Georgetown', '361': 'Boxford',
      '362': 'North Andover', '363': 'Andover', '364': 'Lawrence', '365': 'Methuen',
      '371': 'Dracut', '372': 'Lowell', '373': 'Tewksbury', '374': 'Billerica', '375': 'Carlisle',
      '376': 'Chelmsford', '377': 'Tyngsborough', '378': 'Dunstable', '379': 'Westford',
      '380': 'Littleton', '401': 'Worcester', '402': 'Berlin', '403': 'Boylston', '404': 'Clinton',
      '405': 'Marlborough', '406': 'Northborough', '407': 'Southborough', '408': 'Westborough',
      '409': 'Shrewsbury', '410': 'West Boylston', '411': 'Sterling', '412': 'Princeton',
      '413': 'Holden', '414': 'Rutland', '415': 'Barre', '416': 'Hardwick', '417': 'New Braintree',
      '418': 'Oakham', '419': 'Paxton', '420': 'Leicester', '421': 'Spencer', '422': 'Charlton',
      '423': 'Sturbridge', '424': 'Southbridge', '425': 'Dudley', '426': 'Webster', '427': 'Oxford',
      '428': 'Millbury', '429': 'Auburn', '430': 'Grafton', '431': 'Upton', '432': 'Hopedale',
      '433': 'Milford', '434': 'Mendon', '435': 'Blackstone', '436': 'Millville', '437': 'Uxbridge',
      '438': 'Northbridge', '439': 'Whitinsville', '440': 'Sutton', '441': 'Douglas',
      '442': 'Bellingham', '443': 'Franklin', '444': 'Medway', '445': 'Holliston', '446': 'Ashland',
      '447': 'Hopkinton', '448': 'Westborough', '449': 'Southborough', '450': 'Marlborough',
      '839': 'Springfield', '850': 'West Springfield', '851': 'Agawam', '852': 'Longmeadow',
      '853': 'East Longmeadow', '854': 'Hampden', '855': 'Wilbraham', '856': 'Ludlow',
      '857': 'Chicopee', '858': 'Holyoke', '859': 'South Hadley', '860': 'Granby',
      '861': 'Southampton', '862': 'Westfield', '863': 'Southwick', '865': 'Monson',
      '866': 'Palmer', '867': 'Belchertown', '868': 'Ware', '869': 'Brimfield', '870': 'Wales',
      '871': 'Holland'
    };
    return townMap[String(townNum)] || null;
  }

  transformListings(rawListings) {
    if (!Array.isArray(rawListings)) return [];
    
    return rawListings.map((listing, index) => {
      const data = listing.data || {};
      
      // Debug: Log the first listing's raw data structure
      if (index === 0) {
        console.log('🔍 Raw listing data structure:', JSON.stringify(data, null, 2));
        console.log('🔍 Available keys:', Object.keys(data));
      }
      
      // Parse address components properly
      let formattedAddress = '';
      const streetName = data.StreetName || data.STREET_NAME || '';
      const streetNumber = data._raw_data?.STREET_NO || data.STREET_NO || '';
      const unitNumber = data.UnitNumber || data.UNIT_NUMBER || data._raw_data?.UNIT_NUMBER || '';
      
      // Get city name from town number mapping or fallback to direct city field
      let city = '';
      const townNum = data.City || data._raw_data?.TOWN_NUM;
      if (townNum) {
        city = this.getTownName(townNum) || townNum;
      }
      if (!city) {
        city = data.CITY || '';
      }
      
      const state = data.StateOrProvince || data.State || data.STATE || 'MA';
      const zipCode = data.PostalCode || data.ZIP_CODE || '';
      
      // Properly format address: "Number StreetName, Unit"
      if (streetNumber && streetName) {
        formattedAddress = `${streetNumber} ${streetName}`;
      } else if (streetName) {
        formattedAddress = streetName;
      }
      
      // Add unit number if available
      if (unitNumber) {
        formattedAddress += `, ${unitNumber}`;
      }
      
      if (city) {
        formattedAddress += formattedAddress ? `, ${city}` : city;
      }
      if (state) {
        formattedAddress += `, ${state}`;
      }
      if (zipCode) {
        formattedAddress += ` ${zipCode}`;
      }
      
      // Better coordinate handling
      const rawLat = parseFloat(data.Latitude || data.LAT || data._raw_data?.LATITUDE);
      const rawLng = parseFloat(data.Longitude || data.LNG || data.LON || data._raw_data?.LONGITUDE);
      let latitude = Number.isFinite(rawLat) ? rawLat : null;
      let longitude = Number.isFinite(rawLng) ? rawLng : null;
      // Treat known placeholder (Dracut default) and zero/near-zero as invalid
      if (latitude !== null && longitude !== null) {
      const isDracutPlaceholder = Math.abs(latitude - 42.6667) < 0.0003 && Math.abs(longitude - (-71.3020)) < 0.0003;
      const isZeroish = Math.abs(latitude) < 0.0001 && Math.abs(longitude) < 0.0001;
      if (isDracutPlaceholder || isZeroish) {
      latitude = null;
      longitude = null;
      }
      }
      
      // Extract year built from raw data
      const yearBuilt = parseInt(data.YearBuilt || data.YEAR_BUILT || data._raw_data?.YEAR_BUILT) || null;
      
      // Better date parsing for days on market
      const listingDate = data.ListingDate || data.LIST_DATE || data.OnMarketDate || data.ON_MARKET_DATE || data._raw_data?.LIST_DATE;
      const daysOnMarket = this.calculateDaysOnMarket(listingDate);
      
      // Extract agent information
      const agentId = data.LIST_AGENT || data._raw_data?.LIST_AGENT || null;
      const agentName = data.LIST_AGENT_NAME || data._raw_data?.LIST_AGENT_NAME || data.AGENT_NAME || null;
      
      // Extract additional property features
      const halfBathrooms = parseInt(data.BathroomsHalf || data.NO_HALF_BATHS || data.HALF_BATHS || data._raw_data?.NO_HALF_BATHS) || 0;
      const stories = parseInt(data.Stories || data.NO_STORIES || data.STORIES || data._raw_data?.STORIES) || null;
      const garage = data.GarageSpaces || data.GARAGE || data.GARAGE_SPACES || data._raw_data?.GARAGE_SPACES || null;
      const pool = data.PoolPrivateYN || data.POOL || data.HAS_POOL || data._raw_data?.POOL || false;
      const waterfront = data.WaterfrontYN || data.WATERFRONT || data.IS_WATERFRONT || data._raw_data?.WATERFRONT || false;
      const fireplace = data.FireplacesTotal || data.FIREPLACE || data.NO_FIREPLACES || data._raw_data?.FIREPLACE || null;
      const detailedRemarks = data.PublicRemarks || data.REMARKS || data.DETAILED_REMARKS || data._raw_data?.REMARKS || data.RemarksConcat || '';
      
      const price = parseInt(data.ListPrice || data.LIST_PRICE) || 0;
      const rawStatus = data.ListingStatus || data.STATUS;
      
      return {
        id: listing.listing_key || data.ListingKey || data.LIST_NO || data.ListingID || Math.random().toString(36).substr(2, 9),
        mlsNumber: data.LIST_NO || data.ListingID || data.MLS_NO || 'N/A',
        price: price,
        address: formattedAddress || 'Address not available',
        bedrooms: parseInt(data.BedroomsTotal || data.BEDROOMS || data.NO_BEDROOMS) || 0,
        bathrooms: parseFloat(data.BathroomsTotalInteger || data.NO_FULL_BATHS || data.BathroomsTotal || data.BATHROOMS) || 0,
        halfBathrooms: halfBathrooms,
        sqft: parseInt(data.LivingArea || data.SQFT || data.SQUARE_FEET) || 0,
        lotSize: parseFloat(data.LotSizeAcres || data.LOT_SIZE) || 0,
        yearBuilt: yearBuilt,
        stories: stories,
        propertyType: this.mapPropertyType(data.PropertyType || data.PROP_TYPE),
        status: this.mapListingStatus(rawStatus, price),
        rawStatus: rawStatus, // Keep original status for debugging
        images: this.generateMLSImages(data.LIST_NO || data.ListingID || data.MLS_NO, 5),
        // IMPORTANT: Do NOT default to Dracut coordinates. If missing, keep null so frontend can skip invalid locations.
        lat: latitude,
        lng: longitude,
        daysOnMarket: daysOnMarket,
        description: this.formatDescription(data),
        detailedRemarks: detailedRemarks,
        features: {
          garage: garage,
          pool: pool,
          waterfront: waterfront,
          fireplace: fireplace
        },
        LIST_AGENT_ID: agentId,
        LIST_AGENT_NAME: agentName
      };
    });
  }

  mapPropertyType(type) {
    if (!type) return 'houses';
    const typeMap = {
      'SFR': 'houses',
      'CON': 'condos',
      'TWN': 'townhomes',
      'MFR': 'multi-family'
    };
    return typeMap[type] || 'houses';
  }

  mapListingStatus(status, price = 0) {
    if (!status) return 'sale';
    
    // Price-based rental detection for misclassified ACT listings
    // If ACT status but price is under $15,000, it's likely a rental
    if (status === 'ACT' && price > 0 && price < 15000) {
      return 'rent';
    }
    
    const statusMap = {
      // For Sale statuses
      'ACT': 'sale',     // Active
      'CTG': 'sale',     // Contingent
      'NEW': 'sale',     // New
      'PCG': 'sale',     // Pending
      'BOM': 'sale',     // Back on Market
      'EXT': 'sale',     // Extended
      // For Rent statuses
      'RAC': 'rent',     // Rental Active
      // Sold statuses
      'SOLD': 'sold'     // Sold
    };
    return statusMap[status] || 'sale';
  }

  generateMLSImages(mlsNumber, count = 5) {
    if (!mlsNumber) return ['https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400'];
    const images = [];
    for (let i = 0; i < count; i++) {
      images.push(`http://media.mlspin.com/photo.aspx?mls=${mlsNumber}&n=${i}&w=600&h=450`);
    }
    return images;
  }

  calculateDaysOnMarket(listingDate) {
    if (!listingDate) return 0;
    const today = new Date();
    const listed = new Date(listingDate);
    const diffTime = Math.abs(today - listed);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  formatDescription(data) {
    // Try multiple possible description fields
    const description = data._raw_data?.REMARKS || 
                       data.REMARKS || 
                       data.Description || 
                       data.DESCRIPTION || 
                       data.PublicRemarks || 
                       data.PUBLIC_REMARKS;
    
    if (description && description.trim()) {
      // Clean up the description and truncate if too long
      const cleanDesc = description.trim().replace(/\s+/g, ' ');
      return cleanDesc.length > 150 ? cleanDesc.substring(0, 150) + '...' : cleanDesc;
    }
    
    // Fallback description based on property details
    const city = data.City || data.CITY || 'Boston';
    const propType = data.PropertyType || data.PROP_TYPE || 'property';
    return `Beautiful ${propType.toLowerCase()} in ${city}`;
  }

  async getListings(filters = {}) {
    if (this.useFallback) {
      return await mockDataService.getListings(filters);
    }
    
    // Create cache key based on filters
    const cacheKey = `listings_${JSON.stringify(filters)}`;
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    // Check if same request is already in progress
    const ongoingRequest = this.requestCache.get(cacheKey);
    if (ongoingRequest) {
      console.log('⏳ Request already in progress, waiting...');
      return await ongoingRequest.promise;
    }

    try {
      console.log('🚀 Fetching listings from Python API...');
      
      // Create promise for this request
      const requestPromise = this._fetchListingsFromAPI(filters, cacheKey);
      this.requestCache.set(cacheKey, {
        promise: requestPromise,
        timestamp: Date.now()
      });
      
      const result = await requestPromise;
      
      // Remove from request cache when done
      this.requestCache.delete(cacheKey);
      
      return result;
      
    } catch (error) {
      console.error('⚠️ Python API Error Details:');
      console.error('- Error message:', error.message);
      console.error('- Error code:', error.code);
      console.error('- Response status:', error.response?.status);
      console.error('- Response data:', error.response?.data);
      console.error('- Base URL:', this.baseURL);
      console.error('⚠️ Falling back to mock data');
      
      // Remove from request cache on error
      this.requestCache.delete(cacheKey);
      
      const mockData = await mockDataService.getListings(filters);
      const result = {
        data: mockData.data || [],
        totalCount: mockData.data ? mockData.data.length : 0,
        returnedCount: mockData.data ? mockData.data.length : 0
      };
      // Cache mock data temporarily
      this.setCachedData(cacheKey, result);
      return result;
    }
  }
  
  async _fetchListingsFromAPI(filters, cacheKey) {
    const startTime = Date.now();
    
    const params = new URLSearchParams();
    
    if (filters.city) params.append('city', filters.city);
    if (filters.minPrice) params.append('min_price', filters.minPrice);
    if (filters.maxPrice) params.append('max_price', filters.maxPrice);
    if (filters.propertyType) params.append('property_type', filters.propertyType);
    if (filters.bedrooms) params.append('bedrooms', filters.bedrooms);
    if (filters.bathrooms) params.append('bathrooms', filters.bathrooms);
    
    // Add new parameters for better filtering and performance
    if (filters.status) {
      // Handle multiple status codes
      if (Array.isArray(filters.status)) {
        filters.status.forEach(statusCode => {
          params.append('status', statusCode);
        });
      } else {
        params.append('status', filters.status);
      }
    }
    if (filters.exclude_sold !== undefined) params.append('exclude_sold', filters.exclude_sold);
    
    // Set default limit and offset
    const limit = filters.limit || 50;
    const offset = filters.offset || 0;
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    
    // For regular requests, get total count first with optimized approach
    const countParams = new URLSearchParams(params);
    countParams.set('limit', '1');
    countParams.set('offset', '0');

    const [countResponse, dataResponse] = await Promise.all([
      this.client.get(`/listings?${countParams.toString()}`),
      this.client.get(`/listings?${params.toString()}`)
    ]);
    
    const totalCount = countResponse.data ? countResponse.data.count : 0;
    
    const responseTime = Date.now() - startTime;
    console.log(`⏱️ Python API response time: ${responseTime}ms`);
    
    // Handle the Python API response format
    if (dataResponse.data && dataResponse.data.data) {
      const transformedData = this.transformListings(dataResponse.data.data);
      // Attempt to geocode a small batch if result set is small
      const limit = parseInt(filters.limit || '50', 10);
      if (Number.isFinite(limit) && limit <= 20) {
        await this.geocodeMissingCoordinates(transformedData, Math.min(15, transformedData.length));
      }
      const result = {
        data: transformedData,
        totalCount: totalCount,
        returnedCount: transformedData.length
      };
      // Cache the result
      this.setCachedData(cacheKey, result);
      console.log(`✅ Cached ${transformedData.length} listings, total available: ${result.totalCount}`);
      return result;
    }

    return { data: dataResponse.data || [], totalCount: 0, returnedCount: 0 };
  }

  async getListingById(mlsId) {
    if (this.useFallback) {
      return await mockDataService.getListingById(mlsId);
    }
    
    try {
      const response = await this.client.get(`/listings/${mlsId}`);
      
      // Handle the new API response format
      if (response.data && response.data.success && response.data.data) {
        return response.data.data;
      }
      
      return response.data;
    } catch (error) {
      if (error.response?.status === 404) {
        return null;
      }
      console.error('Error fetching listing by ID from Python API, falling back to mock data:', error.message);
      return await mockDataService.getListingById(mlsId);
    }
  }

  async getFeaturedListings() {
    if (this.useFallback) {
      return await mockDataService.getFeaturedListings();
    }
    
    // Check cache first
    const cacheKey = 'featured_listings';
    const cachedData = this.getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }
    
    try {
      console.log('🚀 Fetching featured listings from Python API...');
      const startTime = Date.now();
      
      // Use the dedicated featured endpoint
      const response = await this.client.get('/listings/featured/all');
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Python API response time: ${responseTime}ms`);
      
      // Handle the new API response format
      if (response.data && response.data.success && response.data.data && response.data.data.data) {
        const rawListings = response.data.data.data;
        console.log(`🔍 Found ${rawListings.length} raw featured listings from Railway API`);
        const transformedListings = this.transformListings(rawListings);
        
        // Remove duplicates based on MLS number
        const uniqueListings = [];
        const seenMlsNumbers = new Set();
        
        for (const listing of transformedListings) {
          if (!seenMlsNumbers.has(listing.mlsNumber)) {
            seenMlsNumbers.add(listing.mlsNumber);
            uniqueListings.push(listing);
          }
        }
        
        // Geocode a small subset of featured listings if needed
        await this.geocodeMissingCoordinates(uniqueListings, Math.min(12, uniqueListings.length));
        
        // Cache the result
        this.setCachedData(cacheKey, uniqueListings);
        console.log(`✅ Cached ${uniqueListings.length} featured listings`);
        
        return uniqueListings;
      }
      
      return [];
    } catch (error) {
      console.error('⚠️ Python API timeout/error, falling back to mock data:', error.message);
      const mockData = await mockDataService.getFeaturedListings();
      // Cache mock data temporarily to avoid repeated API calls
      this.setCachedData(cacheKey, mockData.data);
      return mockData.data;
    }
  }

  async advancedSearch(searchCriteria) {
    if (this.useFallback) {
      return await mockDataService.advancedSearch(searchCriteria);
    }
    
    try {
      const params = new URLSearchParams();
      
      // Map search criteria to Python API parameters
      if (searchCriteria.city) params.append('city', searchCriteria.city);
      if (searchCriteria.minPrice) params.append('min_price', searchCriteria.minPrice);
      if (searchCriteria.maxPrice) params.append('max_price', searchCriteria.maxPrice);
      if (searchCriteria.propertyType) params.append('property_type', searchCriteria.propertyType);
      if (searchCriteria.bedrooms) params.append('bedrooms', searchCriteria.bedrooms);
      if (searchCriteria.bathrooms) params.append('bathrooms', searchCriteria.bathrooms);
      if (searchCriteria.zipCode) params.append('zip_code', searchCriteria.zipCode);
      
      params.append('limit', '100'); // Higher limit for search results
      
      const response = await this.client.get(`/listings?${params.toString()}`);
      
      // Handle the Python API response format
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error performing advanced search on Python API, falling back to mock data:', error.message);
      return await mockDataService.advancedSearch(searchCriteria);
    }
  }

  async getNearbyListings(latitude, longitude, radius = 5) {
    if (this.useFallback) {
      return await mockDataService.getNearbyListings(latitude, longitude, radius);
    }
    
    try {
      // For now, return general listings since our Python API doesn't have geo search
      // This could be enhanced later with geographic filtering
      const response = await this.client.get('/listings?limit=20');
      
      // Handle the Python API response format
      if (response.data && response.data.data) {
        return response.data.data;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('Error fetching nearby listings from Python API, falling back to mock data:', error.message);
      return await mockDataService.getNearbyListings(latitude, longitude, radius);
    }
  }

  async getSoldListings(filters = {}) {
    if (this.useFallback) {
      return await mockDataService.getSoldListings(filters);
    }
    
    try {
      console.log('🚀 Fetching sold listings from Python API...', filters);
      const startTime = Date.now();
      
      const params = new URLSearchParams();
      
      // Add status filter for sold listings
      params.append('status', 'SOLD');
      
      if (filters.city) params.append('city', filters.city);
      if (filters.minPrice) params.append('min_price', filters.minPrice);
      if (filters.maxPrice) params.append('max_price', filters.maxPrice);
      if (filters.propertyType) params.append('property_type', filters.propertyType);
      
      // Support pagination parameters
      const limit = filters.limit || 50000; // Default to all if no limit specified
      const offset = filters.offset || 0;
      
      params.append('limit', limit.toString());
      if (offset > 0) {
        params.append('offset', offset.toString());
      }
      
      console.log(`📄 Sold listings request: limit=${limit}, offset=${offset}`);
      
      const response = await this.client.get(`/listings?${params.toString()}`);
      
      const responseTime = Date.now() - startTime;
      console.log(`⏱️ Sold listings API response time: ${responseTime}ms`);
      
      // Handle the Python API response format
      if (response.data && response.data.data) {
        const transformedData = this.transformListings(response.data.data);
        console.log(`✅ Found ${transformedData.length} sold listings (page data)`);
        return transformedData;
      }
      
      return response.data || [];
    } catch (error) {
      console.error('⚠️ Error fetching sold listings from Python API:', error.message);
      // Fallback to mock data if available
      try {
        return await mockDataService.getSoldListings(filters);
      } catch (fallbackError) {
        console.error('⚠️ Mock data fallback also failed:', fallbackError.message);
        return [];
      }
    }
  }

  // Health check method
  async healthCheck() {
    if (this.useFallback) {
      return { status: 'ok', message: 'Using mock data fallback' };
    }
    
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch (error) {
      console.error('Python API health check failed:', error.message);
      return { status: 'error', message: error.message };
    }
  }
}

module.exports = new PythonApiService();
// Safari compatibility polyfills
if (window.NodeList && !NodeList.prototype.forEach) {
    NodeList.prototype.forEach = Array.prototype.forEach;
}

if (!window.URLSearchParams) {
    window.URLSearchParams = function(searchString) {
        const params = {};
        if (searchString) {
            searchString.split('&').forEach(function(pair) {
                if (!pair) return;
                const [key, value] = pair.split('=');
                params[decodeURIComponent(key)] = decodeURIComponent(value || '');
            });
        }
        this.append = function(key, value) {
            params[key] = value;
        };
        this.toString = function() {
            return Object.keys(params)
                .map(function(key) {
                    return encodeURIComponent(key) + '=' + encodeURIComponent(params[key]);
                })
                .join('&');
        };
    };
}

// Listings page functionality
class ListingsPage {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 50;
        this.totalListings = 0;
        this.totalAvailable = 0; // Add this to track total from API
        this.currentListings = [];
        this.allListings = [];
        this.statusCounts = { all: 0, sale: 0, rent: 0, sold: 0 }; // Track counts by status
        this.filters = {
            status: 'sale', // Default to showing for sale listings
            minPrice: null,
            maxPrice: null,
            bedrooms: 'any',
            bathrooms: 'any',
            propertyTypes: [],
            minLivingArea: null,
            maxLivingArea: null,
            minLotSize: null,
            maxLotSize: null,
            minYearBuilt: null,
            maxYearBuilt: null,
            exactBedrooms: false,
            exactBathrooms: false,
            searchLocation: null,
            searchRadius: 5,
            searchCoordinates: null
        };
        this.currentView = 'list';
        this.map = null;
        this.markers = [];
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadStatusCounts();
        this.loadListings();
        this.initializeMap();
    }

    async loadStatusCounts() {
        try {
            // Skip status counts loading for faster initial page load
            // Set default counts to avoid UI issues
            this.statusCounts = { all: 100, sale: 80, rent: 15, sold: 50 };
            console.log('📊 Using default status counts for faster loading');
            
            // Load actual counts in background (non-blocking)
            this.loadActualStatusCounts();
        } catch (error) {
            console.error('❌ Error loading status counts:', error);
        }
    }
    
    async loadActualStatusCounts() {
        try {
            const params = new URLSearchParams();
            
            // Add current filters to get accurate counts
            if (this.filters.city) params.append('city', this.filters.city);
            if (this.filters.minPrice) params.append('minPrice', this.filters.minPrice);
            if (this.filters.maxPrice) params.append('maxPrice', this.filters.maxPrice);
            if (this.filters.propertyType) params.append('propertyType', this.filters.propertyType);
            if (this.filters.bedrooms && this.filters.bedrooms !== 'any') params.append('bedrooms', this.filters.bedrooms);
            if (this.filters.bathrooms && this.filters.bathrooms !== 'any') params.append('bathrooms', this.filters.bathrooms);
            
            const url = `/api/listings/counts/by-status?${params.toString()}`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
            
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json();
            
            if (data.success) {
                this.statusCounts = data.data;
                console.log('📊 Actual status counts loaded:', this.statusCounts);
            }
        } catch (error) {
            console.log('⚠️ Status counts loading failed, using defaults:', error.message);
        }
    }

    setupEventListeners() {
        // Status tabs (For Sale, For Rent, Sold)
        document.querySelectorAll('[data-status]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-status]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filters.status = e.target.dataset.status;
                
                // Reset pagination when changing status
                this.currentPage = 1;
                
                // Reload status counts and listings
                this.loadStatusCounts().then(() => {
                    this.loadListings();
                });
            });
        });

        // Price inputs
        document.getElementById('minPrice').addEventListener('input', (e) => {
            this.filters.minPrice = this.parsePrice(e.target.value);
            this.debounceFilter();
        });
        
        document.getElementById('maxPrice').addEventListener('input', (e) => {
            this.filters.maxPrice = this.parsePrice(e.target.value);
            this.debounceFilter();
        });

        // Bedroom buttons
        document.querySelectorAll('[data-bedrooms]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-bedrooms]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filters.bedrooms = e.target.dataset.bedrooms;
                this.applyFilters();
            });
        });

        // Bathroom buttons
        document.querySelectorAll('[data-bathrooms]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-bathrooms]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.filters.bathrooms = e.target.dataset.bathrooms;
                this.applyFilters();
            });
        });

        // Property type buttons
        document.querySelectorAll('[data-type]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.target.classList.toggle('active');
                const type = e.target.dataset.type;
                if (e.target.classList.contains('active')) {
                    if (!this.filters.propertyTypes.includes(type)) {
                        this.filters.propertyTypes.push(type);
                    }
                } else {
                    this.filters.propertyTypes = this.filters.propertyTypes.filter(t => t !== type);
                }
                this.applyFilters();
            });
        });

        // Range inputs
        ['minLivingArea', 'maxLivingArea', 'minLotSize', 'maxLotSize', 'minYearBuilt', 'maxYearBuilt'].forEach(id => {
            document.getElementById(id).addEventListener('input', (e) => {
                this.filters[id] = e.target.value ? parseInt(e.target.value) : null;
                this.debounceFilter();
            });
        });

        // Exact match checkboxes
        document.getElementById('exactBedrooms').addEventListener('change', (e) => {
            this.filters.exactBedrooms = e.target.checked;
            this.applyFilters();
        });
        
        document.getElementById('exactBathrooms').addEventListener('change', (e) => {
            this.filters.exactBathrooms = e.target.checked;
            this.applyFilters();
        });

        // Location search
        const locationInput = document.getElementById('locationSearch');
        const searchLocationBtn = document.getElementById('searchLocationBtn');
        const radiusSelect = document.getElementById('searchRadius');
        
        if (locationInput && searchLocationBtn) {
            searchLocationBtn.addEventListener('click', () => {
                this.performLocationSearch();
            });
            
            locationInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performLocationSearch();
                }
            });
        }
        
        // Radius change listener
        if (radiusSelect) {
            radiusSelect.addEventListener('change', (e) => {
                // If we have search coordinates, update the radius and re-apply filters
                if (this.filters.searchCoordinates) {
                    this.filters.searchRadius = parseInt(e.target.value);
                    console.log(`🔄 Radius changed to ${this.filters.searchRadius} miles`);
                    this.applyFilters();
                }
            });
        }

        // View toggle
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentView = e.target.dataset.view;
                this.toggleView();
            });
        });

        // Sort dropdown
        document.getElementById('sortBy').addEventListener('change', (e) => {
            this.sortListings(e.target.value);
        });

        // Reset filters
        document.getElementById('resetFilters').addEventListener('click', () => {
            this.resetFilters();
        });

        // Show results
        document.getElementById('showResults').addEventListener('click', () => {
            this.applyFilters();
        });

        // Load more button
        document.getElementById('loadMoreBtn').addEventListener('click', () => {
            this.loadMoreListings();
        });
    }

    debounceFilter() {
        clearTimeout(this.filterTimeout);
        this.filterTimeout = setTimeout(() => {
            this.applyFilters();
        }, 500);
    }

    parsePrice(value) {
        if (!value) return null;
        return parseInt(value.replace(/[^0-9]/g, ''));
    }

    async loadTotalCount() {
        try {
            const params = new URLSearchParams();
            params.append('limit', '10'); // Use higher limit to get accurate total count
            params.append('page', '1');
            
            if (this.filters.status === 'all') {
                params.append('exclude_sold', 'true');
            } else if (this.filters.status !== 'sold') {
                params.append('status', this.filters.status);
                params.append('exclude_sold', 'true');
            }
            
            // Add filters for accurate count
            if (this.filters.city) params.append('city', this.filters.city);
            if (this.filters.minPrice) params.append('minPrice', this.filters.minPrice);
            if (this.filters.maxPrice) params.append('maxPrice', this.filters.maxPrice);
            if (this.filters.propertyType) params.append('propertyType', this.filters.propertyType);
            if (this.filters.bedrooms && this.filters.bedrooms !== 'any') params.append('bedrooms', this.filters.bedrooms);
            if (this.filters.bathrooms && this.filters.bathrooms !== 'any') params.append('bathrooms', this.filters.bathrooms);
            
            const apiUrl = this.filters.status === 'sold' ? '/api/listings/sold/recent' : '/api/listings';
            const fullUrl = `${apiUrl}?${params.toString()}`;
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);
            
            const response = await fetch(fullUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (response.ok) {
                const data = await response.json();
                if (data?.success && data?.data) {
                    this.totalAvailable = data.data.pagination?.totalItems || data.data.totalCount || data.data.total || 0;
                    console.log(`📊 Total available listings: ${this.totalAvailable}`);
                }
            }
        } catch (error) {
            console.log('⚠️ Could not load total count, will get it with listings');
        }
    }

    async loadListings() {
        try {
            this.showLoading();
            
            // For first page, get total count first for better UX
            if (this.currentPage === 1) {
                await this.loadTotalCount();
            }
            
            // Determine API URL and parameters based on filter status
            let apiUrl = '/api/listings';
            const params = new URLSearchParams();
            
            if (this.filters.status === 'sold') {
                apiUrl = '/api/listings/sold/recent';
            } else {
                // Smart loading: load only first page initially for faster response
                if (this.currentPage === 1) {
                    params.append('limit', '10'); // Load only 10 listings initially
                } else {
                    params.append('limit', '20'); // Load more on subsequent pages
                }
                params.append('page', this.currentPage.toString());
                
                if (this.filters.status === 'all') {
                    params.append('exclude_sold', 'true');
                } else {
                    // Filter by specific status (sale or rent)
                    params.append('status', this.filters.status);
                    params.append('exclude_sold', 'true');
                }
            }
            
            // Add other filters
            if (this.filters.city) params.append('city', this.filters.city);
            if (this.filters.minPrice) params.append('minPrice', this.filters.minPrice);
            if (this.filters.maxPrice) params.append('maxPrice', this.filters.maxPrice);
            if (this.filters.propertyType) params.append('propertyType', this.filters.propertyType);
            // Only add bedroom/bathroom filters if they're not 'any'
            if (this.filters.bedrooms && this.filters.bedrooms !== 'any') params.append('bedrooms', this.filters.bedrooms);
            if (this.filters.bathrooms && this.filters.bathrooms !== 'any') params.append('bathrooms', this.filters.bathrooms);
            
            const fullUrl = params.toString() ? `${apiUrl}?${params.toString()}` : apiUrl;
            console.log('Loading listings from:', fullUrl);
            
            // Add timeout to prevent hanging requests
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            const response = await fetch(fullUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('API Response structure:', data);
            
            // Extract total count and listings from API response
            let totalCount = 0;
            let listingsArray = null;
            
            if (data?.success && data?.data) {
                if (Array.isArray(data.data.data)) {
                    listingsArray = data.data.data;
                    // Get total count from pagination or total field
                    totalCount = data.data.pagination?.totalItems || data.data.totalCount || data.data.total || data.total || 0;
                } else if (Array.isArray(data.data)) {
                    listingsArray = data.data;
                    totalCount = data.totalCount || data.total || 0;
                }
            } else if (Array.isArray(data)) {
                listingsArray = data;
                totalCount = data.length;
            }
            
            if (listingsArray && listingsArray.length >= 0) {
                // For pagination, append to existing listings or replace
                if (this.currentPage === 1) {
                    this.allListings = listingsArray;
                    this.totalAvailable = totalCount; // Set total available from API
                } else {
                    this.allListings = [...this.allListings, ...listingsArray];
                    // Keep the same total available count
                }
                
                console.log(`✅ Loaded ${listingsArray.length} listings for page ${this.currentPage}, total loaded: ${this.allListings.length}, total available: ${this.totalAvailable}`);
                
                this.totalListings = this.allListings.length;
                this.applyFilters();
                
                // Hide loading state
                document.getElementById('listingsGrid').style.display = 'grid';
                this.hideLoading();
                
                // Show "Load More" button if there are more listings available
                const hasMoreListings = this.allListings.length < this.totalAvailable;
                if (hasMoreListings) {
                    this.showLoadMoreButton();
                } else {
                    this.hideLoadMoreButton();
                }
                
            } else {
                console.error('❌ Invalid API response structure:', data);
                this.showError('Unable to load listings. Please check API connection.');
            }
        } catch (error) {
            console.error('❌ Network error loading listings:', error);
            this.showError('Failed to connect to listings API. Please check network connection.');
        }
    }

    mapPropertyType(type) {
        const typeMapping = {
            'Single Family Residential': 'houses',
            'Condominium': 'condos',
            'Townhouse': 'townhomes',
            'Multi-Family': 'multifamily'
        };
        return typeMapping[type] || 'other';
    }

    mapStatus(status) {
        const statusMapping = {
            'Active': 'sale',
            'Pending': 'sale',
            'Sold': 'sold'
        };
        return statusMapping[status] || 'sale';
    }

    loadSampleData() {
        this.allListings = [
            {
                id: 1,
                mlsNumber: '73026808',
                price: 499800,
                address: '200 Swanton St #228, Winchester, MA 01890',
                bedrooms: 2,
                bathrooms: 1,
                sqft: 622,
                lotSize: 0.15,
                yearBuilt: 1985,
                propertyType: 'houses',
                status: 'sale',
                images: this.generateMLSImages('73026808', 5),
                lat: 42.4526,
                lng: -71.1370,
                daysOnMarket: 15
            },
            {
                id: 2,
                mlsNumber: '73026809',
                price: 675000,
                address: '45 Oak Street, MA 01826',
                bedrooms: 3,
                bathrooms: 2,
                sqft: 1450,
                lotSize: 0.25,
                yearBuilt: 1995,
                propertyType: 'houses',
                status: 'sold',
                images: this.generateMLSImages('73026809', 8),
                lat: null,
                lng: null,
                daysOnMarket: 8
            },
            {
                id: 3,
                mlsNumber: '73026810',
                price: 2500,
                address: '123 Maple Avenue, Lowell, MA 01854',
                bedrooms: 2,
                bathrooms: 1,
                sqft: 980,
                lotSize: 0.18,
                yearBuilt: 1978,
                propertyType: 'condos',
                status: 'rent',
                images: this.generateMLSImages('73026810', 6),
                lat: 42.6334,
                lng: -71.3162,
                daysOnMarket: 22
            },
            {
                id: 4,
                mlsNumber: '73026811',
                price: 850000,
                address: '789 Pine Road, Tewksbury, MA 01876',
                bedrooms: 4,
                bathrooms: 3,
                sqft: 2200,
                lotSize: 0.45,
                yearBuilt: 2005,
                propertyType: 'houses',
                status: 'sale',
                images: this.generateMLSImages('73026811', 12),
                lat: 42.6106,
                lng: -71.2300,
                daysOnMarket: 5
            }
        ];
        
        // Generate more sample listings
        for (let i = 5; i <= 50; i++) {
            const mlsNumber = `7302${6812 + i}`;
            // Distribute statuses: 60% sale, 25% sold, 15% rent
            let status;
            const rand = Math.random();
            if (rand < 0.6) {
                status = 'sale';
            } else if (rand < 0.85) {
                status = 'sold';
            } else {
                status = 'rent';
            }
            
            this.allListings.push({
                id: i,
                mlsNumber: mlsNumber,
                price: Math.floor(Math.random() * 800000) + 300000,
                address: `${Math.floor(Math.random() * 999) + 1} Sample St, MA 01826`,
                bedrooms: Math.floor(Math.random() * 4) + 1,
                bathrooms: Math.floor(Math.random() * 3) + 1,
                sqft: Math.floor(Math.random() * 2000) + 800,
                lotSize: Math.random() * 0.5 + 0.1,
                yearBuilt: Math.floor(Math.random() * 40) + 1980,
                propertyType: ['houses', 'condos', 'townhomes'][Math.floor(Math.random() * 3)],
                status: status,
                images: this.generateMLSImages(mlsNumber, Math.floor(Math.random() * 15) + 3),
                // Random coordinates within Massachusetts-ish bounds for demo data
                lat: 41 + Math.random() * 2, // 41.0 to 43.0
                lng: -74 + Math.random() * 6, // -74.0 to -68.0
                daysOnMarket: Math.floor(Math.random() * 30) + 1
            });
        }
        
        this.totalListings = this.allListings.length;
        this.applyFilters();
    }

    // Generate MLS image URLs using the MLSPin format
    generateMLSImages(mlsNumber, count = 5) {
        const images = [];
        for (let i = 0; i < count; i++) {
            // Using MLSPin photo API format: http://media.mlspin.com/photo.aspx?mls=MLS#&n=photo#&w=image width&h=image height
            images.push(`https://media.mlspin.com/photo.aspx?mls=${mlsNumber}&n=${i}&w=600&h=450`);
        }
        // Add fallback images in case MLS images don't load
        images.push('https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=600&h=450&fit=crop');
        return images;
    }

    applyFilters() {
        let filtered = [...this.allListings];

        // Status filtering is now handled at API level, no need for client-side filtering

        // Price filter
        if (this.filters.minPrice) {
            filtered = filtered.filter(listing => listing.price >= this.filters.minPrice);
        }
        if (this.filters.maxPrice) {
            filtered = filtered.filter(listing => listing.price <= this.filters.maxPrice);
        }

        // Bedroom filter
        if (this.filters.bedrooms !== 'any') {
            const bedrooms = parseInt(this.filters.bedrooms);
            if (this.filters.exactBedrooms) {
                filtered = filtered.filter(listing => listing.bedrooms === bedrooms);
            } else {
                filtered = filtered.filter(listing => listing.bedrooms >= bedrooms);
            }
        }

        // Bathroom filter
        if (this.filters.bathrooms !== 'any') {
            const bathrooms = parseInt(this.filters.bathrooms);
            if (this.filters.exactBathrooms) {
                filtered = filtered.filter(listing => listing.bathrooms === bathrooms);
            } else {
                filtered = filtered.filter(listing => listing.bathrooms >= bathrooms);
            }
        }

        // Property type filter
        if (this.filters.propertyTypes.length > 0) {
            filtered = filtered.filter(listing => 
                this.filters.propertyTypes.includes(listing.propertyType)
            );
        }

        // Living area filter
        if (this.filters.minLivingArea) {
            filtered = filtered.filter(listing => listing.sqft >= this.filters.minLivingArea);
        }
        if (this.filters.maxLivingArea) {
            filtered = filtered.filter(listing => listing.sqft <= this.filters.maxLivingArea);
        }

        // Lot size filter
        if (this.filters.minLotSize) {
            filtered = filtered.filter(listing => listing.lotSize >= this.filters.minLotSize);
        }
        if (this.filters.maxLotSize) {
            filtered = filtered.filter(listing => listing.lotSize <= this.filters.maxLotSize);
        }

        // Year built filter
        if (this.filters.minYearBuilt) {
            filtered = filtered.filter(listing => listing.yearBuilt >= this.filters.minYearBuilt);
        }
        if (this.filters.maxYearBuilt) {
            filtered = filtered.filter(listing => listing.yearBuilt <= this.filters.maxYearBuilt);
        }

        // Location-based filter
        if (this.filters.searchCoordinates && this.filters.searchRadius) {
            const { lat: searchLat, lng: searchLng } = this.filters.searchCoordinates;
            const radius = this.filters.searchRadius;
            
            filtered = filtered.filter(listing => {
                if (!listing.lat || !listing.lng) return false;
                
                const distance = this.calculateDistance(
                    searchLat, searchLng,
                    listing.lat, listing.lng
                );
                
                return distance <= radius;
            });
            
            console.log(`🗺️ Location filter: ${filtered.length} listings within ${radius} miles of search location`);
        }

        this.currentListings = filtered;
        
        // When filters change, we need to reload from API to get accurate total
        // Reset to page 1 and reload
        if (this.currentPage !== 1) {
            this.currentPage = 1;
            this.loadListings(); // Reload with new filters
            return;
        }
        
        this.updateResultsCount();
        this.renderListings();
        this.updateMapMarkers();
    }

    sortListings(sortBy) {
        // Brandon's agent ID - prioritize his listings
        const BRANDON_AGENT_ID = 'CN222505';
        
        switch (sortBy) {
            case 'price-low-high':
                this.currentListings.sort((a, b) => a.price - b.price);
                break;
            case 'price-high-low':
                this.currentListings.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                this.currentListings.sort((a, b) => a.daysOnMarket - b.daysOnMarket);
                break;
            case 'bedrooms':
                this.currentListings.sort((a, b) => b.bedrooms - a.bedrooms);
                break;
            case 'bathrooms':
                this.currentListings.sort((a, b) => b.bathrooms - a.bathrooms);
                break;
            case 'sqft':
                this.currentListings.sort((a, b) => b.sqft - a.sqft);
                break;
            default:
                // Recently updated - sort by days on market
                this.currentListings.sort((a, b) => a.daysOnMarket - b.daysOnMarket);
        }
        
        // Always prioritize Brandon's listings at the top
        this.currentListings.sort((a, b) => {
            const aIsBrandon = a.LIST_AGENT_ID === BRANDON_AGENT_ID;
            const bIsBrandon = b.LIST_AGENT_ID === BRANDON_AGENT_ID;
            
            if (aIsBrandon && !bIsBrandon) return -1;
            if (!aIsBrandon && bIsBrandon) return 1;
            return 0; // Keep existing order for non-Brandon listings
        });
        
        this.renderListings();
    }

    renderListings() {
        const grid = document.getElementById('listingsGrid');
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        // Calculate pagination
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const paginatedListings = this.currentListings.slice(startIndex, endIndex);
        
        // Show only current page listings
        if (this.currentPage === 1) {
            // Clear grid and add new listings
            grid.innerHTML = '';
            const listingsHTML = paginatedListings.map(listing => this.createListingCard(listing)).join('');
            grid.innerHTML = listingsHTML;
        } else {
            // Append to existing listings for "load more" functionality
            const listingsHTML = paginatedListings.map(listing => this.createListingCard(listing)).join('');
            grid.insertAdjacentHTML('beforeend', listingsHTML);
        }
        
        // Show/hide load more button
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        const hasMoreListings = endIndex < this.currentListings.length;
        if (loadMoreBtn) {
            loadMoreBtn.style.display = hasMoreListings ? 'block' : 'none';
        }
        
        // Add loading animation for images
        this.optimizeImageLoading();
    }
    
    optimizeImageLoading() {
        // Implement lazy loading for images
        const images = document.querySelectorAll('.listing-image');
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        observer.unobserve(img);
                    }
                }
            });
        });
        
        images.forEach(img => {
            if (img.dataset.src) {
                imageObserver.observe(img);
            }
        });
    }

    createListingCard(listing) {
        const BRANDON_AGENT_ID = 'CN222505';
        const isBrandonListing = listing.LIST_AGENT_ID === BRANDON_AGENT_ID;
        const agentBadge = isBrandonListing ? '<div class="brandon-badge">Featured by Brandon</div>' : '';
        const addressText = this.getAddressString(listing);
        
        // Safe image handling with proper fallbacks and lazy loading
        const defaultImage = 'https://via.placeholder.com/400x300/cccccc/666666?text=Property+Image';
        let primaryImage = defaultImage;
        let fallbackImage = defaultImage;
        let useLazyLoading = false;
        
        if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
            // Use first valid image, filter out undefined/null values
            const validImages = listing.images.filter(img => img && img !== undefined && img !== 'undefined');
            if (validImages.length > 0) {
                primaryImage = validImages[0];
                fallbackImage = validImages.length > 1 ? validImages[validImages.length - 1] : defaultImage;
                useLazyLoading = true;
            }
        } else if (listing.featuredImage && listing.featuredImage !== undefined && listing.featuredImage !== 'undefined') {
            primaryImage = listing.featuredImage;
            fallbackImage = defaultImage;
            useLazyLoading = true;
        }
        
        // Implement lazy loading for non-default images
        const imageAttributes = useLazyLoading 
            ? `data-src="${primaryImage}" src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3C/svg%3E"` 
            : `src="${primaryImage}"`;
        
        return `
            <div class="listing-card ${isBrandonListing ? 'brandon-listing' : ''}" onclick="window.location.href='property.html?id=${listing.id}'">
                <div class="listing-image-container">
                    <img ${imageAttributes} alt="Property" class="listing-image" style="background-color: #f0f0f0; min-height: 200px;" onerror="this.src='${fallbackImage}'">
                    ${agentBadge}
                </div>
                <div class="listing-content">
                    <div class="listing-price">$${this.formatPrice(listing.price)}</div>
                    <div class="listing-address">${addressText}</div>
                    <div class="listing-details">
                        <div class="listing-detail">
                            <i class="fas fa-bed"></i>
                            <span>${listing.bedrooms} bd</span>
                        </div>
                        <div class="listing-detail">
                            <i class="fas fa-bath"></i>
                            <span>${listing.bathrooms} ba</span>
                        </div>
                        <div class="listing-detail">
                            <i class="fas fa-expand-arrows-alt"></i>
                            <span>${this.formatNumber(listing.sqft)} sqft</span>
                        </div>
                    </div>
                    ${listing.LIST_AGENT_NAME || listing.LIST_AGENT_ID ? `<div class="agent-name">Agent: ${listing.LIST_AGENT_NAME || listing.LIST_AGENT_ID}</div>` : ''}
                </div>
            </div>
        `;
    }

    loadMoreListings() {
        this.currentPage++;
        this.loadListings(); // This will append new results
    }
    
    showLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'block';
        }
    }
    
    hideLoadMoreButton() {
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.style.display = 'none';
        }
    }

    updateResultsCount() {
        // Use filtered results for current display
        const currentlyShowing = this.currentListings.length;
        
        // Use total available from API response
        const totalForFilter = this.totalAvailable;
        
        // Update result count displays
        const currentResultsElement = document.getElementById('currentResultsCount');
        const totalResultsElement = document.getElementById('totalResultsCount');
        const resultsCountElement = document.getElementById('resultsCount');
        
        if (currentResultsElement) currentResultsElement.textContent = currentlyShowing;
        if (totalResultsElement) totalResultsElement.textContent = totalForFilter;
        if (resultsCountElement) resultsCountElement.textContent = totalForFilter;
        
        console.log(`📊 Results: ${currentlyShowing} of ${totalForFilter} (status: ${this.filters.status})`);
    }

    toggleView() {
        const mapContainer = document.getElementById('mapContainer');
        const listingsGrid = document.getElementById('listingsGrid');
        const loadMoreContainer = document.querySelector('.load-more-container');

        if (this.currentView === 'map') {
            mapContainer.style.display = 'block';
            // Show listings grid and load more button in map view as well
            listingsGrid.style.display = 'grid';
            loadMoreContainer.style.display = 'block';
            if (this.map) {
                setTimeout(() => { 
                    this.map.invalidateSize(); 
                    // Ensure markers are refreshed when switching to map view
                    this.updateMapMarkers();
                }, 100);
            }
        } else {
            mapContainer.style.display = 'none';
            listingsGrid.style.display = 'grid';
            loadMoreContainer.style.display = 'block';
        }
    }

    initializeMap() {
        // Check if Leaflet is loaded
        if (typeof L === 'undefined') {
            // Wait for Leaflet to load
            setTimeout(() => this.initializeMap(), 100);
            return;
        }
        
        this.map = L.map('map').setView([42.0, -71.0], 8);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
    }

    updateMapMarkers() {
        if (!this.map || typeof L === 'undefined') return;

        // Clear existing markers
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.markers = [];

        // Add new markers with better coordinate validation
        let validMarkers = 0;
        let invalidCount = 0;
        this.currentListings.forEach((listing, index) => {
            // Better coordinate validation and fallback
            let lat = null, lng = null;
            
            // Try multiple coordinate field names
            if (listing.lat != null && listing.lng != null) {
                lat = parseFloat(listing.lat);
                lng = parseFloat(listing.lng);
            } else if (listing.latitude != null && listing.longitude != null) {
                lat = parseFloat(listing.latitude);
                lng = parseFloat(listing.longitude);
            } else if (listing.LAT != null && listing.LNG != null) {
                lat = parseFloat(listing.LAT);
                lng = parseFloat(listing.LNG);
            } else if (listing.coordinates && typeof listing.coordinates === 'object') {
                const c = listing.coordinates;
                if (Array.isArray(c) && c.length >= 2) {
                    lat = parseFloat(c[0]);
                    lng = parseFloat(c[1]);
                } else if (c.lat != null && c.lng != null) {
                    lat = parseFloat(c.lat);
                    lng = parseFloat(c.lng);
                } else if (c.latitude != null && c.longitude != null) {
                    lat = parseFloat(c.latitude);
                    lng = parseFloat(c.longitude);
                }
            }
            
            // Validate parsed values
            const isNum = (v) => typeof v === 'number' && !Number.isNaN(v) && Number.isFinite(v);

            // Treat known placeholder (Dracut default) as invalid
            const isPlaceholder = isNum(lat) && isNum(lng) && Math.abs(lat - 42.6667) < 0.0002 && Math.abs(lng + 71.3020) < 0.0002;

            if (!isNum(lat) || !isNum(lng) || isPlaceholder) {
                invalidCount++;
                return; // Skip listings without valid coordinates
            }
            
            // Validate coordinates are in reasonable range (continental US bounds are broader, MA narrower)
            if (lat >= 41.0 && lat <= 43.0 && lng >= -74.0 && lng <= -68.0) {
                // Create custom icon for better visibility and clickability
                const customIcon = L.divIcon({
                    className: 'custom-marker',
                    html: `<div style="background: #FFD700; border: 2px solid #fff; border-radius: 50%; width: 24px; height: 24px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: #2c3e50; font-weight: bold; font-size: 12px; pointer-events: none; position: relative; cursor: pointer;">$</div>`,
                    iconSize: [24, 24],
                    iconAnchor: [12, 12]
                });
                
                const marker = L.marker([lat, lng], { icon: customIcon })
                    .bindPopup(`
                        <div style="text-align: center; min-width: 200px;">
                            <img src="${listing.images && listing.images[0] ? listing.images[0] : 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400'}" style="width: 150px; height: 100px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" onerror="this.src='https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=400'">
                            <div style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">$${this.formatPrice(listing.price)}</div>
                            <div style="font-size: 12px; color: #666; margin-bottom: 8px;">${this.getAddressString(listing)}</div>
                            <div style="font-size: 12px;">${listing.bedrooms || 'N/A'} bd • ${listing.bathrooms || 'N/A'} ba • ${this.formatNumber(listing.sqft || 0)} sqft</div>
                            <button onclick="window.location.href='property.html?id=${listing.id}'" style="margin-top: 8px; padding: 4px 12px; background: #FFD700; border: none; border-radius: 4px; cursor: pointer;">View Details</button>
                        </div>
                    `);
                
                marker.addTo(this.map);
                this.markers.push(marker);
                validMarkers++;
            } else {
                console.log('Invalid coordinates for listing:', listing.id, 'lat:', lat, 'lng:', lng);
            }
        });

        console.log(`📍 Added ${validMarkers} markers to map from ${this.currentListings.length} listings (skipped ${invalidCount} without valid coords)`);

        // Fit map to markers if there are any, otherwise center on Massachusetts
        if (this.markers.length > 0) {
            setTimeout(() => {
                const group = new L.featureGroup(this.markers);
                const bounds = group.getBounds();
                
                // Check if all markers are at the same location (bounds are too small)
                const latDiff = bounds.getNorth() - bounds.getSouth();
                const lngDiff = bounds.getEast() - bounds.getWest();
                
                if (latDiff < 0.01 && lngDiff < 0.01) {
                    // All markers are very close together, set a moderate zoom
                    const center = bounds.getCenter();
                    this.map.setView([center.lat, center.lng], 13);
                    console.log(`📍 Centered map on close markers at zoom 13: ${center.lat}, ${center.lng}`);
                } else {
                    // Normal case with spread out markers
                    this.map.fitBounds(bounds.pad(0.05));
                    console.log(`📍 Fitted map bounds to ${this.markers.length} markers`);
                }
            }, 100);
        } else {
            // Center on Massachusetts if no markers
            this.map.setView([42.0, -71.0], 8);
            console.log('📍 No markers with valid coordinates found, centered on Massachusetts');
        }
    }

    async performLocationSearch() {
        const locationInput = document.getElementById('locationSearch');
        const radiusSelect = document.getElementById('searchRadius');
        
        if (!locationInput || !locationInput.value.trim()) {
            this.showError('Please enter a location to search');
            return;
        }
        
        const location = locationInput.value.trim();
        const radius = radiusSelect ? parseInt(radiusSelect.value) : 5;
        
        try {
            this.showLoading();
            
            // Use Nominatim geocoding service (free alternative to Google)
            const geocodeUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}&countrycodes=us&limit=1`;
            
            const response = await fetch(geocodeUrl);
            const data = await response.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                const lat = parseFloat(result.lat);
                const lng = parseFloat(result.lon);
                
                this.filters.searchLocation = location;
                this.filters.searchRadius = radius;
                this.filters.searchCoordinates = { lat, lng };
                
                console.log(`🗺️ Location search: ${location} -> ${lat}, ${lng} (${radius} miles)`);
                
                // Apply location-based filtering
                this.applyFilters();
                
                // Center map on searched location
                if (this.map) {
                    this.map.setView([lat, lng], 12);
                    
                    // Add a search marker
                    if (this.searchMarker) {
                        this.map.removeLayer(this.searchMarker);
                    }
                    
                    this.searchMarker = L.marker([lat, lng], {
                        icon: L.icon({
                            iconUrl: 'data:image/svg+xml;base64,' + btoa(`
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="red" width="24" height="24">
                                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                </svg>
                            `),
                            iconSize: [24, 24],
                            iconAnchor: [12, 24]
                        })
                    }).addTo(this.map);
                }
                
            } else {
                this.showError('Location not found. Please try a different search term.');
            }
        } catch (error) {
            console.error('❌ Geocoding error:', error);
            this.showError('Error searching for location. Please try again.');
        } finally {
            this.hideLoading();
        }
    }
    
    calculateDistance(lat1, lng1, lat2, lng2) {
        // Haversine formula to calculate distance between two points
        const R = 3959; // Earth's radius in miles
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLng = (lng2 - lng1) * Math.PI / 180;
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        return R * c;
    }

    resetFilters() {
        // Reset filter object
        this.filters = {
            status: 'sale',
            minPrice: null,
            maxPrice: null,
            bedrooms: 'any',
            bathrooms: 'any',
            propertyTypes: [],
            minLivingArea: null,
            maxLivingArea: null,
            minLotSize: null,
            maxLotSize: null,
            minYearBuilt: null,
            maxYearBuilt: null,
            exactBedrooms: false,
            exactBathrooms: false,
            searchLocation: null,
            searchRadius: 5,
            searchCoordinates: null
        };

        // Reset UI elements
        document.querySelectorAll('.property-type-btn, .bed-bath-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Set default active states
        document.querySelector('[data-status="sale"]').classList.add('active');
        document.querySelector('[data-bedrooms="any"]').classList.add('active');
        document.querySelector('[data-bathrooms="any"]').classList.add('active');
        
        // Clear input fields
        document.querySelectorAll('input[type="text"], input[type="checkbox"]').forEach(input => {
            if (input.type === 'checkbox') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
        
        // Reset radius select to default
        const radiusSelect = document.getElementById('searchRadius');
        if (radiusSelect) {
            radiusSelect.value = '5';
        }
        
        // Remove search marker from map
        if (this.searchMarker && this.map) {
            this.map.removeLayer(this.searchMarker);
            this.searchMarker = null;
        }

        this.applyFilters();
    }

    formatPrice(price) {
        return new Intl.NumberFormat('en-US').format(price);
    }

    formatNumber(num) {
        return new Intl.NumberFormat('en-US').format(num);
    }

    // New: Safely get address as a string from various shapes
    getAddressString(listing) {
        // Handle both string addresses (from backend transformation) and object addresses
        const addr = listing && listing.address;
        if (!addr) return 'Address not available';
        
        // If address is already a formatted string, return it directly
        if (typeof addr === 'string') {
            return addr !== 'Address not available' ? addr : 'Address not available';
        }
        
        // Handle object format (fallback for different data structures)
        if (typeof addr === 'object') {
            const parts = [];
            const streetNumber = addr.streetNumber || addr.StreetNumber || addr.street_no || addr.number;
            const streetName = addr.streetName || addr.StreetName || addr.street || addr.road;
            const unit = addr.unit || addr.UnitNumber || addr.unitNumber || addr.apartment;
            const city = addr.city || addr.City;
            const state = addr.state || addr.StateOrProvince || addr.stateOrProvince;
            const zip = addr.zip || addr.ZipCode || addr.postalCode || addr.PostalCode;
            
            if (streetNumber && streetName) parts.push(`${streetNumber} ${streetName}`);
            else if (streetName) parts.push(streetName);
            if (unit) parts.push(`#${unit}`);
            if (city) parts.push(city);
            if (state) parts.push(state);
            if (zip) parts.push(zip);
            
            return parts.filter(Boolean).join(', ') || 'Address not available';
        }
        
        return 'Address not available';
    }

    showLoading() {
        const grid = document.getElementById('listingsGrid');
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: #FFD700;"></i>
                <p style="margin-top: 1rem; color: #6c757d;">Loading listings...</p>
            </div>
        `;
    }

    hideLoading() {
        // Clear loading state - listings will be rendered by renderListings()
        const grid = document.getElementById('listingsGrid');
        if (grid.innerHTML.includes('fa-spinner')) {
            grid.innerHTML = '';
        }
    }

    showError(message) {
        const grid = document.getElementById('listingsGrid');
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 2rem;">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #dc3545;"></i>
                <p style="margin-top: 1rem; color: #6c757d;">${message}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #FFD700; border: none; border-radius: 4px; cursor: pointer;">Try Again</button>
            </div>
        `;
    }
}

// Initialize mobile menu functionality
function initializeMobileMenu() {
    const mobileMenuToggle = document.querySelector('.mobile-menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const navLinks = document.querySelectorAll('.nav-link');
    
    if (mobileMenuToggle && navMenu) {
        // Toggle mobile menu
        mobileMenuToggle.addEventListener('click', function() {
            navMenu.classList.toggle('mobile-open');
            
            // Toggle hamburger icon
            const icon = mobileMenuToggle.querySelector('i');
            if (navMenu.classList.contains('mobile-open')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-times');
            } else {
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close mobile menu when clicking on nav links
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                navMenu.classList.remove('mobile-open');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            });
        });
        
        // Close mobile menu when clicking outside
        document.addEventListener('click', function(event) {
            if (!mobileMenuToggle.contains(event.target) && !navMenu.contains(event.target)) {
                navMenu.classList.remove('mobile-open');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
        
        // Close mobile menu on window resize if screen becomes larger
        window.addEventListener('resize', function() {
            if (window.innerWidth > 768) {
                navMenu.classList.remove('mobile-open');
                const icon = mobileMenuToggle.querySelector('i');
                icon.classList.remove('fa-times');
                icon.classList.add('fa-bars');
            }
        });
    }
}

// Initialize the listings page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.listingsPage = new ListingsPage();
    initializeMobileMenu();
});
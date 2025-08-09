// Listing Detail Page JavaScript

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

// DOM Elements
const listingDetail = document.getElementById('listingDetail');
const propertyInquiryForm = document.getElementById('propertyInquiryForm');
const propertyMlsIdInput = document.getElementById('propertyMlsId');

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

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const mlsId = urlParams.get('mlsId') || urlParams.get('id');
    
    if (mlsId) {
        loadListingDetail(mlsId);
        propertyMlsIdInput.value = mlsId;
    } else {
        showError('No property ID provided');
    }
    
    // Initialize form handler
    if (propertyInquiryForm) {
        propertyInquiryForm.addEventListener('submit', handlePropertyInquiry);
    }
    
    // Initialize mobile menu
    initializeMobileMenu();
});

// Load listing details
async function loadListingDetail(mlsId) {
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/listings/${mlsId}`);
        const data = await response.json();
        
        if (data.success && data.data) {
            displayListingDetail(data.data);
        } else {
            showError('Property not found');
        }
    } catch (error) {
        console.error('Error loading listing detail:', error);
        showError('Unable to load property details');
    }
}

// Display listing details
function displayListingDetail(listing) {
    // Access data from the nested structure
    const data = listing.data || listing;
    
    const price = formatPrice(data.LIST_PRICE || data.ListPrice || data.listPrice || 0);
    const address = `${data.STREET_NO || ''} ${data.STREET_NAME || data.StreetName || ''}, ${data.City === '1' ? 'Boston' : data.City || ''}, ${data.STATE || data.StateOrProvince || 'MA'} ${data.ZIP_CODE || data.PostalCode || ''}`;
    const bedrooms = data.NO_BEDROOMS || data.BedroomsTotal || 'N/A';
    const bathrooms = data.NO_FULL_BATHS || data.BathroomsTotalInteger || 'N/A';
    const halfBathrooms = data.NO_HALF_BATHS || data.BathroomsHalf || 0;
    const sqft = data.SQUARE_FEET || data.LivingArea || data.AboveGradeFinishedArea || 'N/A';
    const lotSize = data.LOT_SIZE || data.LotSizeSquareFeet || 'N/A';
    const yearBuilt = data.YEAR_BUILT || data.YearBuilt || 'N/A';
    const stories = data.STORIES || data.Stories || null;
    const propertyType = data.PROPERTY_TYPE || data.PropertyType || 'Residential';
    const mlsId = listing.listing_key || data.LIST_NO || data.ListingID || data.ListingKey || 'unknown';
    const description = data.REMARKS || data.PublicRemarks || data.detailedRemarks || 'Beautiful property with great potential.';
    const listingDate = data.LIST_DATE || data.ListingContractDate || new Date().toISOString();
    
    // Extract property features
    const features = data.features || {};
    const garage = features.garage || data.garage || data.GARAGE_SPACES || data.GarageSpaces || null;
    const pool = features.pool || data.pool || data.POOL || data.PoolPrivateYN || false;
    const waterfront = features.waterfront || data.waterfront || data.WATERFRONT || data.WaterfrontYN || false;
    const fireplace = features.fireplace || data.fireplace || data.fireplaces || data.FIREPLACE || data.FireplacesTotal || null;
    
    // Additional property features
    const basement = data.BASEMENT || data.Basement || data.BasementYN || false;
    const centralAir = data.CENTRAL_AIR || data.CentralAir || data.CoolingYN || data.Cooling || false;
    const deck = data.DECK || data.Deck || data.PATIO || data.Patio || false;
    const hardwoodFloors = data.HARDWOOD_FLOORS || data.HardwoodFloors || data.FlooringTypes || false;
    const laundry = data.LAUNDRY || data.Laundry || data.LaundryFeatures || false;
    const fencing = data.FENCING || data.Fencing || data.FencedYardYN || false;
    const newConstruction = data.NEW_CONSTRUCTION || data.NewConstruction || data.NewConstructionYN || false;
    const energyEfficient = data.ENERGY_EFFICIENT || data.EnergyEfficient || data.GreenEnergyEfficient || false;
    
    // Format listing date
    const formattedDate = new Date(listingDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Calculate price per square foot
    const pricePerSqft = (data.LIST_PRICE && sqft && sqft !== 'N/A') 
        ? Math.round(data.LIST_PRICE / sqft) 
        : 'N/A';
    
    const detailHTML = `
        <div class="listing-detail-content">
            <div class="listing-header">
                <div class="listing-title">
                    <h1>${address}</h1>
                    <div class="listing-price">${price}</div>
                    <div class="listing-meta">
                        <span class="mls-id">MLS# ${mlsId}</span>
                        <span class="listing-date">Listed: ${formattedDate}</span>
                    </div>
                </div>
            </div>
            
            <div class="listing-gallery">
                <div class="main-image">
                    <img src="${generatePhotoURL(mlsId, 0, 800, 600)}" 
                         alt="${address}" 
                         onerror="this.src='https://via.placeholder.com/800x600/000000/FFD700?text=Property+Image'">
                </div>
                <div class="image-thumbnails" id="photo-thumbnails">
                    <!-- Thumbnails will be dynamically loaded -->
                </div>
            </div>
            
            <div class="listing-info">
                <div class="property-highlights">
                    <h2>Property Highlights</h2>
                    <div class="highlights-grid">
                        <div class="highlight-item">
                            <i class="fas fa-bed"></i>
                            <div>
                                <span class="highlight-value">${bedrooms}</span>
                                <span class="highlight-label">Bedrooms</span>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <i class="fas fa-bath"></i>
                            <div>
                                <span class="highlight-value">${bathrooms}${halfBathrooms > 0 ? `.${halfBathrooms}` : ''}</span>
                                <span class="highlight-label">Bathrooms</span>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <i class="fas fa-ruler-combined"></i>
                            <div>
                                <span class="highlight-value">${formatNumber(sqft)}</span>
                                <span class="highlight-label">Sq Ft</span>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <i class="fas fa-map-marked-alt"></i>
                            <div>
                                <span class="highlight-value">${formatNumber(lotSize)}</span>
                                <span class="highlight-label">Lot Size</span>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <i class="fas fa-calendar-alt"></i>
                            <div>
                                <span class="highlight-value">${yearBuilt}</span>
                                <span class="highlight-label">Year Built</span>
                            </div>
                        </div>
                        <div class="highlight-item">
                            <i class="fas fa-dollar-sign"></i>
                            <div>
                                <span class="highlight-value">${pricePerSqft !== 'N/A' ? '$' + pricePerSqft : 'N/A'}</span>
                                <span class="highlight-label">Price/Sq Ft</span>
                            </div>
                        </div>
                        ${stories ? `<div class="highlight-item">
                            <i class="fas fa-building"></i>
                            <div>
                                <span class="highlight-value">${stories}</span>
                                <span class="highlight-label">${stories === 1 ? 'Story' : 'Stories'}</span>
                            </div>
                        </div>` : ''}
                        ${garage ? `<div class="highlight-item">
                            <i class="fas fa-car"></i>
                            <div>
                                <span class="highlight-value">${garage}</span>
                                <span class="highlight-label">Car Garage</span>
                            </div>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="property-features">
                    <h2>Property Features</h2>
                    <div class="features-grid">
                        ${pool ? `<div class="feature-item">
                            <i class="fas fa-swimming-pool"></i>
                            <span>Swimming Pool</span>
                        </div>` : ''}
                        ${waterfront ? `<div class="feature-item">
                            <i class="fas fa-water"></i>
                            <span>Waterfront Property</span>
                        </div>` : ''}
                        ${fireplace ? `<div class="feature-item">
                            <i class="fas fa-fire"></i>
                            <span>${fireplace > 1 ? `${fireplace} Fireplaces` : 'Fireplace'}</span>
                        </div>` : ''}
                        ${basement ? `<div class="feature-item">
                            <i class="fas fa-home"></i>
                            <span>Basement</span>
                        </div>` : ''}
                        ${centralAir ? `<div class="feature-item">
                            <i class="fas fa-snowflake"></i>
                            <span>Central Air</span>
                        </div>` : ''}
                        ${deck ? `<div class="feature-item">
                            <i class="fas fa-tree"></i>
                            <span>Deck/Patio</span>
                        </div>` : ''}
                        ${hardwoodFloors ? `<div class="feature-item">
                            <i class="fas fa-th-large"></i>
                            <span>Hardwood Floors</span>
                        </div>` : ''}
                        ${laundry ? `<div class="feature-item">
                            <i class="fas fa-tshirt"></i>
                            <span>Laundry</span>
                        </div>` : ''}
                        ${fencing ? `<div class="feature-item">
                            <i class="fas fa-shield-alt"></i>
                            <span>Fenced Yard</span>
                        </div>` : ''}
                        ${newConstruction ? `<div class="feature-item">
                            <i class="fas fa-hammer"></i>
                            <span>New Construction</span>
                        </div>` : ''}
                        ${energyEfficient ? `<div class="feature-item">
                            <i class="fas fa-leaf"></i>
                            <span>Energy Efficient</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="property-description">
                    <h2>Property Description</h2>
                    <p>${description}</p>
                </div>
                
                <div class="property-details">
                    <h2>Property Details</h2>
                    <div class="details-grid">
                        <div class="detail-row">
                            <span class="detail-label">Property Type:</span>
                            <span class="detail-value">${propertyType}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">MLS Number:</span>
                            <span class="detail-value">${mlsId}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Listing Date:</span>
                            <span class="detail-value">${formattedDate}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Status:</span>
                            <span class="detail-value">${data.STATUS || data.ListingStatus || 'Active'}</span>
                        </div>
                        ${lotSize && lotSize !== 'N/A' ? `<div class="detail-row">
                            <span class="detail-label">Lot Size:</span>
                            <span class="detail-value">${formatNumber(lotSize)} sq ft</span>
                        </div>` : ''}
                        ${data.DAYS_ON_MARKET || data.DaysOnMarket ? `<div class="detail-row">
                            <span class="detail-label">Days on Market:</span>
                            <span class="detail-value">${data.DAYS_ON_MARKET || data.DaysOnMarket}</span>
                        </div>` : ''}
                        ${data.SUBDIVISION || data.Subdivision ? `<div class="detail-row">
                            <span class="detail-label">Subdivision:</span>
                            <span class="detail-value">${data.SUBDIVISION || data.Subdivision}</span>
                        </div>` : ''}
                        ${data.SCHOOL_DISTRICT || data.SchoolDistrict ? `<div class="detail-row">
                            <span class="detail-label">School District:</span>
                            <span class="detail-value">${data.SCHOOL_DISTRICT || data.SchoolDistrict}</span>
                        </div>` : ''}
                        ${data.TAX_AMOUNT || data.TaxAnnualAmount ? `<div class="detail-row">
                            <span class="detail-label">Annual Taxes:</span>
                            <span class="detail-value">$${formatNumber(data.TAX_AMOUNT || data.TaxAnnualAmount)}</span>
                        </div>` : ''}
                        ${data.HOA_FEE || data.AssociationFee ? `<div class="detail-row">
                            <span class="detail-label">HOA Fee:</span>
                            <span class="detail-value">$${formatNumber(data.HOA_FEE || data.AssociationFee)}/month</span>
                        </div>` : ''}
                    </div>
                </div>
                
                <div class="contact-agent">
                    <h2>Contact Your Dracut Realtor</h2>
                    <div class="agent-info">
                        <div class="agent-photo">
                            <img src="headshot_brandon.png" alt="Brandon Sweeney">
                        </div>
                        <div class="agent-details">
                            <h3>Brandon Sweeney</h3>
                            <p>Your Dracut Realtor</p>
                            <div class="agent-contact">
                                <a href="tel:978-987-2806" class="btn btn-primary">
                                    <i class="fas fa-phone"></i> (978) 987-2806
                                </a>
                                <a href="mailto:info@solidwithsweeney.com" class="btn btn-secondary">
                                    <i class="fas fa-envelope"></i> Email
                                </a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    listingDetail.innerHTML = detailHTML;
    
    // Initialize image gallery with real photos
    initializeImageGallery(mlsId);
    
    // Update page title
    document.title = `${address} - SWS & Co.`;
}

// Generate MLSPin photo URL
function generatePhotoURL(mlsId, photoNumber, width, height) {
    return `https://media.mlspin.com/photo.aspx?mls=${mlsId}&n=${photoNumber}&w=${width}&h=${height}`;
}

// Check if photo exists by attempting to load it
function checkPhotoExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

// Initialize image gallery with real photos
async function initializeImageGallery(mlsId) {
    const mainImage = document.querySelector('.main-image img');
    const thumbnailsContainer = document.getElementById('photo-thumbnails');
    
    if (!mlsId || mlsId === 'unknown') {
        // Fallback to placeholder if no MLS ID
        thumbnailsContainer.innerHTML = '<p class="no-photos">Photos not available</p>';
        return;
    }
    
    const availablePhotos = [];
    
    // Check for up to 10 photos (can be increased to 42 if needed)
    for (let i = 0; i < 10; i++) {
        const thumbnailURL = generatePhotoURL(mlsId, i, 200, 150);
        const photoExists = await checkPhotoExists(thumbnailURL);
        
        if (photoExists) {
            availablePhotos.push({
                photoNumber: i,
                thumbnailURL: thumbnailURL,
                fullURL: generatePhotoURL(mlsId, i, 800, 600)
            });
        }
    }
    
    if (availablePhotos.length === 0) {
        thumbnailsContainer.innerHTML = '<p class="no-photos">Photos not available for this property</p>';
        return;
    }
    
    // Generate thumbnail HTML
    const thumbnailsHTML = availablePhotos.map((photo, index) => {
        return `<img src="${photo.thumbnailURL}" 
                     alt="Photo ${photo.photoNumber + 1}" 
                     class="thumbnail ${index === 0 ? 'active' : ''}" 
                     data-full-url="${photo.fullURL}">`;
    }).join('');
    
    thumbnailsContainer.innerHTML = thumbnailsHTML;
    
    // Add click event listeners to thumbnails
    const thumbnails = thumbnailsContainer.querySelectorAll('.thumbnail');
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Remove active class from all thumbnails
            thumbnails.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Update main image
            mainImage.src = this.dataset.fullUrl;
        });
    });
}

// Handle property inquiry form
async function handlePropertyInquiry(e) {
    e.preventDefault();
    
    const formData = new FormData(propertyInquiryForm);
    const data = Object.fromEntries(formData);
    
    try {
        // In a real implementation, this would send to your backend
        console.log('Property inquiry submission:', data);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show success message
        alert(`Thank you ${data.name}! Your inquiry about this property has been sent to Brandon. He will contact you at ${data.email} soon.`);
        propertyInquiryForm.reset();
        
    } catch (error) {
        console.error('Error submitting property inquiry:', error);
        alert('There was an error sending your inquiry. Please try calling (978) 987-2806 directly.');
    }
}

// Utility functions
function formatPrice(price) {
    if (!price) return 'Price on request';
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function formatNumber(number) {
    if (!number || number === 'N/A') return 'N/A';
    return new Intl.NumberFormat('en-US').format(number);
}

function showLoading() {
    listingDetail.innerHTML = `
        <div class="loading-container">
            <div class="loading"></div>
            <p>Loading property details...</p>
        </div>
    `;
}

function showError(message) {
    listingDetail.innerHTML = `
        <div class="error-message">
            <h2>Property Not Found</h2>
            <p>${message}</p>
            <a href="index.html#listings" class="btn btn-primary">Back to Listings</a>
        </div>
    `;
}
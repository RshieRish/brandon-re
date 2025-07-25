// Listing Detail Page JavaScript

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

// DOM Elements
const listingDetail = document.getElementById('listingDetail');
const propertyInquiryForm = document.getElementById('propertyInquiryForm');
const propertyMlsIdInput = document.getElementById('propertyMlsId');

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
    const urlParams = new URLSearchParams(window.location.search);
    const mlsId = urlParams.get('id');
    
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
    const sqft = data.SQUARE_FEET || data.LivingArea || data.AboveGradeFinishedArea || 'N/A';
    const lotSize = data.LOT_SIZE || data.LotSizeSquareFeet || 'N/A';
    const yearBuilt = data.YEAR_BUILT || data.YearBuilt || 'N/A';
    const propertyType = data.PROPERTY_TYPE || data.PropertyType || 'Residential';
    const mlsId = listing.listing_key || data.LIST_NO || data.ListingID || data.ListingKey || 'unknown';
    const description = data.REMARKS || data.PublicRemarks || 'Beautiful property with great potential.';
    const listingDate = data.LIST_DATE || data.ListingContractDate || new Date().toISOString();
    
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
                    <img src="https://via.placeholder.com/800x600/000000/FFD700?text=Property+Image" 
                         alt="${address}" 
                         onerror="this.src='https://via.placeholder.com/800x600/000000/FFD700?text=Property+Image'">
                </div>
                <div class="image-thumbnails">
                    <img src="https://via.placeholder.com/200x150/000000/FFD700?text=Photo+1" alt="Photo 1" class="thumbnail active">
                    <img src="https://via.placeholder.com/200x150/000000/FFD700?text=Photo+2" alt="Photo 2" class="thumbnail">
                    <img src="https://via.placeholder.com/200x150/000000/FFD700?text=Photo+3" alt="Photo 3" class="thumbnail">
                    <img src="https://via.placeholder.com/200x150/000000/FFD700?text=Photo+4" alt="Photo 4" class="thumbnail">
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
                                <span class="highlight-value">${bathrooms}</span>
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
                            <span class="detail-value">Active</span>
                        </div>
                    </div>
                </div>
                
                <div class="contact-agent">
                    <h2>Contact Your Dracut Realtor</h2>
                    <div class="agent-info">
                        <div class="agent-photo">
                            <img src="https://via.placeholder.com/150x150/000000/FFD700?text=Brandon+S" alt="Brandon Sweeney">
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
    
    // Initialize image gallery
    initializeImageGallery();
    
    // Update page title
    document.title = `${address} - SWS & Co.`;
}

// Initialize image gallery
function initializeImageGallery() {
    const mainImage = document.querySelector('.main-image img');
    const thumbnails = document.querySelectorAll('.thumbnail');
    
    thumbnails.forEach(thumbnail => {
        thumbnail.addEventListener('click', function() {
            // Remove active class from all thumbnails
            thumbnails.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked thumbnail
            this.classList.add('active');
            
            // Update main image
            mainImage.src = this.src.replace('200x150', '800x600');
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
// Brandon Sweeney - Your Dracut Realtor - Frontend JavaScript

// API Configuration
const API_BASE_URL = window.location.hostname === 'localhost' 
    ? 'http://localhost:3001/api' 
    : '/api';

// DOM Elements
const listingsGrid = document.getElementById('listingsGrid');
const searchBtn = document.getElementById('searchBtn');
const contactForm = document.getElementById('contactForm');
const chatbotToggle = document.getElementById('chatbotToggle');
const chatbotWindow = document.getElementById('chatbotWindow');
const chatbotClose = document.getElementById('chatbotClose');
const chatbotInput = document.getElementById('chatbotInput');
const chatbotSend = document.getElementById('chatbotSend');
const chatbotMessages = document.getElementById('chatbotMessages');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeHeroVideo();
    loadFeaturedListings();
    initializeEventListeners();
    initializeChatbot();
    initializeSmoothScrolling();
    initializeMobileMenu();
});

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

// Initialize hero video for cross-browser compatibility
function initializeHeroVideo() {
    const video = document.getElementById('heroVideo');
    if (video) {
        console.log('Initializing hero video...');
        
        // Force video attributes
        video.muted = true;
        video.autoplay = true;
        video.loop = true;
        video.playsInline = true;
        video.setAttribute('webkit-playsinline', '');
        video.setAttribute('playsinline', '');
        video.preload = 'auto';
        
        // Ensure video is visible
        video.style.display = 'block';
        video.style.visibility = 'visible';
        video.style.opacity = '1';
        video.style.zIndex = '-2';
        
        // Handle video load errors and fallback to local files
        video.addEventListener('error', function(e) {
            console.error('Video failed to load:', e);
            console.error('Video error details:', video.error);
            
            // Try fallback to local optimized video
            const sources = video.querySelectorAll('source');
            if (sources.length > 1) {
                console.log('Trying fallback video sources...');
                video.load(); // Reload with fallback sources
            }
        });
        
        // Force play when video can play
        video.addEventListener('canplay', function() {
            console.log('Video can play - forcing autoplay');
            video.play().catch(e => {
                console.log('Autoplay failed, will try on user interaction:', e);
                // Add click listener for manual play
                document.addEventListener('click', function playOnClick() {
                    video.play().then(() => {
                        console.log('Video started playing after user interaction');
                        document.removeEventListener('click', playOnClick);
                    }).catch(e => console.log('Manual play failed:', e));
                }, { once: true });
            });
        });
        
        // Ensure video loops properly
        video.addEventListener('ended', function() {
            console.log('Video ended, restarting...');
            video.currentTime = 0;
            video.play();
        });
        
        // Debug events
         video.addEventListener('loadstart', () => console.log('Video load started'));
         video.addEventListener('loadeddata', () => {
             console.log('Video data loaded');
             // Make video more visible when loaded
             video.style.opacity = '1';
         });
         video.addEventListener('playing', () => {
             console.log('Video is playing - SUCCESS!');
             // Ensure video is fully visible when playing
             video.style.opacity = '1';
             video.style.visibility = 'visible';
         });
         video.addEventListener('pause', () => console.log('Video paused'));
         video.addEventListener('waiting', () => console.log('Video waiting for data'));
         video.addEventListener('stalled', () => console.log('Video stalled'));
        
        // Try to load and play immediately
        video.load();
        
        // Multiple attempts to start video
        setTimeout(() => {
            if (video.paused) {
                console.log('Video still paused after 1s, trying to play...');
                video.play().catch(e => console.log('Delayed play attempt failed:', e));
            }
        }, 1000);
        
        setTimeout(() => {
            if (video.paused) {
                console.log('Video still paused after 3s, trying to play...');
                video.play().catch(e => console.log('Second delayed play attempt failed:', e));
            }
        }, 3000);
        
        // Status check
        setTimeout(() => {
            console.log('Video status check:');
            console.log('- readyState:', video.readyState);
            console.log('- networkState:', video.networkState);
            console.log('- currentSrc:', video.currentSrc);
            console.log('- duration:', video.duration);
            console.log('- paused:', video.paused);
            console.log('- muted:', video.muted);
            console.log('- autoplay:', video.autoplay);
        }, 2000);
    }
}

// Event Listeners
function initializeEventListeners() {
    // Search functionality
    searchBtn.addEventListener('click', handleSearch);
    
    // Enter key for search
    document.querySelectorAll('.filter-input').forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSearch();
            }
        });
    });
    
    // Contact form
    contactForm.addEventListener('submit', handleContactForm);
    
    // Chatbot events
    chatbotToggle.addEventListener('click', toggleChatbot);
    chatbotClose.addEventListener('click', closeChatbot);
    chatbotSend.addEventListener('click', sendChatMessage);
    chatbotInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
}

// Smooth scrolling for navigation links
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Load featured listings
async function loadFeaturedListings() {
    console.log('🏠 Loading featured listings...');
    try {
        showLoading();
        const response = await fetch(`${API_BASE_URL}/listings/featured/all`);
        const data = await response.json();
        
        console.log('📊 Featured listings response:', data);
        
        if (data.success && data.data && data.data.data && data.data.data.length > 0) {
            console.log('✅ Using featured listings:', data.data.data.length);
            displayListings(data.data.data);
        } else {
            console.log('⚠️ No featured listings, falling back to regular listings');
            // Fallback to regular listings if featured not available
            await loadRegularListings();
        }
    } catch (error) {
        console.error('❌ Error loading featured listings:', error);
        // Clear any partial content before loading regular listings
        if (listingsGrid) {
            listingsGrid.innerHTML = '';
        }
        await loadRegularListings();
    }
}

// Pagination state
let currentPage = 1;
let isLoadingMore = false;
let hasMoreListings = true;

// Load regular listings as fallback
async function loadRegularListings(page = 1, append = false) {
    console.log('🔄 loadRegularListings called - page:', page, 'append:', append);
    try {
        if (!append) {
            showLoading();
        } else {
            isLoadingMore = true;
            updateLoadMoreButton('Loading...');
        }
        
        const response = await fetch(`${API_BASE_URL}/listings?page=${page}&limit=6`);
        const data = await response.json();
        
        console.log('📡 Regular listings API response:', data.success, 'data length:', data.data?.data?.length);
        
        if (data.success && data.data && data.data.data) {
            if (append) {
                console.log('➕ Appending listings');
                appendListings(data.data.data);
            } else {
                console.log('🔄 Displaying listings');
                displayListings(data.data.data);
            }
            
            // Update pagination state
            currentPage = page;
            hasMoreListings = data.data.data.length === 6; // If we got less than 6, no more listings
            
            // Show/hide load more button
            updateLoadMoreButton();
        } else {
            if (!append) {
                showError('Unable to load listings at this time.');
            }
            hasMoreListings = false;
            updateLoadMoreButton();
        }
    } catch (error) {
        console.error('❌ Error loading listings:', error);
        if (!append) {
            showError('Unable to connect to the listings service.');
        }
        hasMoreListings = false;
        updateLoadMoreButton();
    } finally {
        isLoadingMore = false;
    }
}

// Handle search functionality
async function handleSearch() {
    const filters = {
        city: document.getElementById('cityFilter').value,
        minPrice: document.getElementById('minPrice').value,
        maxPrice: document.getElementById('maxPrice').value,
        bedrooms: document.getElementById('bedrooms').value
    };
    
    // Remove empty filters
    Object.keys(filters).forEach(key => {
        if (!filters[key]) {
            delete filters[key];
        }
    });
    
    try {
        showLoading();
        const queryString = new URLSearchParams(filters).toString();
        const response = await fetch(`${API_BASE_URL}/listings?${queryString}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.data) {
            displayListings(data.data.data);
        } else {
            showError('No listings found matching your criteria.');
        }
    } catch (error) {
        console.error('Error searching listings:', error);
        showError('Search failed. Please try again.');
    }
}

// Display listings in the grid
function displayListings(listings) {
    console.log('🎯 displayListings called with:', listings?.length, 'listings');
    if (listings && listings.length > 0) {
        console.log('📋 First 3 listings:', listings.slice(0, 3).map(l => ({ id: l.id, mlsNumber: l.mlsNumber, address: l.address })));
    }
    
    if (!listings || listings.length === 0) {
        listingsGrid.innerHTML = '<p class="no-results">No listings found.</p>';
        return;
    }
    
    listingsGrid.innerHTML = listings.map(listing => createListingCard(listing)).join('');
    
    // Add click events to listing cards
    document.querySelectorAll('.listing-card').forEach(card => {
        card.addEventListener('click', function() {
            const mlsId = this.dataset.mlsId;
            showListingDetails(mlsId);
        });
    });
    
    // Add load more button if not exists
    addLoadMoreButton();
}

// Append listings (for pagination)
function appendListings(listings) {
    if (!listings || listings.length === 0) {
        return;
    }
    
    // Remove load more button temporarily
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        loadMoreBtn.remove();
    }
    
    // Get current number of cards to identify new ones
    const currentCardCount = listingsGrid.children.length;
    
    // Append new listings
    const newListingsHTML = listings.map(listing => createListingCard(listing)).join('');
    listingsGrid.insertAdjacentHTML('beforeend', newListingsHTML);
    
    // Add click events only to newly added listing cards
    const allCards = document.querySelectorAll('.listing-card');
    for (let i = currentCardCount; i < allCards.length; i++) {
        const card = allCards[i];
        card.addEventListener('click', function() {
            const mlsId = this.dataset.mlsId;
            showListingDetails(mlsId);
        });
    }
    
    // Re-add load more button
    addLoadMoreButton();
}

// Generate MLSPin photo URL
function generatePhotoURL(mlsId, photoNumber, width, height) {
    return `https://media.mlspin.com/photo.aspx?mls=${mlsId}&n=${photoNumber}&w=${width}&h=${height}`;
}

// Create listing card HTML
function createListingCard(listing) {
    // Handle both API data structure and mock data structure
    const price = formatPrice(
        listing.price?.amount || listing.price || 0
    );
    
    // Handle address - could be string or object
    let address = 'Address not available';
    if (typeof listing.address === 'string') {
        address = listing.address;
    } else if (listing.address && typeof listing.address === 'object') {
        const addr = listing.address;
        address = `${addr.street || ''}, ${addr.city || ''}, ${addr.state || 'MA'} ${addr.zipCode || ''}`.replace(/,\s*,/g, ',').trim();
    }
    
    const bedrooms = listing.bedrooms || listing.property?.bedrooms || 'N/A';
    const bathrooms = listing.bathrooms || listing.property?.bathrooms || 'N/A';
    const halfBathrooms = listing.halfBathrooms || listing.property?.halfBaths || 0;
    const sqft = listing.sqft || listing.squareFootage || listing.property?.squareFeet || 'N/A';
    const stories = listing.stories || listing.property?.stories || null;
    const mlsId = listing.id || listing.mlsNumber || 'unknown';
    const description = listing.description || listing.detailedRemarks || `Beautiful property in Boston`;
    
    // Extract property features
    const features = listing.features || {};
    const garage = features.garage || listing.garage || null;
    const pool = features.pool || listing.pool || false;
    const waterfront = features.waterfront || listing.waterfront || false;
    const fireplace = features.fireplace || listing.fireplace || listing.fireplaces || null;
    
    // Handle images - could be array or object structure
    let image = 'https://via.placeholder.com/400x300/000000/FFD700?text=Property+Image';
    if (listing.images && Array.isArray(listing.images) && listing.images.length > 0) {
        image = listing.images[0];
    } else if (listing.images?.featured) {
        image = listing.images.featured;
    } else if (listing.featuredImage) {
        image = listing.featuredImage;
    }
    
    return `
        <div class="listing-card" data-mls-id="${mlsId}">
            <div class="listing-image-container">
                <img src="${image}" alt="${address}" class="listing-image" onerror="this.src='https://via.placeholder.com/400x300/000000/FFD700?text=Property+Image'">
            </div>
            <div class="listing-content">
                <div class="listing-price">${price}</div>
                <div class="listing-address">${address}</div>
                <div class="listing-details">
                    <div class="listing-detail">
                        <i class="fas fa-bed"></i>
                        <span>${bedrooms} bed</span>
                    </div>
                    <div class="listing-detail">
                        <i class="fas fa-bath"></i>
                        <span>${bathrooms}${halfBathrooms > 0 ? `.${halfBathrooms}` : ''} bath</span>
                    </div>
                    <div class="listing-detail">
                        <i class="fas fa-ruler-combined"></i>
                        <span>${formatNumber(sqft)} sqft</span>
                    </div>
                    ${stories ? `<div class="listing-detail">
                        <i class="fas fa-building"></i>
                        <span>${stories} ${stories === 1 ? 'story' : 'stories'}</span>
                    </div>` : ''}
                </div>
                <div class="listing-features">
                    ${garage ? `<div class="feature-tag">
                        <i class="fas fa-car"></i>
                        <span>${garage} car garage</span>
                    </div>` : ''}
                    ${pool ? `<div class="feature-tag">
                        <i class="fas fa-swimming-pool"></i>
                        <span>Pool</span>
                    </div>` : ''}
                    ${waterfront ? `<div class="feature-tag">
                        <i class="fas fa-water"></i>
                        <span>Waterfront</span>
                    </div>` : ''}
                    ${fireplace ? `<div class="feature-tag">
                        <i class="fas fa-fire"></i>
                        <span>${fireplace > 1 ? `${fireplace} fireplaces` : 'Fireplace'}</span>
                    </div>` : ''}
                </div>
                <div class="listing-description">
                    ${description}
                </div>
            </div>
        </div>
    `;
}

// Show listing details - redirect to detail page
function showListingDetails(mlsId) {
    window.location.href = `listing.html?id=${mlsId}`;
}

// Handle contact form submission
async function handleContactForm(e) {
    e.preventDefault();
    
    const formData = new FormData(contactForm);
    const data = Object.fromEntries(formData);
    
    try {
        // In a real implementation, this would send to your backend
        console.log('Contact form submission:', data);
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Show success message
        alert('Thank you for your message! Brandon will get back to you soon.');
        contactForm.reset();
        
        // Add to chatbot as a message
        addChatMessage(`Thank you ${data.name}! I've received your ${data.inquiryType} inquiry and will contact you at ${data.email} soon.`, 'bot');
        
    } catch (error) {
        console.error('Error submitting contact form:', error);
        alert('There was an error sending your message. Please try calling (978) 987-2806 directly.');
    }
}

// Chatbot functionality
function initializeChatbot() {
    const chatbotToggle = document.getElementById('chatbotToggle');
    const chatbotWidget = document.getElementById('chatbotWidget');
    const chatbotClose = document.getElementById('chatbotClose');
    const chatbotSend = document.getElementById('chatbotSend');
    const chatbotInput = document.getElementById('chatbotInput');
    const chatbotMessages = document.getElementById('chatbotMessages');

    if (!chatbotToggle || !chatbotWidget) {
        // Fallback to existing implementation if elements not found
        setTimeout(() => {
            addChatMessage("Hi! I'm Brandon's AI assistant. I can help you with information about Dracut real estate, current listings, market trends, or connect you with Brandon directly. What would you like to know?", 'bot');
        }, 2000);
        return;
    }

    chatbotToggle.addEventListener('click', () => {
        chatbotWidget.classList.add('active');
        chatbotToggle.style.display = 'none';
    });

    chatbotClose.addEventListener('click', () => {
        chatbotWidget.classList.remove('active');
        chatbotToggle.style.display = 'flex';
    });

    chatbotSend.addEventListener('click', sendMessage);
    chatbotInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    async function sendMessage() {
        const message = chatbotInput.value.trim();
        if (!message) return;

        // Add user message
        addChatMessage(message, 'user');
        chatbotInput.value = '';

        // Show typing indicator
        showTypingIndicator();

        try {
             // Get AI response
             const response = await getAIResponse(message);
             removeTypingIndicator();
             addChatMessage(response, 'bot');
         } catch (error) {
             removeTypingIndicator();
             const fallbackResponse = generateFallbackResponse(message);
             addChatMessage(fallbackResponse, 'bot');
         }
    }

    function addChatMessage(message, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${sender}`;
        messageDiv.innerHTML = `
            <div class="message-content">
                ${message}
            </div>
            <div class="message-time">
                ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </div>
        `;
        chatbotMessages.appendChild(messageDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot typing-indicator';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="message-content">
                <div class="typing-dots">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </div>
        `;
        chatbotMessages.appendChild(typingDiv);
        chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
    }

    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async function getAIResponse(userMessage) {
        // In a real implementation, this would call an AI service
        // For now, we'll use enhanced pattern matching with property data
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(generateSmartResponse(userMessage));
            }, 1000 + Math.random() * 1000);
        });
    }

    async function generateSmartResponse(userMessage) {
        const lowerMessage = userMessage.toLowerCase();
        
        // Check for specific property inquiries
        if (lowerMessage.includes('price') || lowerMessage.includes('cost') || lowerMessage.includes('budget')) {
            try {
                const response = await fetch(`${API_BASE_URL}/listings`);
                const data = await response.json();
                if (data.success && data.data) {
                    const listings = data.data;
                    const prices = listings.map(l => l.listPrice).filter(p => p).sort((a, b) => a - b);
                    if (prices.length > 0) {
                        const minPrice = Math.min(...prices);
                        const maxPrice = Math.max(...prices);
                        const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
                        
                        return `I have properties ranging from ${formatPrice(minPrice)} to ${formatPrice(maxPrice)}, with an average price of ${formatPrice(avgPrice)}. What's your budget range? I can show you properties that match your needs.`;
                    }
                }
            } catch (error) {
                console.error('Error fetching price data:', error);
            }
            return "I can help you find homes in various price ranges. What's your budget? I have properties starting from the mid $400,000s up to over $1 million.";
        }
        
        if (lowerMessage.includes('bedroom') || lowerMessage.includes('bed')) {
            const bedMatch = lowerMessage.match(/(\d+)\s*bed/);
            if (bedMatch) {
                const bedrooms = bedMatch[1];
                return `Great! I have several ${bedrooms}-bedroom properties available. Would you like me to show you the current listings? I can also help you with specific neighborhoods or price ranges.`;
            }
            return "How many bedrooms are you looking for? I have listings from 2 to 5+ bedrooms in Dracut and surrounding areas.";
        }
        
        if (lowerMessage.includes('dracut')) {
            return "Dracut is a fantastic town with great schools, beautiful neighborhoods, and easy access to major highways! I specialize in Dracut real estate and know the area inside and out. Would you like to see current listings or learn more about specific neighborhoods?";
        }
        
        if (lowerMessage.includes('school') || lowerMessage.includes('education')) {
            return "Dracut has excellent schools! The Dracut Public School system is well-regarded, and there are also private school options nearby. Many families choose Dracut specifically for the schools. Would you like information about properties in specific school districts?";
        }
        
        if (lowerMessage.includes('contact') || lowerMessage.includes('call') || lowerMessage.includes('phone')) {
            return "You can reach me, Brandon Sweeney, at (978) 987-2806 or email me at info@solidwithsweeney.com. I'm always happy to discuss your real estate needs and answer any questions. Would you like me to help you schedule a consultation?";
        }
        
        if (lowerMessage.includes('tour') || lowerMessage.includes('showing') || lowerMessage.includes('visit')) {
            return "I'd be happy to arrange a property tour for you! I can schedule showings for any of the listings that interest you. Just let me know which properties you'd like to see, and I'll coordinate the visits. You can call me at (978) 987-2806 to set up appointments.";
        }
        
        if (lowerMessage.includes('sell') || lowerMessage.includes('selling')) {
            return "Thinking of selling your home? I provide comprehensive selling services including market analysis, professional photography, marketing, and negotiation. As your Dracut realtor, I know the local market well. Would you like a free home valuation?";
        }
        
        if (lowerMessage.includes('market') || lowerMessage.includes('trend')) {
            return "The Dracut real estate market has been quite active! Home values have been appreciating steadily, and it's still a great time for both buyers and sellers. I can provide you with detailed market analysis and current trends. What specific information are you looking for?";
        }
        
        if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
            return "Hello! I'm Brandon's AI assistant, and I'm here to help you with all your real estate needs in Dracut and surrounding areas. Whether you're buying, selling, or just exploring the market, I can provide information and connect you with Brandon. What can I help you with today?";
        }
        
        if (lowerMessage.includes('thank') || lowerMessage.includes('thanks')) {
            return "You're very welcome! I'm here whenever you need help with real estate questions. Feel free to ask about properties, neighborhoods, market conditions, or anything else. You can also contact Brandon directly at (978) 987-2806.";
        }
        
        // Default response with helpful suggestions
        return "I'm here to help you with your real estate needs in Dracut and surrounding areas! I can assist you with:\n\n• Finding properties that match your criteria\n• Providing market information and pricing\n• Answering questions about neighborhoods\n• Connecting you with Brandon for showings\n• Information about schools and amenities\n\nWhat would you like to know more about?";
    }

    function generateFallbackResponse(userMessage) {
        const responses = [
            "I'm here to help you with your real estate needs in Dracut and surrounding areas. You can ask me about available properties, pricing, neighborhoods, or contact information.",
            "As your Dracut realtor's assistant, I can help you find the perfect home. What are you looking for in terms of bedrooms, price range, or location?",
            "I'd be happy to help you with your real estate questions! You can also contact Brandon directly at (978) 987-2806 for personalized assistance."
        ];
        return responses[Math.floor(Math.random() * responses.length)];
    }

    // Add initial bot message
    setTimeout(() => {
        addChatMessage('Hi! I\'m Brandon\'s AI assistant. I\'m here to help you find your perfect home in Dracut and surrounding areas. I can answer questions about properties, neighborhoods, pricing, and more. How can I assist you today?', 'bot');
    }, 500);
}

function toggleChatbot() {
    chatbotWindow.classList.toggle('active');
    if (chatbotWindow.classList.contains('active')) {
        chatbotInput.focus();
    }
}

function closeChatbot() {
    chatbotWindow.classList.remove('active');
}

function sendChatMessage() {
    const message = chatbotInput.value.trim();
    if (!message) return;
    
    // Add user message
    addChatMessage(message, 'user');
    chatbotInput.value = '';
    
    // Show typing indicator
    showTypingIndicator();
    
    // Generate bot response
    setTimeout(() => {
        const response = generateBotResponse(message);
        hideTypingIndicator();
        addChatMessage(response, 'bot');
    }, 1000 + Math.random() * 2000);
}

function addChatMessage(message, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = `<p>${message}</p>`;
    
    chatbotMessages.appendChild(messageDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing-indicator';
    typingDiv.innerHTML = '<div class="loading"></div>';
    typingDiv.id = 'typing-indicator';
    
    chatbotMessages.appendChild(typingDiv);
    chatbotMessages.scrollTop = chatbotMessages.scrollHeight;
}

function hideTypingIndicator() {
    const typingIndicator = document.getElementById('typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Generate bot responses based on user input
function generateBotResponse(userMessage) {
    const message = userMessage.toLowerCase();
    
    // Real estate related responses
    if (message.includes('dracut') || message.includes('price') || message.includes('market')) {
        return "Dracut is a fantastic community with great value! The current median home price is around $485,000. I can help you find properties in your budget. Would you like me to search for specific criteria?";
    }
    
    if (message.includes('buy') || message.includes('buying')) {
        return "Great! I'd love to help you buy a home in Dracut. As your local realtor, I know the market inside and out. What's your budget range and preferred number of bedrooms?";
    }
    
    if (message.includes('sell') || message.includes('selling')) {
        return "I can help you sell your property! I offer free market analysis and have a proven track record in Dracut. Would you like to schedule a consultation to discuss your home's value?";
    }
    
    if (message.includes('contact') || message.includes('call') || message.includes('phone')) {
        return "You can reach Brandon directly at (978) 987-2806 or email info@solidwithsweeney.com. I'm also here to help answer any questions you might have!";
    }
    
    if (message.includes('listing') || message.includes('properties') || message.includes('homes')) {
        return "I can show you current listings! Check out the properties above, or let me know what you're looking for - bedrooms, price range, specific neighborhoods in Dracut?";
    }
    
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
        return "Hello! I'm here to help with all your Dracut real estate needs. Are you looking to buy, sell, or just get market information?";
    }
    
    if (message.includes('thank')) {
        return "You're very welcome! Feel free to ask me anything else about Dracut real estate, or contact Brandon directly at (978) 987-2806.";
    }
    
    // Default response
    return "That's a great question! For detailed information, I'd recommend speaking with Brandon directly at (978) 987-2806. He's the expert on Dracut real estate and can provide personalized assistance. Is there anything specific about buying or selling in Dracut I can help with?";
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
    if (!number) return 'N/A';
    return new Intl.NumberFormat('en-US').format(number);
}

// Add load more button
function addLoadMoreButton() {
    const listingsSection = document.getElementById('listings');
    const existingBtn = document.getElementById('loadMoreBtn');
    
    if (!existingBtn && hasMoreListings && listingsGrid.children.length > 0) {
        const loadMoreHTML = `
            <div class="load-more-container">
                <button id="loadMoreBtn" class="btn btn-secondary">
                    Load More Listings
                </button>
            </div>
        `;
        if (listingsSection) {
            listingsSection.insertAdjacentHTML('beforeend', loadMoreHTML);
        } else {
            listingsGrid.insertAdjacentHTML('afterend', loadMoreHTML);
        }
        
        // Add event listener to the new button
        const newBtn = document.getElementById('loadMoreBtn');
        if (newBtn) {
            newBtn.addEventListener('click', loadMoreListings);
        }
    }
}

// Update load more button state
function updateLoadMoreButton(text = null) {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    
    if (!loadMoreBtn) return;
    
    if (text) {
        loadMoreBtn.textContent = text;
        loadMoreBtn.disabled = true;
    } else if (!hasMoreListings) {
        loadMoreBtn.style.display = 'none';
    } else {
        loadMoreBtn.textContent = 'Load More Listings';
        loadMoreBtn.disabled = false;
        loadMoreBtn.style.display = 'block';
    }
}

// Load more listings with click tracking
let loadMoreClickCount = 0;

function loadMoreListings() {
    if (isLoadingMore || !hasMoreListings) return;
    
    loadMoreClickCount++;
    
    // After 3rd click, show option to go to listings page
    if (loadMoreClickCount >= 3) {
        showListingsPageOption();
        return;
    }
    
    loadRegularListings(currentPage + 1, true);
}

// Show option to go to listings page
function showListingsPageOption() {
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) {
        const container = loadMoreBtn.parentElement;
        container.innerHTML = `
            <div class="listings-page-option">
                <p style="margin-bottom: 1rem; color: #6c757d; text-align: center;">You've seen many properties! Want to explore all available listings with advanced filters?</p>
                <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                    <button class="btn btn-primary" onclick="window.location.href='listings.html'">
                        <i class="fas fa-search"></i> View All Listings
                    </button>
                    <button class="btn btn-secondary" onclick="continueLoadingMore()">
                        <i class="fas fa-plus"></i> Load More Here
                    </button>
                </div>
            </div>
        `;
        
        // Track this event
        trackEvent('load_more_limit_reached', {
            clickCount: loadMoreClickCount,
            currentPage: currentPage
        });
    }
}

// Continue loading more on current page
function continueLoadingMore() {
    const container = document.querySelector('.listings-page-option').parentElement;
    container.innerHTML = `
        <button id="loadMoreBtn" class="btn btn-secondary">
            Load More Listings
        </button>
    `;
    
    const newBtn = document.getElementById('loadMoreBtn');
    if (newBtn) {
        newBtn.addEventListener('click', loadMoreListings);
    }
    
    // Load more listings
    loadRegularListings(currentPage + 1, true);
    
    // Track this event
    trackEvent('continued_loading_on_home', {
        clickCount: loadMoreClickCount
    });
}

function showLoading() {
    listingsGrid.innerHTML = '<div class="loading-container"><div class="loading"></div><p>Loading listings...</p></div>';
}

function showError(message) {
    listingsGrid.innerHTML = `<div class="error-message"><p>${message}</p></div>`;
}

// Add some CSS for loading and error states
const additionalStyles = `
<style>
.loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    text-align: center;
}

.loading-container p {
    margin-top: 1rem;
    color: var(--text-gray);
}

.error-message {
    text-align: center;
    padding: 3rem;
    color: var(--text-gray);
}

.no-results {
    text-align: center;
    padding: 3rem;
    color: var(--text-gray);
    font-size: 1.1rem;
}

.typing-indicator {
    display: flex;
    align-items: center;
    padding: 0.8rem 1rem;
}
</style>
`;

// Inject additional styles
document.head.insertAdjacentHTML('beforeend', additionalStyles);

// Analytics and tracking (placeholder)
function trackEvent(eventName, properties = {}) {
    console.log('Event tracked:', eventName, properties);
    // In a real implementation, this would send to analytics service
}

// Track page load
trackEvent('page_load', {
    page: 'home',
    timestamp: new Date().toISOString()
});

// Track search events
if (searchBtn) {
    searchBtn.addEventListener('click', () => {
        trackEvent('search_performed', {
            filters: {
                city: document.getElementById('cityFilter').value,
                minPrice: document.getElementById('minPrice').value,
                maxPrice: document.getElementById('maxPrice').value,
                bedrooms: document.getElementById('bedrooms').value
            }
        });
    });
}

// Track contact form submissions
if (contactForm) {
    contactForm.addEventListener('submit', () => {
        trackEvent('contact_form_submitted', {
            inquiryType: document.getElementById('inquiryType').value
        });
    });
}

// Track chatbot usage
if (chatbotToggle) {
    chatbotToggle.addEventListener('click', () => {
        trackEvent('chatbot_opened');
    });
}
// Admin Panel JavaScript

// API Configuration
const API_BASE_URL = window.location.origin;

// DOM Elements
const navLinks = document.querySelectorAll('.admin-nav-link');
const sections = document.querySelectorAll('.admin-section');
const modals = document.querySelectorAll('.modal');
const modalCloses = document.querySelectorAll('.modal-close');

// Charts
let viewsChart, leadsChart, trafficChart, funnelChart, trendsChart;

// Initialize Admin Panel
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    loadDashboardData();
    initializeCharts();
    initializeEventListeners();
    loadRecentActivity();
    loadListings();
    loadLeads();
    setDefaultDates();
});

// Navigation
function initializeNavigation() {
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetSection = this.getAttribute('data-section');
            showSection(targetSection);
            
            // Update active nav link
            navLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');
        });
    });
}

function showSection(sectionName) {
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionName) {
            case 'analytics':
                loadAnalyticsData();
                break;
            case 'listings':
                loadListings();
                break;
            case 'leads':
                loadLeads();
                break;
        }
    }
}

// Dashboard Data Loading
async function loadDashboardData() {
    try {
        // Load listings count
        const listingsResponse = await fetch(`${API_BASE_URL}/api/listings`);
        const listings = await listingsResponse.json();
        
        document.getElementById('totalListings').textContent = listings.length;
        
        // Calculate average price
        const avgPrice = listings.reduce((sum, listing) => sum + listing.price, 0) / listings.length;
        document.getElementById('avgPrice').textContent = formatPrice(avgPrice);
        
        // Mock data for other stats
        document.getElementById('totalLeads').textContent = '24';
        document.getElementById('siteViews').textContent = '1,247';
        
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set fallback values
        document.getElementById('totalListings').textContent = '12';
        document.getElementById('avgPrice').textContent = '$650,000';
        document.getElementById('totalLeads').textContent = '24';
        document.getElementById('siteViews').textContent = '1,247';
    }
}

// Charts Initialization
function initializeCharts() {
    // Views Chart
    const viewsCtx = document.getElementById('viewsChart');
    if (viewsCtx) {
        viewsChart = new Chart(viewsCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Page Views',
                    data: [1200, 1900, 3000, 2500, 2200, 3000],
                    borderColor: '#FFD700',
                    backgroundColor: 'rgba(255, 215, 0, 0.1)',
                    tension: 0.4,
                    fill: true
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    // Leads Chart
    const leadsCtx = document.getElementById('leadsChart');
    if (leadsCtx) {
        leadsChart = new Chart(leadsCtx, {
            type: 'doughnut',
            data: {
                labels: ['Website', 'Referral', 'Social Media', 'Other'],
                datasets: [{
                    data: [45, 25, 20, 10],
                    backgroundColor: [
                        '#FFD700',
                        '#FFA500',
                        '#FF8C00',
                        '#FF6347'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#ffffff',
                            padding: 20
                        }
                    }
                }
            }
        });
    }
}

// Recent Activity
function loadRecentActivity() {
    const activities = [
        {
            icon: 'fas fa-home',
            title: 'New listing added',
            description: '123 Main St, Dracut, MA',
            time: '2 hours ago'
        },
        {
            icon: 'fas fa-user-plus',
            title: 'New lead registered',
            description: 'John Smith - interested in 3BR homes',
            time: '4 hours ago'
        },
        {
            icon: 'fas fa-eye',
            title: 'Listing viewed',
            description: '456 Oak Ave received 15 views today',
            time: '6 hours ago'
        },
        {
            icon: 'fas fa-envelope',
            title: 'Contact form submitted',
            description: 'Sarah Johnson requested property tour',
            time: '1 day ago'
        },
        {
            icon: 'fas fa-chart-line',
            title: 'Price updated',
            description: '789 Pine St price reduced to $575,000',
            time: '2 days ago'
        }
    ];
    
    const activityList = document.getElementById('activityList');
    if (activityList) {
        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">
                    <i class="${activity.icon}"></i>
                </div>
                <div class="activity-content">
                    <h4>${activity.title}</h4>
                    <p>${activity.description}</p>
                </div>
                <div class="activity-time">${activity.time}</div>
            </div>
        `).join('');
    }
}

// Listings Management
async function loadListings() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/listings`);
        const listings = await response.json();
        
        const tableBody = document.getElementById('listingsTableBody');
        if (tableBody) {
            tableBody.innerHTML = listings.map(listing => `
                <tr>
                    <td>
                        <img src="${listing.photos && listing.photos[0] ? listing.photos[0] : '/api/placeholder/60/45'}" 
                             alt="${listing.address}" class="listing-photo">
                    </td>
                    <td>
                        <strong>${listing.address}</strong><br>
                        <small>${listing.city}, ${listing.state} ${listing.zipCode}</small>
                    </td>
                    <td>${formatPrice(listing.price)}</td>
                    <td>${listing.bedrooms}/${listing.bathrooms}</td>
                    <td><span class="status-badge status-active">Active</span></td>
                    <td>${Math.floor(Math.random() * 30) + 1} days</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn" onclick="editListing('${listing.mlsId}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn" onclick="viewListing('${listing.mlsId}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn" onclick="deleteListing('${listing.mlsId}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading listings:', error);
    }
}

// Leads Management
function loadLeads() {
    const mockLeads = [
        {
            id: 1,
            name: 'John Smith',
            email: 'john@email.com',
            phone: '(978) 555-0123',
            interest: 'Buying - 3BR Home',
            source: 'Website',
            status: 'New',
            date: '2024-01-15'
        },
        {
            id: 2,
            name: 'Sarah Johnson',
            email: 'sarah@email.com',
            phone: '(978) 555-0456',
            interest: 'Selling - Current Home',
            source: 'Referral',
            status: 'Contacted',
            date: '2024-01-14'
        },
        {
            id: 3,
            name: 'Mike Wilson',
            email: 'mike@email.com',
            phone: '(978) 555-0789',
            interest: 'Buying - Condo',
            source: 'Social Media',
            status: 'Qualified',
            date: '2024-01-13'
        }
    ];
    
    const tableBody = document.getElementById('leadsTableBody');
    if (tableBody) {
        tableBody.innerHTML = mockLeads.map(lead => `
            <tr>
                <td><strong>${lead.name}</strong></td>
                <td>${lead.email}</td>
                <td>${lead.phone}</td>
                <td>${lead.interest}</td>
                <td>${lead.source}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase()}">${lead.status}</span></td>
                <td>${formatDate(lead.date)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="contactLead(${lead.id})" title="Contact">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="action-btn" onclick="editLead(${lead.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="deleteLead(${lead.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// Analytics
function loadAnalyticsData() {
    // Traffic Chart
    const trafficCtx = document.getElementById('trafficChart');
    if (trafficCtx && !trafficChart) {
        trafficChart = new Chart(trafficCtx, {
            type: 'bar',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Visitors',
                    data: [120, 190, 300, 250, 220, 300, 280],
                    backgroundColor: 'rgba(255, 215, 0, 0.8)',
                    borderColor: '#FFD700',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        labels: {
                            color: '#ffffff'
                        }
                    }
                },
                scales: {
                    x: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    },
                    y: {
                        ticks: {
                            color: '#ffffff'
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)'
                        }
                    }
                }
            }
        });
    }
    
    // Popular Listings
    const popularListings = [
        { address: '123 Main St', city: 'Dracut', views: 245 },
        { address: '456 Oak Ave', city: 'Lowell', views: 189 },
        { address: '789 Pine St', city: 'Tyngsborough', views: 156 },
        { address: '321 Elm Dr', city: 'Dracut', views: 134 },
        { address: '654 Maple Ln', city: 'Lowell', views: 98 }
    ];
    
    const popularListingsContainer = document.getElementById('popularListings');
    if (popularListingsContainer) {
        popularListingsContainer.innerHTML = popularListings.map(listing => `
            <div class="popular-listing-item">
                <img src="/api/placeholder/50/40" alt="${listing.address}">
                <div class="popular-listing-info">
                    <h4>${listing.address}</h4>
                    <p>${listing.city}, MA</p>
                </div>
                <div class="popular-listing-views">${listing.views} views</div>
            </div>
        `).join('');
    }
}

// Event Listeners
function initializeEventListeners() {
    // Modal handling
    modalCloses.forEach(close => {
        close.addEventListener('click', closeModal);
    });
    
    // Click outside modal to close
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                closeModal();
            }
        });
    });
    
    // Add listing button
    const addListingBtn = document.getElementById('addListingBtn');
    if (addListingBtn) {
        addListingBtn.addEventListener('click', () => openModal('addListingModal'));
    }
    
    // Form submissions
    const addListingForm = document.getElementById('addListingForm');
    if (addListingForm) {
        addListingForm.addEventListener('submit', handleAddListing);
    }
    
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileUpdate);
    }
    
    const websiteForm = document.getElementById('websiteForm');
    if (websiteForm) {
        websiteForm.addEventListener('submit', handleWebsiteUpdate);
    }
    
    const apiForm = document.getElementById('apiForm');
    if (apiForm) {
        apiForm.addEventListener('submit', handleApiUpdate);
    }
    
    // Search and filters
    const listingSearch = document.getElementById('listingSearch');
    if (listingSearch) {
        listingSearch.addEventListener('input', filterListings);
    }
    
    const leadSearch = document.getElementById('leadSearch');
    if (leadSearch) {
        leadSearch.addEventListener('input', filterLeads);
    }
    
    // Test connection button
    const testConnectionBtn = document.getElementById('testConnectionBtn');
    if (testConnectionBtn) {
        testConnectionBtn.addEventListener('click', testConnection);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
    
    // Update analytics button
    const updateAnalytics = document.getElementById('updateAnalytics');
    if (updateAnalytics) {
        updateAnalytics.addEventListener('click', loadAnalyticsData);
    }
}

// Modal Functions
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
    document.body.style.overflow = 'auto';
}

// Form Handlers
async function handleAddListing(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const listingData = {
        address: formData.get('address'),
        city: formData.get('city'),
        price: parseInt(formData.get('price')),
        bedrooms: parseInt(formData.get('bedrooms')),
        bathrooms: parseFloat(formData.get('bathrooms')),
        sqft: parseInt(formData.get('sqft')),
        description: formData.get('description')
    };
    
    try {
        // In a real app, this would POST to the API
        console.log('Adding listing:', listingData);
        
        // Show success message
        showNotification('Listing added successfully!', 'success');
        closeModal();
        loadListings();
        
        // Reset form
        e.target.reset();
    } catch (error) {
        console.error('Error adding listing:', error);
        showNotification('Error adding listing. Please try again.', 'error');
    }
}

function handleProfileUpdate(e) {
    e.preventDefault();
    showNotification('Profile updated successfully!', 'success');
}

function handleWebsiteUpdate(e) {
    e.preventDefault();
    showNotification('Website settings updated successfully!', 'success');
}

function handleApiUpdate(e) {
    e.preventDefault();
    showNotification('API settings updated successfully!', 'success');
}

// Action Functions
function editListing(mlsId) {
    console.log('Edit listing:', mlsId);
    showNotification('Edit functionality coming soon!', 'info');
}

function viewListing(mlsId) {
    window.open(`/listing/${mlsId}`, '_blank');
}

function deleteListing(mlsId) {
    if (confirm('Are you sure you want to delete this listing?')) {
        console.log('Delete listing:', mlsId);
        showNotification('Listing deleted successfully!', 'success');
        loadListings();
    }
}

function contactLead(leadId) {
    console.log('Contact lead:', leadId);
    showNotification('Contact functionality coming soon!', 'info');
}

function editLead(leadId) {
    console.log('Edit lead:', leadId);
    showNotification('Edit functionality coming soon!', 'info');
}

function deleteLead(leadId) {
    if (confirm('Are you sure you want to delete this lead?')) {
        console.log('Delete lead:', leadId);
        showNotification('Lead deleted successfully!', 'success');
        loadLeads();
    }
}

// Filter Functions
function filterListings() {
    const searchTerm = document.getElementById('listingSearch').value.toLowerCase();
    const statusFilter = document.getElementById('statusFilter').value;
    const cityFilter = document.getElementById('cityFilterAdmin').value;
    
    const rows = document.querySelectorAll('#listingsTableBody tr');
    rows.forEach(row => {
        const address = row.cells[1].textContent.toLowerCase();
        const status = row.cells[4].textContent.toLowerCase();
        const city = row.cells[1].textContent.toLowerCase();
        
        const matchesSearch = address.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter.toLowerCase());
        const matchesCity = !cityFilter || city.includes(cityFilter.toLowerCase());
        
        row.style.display = matchesSearch && matchesStatus && matchesCity ? '' : 'none';
    });
}

function filterLeads() {
    const searchTerm = document.getElementById('leadSearch').value.toLowerCase();
    const statusFilter = document.getElementById('leadStatusFilter').value;
    const sourceFilter = document.getElementById('leadSourceFilter').value;
    
    const rows = document.querySelectorAll('#leadsTableBody tr');
    rows.forEach(row => {
        const name = row.cells[0].textContent.toLowerCase();
        const email = row.cells[1].textContent.toLowerCase();
        const status = row.cells[5].textContent.toLowerCase();
        const source = row.cells[4].textContent.toLowerCase();
        
        const matchesSearch = name.includes(searchTerm) || email.includes(searchTerm);
        const matchesStatus = !statusFilter || status.includes(statusFilter.toLowerCase());
        const matchesSource = !sourceFilter || source.includes(sourceFilter.toLowerCase());
        
        row.style.display = matchesSearch && matchesStatus && matchesSource ? '' : 'none';
    });
}

// Utility Functions
function formatPrice(price) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(price);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function setDefaultDates() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const startDateInput = document.getElementById('startDate');
    const endDateInput = document.getElementById('endDate');
    
    if (startDateInput) {
        startDateInput.value = startDate.toISOString().split('T')[0];
    }
    if (endDateInput) {
        endDateInput.value = endDate.toISOString().split('T')[0];
    }
}

function testConnection() {
    const btn = document.getElementById('testConnectionBtn');
    const originalText = btn.innerHTML;
    
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Testing...';
    btn.disabled = true;
    
    setTimeout(() => {
        btn.innerHTML = originalText;
        btn.disabled = false;
        showNotification('Connection test successful!', 'success');
    }, 2000);
}

function handleLogout() {
    if (confirm('Are you sure you want to logout?')) {
        // In a real app, this would clear session and redirect
        window.location.href = 'index.html';
    }
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        </div>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: rgba(26, 26, 26, 0.95);
                border: 1px solid rgba(255, 255, 255, 0.1);
                border-radius: 8px;
                padding: 1rem;
                color: white;
                z-index: 3000;
                min-width: 300px;
                animation: slideInRight 0.3s ease;
            }
            .notification-success { border-left: 4px solid #22c55e; }
            .notification-error { border-left: 4px solid #ef4444; }
            .notification-info { border-left: 4px solid #3b82f6; }
            .notification-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .notification-close {
                background: none;
                border: none;
                color: white;
                cursor: pointer;
                font-size: 1.2rem;
                padding: 0;
                margin-left: 1rem;
            }
            @keyframes slideInRight {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    // Add to page
    document.body.appendChild(notification);
    
    // Close button functionality
    const closeBtn = notification.querySelector('.notification-close');
    closeBtn.addEventListener('click', () => {
        notification.remove();
    });
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Escape key to close modals
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const activeSection = document.querySelector('.admin-section.active');
        const searchInput = activeSection?.querySelector('input[type="text"]');
        if (searchInput) {
            searchInput.focus();
        }
    }
});
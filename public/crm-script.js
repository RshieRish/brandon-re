// CRM Dashboard JavaScript

// Global variables
let pipelineChart = null;
let leadSourcesChart = null;
let performanceChart = null;
let conversionChart = null;

// API utility functions
const API_BASE = '/api/crm';

async function apiRequest(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`API request failed: ${response.status} ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API request error:', error);
        showNotification(`Error: ${error.message}`, 'error');
        throw error;
    }
}

// API functions
const crmAPI = {
    // Contacts
    getContacts: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/contacts${queryString ? '?' + queryString : ''}`);
    },
    getContact: (id) => apiRequest(`/contacts/${id}`),
    createContact: (data) => apiRequest('/contacts', { method: 'POST', body: JSON.stringify(data) }),
    updateContact: (id, data) => apiRequest(`/contacts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteContact: (id) => apiRequest(`/contacts/${id}`, { method: 'DELETE' }),
    
    // Leads
    getLeads: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/leads${queryString ? '?' + queryString : ''}`);
    },
    
    // Opportunities
    getOpportunities: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/opportunities${queryString ? '?' + queryString : ''}`);
    },
    createOpportunity: (data) => apiRequest('/opportunities', { method: 'POST', body: JSON.stringify(data) }),
    updateOpportunity: (id, data) => apiRequest(`/opportunities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    
    // Activities
    getActivities: (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        return apiRequest(`/activities${queryString ? '?' + queryString : ''}`);
    },
    createActivity: (data) => apiRequest('/activities', { method: 'POST', body: JSON.stringify(data) }),
    
    // Dashboard stats
    getStats: () => apiRequest('/stats')
};

// Helper function to format currency values
function formatCurrency(value) {
    if (typeof value === 'string' && value.startsWith('$')) {
        return value;
    }
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value || 0);
}

// Initialize CRM Dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeCharts();
    loadDashboardData();
    initializeModals();
    initializeEventListeners();
    
    // Load initial section
    showSection('dashboard');
});

// Navigation handling
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.admin-nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', async function(e) {
            e.preventDefault();
            
            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Show corresponding section
            const section = this.getAttribute('data-section');
            await showSection(section);
        });
    });
}

// Show specific section
async function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.admin-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show target section
    const targetSection = document.getElementById(`${sectionName}-section`);
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch(sectionName) {
            case 'dashboard':
                await loadDashboardData();
                break;
            case 'contacts':
                await loadContacts();
                break;
            case 'leads':
                await loadLeads();
                break;
            case 'opportunities':
                await loadOpportunities();
                break;
            case 'activities':
                await loadActivities();
                break;
            case 'reports':
                loadReports();
                break;
        }
    }
}

// Initialize Charts
function initializeCharts() {
    // Pipeline Chart
    const pipelineCtx = document.getElementById('pipelineChart');
    if (pipelineCtx) {
        pipelineChart = new Chart(pipelineCtx, {
            type: 'bar',
            data: {
                labels: ['New', 'Contacted', 'Qualified', 'Proposal', 'Closed'],
                datasets: [{
                    label: 'Leads',
                    data: [12, 8, 15, 6, 23],
                    backgroundColor: [
                        '#3b82f6',
                        '#8b5cf6',
                        '#06b6d4',
                        '#f59e0b',
                        '#10b981'
                    ],
                    borderRadius: 6
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: '#f3f4f6'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }
    
    // Lead Sources Chart
    const leadSourcesCtx = document.getElementById('leadSourcesChart');
    if (leadSourcesCtx) {
        leadSourcesChart = new Chart(leadSourcesCtx, {
            type: 'doughnut',
            data: {
                labels: ['Website', 'Referral', 'Social Media', 'Direct'],
                datasets: [{
                    data: [45, 30, 15, 10],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#ef4444'
                    ],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

// Load Dashboard Data
async function loadDashboardData() {
    try {
        // Get dashboard stats from API
        const stats = await crmAPI.getStats();
        
        // Update KPI cards
        document.getElementById('totalContacts').textContent = stats.totalContacts.toLocaleString();
        document.getElementById('activeLeads').textContent = stats.activeLeads;
        document.getElementById('closedDeals').textContent = stats.closedDeals;
        document.getElementById('totalRevenue').textContent = formatCurrency(stats.totalRevenue);
        
        // Load recent activities
        loadRecentActivities();
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        // Set default values on error
        document.getElementById('totalContacts').textContent = '0';
        document.getElementById('activeLeads').textContent = '0';
        document.getElementById('closedDeals').textContent = '0';
        document.getElementById('totalRevenue').textContent = '$0';
    }
}

// Load Recent Activities
async function loadRecentActivities() {
    const activitiesList = document.getElementById('recentActivitiesList');
    if (!activitiesList) return;
    
    try {
        const activities = await crmAPI.getActivities({ limit: 5 });
        
        activitiesList.innerHTML = activities.map(activity => {
            const iconMap = {
                call: 'fa-phone',
                meeting: 'fa-calendar',
                email: 'fa-envelope',
                task: 'fa-tasks'
            };
            
            return `
                <div class="activity-item">
                    <div class="activity-icon">
                        <i class="fas ${iconMap[activity.type] || 'fa-circle'}"></i>
                    </div>
                    <div class="activity-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                    </div>
                    <div class="activity-time">
                        ${formatDate(activity.date)} ${activity.time || ''}
                    </div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading recent activities:', error);
        activitiesList.innerHTML = '<div class="activity-item">No recent activities found</div>';
    }
}

// Load Contacts
async function loadContacts() {
    const tableBody = document.getElementById('contactsTableBody');
    if (!tableBody) return;
    
    try {
        const contacts = await crmAPI.getContacts();
        
        tableBody.innerHTML = contacts.map(contact => `
            <tr>
                <td><strong>${contact.first_name} ${contact.last_name}</strong></td>
                <td>${contact.email}</td>
                <td>${contact.phone}</td>
                <td><span class="status-badge status-${contact.type || 'unknown'}">${contact.type || 'Unknown'}</span></td>
                <td><span class="status-badge status-${contact.status || 'unknown'}">${contact.status || 'Unknown'}</span></td>
                <td>${formatDate(contact.last_contact_date)}</td>
                <td><strong>${formatCurrency(contact.estimated_value)}</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="editContact(${contact.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="contactClient(${contact.id})" title="Contact">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="action-btn danger" onclick="deleteContact(${contact.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading contacts:', error);
        tableBody.innerHTML = '<tr><td colspan="8">Error loading contacts. Please try again.</td></tr>';
    }
}

// Load Leads Pipeline
async function loadLeads() {
    const stages = ['new', 'contacted', 'qualified', 'proposal', 'closed'];
    
    try {
        const leads = await crmAPI.getLeads();
        
        stages.forEach(stage => {
            const stageLeads = leads.filter(lead => lead.stage === stage);
            const cardsContainer = document.getElementById(`${stage}LeadsCards`);
            const countElement = document.getElementById(`${stage}LeadsCount`);
            
            if (countElement) {
                countElement.textContent = stageLeads.length;
            }
            
            if (cardsContainer) {
                cardsContainer.innerHTML = stageLeads.map(lead => `
                    <div class="pipeline-card" data-lead-id="${lead.id}">
                        <h4>${lead.first_name} ${lead.last_name}</h4>
                        <p>${lead.property_interest || 'No property specified'}</p>
                        <div class="pipeline-card-value">${formatCurrency(lead.estimated_value)}</div>
                        <div class="pipeline-card-date">${formatDate(lead.created_at)}</div>
                    </div>
                `).join('');
            }
        });
    } catch (error) {
        console.error('Error loading leads:', error);
        stages.forEach(stage => {
            const cardsContainer = document.getElementById(`${stage}LeadsCards`);
            const countElement = document.getElementById(`${stage}LeadsCount`);
            
            if (countElement) {
                countElement.textContent = '0';
            }
            
            if (cardsContainer) {
                cardsContainer.innerHTML = '<div class="pipeline-card">Error loading leads</div>';
            }
        });
    }
}

// Load Opportunities
async function loadOpportunities() {
    const tableBody = document.getElementById('opportunitiesTableBody');
    if (!tableBody) return;
    
    try {
        const opportunities = await crmAPI.getOpportunities();
        
        tableBody.innerHTML = opportunities.map(opp => `
            <tr>
                <td><strong>${opp.title}</strong></td>
                <td>${opp.contact_name || 'Unknown'}</td>
                <td><strong>${formatCurrency(opp.value)}</strong></td>
                <td><span class="status-badge status-${opp.stage}">${opp.stage}</span></td>
                <td>${opp.probability || 0}%</td>
                <td>${formatDate(opp.expected_close_date)}</td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="editOpportunity(${opp.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="viewOpportunity(${opp.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading opportunities:', error);
        tableBody.innerHTML = '<tr><td colspan="7">Error loading opportunities. Please try again.</td></tr>';
    }
}

// Load Activities
async function loadActivities() {
    const tableBody = document.getElementById('activitiesTableBody');
    if (!tableBody) return;
    
    try {
        const activities = await crmAPI.getActivities();
        
        tableBody.innerHTML = activities.map(activity => `
            <tr>
                <td><span class="status-badge status-${activity.type}">${activity.type}</span></td>
                <td><strong>${activity.title}</strong></td>
                <td>${activity.contact_name || 'Unknown'}</td>
                <td>${formatDate(activity.scheduled_date)}</td>
                <td><span class="status-badge status-${activity.status}">${activity.status}</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="editActivity(${activity.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="viewActivity(${activity.id})" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading activities:', error);
        tableBody.innerHTML = '<tr><td colspan="6">Error loading activities. Please try again.</td></tr>';
    }
}

// Load Reports
function loadReports() {
    // Initialize report charts
    const performanceCtx = document.getElementById('performanceChart');
    if (performanceCtx && !performanceChart) {
        performanceChart = new Chart(performanceCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [65000, 78000, 82000, 95000, 88000, 102000],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toLocaleString();
                            }
                        }
                    }
                }
            }
        });
    }
    
    const conversionCtx = document.getElementById('conversionChart');
    if (conversionCtx && !conversionChart) {
        conversionChart = new Chart(conversionCtx, {
            type: 'funnel',
            data: {
                labels: ['Leads', 'Qualified', 'Proposals', 'Closed'],
                datasets: [{
                    data: [100, 65, 35, 23],
                    backgroundColor: [
                        '#3b82f6',
                        '#8b5cf6',
                        '#f59e0b',
                        '#10b981'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

// Modal handling
function initializeModals() {
    const contactModal = document.getElementById('contactModal');
    const addContactBtn = document.getElementById('addContactBtn');
    const closeContactModal = document.getElementById('closeContactModal');
    const cancelContactBtn = document.getElementById('cancelContactBtn');
    
    if (addContactBtn) {
        addContactBtn.addEventListener('click', () => {
            document.getElementById('contactModalTitle').textContent = 'Add Contact';
            document.getElementById('contactForm').reset();
            contactModal.style.display = 'block';
        });
    }
    
    if (closeContactModal) {
        closeContactModal.addEventListener('click', () => {
            contactModal.style.display = 'none';
        });
    }
    
    if (cancelContactBtn) {
        cancelContactBtn.addEventListener('click', () => {
            contactModal.style.display = 'none';
        });
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target === contactModal) {
            contactModal.style.display = 'none';
        }
    });
    
    // Handle contact form submission
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }
}

// Handle contact form submission
async function handleContactFormSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const contactData = {
        first_name: formData.get('firstName'),
        last_name: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        status: formData.get('status'),
        notes: formData.get('notes'),
        tags: formData.get('type') ? [formData.get('type')] : [],
        estimated_value: 0
    };
    
    try {
        // Add contact via API
        await crmAPI.createContact(contactData);
        
        // Reload contacts table
        await loadContacts();
        
        // Close modal
        document.getElementById('contactModal').style.display = 'none';
        
        // Show success notification
        showNotification('Contact added successfully!', 'success');
    } catch (error) {
        console.error('Error adding contact:', error);
        showNotification('Error adding contact. Please try again.', 'error');
    }
}

// Initialize event listeners
function initializeEventListeners() {
    // Search functionality
    const contactSearch = document.getElementById('contactSearch');
    if (contactSearch) {
        contactSearch.addEventListener('input', filterContacts);
    }
    
    // Filter functionality
    const contactTypeFilter = document.getElementById('contactTypeFilter');
    const contactStatusFilter = document.getElementById('contactStatusFilter');
    
    if (contactTypeFilter) {
        contactTypeFilter.addEventListener('change', filterContacts);
    }
    
    if (contactStatusFilter) {
        contactStatusFilter.addEventListener('change', filterContacts);
    }
    
    // Export buttons
    const exportContactsBtn = document.getElementById('exportContactsBtn');
    if (exportContactsBtn) {
        exportContactsBtn.addEventListener('click', exportContacts);
    }
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to logout?')) {
                window.location.href = 'admin.html';
            }
        });
    }
}

// Filter contacts
function filterContacts() {
    const searchTerm = document.getElementById('contactSearch').value.toLowerCase();
    const typeFilter = document.getElementById('contactTypeFilter').value;
    const statusFilter = document.getElementById('contactStatusFilter').value;
    
    let filteredContacts = mockCRMData.contacts.filter(contact => {
        const matchesSearch = 
            contact.firstName.toLowerCase().includes(searchTerm) ||
            contact.lastName.toLowerCase().includes(searchTerm) ||
            contact.email.toLowerCase().includes(searchTerm) ||
            contact.phone.includes(searchTerm);
        
        const matchesType = !typeFilter || contact.type === typeFilter;
        const matchesStatus = !statusFilter || contact.status === statusFilter;
        
        return matchesSearch && matchesType && matchesStatus;
    });
    
    // Update table with filtered results
    const tableBody = document.getElementById('contactsTableBody');
    if (tableBody) {
        tableBody.innerHTML = filteredContacts.map(contact => `
            <tr>
                <td><strong>${contact.firstName} ${contact.lastName}</strong></td>
                <td>${contact.email}</td>
                <td>${contact.phone}</td>
                <td><span class="status-badge status-${contact.type}">${contact.type}</span></td>
                <td><span class="status-badge status-${contact.status}">${contact.status}</span></td>
                <td>${formatDate(contact.lastContact)}</td>
                <td><strong>${contact.value}</strong></td>
                <td>
                    <div class="action-buttons">
                        <button class="action-btn" onclick="editContact(${contact.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn" onclick="contactClient(${contact.id})" title="Contact">
                            <i class="fas fa-phone"></i>
                        </button>
                        <button class="action-btn danger" onclick="deleteContact(${contact.id})" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }
}

// Action functions
function editContact(contactId) {
    const contact = mockCRMData.contacts.find(c => c.id === contactId);
    if (contact) {
        // Populate form with contact data
        document.getElementById('contactFirstName').value = contact.firstName;
        document.getElementById('contactLastName').value = contact.lastName;
        document.getElementById('contactEmail').value = contact.email;
        document.getElementById('contactPhone').value = contact.phone;
        document.getElementById('contactType').value = contact.type;
        document.getElementById('contactStatus').value = contact.status;
        document.getElementById('contactNotes').value = contact.notes;
        
        // Change modal title
        document.getElementById('contactModalTitle').textContent = 'Edit Contact';
        
        // Show modal
        document.getElementById('contactModal').style.display = 'block';
    }
}

function contactClient(contactId) {
    const contact = mockCRMData.contacts.find(c => c.id === contactId);
    if (contact) {
        showNotification(`Calling ${contact.firstName} ${contact.lastName} at ${contact.phone}`, 'info');
    }
}

function deleteContact(contactId) {
    if (confirm('Are you sure you want to delete this contact?')) {
        const index = mockCRMData.contacts.findIndex(c => c.id === contactId);
        if (index > -1) {
            mockCRMData.contacts.splice(index, 1);
            loadContacts();
            showNotification('Contact deleted successfully!', 'success');
        }
    }
}

function editOpportunity(opportunityId) {
    showNotification('Edit opportunity functionality coming soon!', 'info');
}

function viewOpportunity(opportunityId) {
    showNotification('View opportunity functionality coming soon!', 'info');
}

// Export functions
function exportContacts() {
    const csv = convertToCSV(mockCRMData.contacts);
    downloadCSV(csv, 'contacts.csv');
    showNotification('Contacts exported successfully!', 'success');
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function convertToCSV(data) {
    if (!data.length) return '';
    
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => `"${row[header]}"`).join(','))
    ].join('\n');
    
    return csvContent;
}

function downloadCSV(csv, filename) {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', filename);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
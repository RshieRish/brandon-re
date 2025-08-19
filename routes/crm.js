const express = require('express');
const router = express.Router();
const crmService = require('../services/crmService');

// Contacts endpoints
router.get('/contacts', async (req, res) => {
  try {
    const { search, type, status, limit = 50, offset = 0 } = req.query;
    const contacts = await crmService.getContacts({ search, type, status, limit, offset });
    res.json({
      success: true,
      data: contacts,
      message: 'Contacts retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contacts',
      error: error.message
    });
  }
});

router.get('/contacts/:id', async (req, res) => {
  try {
    const contact = await crmService.getContactById(req.params.id);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    res.json({
      success: true,
      data: contact,
      message: 'Contact retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch contact',
      error: error.message
    });
  }
});

router.post('/contacts', async (req, res) => {
  try {
    const contact = await crmService.createContact(req.body);
    res.status(201).json({
      success: true,
      data: contact,
      message: 'Contact created successfully'
    });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create contact',
      error: error.message
    });
  }
});

router.put('/contacts/:id', async (req, res) => {
  try {
    const contact = await crmService.updateContact(req.params.id, req.body);
    if (!contact) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    res.json({
      success: true,
      data: contact,
      message: 'Contact updated successfully'
    });
  } catch (error) {
    console.error('Error updating contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update contact',
      error: error.message
    });
  }
});

router.delete('/contacts/:id', async (req, res) => {
  try {
    const deleted = await crmService.deleteContact(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        message: 'Contact not found'
      });
    }
    res.json({
      success: true,
      message: 'Contact deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting contact:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete contact',
      error: error.message
    });
  }
});

// Leads endpoints (filtered contacts where is_lead = true)
router.get('/leads', async (req, res) => {
  try {
    const { search, stage, source, limit = 50, offset = 0 } = req.query;
    const leads = await crmService.getLeads({ search, stage, source, limit, offset });
    res.json({
      success: true,
      data: leads,
      message: 'Leads retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leads',
      error: error.message
    });
  }
});

// Opportunities endpoints
router.get('/opportunities', async (req, res) => {
  try {
    const { stage, contact_id, limit = 50, offset = 0 } = req.query;
    const opportunities = await crmService.getOpportunities({ stage, contact_id, limit, offset });
    res.json({
      success: true,
      data: opportunities,
      message: 'Opportunities retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching opportunities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch opportunities',
      error: error.message
    });
  }
});

router.post('/opportunities', async (req, res) => {
  try {
    const opportunity = await crmService.createOpportunity(req.body);
    res.status(201).json({
      success: true,
      data: opportunity,
      message: 'Opportunity created successfully'
    });
  } catch (error) {
    console.error('Error creating opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create opportunity',
      error: error.message
    });
  }
});

router.put('/opportunities/:id', async (req, res) => {
  try {
    const opportunity = await crmService.updateOpportunity(req.params.id, req.body);
    if (!opportunity) {
      return res.status(404).json({
        success: false,
        message: 'Opportunity not found'
      });
    }
    res.json({
      success: true,
      data: opportunity,
      message: 'Opportunity updated successfully'
    });
  } catch (error) {
    console.error('Error updating opportunity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update opportunity',
      error: error.message
    });
  }
});

// Activities endpoints
router.get('/activities', async (req, res) => {
  try {
    const { contact_id, type, status, limit = 50, offset = 0 } = req.query;
    const activities = await crmService.getActivities({ contact_id, type, status, limit, offset });
    res.json({
      success: true,
      data: activities,
      message: 'Activities retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch activities',
      error: error.message
    });
  }
});

router.post('/activities', async (req, res) => {
  try {
    const activity = await crmService.createActivity(req.body);
    res.status(201).json({
      success: true,
      data: activity,
      message: 'Activity created successfully'
    });
  } catch (error) {
    console.error('Error creating activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create activity',
      error: error.message
    });
  }
});

// Dashboard stats endpoint
router.get('/stats', async (req, res) => {
  try {
    const stats = await crmService.getDashboardStats();
    res.json({
      success: true,
      data: stats,
      message: 'Dashboard stats retrieved successfully'
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard stats',
      error: error.message
    });
  }
});

module.exports = router;
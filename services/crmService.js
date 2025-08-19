const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

class CRMService {
  // Contacts methods
  async getContacts({ search, type, status, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        id,
        first_name,
        last_name,
        primary_personal_email as email,
        primary_personal_phone as phone,
        custom_tags,
        stage,
        is_lead,
        source,
        created_at,
        updated_at
      FROM crm_contacts
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (
        LOWER(first_name) LIKE LOWER($${paramCount}) OR 
        LOWER(last_name) LIKE LOWER($${paramCount}) OR 
        LOWER(primary_personal_email) LIKE LOWER($${paramCount}) OR
        primary_personal_phone LIKE $${paramCount}
      )`;
      params.push(`%${search}%`);
    }

    if (type) {
      paramCount++;
      query += ` AND LOWER(custom_tags) LIKE LOWER($${paramCount})`;
      params.push(`%${type}%`);
    }

    if (status) {
      paramCount++;
      query += ` AND LOWER(stage) = LOWER($${paramCount})`;
      params.push(status);
    }

    query += ` ORDER BY updated_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    // Transform data to match frontend expectations
    return result.rows.map(contact => ({
      id: contact.id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.email || '',
      phone: contact.phone || '',
      type: this.extractTypeFromTags(contact.custom_tags),
      status: contact.stage || 'prospect',
      lastContact: contact.updated_at ? contact.updated_at.toISOString().split('T')[0] : '',
      value: '$0', // This would need to be calculated from opportunities
      notes: contact.custom_tags || ''
    }));
  }

  async getContactById(id) {
    const query = `
      SELECT * FROM crm_contacts WHERE id = $1
    `;
    const result = await pool.query(query, [id]);
    
    if (result.rows.length === 0) {
      return null;
    }

    const contact = result.rows[0];
    return {
      id: contact.id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.primary_personal_email || '',
      phone: contact.primary_personal_phone || '',
      type: this.extractTypeFromTags(contact.custom_tags),
      status: contact.stage || 'prospect',
      lastContact: contact.updated_at ? contact.updated_at.toISOString().split('T')[0] : '',
      value: '$0',
      notes: contact.custom_tags || '',
      fullData: contact // Include full contact data for detailed view
    };
  }

  async createContact(contactData) {
    const query = `
      INSERT INTO crm_contacts (
        first_name, last_name, primary_personal_email, primary_personal_phone,
        custom_tags, stage, is_lead, source, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      contactData.firstName,
      contactData.lastName,
      contactData.email,
      contactData.phone,
      contactData.notes || '',
      contactData.status || 'prospect',
      contactData.type === 'lead',
      contactData.source || 'Manual Entry'
    ];

    const result = await pool.query(query, values);
    return this.transformContact(result.rows[0]);
  }

  async updateContact(id, contactData) {
    const query = `
      UPDATE crm_contacts 
      SET 
        first_name = $2,
        last_name = $3,
        primary_personal_email = $4,
        primary_personal_phone = $5,
        custom_tags = $6,
        stage = $7,
        is_lead = $8,
        source = $9,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      contactData.firstName,
      contactData.lastName,
      contactData.email,
      contactData.phone,
      contactData.notes || '',
      contactData.status || 'prospect',
      contactData.type === 'lead',
      contactData.source || 'Manual Entry'
    ];

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? this.transformContact(result.rows[0]) : null;
  }

  async deleteContact(id) {
    const query = `DELETE FROM crm_contacts WHERE id = $1`;
    const result = await pool.query(query, [id]);
    return result.rowCount > 0;
  }

  // Leads methods (contacts where is_lead = true)
  async getLeads({ search, stage, source, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        id,
        first_name,
        last_name,
        primary_personal_email as email,
        primary_personal_phone as phone,
        custom_tags,
        stage,
        source,
        created_at,
        updated_at
      FROM crm_contacts
      WHERE is_lead = true
    `;
    const params = [];
    let paramCount = 0;

    if (search) {
      paramCount++;
      query += ` AND (
        LOWER(first_name) LIKE LOWER($${paramCount}) OR 
        LOWER(last_name) LIKE LOWER($${paramCount}) OR 
        LOWER(primary_personal_email) LIKE LOWER($${paramCount})
      )`;
      params.push(`%${search}%`);
    }

    if (stage) {
      paramCount++;
      query += ` AND LOWER(stage) = LOWER($${paramCount})`;
      params.push(stage);
    }

    if (source) {
      paramCount++;
      query += ` AND LOWER(source) LIKE LOWER($${paramCount})`;
      params.push(`%${source}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    return result.rows.map(lead => ({
      id: lead.id,
      name: `${lead.first_name} ${lead.last_name}`,
      email: lead.email || '',
      phone: lead.phone || '',
      stage: lead.stage || 'new',
      value: '$0', // Would be calculated from opportunities
      source: lead.source || 'Unknown',
      date: lead.created_at ? lead.created_at.toISOString().split('T')[0] : '',
      property: '' // Would need to be linked to opportunities/listings
    }));
  }

  // Opportunities methods
  async getOpportunities({ stage, contact_id, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        o.*,
        c.first_name,
        c.last_name,
        c.primary_personal_email as contact_email
      FROM crm_opportunities o
      LEFT JOIN crm_contacts c ON o.contact_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (stage) {
      paramCount++;
      query += ` AND LOWER(o.stage) = LOWER($${paramCount})`;
      params.push(stage);
    }

    if (contact_id) {
      paramCount++;
      query += ` AND o.contact_id = $${paramCount}`;
      params.push(contact_id);
    }

    query += ` ORDER BY o.created_at DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    return result.rows.map(opp => ({
      id: opp.id,
      name: opp.name,
      contact: `${opp.first_name} ${opp.last_name}`,
      stage: opp.stage || 'prospecting',
      value: opp.value ? `$${parseFloat(opp.value).toLocaleString()}` : '$0',
      probability: opp.probability || 0,
      closeDate: opp.expected_close_date ? opp.expected_close_date.toISOString().split('T')[0] : '',
      source: opp.source || 'Unknown'
    }));
  }

  async createOpportunity(oppData) {
    const query = `
      INSERT INTO crm_opportunities (
        contact_id, name, stage, value, probability, expected_close_date,
        description, source, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      oppData.contact_id,
      oppData.name,
      oppData.stage || 'prospecting',
      oppData.value || 0,
      oppData.probability || 0,
      oppData.closeDate || null,
      oppData.description || '',
      oppData.source || 'Manual Entry'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  async updateOpportunity(id, oppData) {
    const query = `
      UPDATE crm_opportunities 
      SET 
        name = $2,
        stage = $3,
        value = $4,
        probability = $5,
        expected_close_date = $6,
        description = $7,
        source = $8,
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `;
    
    const values = [
      id,
      oppData.name,
      oppData.stage,
      oppData.value,
      oppData.probability,
      oppData.closeDate,
      oppData.description,
      oppData.source
    ];

    const result = await pool.query(query, values);
    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // Activities methods
  async getActivities({ contact_id, type, status, limit = 50, offset = 0 }) {
    let query = `
      SELECT 
        a.*,
        c.first_name,
        c.last_name
      FROM crm_activities a
      LEFT JOIN crm_contacts c ON a.contact_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (contact_id) {
      paramCount++;
      query += ` AND a.contact_id = $${paramCount}`;
      params.push(contact_id);
    }

    if (type) {
      paramCount++;
      query += ` AND LOWER(a.activity_type) = LOWER($${paramCount})`;
      params.push(type);
    }

    if (status) {
      paramCount++;
      query += ` AND LOWER(a.status) = LOWER($${paramCount})`;
      params.push(status);
    }

    query += ` ORDER BY a.activity_date DESC LIMIT $${++paramCount} OFFSET $${++paramCount}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);
    
    return result.rows.map(activity => ({
      id: activity.id,
      type: activity.activity_type,
      subject: activity.subject,
      contact: `${activity.first_name} ${activity.last_name}`,
      date: activity.activity_date ? activity.activity_date.toISOString().split('T')[0] : '',
      status: activity.status || 'pending',
      priority: activity.priority || 'medium',
      description: activity.description || ''
    }));
  }

  async createActivity(activityData) {
    const query = `
      INSERT INTO crm_activities (
        contact_id, activity_type, subject, description, activity_date,
        due_date, status, priority, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `;
    
    const values = [
      activityData.contact_id,
      activityData.type,
      activityData.subject,
      activityData.description || '',
      activityData.date || new Date(),
      activityData.dueDate || null,
      activityData.status || 'pending',
      activityData.priority || 'medium',
      activityData.createdBy || 'System'
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  // Dashboard stats
  async getDashboardStats() {
    const contactsQuery = `
      SELECT 
        COUNT(*) as total_contacts,
        COUNT(CASE WHEN is_lead = true THEN 1 END) as active_leads,
        COUNT(CASE WHEN custom_tags LIKE '%Hot Buyer%' THEN 1 END) as hot_buyers,
        COUNT(CASE WHEN custom_tags LIKE '%Past Buyer%' THEN 1 END) as past_buyers
      FROM crm_contacts
    `;

    const opportunitiesQuery = `
      SELECT 
        COUNT(*) as total_opportunities,
        COUNT(CASE WHEN stage = 'closed-won' THEN 1 END) as closed_deals,
        COALESCE(SUM(CASE WHEN stage = 'closed-won' THEN value END), 0) as total_revenue
      FROM crm_opportunities
    `;

    const activitiesQuery = `
      SELECT COUNT(*) as recent_activities
      FROM crm_activities
      WHERE activity_date >= NOW() - INTERVAL '30 days'
    `;

    const [contactsResult, opportunitiesResult, activitiesResult] = await Promise.all([
      pool.query(contactsQuery),
      pool.query(opportunitiesQuery),
      pool.query(activitiesQuery)
    ]);

    const contacts = contactsResult.rows[0];
    const opportunities = opportunitiesResult.rows[0];
    const activities = activitiesResult.rows[0];

    return {
      totalContacts: parseInt(contacts.total_contacts) || 0,
      activeLeads: parseInt(contacts.active_leads) || 0,
      closedDeals: parseInt(opportunities.closed_deals) || 0,
      totalRevenue: parseFloat(opportunities.total_revenue) || 0,
      recentActivities: parseInt(activities.recent_activities) || 0,
      hotBuyers: parseInt(contacts.hot_buyers) || 0,
      pastBuyers: parseInt(contacts.past_buyers) || 0
    };
  }

  // Helper methods
  extractTypeFromTags(tags) {
    if (!tags) return 'prospect';
    const lowerTags = tags.toLowerCase();
    if (lowerTags.includes('buyer')) return 'buyer';
    if (lowerTags.includes('seller')) return 'seller';
    if (lowerTags.includes('investor')) return 'investor';
    if (lowerTags.includes('referral')) return 'referral';
    return 'prospect';
  }

  transformContact(contact) {
    return {
      id: contact.id,
      firstName: contact.first_name,
      lastName: contact.last_name,
      email: contact.primary_personal_email || '',
      phone: contact.primary_personal_phone || '',
      type: this.extractTypeFromTags(contact.custom_tags),
      status: contact.stage || 'prospect',
      lastContact: contact.updated_at ? contact.updated_at.toISOString().split('T')[0] : '',
      value: '$0',
      notes: contact.custom_tags || ''
    };
  }
}

module.exports = new CRMService();
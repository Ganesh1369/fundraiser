const db = require('../config/db');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * Resolve the project_id to attach to a new event. Falls back to ROOTS so every
 * event has a project (locked decision §14).
 */
const resolveProjectId = async (projectId) => {
    if (projectId) {
        const row = await db.query('SELECT id FROM projects WHERE id = ? AND is_active = true', [projectId]);
        if (row.rows.length > 0) return row.rows[0].id;
    }
    const roots = await db.query("SELECT id FROM projects WHERE slug = 'roots'");
    return roots.rows[0]?.id || null;
};

/**
 * Create a new event
 */
const createEvent = async (eventData) => {
    const {
        event_name, event_type, event_date, event_location,
        description, banner_url, project_id,
        hero_banner_url, schedule, venue_details,
        contact_name, contact_phone, contact_email
    } = eventData;

    const eventId = uuidv4();
    const resolvedProjectId = await resolveProjectId(project_id);
    await db.query(
        `INSERT INTO events (
            id, project_id, event_name, event_type, event_date, event_location,
            description, banner_url, hero_banner_url, schedule, venue_details,
            contact_name, contact_phone, contact_email
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            eventId, resolvedProjectId, event_name, event_type, event_date, event_location,
            description, banner_url, hero_banner_url, schedule, venue_details,
            contact_name, contact_phone, contact_email
        ]
    );

    const result = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    return result.rows[0];
};

/**
 * Get all events (Admin)
 */
const getAllEvents = async ({ page = 1, limit = 20, search, type, projectId }) => {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];

    if (search) {
        whereConditions.push(`e.event_name LIKE ?`);
        params.push(`%${search}%`);
    }

    if (type) {
        whereConditions.push(`e.event_type = ?`);
        params.push(type);
    }

    if (projectId) {
        whereConditions.push(`e.project_id = ?`);
        params.push(projectId);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countResult = await db.query(
        `SELECT COUNT(*) AS count FROM events e ${whereClause}`,
        params
    );

    const result = await db.query(
        `SELECT e.*, p.name AS project_name, p.slug AS project_slug,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.registration_status = 'registered') as registration_count
         FROM events e
         LEFT JOIN projects p ON p.id = e.project_id
         ${whereClause}
         ORDER BY e.event_date DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    const total = parseInt(countResult.rows[0].count);

    return {
        events: result.rows.map(e => ({
            ...e,
            registration_count: parseInt(e.registration_count)
        })),
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Get single event details with stats (Admin)
 */
const getEventById = async (id) => {
    const result = await db.query(
        `SELECT e.*, p.name AS project_name, p.slug AS project_slug,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.registration_status = 'registered') as registration_count
         FROM events e
         LEFT JOIN projects p ON p.id = e.project_id
         WHERE e.id = ?`,
        [id]
    );

    if (result.rows.length === 0) throw { status: 404, message: 'Event not found' };
    return { ...result.rows[0], registration_count: parseInt(result.rows[0].registration_count) };
};

/**
 * Update event details
 */
const updateEvent = async (id, eventData) => {
    const {
        event_name, event_type, event_date, event_location,
        description, banner_url, project_id,
        hero_banner_url, schedule, venue_details,
        contact_name, contact_phone, contact_email
    } = eventData;

    const updateResult = await db.query(
        `UPDATE events
         SET event_name = COALESCE(?, event_name),
             event_type = COALESCE(?, event_type),
             event_date = COALESCE(?, event_date),
             event_location = COALESCE(?, event_location),
             description = COALESCE(?, description),
             banner_url = COALESCE(?, banner_url),
             project_id = COALESCE(?, project_id),
             hero_banner_url = COALESCE(?, hero_banner_url),
             schedule = COALESCE(?, schedule),
             venue_details = COALESCE(?, venue_details),
             contact_name = COALESCE(?, contact_name),
             contact_phone = COALESCE(?, contact_phone),
             contact_email = COALESCE(?, contact_email)
         WHERE id = ?`,
        [
            event_name, event_type, event_date, event_location,
            description, banner_url, project_id,
            hero_banner_url, schedule, venue_details,
            contact_name, contact_phone, contact_email, id
        ]
    );

    if (updateResult.rowCount === 0) throw { status: 404, message: 'Event not found' };
    const result = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    return result.rows[0];
};

/**
 * Toggle event registration status
 */
const toggleEventRegistration = async (id) => {
    const updateResult = await db.query(
        `UPDATE events
         SET registration_open = NOT registration_open
         WHERE id = ?`,
        [id]
    );

    if (updateResult.rowCount === 0) throw { status: 404, message: 'Event not found' };
    const result = await db.query('SELECT * FROM events WHERE id = ?', [id]);
    return result.rows[0];
};

/**
 * Get registrations for an event (Admin)
 */
const getEventRegistrations = async (eventId, { page = 1, limit = 20, search }) => {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const params = [eventId];
    let whereConditions = ['er.event_id = ?'];

    if (search) {
        whereConditions.push(`(u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`);
        params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const whereClause = 'WHERE ' + whereConditions.join(' AND ');

    const countResult = await db.query(
        `SELECT COUNT(*) AS count FROM event_registrations er
         JOIN users u ON er.user_id = u.id
         ${whereClause}`,
        params
    );

    const result = await db.query(
        `SELECT er.*, u.name, u.email, u.phone
         FROM event_registrations er
         JOIN users u ON er.user_id = u.id
         ${whereClause}
         ORDER BY er.created_at DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    const total = parseInt(countResult.rows[0].count);

    return {
        registrations: result.rows,
        pagination: {
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit)
        }
    };
};

/**
 * Export event registrations to Excel
 */
const exportEventRegistrations = async (eventId) => {
    const result = await db.query(
        `SELECT u.name as "Name", u.email as "Email", u.phone as "Phone",
                er.date_of_birth as "DOB", er.gender as "Gender", er.blood_group as "Blood Group",
                er.registration_status as "Status", er.created_at as "Registered At"
         FROM event_registrations er
         JOIN users u ON er.user_id = u.id
         WHERE er.event_id = ?
         ORDER BY er.created_at DESC`,
        [eventId]
    );

    const workbook = xlsx.utils.book_new();
    const worksheet = xlsx.utils.json_to_sheet(result.rows);
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Registrations');
    return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
};

/**
 * Get active events (Public)
 */
const getActiveEvents = async () => {
    const result = await db.query(
        `SELECT e.id, e.event_name, e.event_type, e.event_date, e.event_location,
                e.description, e.banner_url, e.hero_banner_url, e.project_id,
                p.name AS project_name, p.slug AS project_slug
         FROM events e
         LEFT JOIN projects p ON p.id = e.project_id
         WHERE e.is_active = true AND e.registration_open = true
         ORDER BY e.event_date ASC`
    );
    return result.rows;
};

/**
 * Get public event details
 */
const getEventDetails = async (id) => {
    const result = await db.query(
        `SELECT e.id, e.event_name, e.event_type, e.event_date, e.event_location,
                e.description, e.banner_url, e.hero_banner_url, e.schedule, e.venue_details,
                e.contact_name, e.contact_phone, e.contact_email,
                e.registration_open, e.project_id,
                p.name AS project_name, p.slug AS project_slug
         FROM events e
         LEFT JOIN projects p ON p.id = e.project_id
         WHERE e.id = ? AND e.is_active = true`,
        [id]
    );

    if (result.rows.length === 0) throw { status: 404, message: 'Event not found' };
    return result.rows[0];
};

/**
 * Calculate age from date of birth
 */
const calculateAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;
    const dob = new Date(dateOfBirth);
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
};

/**
 * Generate unique referral code (Internal Helper)
 */
const generateReferralCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = 'FR';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

/**
 * Register for event (Public - Handles New/Existing User)
 */
const registerForEvent = async (eventId, registrationData) => {
    const {
        // User Account Fields
        name, email, phone, password, confirmPassword, user_type, referralCode,

        // Personal Details
        date_of_birth, gender, blood_group,

        // Emergency Contact
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,

        // Other
        experience_level, medical_conditions, allergies, on_medication,
        address_line_1, address_line_2, city, state, pin_code,
        fitness_declaration, terms_accepted,
        // Legacy/alternate field names from older frontend forms — accept both
        address, pincode
    } = registrationData;

    // Normalize optional fields so missing values don't break NOT NULL constraints
    // (event_registrations.on_medication / fitness_declaration / terms_accepted are NOT NULL DEFAULT).
    const safe = {
        on_medication: on_medication ?? false,
        fitness_declaration: fitness_declaration ?? false,
        terms_accepted: terms_accepted ?? true,
        allergies: allergies ?? null,
        emergency_contact_relationship: emergency_contact_relationship ?? null,
        medical_conditions: medical_conditions ?? null,
        blood_group: blood_group ?? null,
        address_line_1: address_line_1 ?? address ?? null,
        address_line_2: address_line_2 ?? null,
        pin_code: pin_code ?? pincode ?? null,
        state: state ?? null,
        experience_level: experience_level ?? 'beginner'
    };

    // 1. Validate Event
    const eventCheck = await db.query(
        'SELECT id, registration_open FROM events WHERE id = ? AND is_active = true',
        [eventId]
    );
    if (eventCheck.rows.length === 0) throw { status: 404, message: 'Event not found' };
    if (!eventCheck.rows[0].registration_open) throw { status: 400, message: 'Registration is closed for this event' };

    // 2. Check User Existence
    const userCheck = await db.query(
        'SELECT * FROM users WHERE email = ? OR phone = ?',
        [email.toLowerCase(), phone]
    );

    let user;
    let userId;
    let isNewUser = false;

    if (userCheck.rows.length > 0) {
        // Existing User
        user = userCheck.rows[0];
        userId = user.id;

        // Verify Password
        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) {
            throw { status: 401, message: 'User exists. Invalid password.' };
        }

        // Check for duplicate registration
        const dupCheck = await db.query(
            'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ?',
            [eventId, userId]
        );
        if (dupCheck.rows.length > 0) {
            throw { status: 400, message: 'You are already registered for this event.' };
        }

    } else {
        // New User
        isNewUser = true;

        if (confirmPassword && password !== confirmPassword) {
            throw { status: 400, message: 'Passwords do not match' };
        }

        const passwordHash = await bcrypt.hash(password, 12);

        // Generate Referral Code
        let newReferralCode;
        let isUnique = false;
        while (!isUnique) {
            newReferralCode = generateReferralCode();
            const codeCheck = await db.query('SELECT id FROM users WHERE referral_code = ?', [newReferralCode]);
            if (codeCheck.rows.length === 0) isUnique = true;
        }

        // Audit M4: capture referrer if a valid referral code was provided.
        let referrerId = null;
        if (referralCode) {
            const refRow = await db.query('SELECT id FROM users WHERE referral_code = ?', [String(referralCode).toUpperCase()]);
            if (refRow.rows.length > 0) referrerId = refRow.rows[0].id;
        }

        // Create User
        const validTypes = ['individual', 'student', 'organization'];
        const selectedType = validTypes.includes(user_type) ? user_type : 'individual';
        const age = calculateAge(date_of_birth);
        const newUserId = uuidv4();
        await db.query(
            `INSERT INTO users (id, user_type, name, email, phone, password_hash, referral_code, city, age, email_verified, referred_by, enrolled_via_event_id)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true, ?, ?)`,
            [newUserId, selectedType, name, email.toLowerCase(), phone, passwordHash, newReferralCode, city, age, referrerId, eventId]
        );
        const newUserResult = await db.query('SELECT * FROM users WHERE id = ?', [newUserId]);
        user = newUserResult.rows[0];
        userId = user.id;
    }

    // 3. Create Event Registration
    await db.query(
        `INSERT INTO event_registrations (
            event_id, user_id, date_of_birth, gender, blood_group,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            experience_level, medical_conditions, allergies, on_medication,
            address_line_1, address_line_2, city, state, pin_code,
            fitness_declaration, terms_accepted
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            eventId, userId, date_of_birth, gender, safe.blood_group,
            emergency_contact_name, emergency_contact_phone, safe.emergency_contact_relationship,
            safe.experience_level, safe.medical_conditions, safe.allergies, safe.on_medication,
            safe.address_line_1, safe.address_line_2, city, safe.state, safe.pin_code,
            safe.fitness_declaration, safe.terms_accepted
        ]
    );

    // For existing users: set enrolled_via_event_id if still unset (idempotent).
    if (!isNewUser) {
        await db.query(
            'UPDATE users SET enrolled_via_event_id = ? WHERE id = ? AND enrolled_via_event_id IS NULL',
            [eventId, userId]
        );
    }

    // 4. Generate Token
    const token = jwt.sign(
        { userId: user.id, userType: user.user_type },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return {
        message: 'Registration successful',
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            userType: user.user_type,
            referralCode: user.referral_code,
            referralPoints: user.referral_points || 0
        },
        token,
        isNewUser
    };
};

module.exports = {
    createEvent,
    getAllEvents,
    getEventById,
    updateEvent,
    toggleEventRegistration,
    getEventRegistrations,
    exportEventRegistrations,
    getActiveEvents,
    getEventDetails,
    registerForEvent
};

const db = require('../config/db');
const xlsx = require('xlsx');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

/**
 * Create a new event
 */
const createEvent = async (eventData) => {
    const {
        event_name, event_type, event_date, event_location,
        description, banner_url
    } = eventData;

    const eventId = uuidv4();
    await db.query(
        `INSERT INTO events (id, event_name, event_type, event_date, event_location, description, banner_url)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [eventId, event_name, event_type, event_date, event_location, description, banner_url]
    );

    const result = await db.query('SELECT * FROM events WHERE id = ?', [eventId]);
    return result.rows[0];
};

/**
 * Get all events (Admin)
 */
const getAllEvents = async ({ page = 1, limit = 20, search, type }) => {
    page = parseInt(page); limit = parseInt(limit);
    const offset = (page - 1) * limit;
    const params = [];
    let whereConditions = [];

    if (search) {
        whereConditions.push(`event_name LIKE ?`);
        params.push(`%${search}%`);
    }

    if (type) {
        whereConditions.push(`event_type = ?`);
        params.push(type);
    }

    const whereClause = whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : '';

    const countResult = await db.query(`SELECT COUNT(*) FROM events ${whereClause}`, params);

    const result = await db.query(
        `SELECT e.*,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.registration_status = 'registered') as registration_count
         FROM events e
         ${whereClause}
         ORDER BY e.event_date DESC
         LIMIT ${limit} OFFSET ${offset}`,
        params
    );

    return {
        events: result.rows.map(e => ({
            ...e,
            registration_count: parseInt(e.registration_count)
        })),
        pagination: {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
        }
    };
};

/**
 * Get single event details with stats (Admin)
 */
const getEventById = async (id) => {
    const result = await db.query(
        `SELECT e.*,
            (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id AND er.registration_status = 'registered') as registration_count
         FROM events e WHERE e.id = ?`,
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
        description, banner_url
    } = eventData;

    const updateResult = await db.query(
        `UPDATE events
         SET event_name = COALESCE(?, event_name),
             event_type = COALESCE(?, event_type),
             event_date = COALESCE(?, event_date),
             event_location = COALESCE(?, event_location),
             description = COALESCE(?, description),
             banner_url = COALESCE(?, banner_url)
         WHERE id = ?`,
        [event_name, event_type, event_date, event_location, description, banner_url, id]
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
        `SELECT COUNT(*) FROM event_registrations er
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

    return {
        registrations: result.rows,
        pagination: {
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(countResult.rows[0].count / limit)
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
        `SELECT id, event_name, event_type, event_date, event_location, description, banner_url
         FROM events
         WHERE is_active = true AND registration_open = true
         ORDER BY event_date ASC`
    );
    return result.rows;
};

/**
 * Get public event details
 */
const getEventDetails = async (id) => {
    const result = await db.query(
        `SELECT id, event_name, event_type, event_date, event_location, description, banner_url, registration_open
         FROM events
         WHERE id = ? AND is_active = true`,
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
        name, email, phone, password, confirmPassword, user_type,

        // Personal Details
        date_of_birth, gender, blood_group,

        // Emergency Contact
        emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,

        // Other
        experience_level, medical_conditions, allergies, on_medication,
        address_line_1, address_line_2, city, state, pin_code,
        fitness_declaration, terms_accepted
    } = registrationData;

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

        const passwordHash = await bcrypt.hash(password, 16);

        // Generate Referral Code
        let newReferralCode;
        let isUnique = false;
        while (!isUnique) {
            newReferralCode = generateReferralCode();
            const codeCheck = await db.query('SELECT id FROM users WHERE referral_code = ?', [newReferralCode]);
            if (codeCheck.rows.length === 0) isUnique = true;
        }

        // Create User
        const validTypes = ['individual', 'student', 'organization'];
        const selectedType = validTypes.includes(user_type) ? user_type : 'individual';
        const age = calculateAge(date_of_birth);
        const newUserId = uuidv4();
        await db.query(
            `INSERT INTO users (id, user_type, name, email, phone, password_hash, referral_code, city, age, email_verified)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
            [newUserId, selectedType, name, email.toLowerCase(), phone, passwordHash, newReferralCode, city, age]
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
            eventId, userId, date_of_birth, gender, blood_group,
            emergency_contact_name, emergency_contact_phone, emergency_contact_relationship,
            experience_level, medical_conditions, allergies, on_medication,
            address_line_1, address_line_2, city, state, pin_code,
            fitness_declaration, terms_accepted
        ]
    );

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

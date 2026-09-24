const db = require('../config/db');
// Google reCAPTCHA v3, shared with the CSR enquiry form.
const recaptcha = require('./utils/recaptcha');

/**
 * Volunteer registrations from the public volunteer page.
 */

// ── Reference numbers ────────────────────────────────────────────────────────

/**
 * Next sequential reference for the year, e.g. ICE-VOL-2026-0001.
 *
 * LAST_INSERT_ID(expr) makes the read-modify-write a single atomic statement, so two
 * simultaneous registrations can never be handed the same number.
 */
const nextVolunteerId = async (conn, year) => {
    await conn.query(
        `INSERT INTO volunteer_counters (year, last_seq)
         VALUES (?, LAST_INSERT_ID(1))
         ON DUPLICATE KEY UPDATE last_seq = LAST_INSERT_ID(last_seq + 1)`,
        [year]
    );
    // db.getClient() wraps query() to return { rows, rowCount } — not mysql2's [rows, fields].
    const result = await conn.query('SELECT LAST_INSERT_ID() AS seq');
    return `ICE-VOL-${year}-${String(Number(result.rows[0].seq)).padStart(4, '0')}`;
};

// ── Validation ───────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^(?:\+?91[\s-]?)?[0-9][0-9\s-]{7,14}$/;
const PINCODE_RE = /^[1-9][0-9]{5}$/;

const OCCUPATIONS = ['student', 'working', 'other'];
const MIN_AGE = 16;
const MAX_HOURS = 60;

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const bool = (v) => v === true || v === 'true' || v === '1' || v === 1;
const digitsOf = (v) => str(v).replace(/\D/g, '');

/** Whole years between a date of birth and today. */
const ageFrom = (dob, today = new Date()) => {
    const born = new Date(dob);
    let age = today.getFullYear() - born.getFullYear();
    const monthDelta = today.getMonth() - born.getMonth();
    if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < born.getDate())) age -= 1;
    return age;
};

/**
 * Field-level validation mirroring the form's inline errors. Returns a { field: message }
 * map so each message can be attached to its own input.
 */
const validate = (body) => {
    const errors = {};

    const fullName = str(body.fullName);
    const email = str(body.email).toLowerCase();
    const phone = str(body.phone);
    const city = str(body.city);
    const pincode = str(body.pincode);
    const occupation = str(body.occupationType);
    const institution = str(body.institution);
    const area = str(body.areaOfInterest);

    if (fullName.length < 2) errors.fullName = 'Full name is required.';
    else if (fullName.length > 150) errors.fullName = 'Full name is too long.';

    if (!body.dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required.';
    } else {
        const dob = new Date(body.dateOfBirth);
        if (Number.isNaN(dob.getTime())) errors.dateOfBirth = 'Enter a valid date of birth.';
        else if (dob > new Date()) errors.dateOfBirth = 'Date of birth cannot be in the future.';
        else if (ageFrom(body.dateOfBirth) < MIN_AGE) errors.dateOfBirth = `Volunteers must be at least ${MIN_AGE} years old.`;
        else if (ageFrom(body.dateOfBirth) > 100) errors.dateOfBirth = 'Please check the date of birth.';
    }

    if (!EMAIL_RE.test(email)) errors.email = 'Enter a valid email address.';
    else if (email.length > 255) errors.email = 'Email address is too long.';

    const phoneDigits = digitsOf(phone);
    if (!PHONE_RE.test(phone) || phoneDigits.length < 10 || phoneDigits.length > 12) {
        errors.phone = 'Enter a valid phone number (10 digits, optionally +91).';
    }

    if (city.length < 2) errors.city = 'City is required.';
    else if (city.length > 100) errors.city = 'City name is too long.';

    // Everything below up to consent is optional on the public form: blank is accepted,
    // anything given is still checked.
    if (pincode && !PINCODE_RE.test(pincode)) errors.pincode = 'Enter a valid 6-digit pincode.';

    if (occupation && !OCCUPATIONS.includes(occupation)) errors.occupationType = 'Select your occupation type.';

    if (institution.length > 200) errors.institution = 'This is too long.';

    const weekday = bool(body.availableWeekday);
    const weekend = bool(body.availableWeekend);

    const rawHours = str(String(body.hoursPerWeek ?? ''));
    const hours = rawHours === '' ? null : Number(rawHours);
    if (hours !== null) {
        if (!Number.isFinite(hours) || hours < 1) errors.hoursPerWeek = 'Enter how many hours a week you can give.';
        else if (hours > MAX_HOURS) errors.hoursPerWeek = `That is more than ${MAX_HOURS} hours a week — please check.`;
    }

    if (area.length > 150) errors.areaOfInterest = 'Area of interest is too long.';

    // Student-only fields, kept only while "student" is the answer.
    const collegeName = str(body.collegeName);
    const course = str(body.course);
    if (collegeName.length > 200) errors.collegeName = 'This is too long.';
    if (course.length > 150) errors.course = 'This is too long.';

    // Emergency contact is no longer collected by the public form, but staff can still
    // record one; when a number is given it must be a real one and not the volunteer's own.
    const emName = str(body.emergencyName);
    const emRel = str(body.emergencyRelationship);
    const emPhone = str(body.emergencyPhone);
    if (emPhone) {
        const emDigits = digitsOf(emPhone);
        if (!PHONE_RE.test(emPhone) || emDigits.length < 10 || emDigits.length > 12) {
            errors.emergencyPhone = 'Enter a valid emergency contact number.';
        } else if (emDigits.slice(-10) === phoneDigits.slice(-10)) {
            // Compared on the last 10 digits so "+91 98765 43210" and "9876543210" are seen
            // as one number, matching how findDuplicate() normalises phones.
            errors.emergencyPhone = 'Emergency contact must differ from your own number.';
        }
    }

    // Consent. Data use is required; photo/media is genuinely optional.
    if (!bool(body.consentDataUse)) errors.consentDataUse = 'You must consent to how we use your data.';

    const languages = str(body.languages);
    const message = str(body.message);
    if (languages.length > 255) errors.languages = 'This is too long.';
    if (message.length > 2000) errors.message = 'Message is too long (2000 characters max).';

    return {
        errors,
        clean: {
            full_name: fullName,
            date_of_birth: body.dateOfBirth,
            email,
            phone,
            city,
            pincode: pincode || null,
            occupation_type: occupation || null,
            institution: institution || null,
            available_weekday: weekday,
            available_weekend: weekend,
            hours_per_week: hours === null ? null : Math.round(hours),
            area_of_interest: area || null,
            role_of_interest: str(body.roleOfInterest) || null,
            // Student fields are cleared for non-students so a changed answer cannot leave
            // stale college details behind.
            college_name: occupation === 'student' ? collegeName || null : null,
            course: occupation === 'student' ? course || null : null,
            languages: languages || null,
            message: message || null,
            emergency_name: emName || null,
            emergency_relationship: emRel || null,
            emergency_phone: emPhone || null,
            consent_data_use: bool(body.consentDataUse),
            consent_photo_media: bool(body.consentPhotoMedia),
        },
    };
};

// ── Duplicate detection ──────────────────────────────────────────────────────

/**
 * Reject a repeat registration on email or phone.
 *
 * Phone is compared on digits only, so "+91 98765 43210" and "9876543210" are recognised
 * as the same person rather than slipping through as two records.
 */
const findDuplicate = async (email, phone) => {
    const errors = {};

    const byEmail = await db.query('SELECT volunteer_id FROM volunteers WHERE email = ?', [email]);
    if (byEmail.rows.length) {
        errors.email = `This email is already registered (${byEmail.rows[0].volunteer_id}).`;
    }

    const digits = digitsOf(phone).slice(-10);
    const byPhone = await db.query(
        `SELECT volunteer_id FROM volunteers
         WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', ''), 10) = ?`,
        [digits]
    );
    if (byPhone.rows.length) {
        errors.phone = `This phone number is already registered (${byPhone.rows[0].volunteer_id}).`;
    }

    return errors;
};

// ── Create ───────────────────────────────────────────────────────────────────

/**
 * `meta.viaAdmin` marks a registration typed in by ICE staff from the admin panel. It
 * comes from the route the request arrived on — never from the request body — so a
 * public caller cannot label its own registration as staff-entered. Admin entry skips only
 * the honeypot, which makes sense against an anonymous visitor alone; the captcha
 * is required on both paths.
 */
const create = async (body, files = {}, meta = {}) => {
    const viaAdmin = meta.viaAdmin === true;

    if (!viaAdmin) {
        // Honeypot: a real person never fills a field that is hidden from them.
        if (str(body.website)) throw { status: 400, message: 'Submission rejected.' };
    }

    // Verified on admin entry too: the panel's form shows the checkbox on both paths,
    // so a missing or replayed token is a genuine failure, not a staff exemption.
    const captcha = await recaptcha.verify(body.recaptchaToken, 'volunteer_registration', meta.ip);
    if (!captcha.ok) {
        throw { status: 400, message: recaptcha.failureMessage(captcha.reason) };
    }

    const { errors, clean } = validate(body);
    if (Object.keys(errors).length) {
        throw { status: 422, message: 'Please correct the highlighted fields.', errors };
    }

    const duplicates = await findDuplicate(clean.email, clean.phone);
    if (Object.keys(duplicates).length) {
        throw { status: 409, message: 'You appear to be registered already.', errors: duplicates };
    }

    const photo = files.photo?.[0] || null;
    const idProof = files.idProof?.[0] || null;

    const conn = await db.getClient();
    try {
        await conn.beginTransaction();
        const volunteerId = await nextVolunteerId(conn, new Date().getFullYear());

        await conn.query(
            `INSERT INTO volunteers
                (volunteer_id, full_name, date_of_birth, email, phone, city, pincode,
                 occupation_type, institution, available_weekday, available_weekend,
                 hours_per_week, area_of_interest, role_of_interest, college_name, course,
                 languages, message, emergency_name, emergency_relationship, emergency_phone,
                 consent_data_use, consent_photo_media,
                 photo_stored_name, photo_original_name, photo_mime_type, photo_size_bytes,
                 id_proof_stored_name, id_proof_original_name, id_proof_mime_type, id_proof_size_bytes,
                 source_ip, user_agent, submitted_via)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                volunteerId, clean.full_name, clean.date_of_birth, clean.email, clean.phone,
                clean.city, clean.pincode, clean.occupation_type, clean.institution,
                clean.available_weekday, clean.available_weekend, clean.hours_per_week,
                clean.area_of_interest, clean.role_of_interest, clean.college_name, clean.course,
                clean.languages, clean.message, clean.emergency_name, clean.emergency_relationship,
                clean.emergency_phone, clean.consent_data_use,
                clean.consent_photo_media,
                photo?.filename || null, photo?.originalname || null, photo?.mimetype || null, photo?.size || null,
                idProof?.filename || null, idProof?.originalname || null, idProof?.mimetype || null, idProof?.size || null,
                meta.ip || null, (meta.userAgent || '').slice(0, 255) || null,
                viaAdmin ? 'ice' : 'self',
            ]
        );

        await conn.commit();

        const created = await db.query('SELECT * FROM volunteers WHERE volunteer_id = ?', [volunteerId]);
        return created.rows[0];
    } catch (err) {
        await conn.rollback();
        // The unique indexes are the race guard behind findDuplicate; translate a hit into
        // the same per-field message rather than a raw 500.
        if (err?.code === 'ER_DUP_ENTRY') {
            const field = /email/i.test(err.message) ? 'email' : 'phone';
            throw {
                status: 409,
                message: 'You appear to be registered already.',
                errors: { [field]: `This ${field} is already registered.` },
            };
        }
        throw err;
    } finally {
        conn.release();
    }
};

module.exports = {
    create,
    validate,
    findDuplicate,
    ageFrom,
    OCCUPATIONS,
    MIN_AGE,
};

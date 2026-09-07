const csrEnquiryService = require('../services/csr-enquiry.service');
const csrEnquiryEmailService = require('../services/csr-enquiry-email.service');

const handleError = (res, next, error) => {
    if (error?.status) {
        const body = { success: false, message: error.message };
        // Field-level messages so the form can attach each one to its own input.
        if (error.errors) body.errors = error.errors;
        return res.status(error.status).json(body);
    }
    next(error);
};

// ── Public ───────────────────────────────────────────────────────────────────

/**
 * Record a CSR enquiry and return its reference number.
 *
 * Notifications are fired after the response is composed: a submitter must get their
 * reference even if SMTP is unavailable.
 */
exports.create = async (req, res, next) => {
    try {
        const enquiry = await csrEnquiryService.create(req.body, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
        });

        res.status(201).json({
            success: true,
            message: 'Enquiry received',
            data: {
                csrId: enquiry.csr_id,
                companyName: enquiry.company_name,
                contactPerson: enquiry.contact_person,
                email: enquiry.email,
                projectName: enquiry.project_name || null,
            },
        });

        csrEnquiryEmailService.notifyNewEnquiry(enquiry);
    } catch (error) { handleError(res, next, error); }
};

// ── Admin: record an enquiry taken off-line ──────────────────────────────────

/**
 * Same form as the public one, entered by staff for an enquiry that arrived by phone,
 * email or in person. `viaAdmin` is set here rather than read from the body, so only a
 * request that got past verifyAdmin can be stamped as staff-entered.
 */
exports.adminCreate = async (req, res, next) => {
    try {
        const enquiry = await csrEnquiryService.create(req.body, {
            ip: req.ip,
            userAgent: req.get('user-agent'),
            viaAdmin: true,
        });

        res.status(201).json({
            success: true,
            message: 'Enquiry recorded',
            data: {
                csrId: enquiry.csr_id,
                companyName: enquiry.company_name,
                contactPerson: enquiry.contact_person,
                email: enquiry.email,
                projectName: enquiry.project_name || null,
            },
        });

        csrEnquiryEmailService.notifyNewEnquiry(enquiry);
    } catch (error) { handleError(res, next, error); }
};

// ── Admin: email templates ───────────────────────────────────────────────────

exports.adminListTemplates = async (req, res, next) => {
    try {
        const templates = await csrEnquiryEmailService.getAll();
        // Ship the detail-row options with the templates so the editor renders checkboxes
        // from the server's own list — an admin never types a field key.
        const detailFieldOptions = Object.entries(csrEnquiryEmailService.DETAIL_LABELS)
            .map(([key, label]) => ({ key, label }));
        res.json({ success: true, data: { templates: Object.values(templates), detailFieldOptions } });
    } catch (error) { handleError(res, next, error); }
};

exports.adminUpdateTemplate = async (req, res, next) => {
    try {
        const template = await csrEnquiryEmailService.updateOne(
            req.params.key,
            req.body,
            req.admin?.id
        );
        res.json({ success: true, message: 'Template saved', data: template });
    } catch (error) { handleError(res, next, error); }
};

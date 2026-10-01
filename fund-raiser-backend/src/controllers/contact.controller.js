const contactService = require('../services/contact.service');
const contactEmailService = require('../services/contact-email.service');

const handleError = (res, next, error) => {
    if (error?.status) {
        const body = { success: false, message: error.message };
        // Field-level messages so the form can attach each one to its own input.
        if (error.errors) body.errors = error.errors;
        return res.status(error.status).json(body);
    }
    next(error);
};

/**
 * Take a message from the home-page contact form and email it to ICE.
 *
 * The message is not stored, so — unlike the CSR and volunteer forms — the response waits
 * for the email: a sender must not be told "sent" when nothing reached anyone.
 */
exports.create = async (req, res, next) => {
    try {
        const msg = await contactService.prepare(req.body, req.files || {}, { ip: req.ip });

        try {
            await contactEmailService.deliver(msg);
        } catch (err) {
            console.error(`Contact message from ${msg.email}: internal alert FAILED —`, err?.message || err);
            return res.status(502).json({
                success: false,
                message: 'We could not send your message just now. Please try again in a few minutes, or email us directly.',
            });
        }

        res.status(201).json({
            success: true,
            message: 'Message sent',
            data: { fullName: msg.full_name, branch: msg.branch },
        });
    } catch (error) { handleError(res, next, error); }
};

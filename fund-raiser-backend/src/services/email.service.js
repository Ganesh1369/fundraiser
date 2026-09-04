const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Verify transporter on startup
transporter.verify()
    .then(() => console.log('SMTP connection verified'))
    .catch(err => console.warn('SMTP not configured:', err.message));

// Shared email wrapper
const emailWrapper = (content) => `
    <div style="font-family: 'DM Sans', 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 0; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <div style="background: #102a43; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">
                <span style="color: #22c55e;">ICE</span> Network
            </h1>
            <p style="color: rgba(255,255,255,0.6); margin: 4px 0 0; font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px;">ICE — Institute for Climate and Environment</p>
        </div>
        <div style="padding: 32px;">
            ${content}
        </div>
        <div style="padding: 16px 32px; border-top: 1px solid #f0f0f0; text-align: center;">
            <p style="color: #a3a3a3; font-size: 11px; margin: 0;">ICE Network &middot; It Matters &trade;</p>
        </div>
    </div>
`;

/**
 * Send OTP email for registration
 */
const sendOtpEmail = async (to, otp) => {
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: "Verify Your Email — ICE Network",
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 4px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Email Verification</p>
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 28px; text-align: center; margin: 20px 0;">
                <p style="color: #171717; margin: 0 0 12px; font-size: 14px;">Your verification code:</p>
                <h2 style="color: #16a34a; margin: 0; font-size: 38px; letter-spacing: 8px; font-weight: 700;">${otp}</h2>
            </div>
            <p style="color: #737373; font-size: 13px; text-align: center; margin: 0;">This code expires in <strong style="color: #171717;">10 minutes</strong>. Do not share it with anyone.</p>
        `)
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send password reset OTP email
 */
const sendPasswordResetEmail = async (to, otp) => {
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: "Reset Your Password — ICE Network",
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 4px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Password Reset</p>
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 28px; text-align: center; margin: 20px 0;">
                <p style="color: #171717; margin: 0 0 12px; font-size: 14px;">Your reset code:</p>
                <h2 style="color: #16a34a; margin: 0; font-size: 38px; letter-spacing: 8px; font-weight: 700;">${otp}</h2>
            </div>
            <p style="color: #737373; font-size: 13px; text-align: center; margin: 0;">This code expires in <strong style="color: #171717;">10 minutes</strong>. If you didn't request this, ignore this email.</p>
        `)
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send donation confirmation email
 */
// opts (optional): { trees, attachments }
//   trees       - number of trees this donation funded; when > 0 a tree line is
//                 shown and the email notes the attached certificate.
//   attachments - nodemailer attachments array (e.g. the tree-donation certificate PDF).
const sendDonationConfirmationEmail = async (to, name, amount, paymentId, date, opts = {}) => {
    const { trees = 0, attachments = [] } = opts;
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    const formattedDate = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const treesBlock = trees > 0 ? `
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 18px; margin: 0 0 20px; text-align: center;">
                <p style="color: #16a34a; margin: 0 0 4px; font-size: 22px; font-weight: 700;">🌳 ${trees} tree${trees === 1 ? '' : 's'}</p>
                <p style="color: #525252; margin: 0; font-size: 13px;">Thank you for donating towards planting <strong>${trees} tree${trees === 1 ? '' : 's'}</strong> — together, we grow a greener tomorrow!</p>
            </div>` : '';

    const certNote = trees > 0 ? `
            <p style="color: #16a34a; font-size: 13px; text-align: center; margin: 0 0 16px; font-weight: 600;">📄 Your Certificate of Tree Donation is attached to this email.</p>` : '';

    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: `Thank You for Your Donation of ${formattedAmount}!`,
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Donation Receipt</p>
            <p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>${name}</strong>,</p>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Thank you for your generous contribution! Your support makes a real difference.</p>
            ${treesBlock}
            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 0 0 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #737373; padding: 8px 0; font-size: 13px;">Amount</td>
                        <td style="color: #16a34a; padding: 8px 0; font-size: 16px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                    </tr>
                    <tr>
                        <td style="color: #737373; padding: 8px 0; font-size: 13px; border-top: 1px solid #e5e5e5;">Payment ID</td>
                        <td style="color: #171717; padding: 8px 0; font-size: 13px; text-align: right; border-top: 1px solid #e5e5e5;">${paymentId}</td>
                    </tr>
                    <tr>
                        <td style="color: #737373; padding: 8px 0; font-size: 13px; border-top: 1px solid #e5e5e5;">Date</td>
                        <td style="color: #171717; padding: 8px 0; font-size: 13px; text-align: right; border-top: 1px solid #e5e5e5;">${formattedDate}</td>
                    </tr>
                </table>
            </div>
            ${certNote}
            <p style="color: #a3a3a3; font-size: 12px; text-align: center; margin: 0;">Need help? Call us at <strong style="color: #525252;">98404 71333</strong></p>
        `),
        attachments
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send 80G certificate approval email
 */
const sendCertificateApprovedEmail = async (to, name) => {
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: "Your 80G Certificate Request is Approved!",
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">80G Certificate</p>
            <p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>${name}</strong>,</p>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Great news! Your 80G certificate request has been <strong style="color: #16a34a;">approved</strong>.</p>
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 20px;">
                <p style="color: #16a34a; margin: 0 0 8px; font-size: 20px; font-weight: 700;">Approved</p>
                <p style="color: #525252; font-size: 14px; margin: 0; line-height: 1.6;">You will receive the 80G tax exemption form from us shortly. This certificate can be used for tax deduction under Section 80G of the Income Tax Act.</p>
            </div>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Thank you for your generous contribution to the cause. Your support truly makes a difference!</p>
            <p style="color: #a3a3a3; font-size: 12px; text-align: center; margin: 0;">Need help? Call us at <strong style="color: #525252;">98404 71333</strong></p>
        `)
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send 80G certificate generated email (Phase 2.1 — auto-issued PDF cert).
 */
const sendCertificateGeneratedEmail = async (to, name, pdfRelUrl, certificateNumber) => {
    const downloadUrl = `${process.env.FRONTEND_URL || ''}/dashboard`;
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: `Your 80G Certificate ${certificateNumber} is Ready`,
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">80G Certificate Issued</p>
            <p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>${name}</strong>,</p>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Your 80G donation receipt has been generated and is now available for download from your dashboard.</p>
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 24px; margin: 0 0 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #737373; padding: 8px 0; font-size: 13px;">Certificate No.</td>
                        <td style="color: #16a34a; padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${certificateNumber}</td>
                    </tr>
                </table>
            </div>
            <div style="text-align: center; margin: 0 0 20px;">
                <a href="${downloadUrl}" style="display: inline-block; background: #22c55e; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Download from Dashboard &rarr;</a>
            </div>
            <p style="color: #a3a3a3; font-size: 12px; text-align: center; margin: 0;">Need help? Call us at <strong style="color: #525252;">98404 71333</strong></p>
        `)
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Generic admin broadcast — title + body (rendered as HTML paragraphs) + optional CTA link.
 * Wrapped in the standard ICE chrome so it matches transactional emails.
 */
const sendBroadcastEmail = async (to, subject, { body, ctaLabel, ctaUrl }) => {
    const safeBody = (body || '')
        .split('\n')
        .filter(Boolean)
        .map(line => `<p style="color: #525252; font-size: 14px; line-height: 1.6; margin: 0 0 12px;">${line}</p>`)
        .join('');
    const cta = (ctaLabel && ctaUrl)
        ? `<div style="text-align:center; margin: 24px 0 8px;"><a href="${ctaUrl}" style="display:inline-block; background:#22c55e; color:#ffffff; padding:12px 28px; border-radius:10px; text-decoration:none; font-weight:600; font-size:14px;">${ctaLabel} &rarr;</a></div>`
        : '';
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html: emailWrapper(safeBody + cta)
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send a sign-in acknowledgement email (passwordless name + email login).
 */
const sendLoginAcknowledgementEmail = async (to, name) => {
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: "You're signed in — ICE Network",
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Sign-in Confirmation</p>
            <p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>${name || 'Friend'}</strong>,</p>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">This is a confirmation that you just signed in to your ICE Network account. Welcome back — thank you for being part of our giving journey!</p>
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 20px; text-align: center; margin: 0 0 20px;">
                <p style="color: #16a34a; margin: 0; font-size: 16px; font-weight: 700;">Signed in successfully</p>
            </div>
            <p style="color: #737373; font-size: 13px; text-align: center; margin: 0;">If this wasn't you, please contact us at <strong style="color: #525252;">98404 71333</strong>.</p>
        `)
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send a pre-rendered inner body inside the standard ICE shell.
 *
 * Used by the CSR enquiry module, whose message bodies are admin-editable and live in
 * `csr_email_templates`. Keeping the wrapper here means an admin edits the message only —
 * the navy header, logo and footer strip can never be broken by a bad edit.
 */
const sendWrappedEmail = async ({ to, subject, bodyHtml, replyTo }) => {
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject,
        html: emailWrapper(bodyHtml)
    };
    if (replyTo) mailOptions.replyTo = replyTo;
    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendWrappedEmail,
    sendOtpEmail,
    sendLoginAcknowledgementEmail,
    sendPasswordResetEmail,
    sendDonationConfirmationEmail,
    sendCertificateApprovedEmail,
    sendCertificateGeneratedEmail,
    sendBroadcastEmail
};

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
            <p style="color: #a3a3a3; font-size: 11px; margin: 0;">Our City &middot; Our Future &middot; 15 Feb 2026</p>
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
const sendDonationConfirmationEmail = async (to, name, amount, paymentId, date) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    const formattedDate = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: `Thank You for Your Donation of ${formattedAmount}!`,
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Donation Receipt</p>
            <p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>${name}</strong>,</p>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Thank you for your generous contribution! Your support makes a real difference.</p>
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
            <p style="color: #a3a3a3; font-size: 12px; text-align: center; margin: 0;">Need help? Call us at <strong style="color: #525252;">98404 71333</strong></p>
        `)
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
 * Send CSR donation confirmation email — addressed to the organization,
 * frames the contribution as a Section 135 CSR commitment and previews
 * the CSR-2 receipt that follows.
 */
const sendCsrDonationConfirmationEmail = async (to, orgName, amount, paymentId, date, projectName) => {
    const formattedAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount);
    const formattedDate = new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    const projectLine = projectName ? `<tr>
                        <td style="color: #737373; padding: 8px 0; font-size: 13px; border-top: 1px solid #e5e5e5;">Project</td>
                        <td style="color: #171717; padding: 8px 0; font-size: 13px; text-align: right; border-top: 1px solid #e5e5e5;">${projectName}</td>
                    </tr>` : '';

    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: `CSR Contribution Received — ${formattedAmount}`,
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">CSR Contribution Confirmed</p>
            <p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>${orgName}</strong>,</p>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Thank you for partnering with ICE Network. Your CSR contribution under Section 135 of the Companies Act, 2013 has been received and will be deployed against the project below.</p>
            <div style="background: #f5f5f5; border-radius: 12px; padding: 20px; margin: 0 0 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #737373; padding: 8px 0; font-size: 13px;">CSR Amount</td>
                        <td style="color: #16a34a; padding: 8px 0; font-size: 16px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                    </tr>
                    ${projectLine}
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
            <p style="color: #525252; font-size: 14px; margin: 0 0 12px; line-height: 1.6;">Your CSR receipt (Form CSR-2 compliant) will be issued automatically and emailed shortly. The receipt and a lifetime CSR rollup are also available from your corporate dashboard.</p>
            <p style="color: #a3a3a3; font-size: 12px; text-align: center; margin: 0;">CSR queries? Call us at <strong style="color: #525252;">98404 71333</strong></p>
        `)
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send CSR receipt generated email — distinct from the 80G version:
 * frames it as a Section 135 receipt and links the corporate dashboard.
 */
const sendCsrReceiptGeneratedEmail = async (to, orgName, pdfRelUrl, certificateNumber) => {
    const downloadUrl = `${process.env.FRONTEND_URL || ''}/dashboard`;
    const mailOptions = {
        from: `"ICE Network" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: `Your CSR Receipt ${certificateNumber} is Ready`,
        html: emailWrapper(`
            <p style="color: #525252; margin: 0 0 16px; font-size: 13px; text-align: center; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">CSR Receipt Issued</p>
            <p style="color: #171717; font-size: 15px; margin: 0 0 4px;">Dear <strong>${orgName}</strong>,</p>
            <p style="color: #525252; font-size: 14px; margin: 0 0 20px; line-height: 1.6;">Your Section 135 CSR contribution receipt has been generated and is ready for your records and Form CSR-2 disclosure.</p>
            <div style="background: #f0fdf4; border: 1px solid #dcfce7; border-radius: 12px; padding: 24px; margin: 0 0 20px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                        <td style="color: #737373; padding: 8px 0; font-size: 13px;">Receipt No.</td>
                        <td style="color: #16a34a; padding: 8px 0; font-size: 14px; font-weight: 700; text-align: right;">${certificateNumber}</td>
                    </tr>
                </table>
            </div>
            <div style="text-align: center; margin: 0 0 20px;">
                <a href="${downloadUrl}" style="display: inline-block; background: #22c55e; color: #ffffff; padding: 12px 28px; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 14px;">Download from Dashboard &rarr;</a>
            </div>
            <p style="color: #a3a3a3; font-size: 12px; text-align: center; margin: 0;">CSR queries? Call us at <strong style="color: #525252;">98404 71333</strong></p>
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

module.exports = {
    sendOtpEmail,
    sendPasswordResetEmail,
    sendDonationConfirmationEmail,
    sendCsrDonationConfirmationEmail,
    sendCertificateApprovedEmail,
    sendCertificateGeneratedEmail,
    sendCsrReceiptGeneratedEmail,
    sendBroadcastEmail
};

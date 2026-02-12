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
    .then(() => console.log('✅ SMTP connection verified'))
    .catch(err => console.warn('⚠️ SMTP not configured:', err.message));

// Shared email wrapper
const emailWrapper = (content) => `
    <div style="font-family: 'DM Sans', 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 0; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e5e5; box-shadow: 0 4px 16px rgba(0,0,0,0.06);">
        <div style="background: #102a43; padding: 24px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">
                <span style="color: #22c55e;">Primathon</span>'26
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
        from: `"Primathon'26" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: "Verify Your Email — Primathon'26",
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
        from: `"Primathon'26" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: "Reset Your Password — Primathon'26",
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
        from: `"Primathon'26" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
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

module.exports = {
    sendOtpEmail,
    sendPasswordResetEmail,
    sendDonationConfirmationEmail
};

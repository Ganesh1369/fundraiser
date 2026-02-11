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

/**
 * Send OTP email for registration
 */
const sendOtpEmail = async (to, otp) => {
    const mailOptions = {
        from: `"FundRaiser" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: 'Verify Your Email — FundRaiser',
        html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #D8E2DC;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1B4332; margin: 0; font-size: 24px;">🌿 FundRaiser</h1>
                    <p style="color: #5F6368; margin-top: 8px;">Email Verification</p>
                </div>
                <div style="background: #F4F1DE; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <p style="color: #081C15; margin: 0 0 12px; font-size: 14px;">Your verification code:</p>
                    <h2 style="color: #2D6A4F; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: 700;">${otp}</h2>
                </div>
                <p style="color: #5F6368; font-size: 13px; text-align: center; margin: 0;">This code expires in <strong>10 minutes</strong>. Do not share it with anyone.</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

/**
 * Send password reset OTP email
 */
const sendPasswordResetEmail = async (to, otp) => {
    const mailOptions = {
        from: `"FundRaiser" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: 'Reset Your Password — FundRaiser',
        html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #D8E2DC;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1B4332; margin: 0; font-size: 24px;">🌿 FundRaiser</h1>
                    <p style="color: #5F6368; margin-top: 8px;">Password Reset</p>
                </div>
                <div style="background: #F4F1DE; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                    <p style="color: #081C15; margin: 0 0 12px; font-size: 14px;">Your reset code:</p>
                    <h2 style="color: #2D6A4F; margin: 0; font-size: 36px; letter-spacing: 8px; font-weight: 700;">${otp}</h2>
                </div>
                <p style="color: #5F6368; font-size: 13px; text-align: center; margin: 0;">This code expires in <strong>10 minutes</strong>. If you didn't request this, ignore this email.</p>
            </div>
        `
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
        from: `"FundRaiser" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to,
        subject: `Thank You for Your Donation of ${formattedAmount}! 🎉`,
        html: `
            <div style="font-family: 'Inter', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 32px; background: #ffffff; border-radius: 12px; border: 1px solid #D8E2DC;">
                <div style="text-align: center; margin-bottom: 24px;">
                    <h1 style="color: #1B4332; margin: 0; font-size: 24px;">🌿 FundRaiser</h1>
                    <p style="color: #2D6A4F; margin-top: 8px; font-weight: 600;">Donation Receipt</p>
                </div>
                <p style="color: #081C15; font-size: 15px;">Dear <strong>${name}</strong>,</p>
                <p style="color: #5F6368; font-size: 14px;">Thank you for your generous contribution! Your support makes a real difference.</p>
                <div style="background: #D8E2DC; border-radius: 8px; padding: 20px; margin: 20px 0;">
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr>
                            <td style="color: #5F6368; padding: 6px 0; font-size: 13px;">Amount</td>
                            <td style="color: #1B4332; padding: 6px 0; font-size: 15px; font-weight: 700; text-align: right;">${formattedAmount}</td>
                        </tr>
                        <tr>
                            <td style="color: #5F6368; padding: 6px 0; font-size: 13px;">Payment ID</td>
                            <td style="color: #081C15; padding: 6px 0; font-size: 13px; text-align: right;">${paymentId}</td>
                        </tr>
                        <tr>
                            <td style="color: #5F6368; padding: 6px 0; font-size: 13px;">Date</td>
                            <td style="color: #081C15; padding: 6px 0; font-size: 13px; text-align: right;">${formattedDate}</td>
                        </tr>
                    </table>
                </div>
                <p style="color: #5F6368; font-size: 12px; text-align: center; margin-top: 24px;">If you have any questions, please contact us at support@fundraiser.com</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
};

module.exports = {
    sendOtpEmail,
    sendPasswordResetEmail,
    sendDonationConfirmationEmail
};

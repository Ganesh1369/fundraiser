const twilio = require('twilio');

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

/**
 * Format phone number with country code (+91 for India if not prefixed)
 */
const formatPhone = (phone) => {
    phone = phone.replace(/\s+/g, '');
    if (phone.startsWith('+')) return phone;
    if (phone.startsWith('91') && phone.length === 12) return `+${phone}`;
    return `+91${phone}`;
};

/**
 * Send OTP via SMS using Twilio
 */
const sendOtpSms = async (phone, otp) => {
    const formattedPhone = formatPhone(phone);
    await client.messages.create({
        body: `Your ICE Network verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
    });
};

module.exports = { sendOtpSms };

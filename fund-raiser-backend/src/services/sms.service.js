const twilio = require('twilio');

const hasTwilioCreds = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE_NUMBER);
const client = hasTwilioCreds ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) : null;

const formatPhone = (phone) => {
    phone = phone.replace(/\s+/g, '');
    if (phone.startsWith('+')) return phone;
    if (phone.startsWith('91') && phone.length === 12) return `+${phone}`;
    return `+91${phone}`;
};

const sendOtpSms = async (phone, otp) => {
    const formattedPhone = formatPhone(phone);
    if (!hasTwilioCreds) {
        console.log(`[sms.service] Twilio creds missing — dev fallback. OTP for ${formattedPhone}: ${otp}`);
        return;
    }
    await client.messages.create({
        body: `Your ICE Network verification code is: ${otp}. Valid for 10 minutes.`,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: formattedPhone
    });
};

module.exports = { sendOtpSms };

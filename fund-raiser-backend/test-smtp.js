/**
 * SMTP Configuration Test
 * Run: node test-smtp.js <your-email@example.com>
 *
 * Tests:
 *  1. .env variables loaded
 *  2. SMTP connection / auth
 *  3. Sends a real test email
 */

require('dotenv').config();
const nodemailer = require('nodemailer');

const recipient = process.argv[2];
if (!recipient) {
    console.error('Usage: node test-smtp.js <recipient-email>');
    process.exit(1);
}

const vars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

console.log('\n--- Step 1: Check .env variables ---');
let missing = false;
for (const v of vars) {
    const val = process.env[v];
    if (!val) {
        console.error(`  MISSING: ${v}`);
        missing = true;
    } else {
        // mask password
        const display = v === 'SMTP_PASS' ? '****' : val;
        console.log(`  ${v} = ${display}`);
    }
}
console.log(`  SMTP_FROM = ${process.env.SMTP_FROM || '(will use SMTP_USER)'}`);

if (missing) {
    console.error('\nFix missing variables in .env and retry.');
    process.exit(1);
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    },
    logger: true,   // logs SMTP conversation
    debug: true      // include protocol-level detail
});

(async () => {
    console.log('\n--- Step 2: Verify SMTP connection ---');
    try {
        await transporter.verify();
        console.log('  SMTP connection OK\n');
    } catch (err) {
        console.error('  SMTP connection FAILED');
        console.error('  Error:', err.message);
        console.error('\nCommon fixes:');
        console.error('  - Wrong SMTP_HOST / SMTP_PORT');
        console.error('  - Wrong SMTP_USER / SMTP_PASS');
        console.error('  - For Gmail: enable "App Passwords" (not your normal password)');
        console.error('  - Firewall blocking port', process.env.SMTP_PORT);
        process.exit(1);
    }

    console.log('--- Step 3: Send test email ---');
    console.log(`  To: ${recipient}`);
    try {
        const info = await transporter.sendMail({
            from: `"SMTP Test" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: recipient,
            subject: 'SMTP Test — ICE Fundraiser',
            text: 'If you see this, your SMTP config is working!',
            html: '<h2>SMTP works!</h2><p>Your email configuration is correct.</p>'
        });
        console.log('  Email sent successfully!');
        console.log('  Message ID:', info.messageId);
        console.log('  Response  :', info.response);
    } catch (err) {
        console.error('  Send FAILED');
        console.error('  Error:', err.message);
        if (err.responseCode) console.error('  SMTP code:', err.responseCode);
        process.exit(1);
    }

    console.log('\nAll checks passed. SMTP config is fine — the issue is elsewhere.\n');
})();

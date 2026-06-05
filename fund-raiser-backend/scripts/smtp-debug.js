/**
 * Standalone SMTP debug script.
 *
 * Runs nodemailer with full debug + logger so the entire SMTP handshake
 * (EHLO → STARTTLS → AUTH → 535/250) is printed to stdout.
 *
 * Usage:
 *   1. Set creds inline below (block A), OR
 *   2. Run via dotenv reading .env.production:
 *        cd fund-raiser-backend
 *        node -r dotenv/config scripts/smtp-debug.js dotenv_config_path=.env.production
 *      The dotenv flag is what loads .env.production into process.env.
 *
 *   Optional: pass a recipient as the first CLI arg, otherwise sends to SMTP_USER.
 *
 * What it does:
 *   1. Prints the resolved config (password length only — never the value).
 *   2. transporter.verify() — proves AUTH works without sending mail.
 *   3. If verify succeeds, sends a tiny test message and prints the messageId.
 *
 * Common diagnoses based on output:
 *   - `535 5.7.8 authentication failed`           → user/pass wrong, OR mailbox doesn't allow SMTP
 *   - `503 sender already given`                  → host mismatch (you're on the wrong SMTP server)
 *   - `connect ETIMEDOUT` / `ECONNREFUSED`        → host/port wrong or firewalled
 *   - `Greeting never received` after STARTTLS    → port 465 vs 587 mismatch (toggle secure)
 *   - `self-signed certificate` / TLS errors      → set requireTLS:true or add tls.rejectUnauthorized:false (lab only)
 */

// --- Block A: inline override (uncomment to use; leave commented to read from env) ---
// process.env.SMTP_HOST = 'smtp.hostinger.com';
// process.env.SMTP_PORT = '587';
// process.env.SMTP_USER = 'no-reply-icenetwork@blackitechs.in';
// process.env.SMTP_PASS = 'IceNet2026_MailSecure';
// process.env.SMTP_FROM = 'no-reply-icenetwork@blackitechs.in';

const nodemailer = require('nodemailer');

const cfg = {
    host:   process.env.SMTP_HOST,
    port:   parseInt(process.env.SMTP_PORT, 10),
    user:   process.env.SMTP_USER,
    pass:   process.env.SMTP_PASS,
    from:   process.env.SMTP_FROM || process.env.SMTP_USER,
};

const sniff = (v) => v == null ? '(unset)' : `len=${v.length} first=${JSON.stringify(v[0])} last=${JSON.stringify(v[v.length - 1])}`;

console.log('=== SMTP config seen by this process ===');
console.log('  SMTP_HOST :', cfg.host || '(unset)');
console.log('  SMTP_PORT :', Number.isFinite(cfg.port) ? cfg.port : '(unset)');
console.log('  SMTP_USER :', cfg.user || '(unset)');
console.log('  SMTP_PASS :', sniff(cfg.pass));   // length + first/last char only
console.log('  SMTP_FROM :', cfg.from || '(unset)');
console.log();

if (!cfg.host || !cfg.port || !cfg.user || !cfg.pass) {
    console.error('✘ Missing one or more SMTP env vars. Either uncomment Block A or pass dotenv_config_path.');
    process.exit(1);
}

// Try both common configurations — start with whatever the env says.
const secure = cfg.port === 465; // 465 = implicit TLS, 587 = STARTTLS

const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure,
    auth: { user: cfg.user, pass: cfg.pass },
    // Spit out every byte of the SMTP conversation.
    logger: true,
    debug: true,
    // Short timeouts so the script doesn't hang on a wrong host.
    connectionTimeout: 10_000,
    greetingTimeout:    8_000,
    socketTimeout:     15_000,
});

// Pick recipient from --to=<email> flag, $TO_EMAIL env, or fall back to SMTP_USER.
// (Bare argv[2] picks up `dotenv_config_path=...` when run with -r dotenv/config.)
const toArg = process.argv.find(a => a.startsWith('--to='));
const recipient = (toArg && toArg.slice(5)) || process.env.TO_EMAIL || cfg.user;

(async () => {
    console.log(`=== Step 1: transporter.verify() ===`);
    try {
        await transporter.verify();
        console.log('✔ verify() OK — server accepts our auth.\n');
    } catch (err) {
        console.error('✘ verify() FAILED');
        console.error('  name        :', err.name);
        console.error('  code        :', err.code);
        console.error('  responseCode:', err.responseCode);
        console.error('  response    :', err.response);
        console.error('  command     :', err.command);
        console.error('  message     :', err.message);
        process.exit(2);
    }

    console.log(`=== Step 2: sending test mail to ${recipient} ===`);
    try {
        const info = await transporter.sendMail({
            from: `"SMTP Debug" <${cfg.from}>`,
            to:   recipient,
            subject: `SMTP debug ${new Date().toISOString()}`,
            text: 'If you see this, prod SMTP creds are good.\n'
        });
        console.log('✔ sendMail() OK');
        console.log('  messageId :', info.messageId);
        console.log('  response  :', info.response);
        console.log('  accepted  :', info.accepted);
        console.log('  rejected  :', info.rejected);
    } catch (err) {
        console.error('✘ sendMail() FAILED');
        console.error('  name        :', err.name);
        console.error('  code        :', err.code);
        console.error('  responseCode:', err.responseCode);
        console.error('  response    :', err.response);
        console.error('  message     :', err.message);
        process.exit(3);
    }
})();

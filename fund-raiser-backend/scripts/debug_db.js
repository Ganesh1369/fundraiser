require('dotenv').config();
const db = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function debugDatabase() {
    try {
        let output = '';
        const log = (msg) => { console.log(msg); output += msg + '\n'; };

        log('--- USERS ---');
        const users = await db.query('SELECT id, name, email, user_type FROM users');
        log(JSON.stringify(users.rows, null, 2));

        log('\n--- DONATIONS ---');
        const donations = await db.query('SELECT id, user_id, amount, status, created_at FROM donations');
        log(JSON.stringify(donations.rows, null, 2));

        log('\n--- DONATION SUMMARY PER USER ---');
        for (const user of users.rows) {
            const userDonations = donations.rows.filter(d => d.user_id === user.id);
            log(`User: ${user.email} (${user.id}) - Donations: ${userDonations.length}`);
        }

        fs.writeFileSync(path.join(__dirname, 'debug_output.txt'), output);
        console.log('Debug output written to debug_output.txt');

    } catch (error) {
        console.error('Debug Error:', error);
    } finally {
        // Allow time for logs to flush if needed, but primarily exit
        setTimeout(() => process.exit(), 500);
    }
}

debugDatabase();

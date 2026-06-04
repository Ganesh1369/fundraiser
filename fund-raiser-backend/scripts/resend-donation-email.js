require('dotenv').config();
const emailService = require('../src/services/email.service');

const TO = 'kamalrajganesan2000@gmail.com';
const NAME = 'Kamalraj';
const AMOUNT = 1000;
const PAYMENT_ID = 'pay_Sx3pf3nhzI2j7U';
const DATE = new Date('2026-06-03T12:01:34');

emailService.sendDonationConfirmationEmail(TO, NAME, AMOUNT, PAYMENT_ID, DATE)
    .then(info => { console.log('OK', info.messageId || info.response); process.exit(0); })
    .catch(err => { console.error('FAIL', err.message); process.exit(1); });

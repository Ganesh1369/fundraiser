require('dotenv').config();
const emailService = require('../src/services/email.service');

const TO = 'kamalrajganesan2000@gmail.com';
const NAME = 'Kamalraj';
const PDF_REL = '/uploads/certificates/.../f85c476a-9dd6-4d22-8221-15293f8d85ae.pdf';
const CERT_NO = 'ICE/80G/2026-27/0001';

emailService.sendCertificateGeneratedEmail(TO, NAME, PDF_REL, CERT_NO)
    .then(info => { console.log('OK messageId=', info.messageId, 'response=', info.response); process.exit(0); })
    .catch(err => { console.error('FAIL', err.message, err.code || ''); process.exit(1); });

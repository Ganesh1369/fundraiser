require('dotenv').config();
const certificateService = require('../src/services/certificate.service');

const CERT_ID = process.argv[2] || 'f85c476a-9dd6-4d22-8221-15293f8d85ae';

certificateService.regenerate(CERT_ID)
    .then(cert => { console.log('OK cert=', cert.certificate_number, 'pdf=', cert.pdf_url); process.exit(0); })
    .catch(err => { console.error('FAIL', err.message); process.exit(1); });

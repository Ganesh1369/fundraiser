// One-off smoke test: render a CSR receipt PDF with mock data to verify
// the layout (watermark, header CSR-1 line, signatory image, footer wording)
// without needing a real CSR donation row in the DB.
//
// Usage: node scripts/smoke-csr-pdf.js  -> writes ./scripts/csr-smoke.pdf
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { renderCsrReceipt } = require('../src/services/pdf.template');
const settingsService = require('../src/services/settings.service');

(async () => {
    const all = await settingsService.getAll();
    const v = (k) => all[k]?.setting_value || '';
    const org = {
        ice_legal_name: v('ice_legal_name'),
        ice_registered_address: v('ice_registered_address'),
        ice_pan: v('ice_pan'),
        ice_80g_reg_number: v('ice_80g_reg_number'),
        ice_80g_valid_from: v('ice_80g_valid_from'),
        ice_80g_valid_to: v('ice_80g_valid_to'),
        ice_signatory_name: v('ice_signatory_name'),
        ice_signatory_image: v('ice_signatory_image'),
        ice_logo: v('ice_logo'),
        ice_csr1_reg_number: v('ice_csr1_reg_number') || 'CSR00012345'
    };
    const donor = {
        name: 'Test Corporate Donor',
        organization_name: 'Acme Industries Pvt Ltd',
        address: '1 Industrial Estate, Hosur Road, Bengaluru, KA 560100',
        email: 'csr@acme.example',
        phone: '+91 9000000000',
        pan: 'AACCA1234C'
    };
    const donation = {
        amount: 250000,
        date: new Date('2026-05-01'),
        payment_id: 'pay_TEST123456',
        project_name: 'ROOTS — Coastal Restoration',
        csr_reference_number: 'ACME/CSR/2026-27/Q1'
    };
    const corporate = {
        cin: 'U12345KA2010PTC012345',
        gstin: '29AACCA1234C1Z5',
        csr_registration_number: 'CSR0099887',
        industry: 'Manufacturing',
        authorized_signatory_name: 'Jane Doe',
        authorized_signatory_designation: 'CFO'
    };
    const outPath = path.resolve(__dirname, 'csr-smoke.pdf');
    const stream = fs.createWriteStream(outPath);
    await new Promise((resolve, reject) => {
        stream.on('finish', resolve);
        stream.on('error', reject);
        renderCsrReceipt({ org, donor, donation, corporate, certificateNumber: 'ICE/CSR/2026-27/SMOKE' }, stream);
    });
    console.log('OK wrote', outPath, 'size=', fs.statSync(outPath).size);
    process.exit(0);
})().catch(err => { console.error('FAIL', err); process.exit(1); });

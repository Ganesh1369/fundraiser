const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { rupeesInWords } = require('./utils/amount-in-words');

// Locked layout (PHASE-2-PLAN.md §14, 2026-04-30):
// - A4 portrait, single page
// - ICE logo top-left, signatory image bottom-right
// - Pragmatic monetary glyph: "Rs." prefix (Helvetica lacks ₹). Words section spells "Rupees".

const PAGE = { size: 'A4', margin: 50 };
const COLORS = {
    primary: '#22c55e',
    accent: '#0f172a',
    muted: '#64748b',
    border: '#e5e7eb',
    text: '#1f2937'
};

const fmtCurrency = (amount) =>
    'Rs. ' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const resolveUploadPath = (relUrl) => {
    if (!relUrl) return null;
    // setting_value typically starts with `/uploads/...`; map to disk under fund-raiser-backend/uploads/...
    const trimmed = relUrl.replace(/^\/+/, '');
    const abs = path.resolve(__dirname, '..', '..', trimmed);
    return fs.existsSync(abs) ? abs : null;
};

const safeImage = (doc, relUrl, opts) => {
    const abs = resolveUploadPath(relUrl);
    if (!abs) return false;
    try { doc.image(abs, opts.x, opts.y, opts); return true; }
    catch { return false; }
};

/**
 * Render the 80G certificate to a writable stream.
 *
 * @param {object} input
 * @param {object} input.org      - { ice_legal_name, ice_registered_address, ice_pan, ice_80g_reg_number, ice_80g_valid_from, ice_80g_valid_to, ice_signatory_name, ice_signatory_image, ice_logo }
 * @param {object} input.donor    - { name, address, email, phone, pan }
 * @param {object} input.donation - { amount, date, payment_id, project_name }
 * @param {string} input.certificateNumber
 * @param {WritableStream} stream
 */
const renderCertificate = ({ org, donor, donation, certificateNumber }, stream) => {
    const doc = new PDFDocument(PAGE);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const margin = PAGE.margin;
    const contentWidth = pageWidth - margin * 2;

    // ===== Header =====
    if (org.ice_logo) safeImage(doc, org.ice_logo, { x: margin, y: margin, width: 70, height: 70, fit: [70, 70] });

    doc.font('Helvetica-Bold').fontSize(11).fillColor(COLORS.muted)
        .text(org.ice_legal_name || '', margin + 80, margin + 5, { width: contentWidth - 80 });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
        .text(org.ice_registered_address || '', { width: contentWidth - 80 });
    if (org.ice_pan) doc.text(`PAN: ${org.ice_pan}`, { continued: false });
    if (org.ice_80g_reg_number) doc.text(`80G Reg. No.: ${org.ice_80g_reg_number}`);

    // ===== Title =====
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(20).fillColor(COLORS.accent)
        .text('Donation Receipt — 80G Certificate', { align: 'center', width: contentWidth });

    // Cert number + issued date
    doc.moveDown(0.5);
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
        .text(`Certificate No.: ${certificateNumber}`, { align: 'center' });
    doc.text(`Issued on: ${fmtDate(new Date())}`, { align: 'center' });

    // ===== Body =====
    doc.moveDown(2);
    doc.font('Helvetica').fontSize(11).fillColor(COLORS.text);

    const intro =
        `This is to certify that we have received a voluntary donation of ${fmtCurrency(donation.amount)} ` +
        `(${rupeesInWords(donation.amount)}) ` +
        `from the donor whose details are set out below. The donation was received on ${fmtDate(donation.date)} ` +
        `via Razorpay (payment reference ${donation.payment_id || 'N/A'}).`;
    doc.text(intro, { align: 'justify', width: contentWidth });

    if (donation.project_name) {
        doc.moveDown(0.5);
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted)
            .text(`Project supported: ${donation.project_name}`, { width: contentWidth });
    }

    // ===== Donor block =====
    doc.moveDown(1.5);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.accent).text('Donor Details');
    doc.moveDown(0.3);
    doc.lineWidth(0.5).strokeColor(COLORS.border)
        .moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
    doc.moveDown(0.6);

    const labelCol = 110;
    const drawRow = (label, value) => {
        if (!value) return;
        const y = doc.y;
        doc.font('Helvetica').fontSize(10).fillColor(COLORS.muted).text(label, margin, y, { width: labelCol });
        doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
            .text(value, margin + labelCol, y, { width: contentWidth - labelCol });
        doc.moveDown(0.4);
    };
    drawRow('Name', donor.name);
    drawRow('Address', donor.address);
    drawRow('Email', donor.email);
    drawRow('Phone', donor.phone);
    drawRow('PAN', donor.pan);

    // ===== Donation block =====
    doc.moveDown(0.8);
    doc.font('Helvetica-Bold').fontSize(12).fillColor(COLORS.accent).text('Donation Details');
    doc.moveDown(0.3);
    doc.lineWidth(0.5).strokeColor(COLORS.border)
        .moveTo(margin, doc.y).lineTo(margin + contentWidth, doc.y).stroke();
    doc.moveDown(0.6);

    drawRow('Amount', `${fmtCurrency(donation.amount)} (${rupeesInWords(donation.amount)})`);
    drawRow('Date', fmtDate(donation.date));
    drawRow('Payment ID', donation.payment_id || 'N/A');
    if (donation.project_name) drawRow('Project', donation.project_name);

    // ===== 80G validity =====
    if (org.ice_80g_valid_from || org.ice_80g_valid_to) {
        doc.moveDown(0.8);
        doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
            .text(
                `Donations to ${org.ice_legal_name || 'this organisation'} are eligible for deduction under Section 80G of ` +
                `the Income Tax Act, 1961. 80G certificate valid ` +
                `${org.ice_80g_valid_from ? 'from ' + fmtDate(org.ice_80g_valid_from) : ''}` +
                `${org.ice_80g_valid_to ? ' to ' + fmtDate(org.ice_80g_valid_to) : ''}.`,
                { width: contentWidth, align: 'justify' }
            );
    }

    // ===== Signature (bottom-right) =====
    const sigBoxW = 180;
    const sigBoxH = 90;
    const sigX = margin + contentWidth - sigBoxW;
    const sigY = doc.page.height - margin - sigBoxH;

    if (org.ice_signatory_image) {
        safeImage(doc, org.ice_signatory_image, {
            x: sigX,
            y: sigY,
            width: sigBoxW,
            height: 50,
            fit: [sigBoxW, 50]
        });
    }

    // signature line
    doc.lineWidth(0.5).strokeColor(COLORS.border)
        .moveTo(sigX, sigY + 55).lineTo(sigX + sigBoxW, sigY + 55).stroke();

    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
        .text(org.ice_signatory_name || 'Authorised Signatory', sigX, sigY + 60, { width: sigBoxW, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
        .text(`for ${org.ice_legal_name || ''}`, sigX, sigY + 75, { width: sigBoxW, align: 'center' });

    doc.end();
};

module.exports = { renderCertificate };

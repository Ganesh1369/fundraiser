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
    text: '#1f2937',
    cardBg: '#f8fafc'
};

const fmtCurrency = (amount) =>
    'Rs. ' + Number(amount).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const resolveUploadPath = (relUrl) => {
    if (!relUrl) return null;
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

const drawCard = (doc, title, rows, x, width) => {
    const startY = doc.y;
    const pad = 14;
    const labelCol = 90;
    const titleBlockH = 24;
    const rowGap = 6;
    const valueW = width - pad * 2 - labelCol;

    // Pre-compute row heights based on value text (handles wrapping addresses cleanly).
    doc.font('Helvetica-Bold').fontSize(10);
    const rowHeights = rows.map(([, value]) =>
        Math.max(12, doc.heightOfString(value || '—', { width: valueW }))
    );
    const totalRowsH = rowHeights.reduce((s, h) => s + h + rowGap, 0) - rowGap;
    const cardH = pad + titleBlockH + totalRowsH + pad;

    // Background card
    doc.roundedRect(x, startY, width, cardH, 6).fillColor(COLORS.cardBg).fill();

    // Title + accent underline
    doc.fillColor(COLORS.primary).font('Helvetica-Bold').fontSize(10)
        .text(title.toUpperCase(), x + pad, startY + pad, { width: width - pad * 2, characterSpacing: 1.2 });
    doc.lineWidth(1.2).strokeColor(COLORS.primary)
        .moveTo(x + pad, startY + pad + 14).lineTo(x + pad + 38, startY + pad + 14).stroke();

    // Rows
    let rowY = startY + pad + titleBlockH;
    rows.forEach(([label, value], i) => {
        doc.fillColor(COLORS.muted).font('Helvetica').fontSize(9)
            .text(label, x + pad, rowY + 1, { width: labelCol });
        doc.fillColor(COLORS.text).font('Helvetica-Bold').fontSize(10)
            .text(value || '—', x + pad + labelCol, rowY, { width: valueW });
        rowY += rowHeights[i] + rowGap;
    });

    doc.x = x;
    doc.y = startY + cardH;
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
    const pageHeight = doc.page.height;
    const margin = PAGE.margin;
    const contentWidth = pageWidth - margin * 2;

    // ===== Top brand bar =====
    doc.rect(0, 0, pageWidth, 6).fillColor(COLORS.primary).fill();
    doc.rect(0, 6, pageWidth, 2).fillColor(COLORS.accent).fill();

    // ===== Watermark logo (faint, centered) =====
    if (org.ice_logo) {
        const wmAbs = resolveUploadPath(org.ice_logo);
        if (wmAbs) {
            doc.save();
            doc.opacity(0.04);
            try { doc.image(wmAbs, pageWidth / 2 - 160, pageHeight / 2 - 160, { fit: [320, 320] }); }
            catch { /* noop */ }
            doc.opacity(1);
            doc.restore();
        }
    }

    // ===== Header =====
    const headerTop = margin + 8;
    if (org.ice_logo) safeImage(doc, org.ice_logo, { x: margin, y: headerTop, width: 60, height: 60, fit: [60, 60] });

    const orgX = margin + 75;
    const orgWidth = contentWidth - 75;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.accent)
        .text(org.ice_legal_name || '', orgX, headerTop + 4, { width: orgWidth });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
        .text(org.ice_registered_address || '', orgX, doc.y + 2, { width: orgWidth });
    const orgMeta = [
        org.ice_pan ? `PAN: ${org.ice_pan}` : null,
        org.ice_80g_reg_number ? `80G Reg. No.: ${org.ice_80g_reg_number}` : null
    ].filter(Boolean).join('   •   ');
    if (orgMeta) doc.text(orgMeta, orgX, doc.y + 2, { width: orgWidth });

    // Bottom rule under header
    const headerBottomY = Math.max(headerTop + 60, doc.y) + 12;
    doc.lineWidth(0.5).strokeColor(COLORS.border)
        .moveTo(margin, headerBottomY).lineTo(margin + contentWidth, headerBottomY).stroke();

    // Reset cursor to left margin for body
    doc.x = margin;
    doc.y = headerBottomY + 26;

    // ===== Title =====
    doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.accent)
        .text('Donation Receipt — 80G Certificate', margin, doc.y, { align: 'center', width: contentWidth });

    // Underline accent
    const underlineY = doc.y + 6;
    const underlineW = 80;
    const underlineX = margin + (contentWidth - underlineW) / 2;
    doc.lineWidth(2.5).strokeColor(COLORS.primary)
        .moveTo(underlineX, underlineY).lineTo(underlineX + underlineW, underlineY).stroke();

    doc.x = margin;
    doc.y = underlineY + 14;

    // Cert metadata
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
        .text(`Certificate No.: ${certificateNumber}`, margin, doc.y, { align: 'center', width: contentWidth });
    doc.text(`Issued on: ${fmtDate(new Date())}`, margin, doc.y + 1, { align: 'center', width: contentWidth });

    // ===== Intro paragraph =====
    doc.x = margin;
    doc.moveDown(1.4);
    doc.font('Helvetica').fontSize(11).fillColor(COLORS.text);
    const intro =
        `This is to certify that we have received a voluntary donation of ${fmtCurrency(donation.amount)} ` +
        `(${rupeesInWords(donation.amount)}) from the donor whose details are set out below. ` +
        `The donation was received on ${fmtDate(donation.date)} via Razorpay ` +
        `(payment reference ${donation.payment_id || 'N/A'}).`;
    doc.text(intro, margin, doc.y, { align: 'justify', width: contentWidth, lineGap: 2 });

    if (donation.project_name) {
        doc.moveDown(0.4);
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted)
            .text(`Project supported: ${donation.project_name}`, margin, doc.y, { width: contentWidth });
    }

    // ===== Donor card =====
    doc.moveDown(1.1);
    drawCard(doc, 'Donor Details', [
        ['Name', donor.name],
        ['Address', donor.address],
        ['Email', donor.email],
        ['Phone', donor.phone],
        ['PAN', donor.pan]
    ], margin, contentWidth);

    // ===== Donation card =====
    doc.moveDown(0.7);
    drawCard(doc, 'Donation Details', [
        ['Amount', `${fmtCurrency(donation.amount)} (${rupeesInWords(donation.amount)})`],
        ['Date', fmtDate(donation.date)],
        ['Payment ID', donation.payment_id || 'N/A'],
        ...(donation.project_name ? [['Project', donation.project_name]] : [])
    ], margin, contentWidth);

    // ===== 80G validity footer (left side, leaves room for signature on right) =====
    if (org.ice_80g_valid_from || org.ice_80g_valid_to) {
        doc.moveDown(0.9);
        doc.x = margin;
        const footerW = contentWidth - 200;
        doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted)
            .text(
                `Donations to ${org.ice_legal_name || 'this organisation'} are eligible for deduction under Section 80G of ` +
                `the Income Tax Act, 1961. 80G certificate valid ` +
                `${org.ice_80g_valid_from ? 'from ' + fmtDate(org.ice_80g_valid_from) : ''}` +
                `${org.ice_80g_valid_to ? ' to ' + fmtDate(org.ice_80g_valid_to) : ''}.`,
                margin, doc.y, { width: footerW, align: 'justify', lineGap: 1.5 }
            );
    }

    // ===== Signature (bottom-right) =====
    const sigBoxW = 180;
    const sigBoxH = 90;
    const sigX = margin + contentWidth - sigBoxW;
    const sigY = pageHeight - margin - sigBoxH;

    if (org.ice_signatory_image) {
        safeImage(doc, org.ice_signatory_image, {
            x: sigX, y: sigY, width: sigBoxW, height: 50, fit: [sigBoxW, 50]
        });
    }
    doc.lineWidth(0.5).strokeColor(COLORS.border)
        .moveTo(sigX, sigY + 55).lineTo(sigX + sigBoxW, sigY + 55).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
        .text(org.ice_signatory_name || 'Authorised Signatory', sigX, sigY + 60, { width: sigBoxW, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
        .text(`for ${org.ice_legal_name || ''}`, sigX, sigY + 75, { width: sigBoxW, align: 'center' });

    doc.end();
};

/**
 * CSR Donation Receipt — for corporate CSR contributions, used by donor companies
 * to substantiate Schedule VII spending in their Form CSR-2 annual filing.
 *
 * @param {object} input
 * @param {object} input.org        - org settings (same shape as renderCertificate)
 * @param {object} input.donor      - { name, organization_name, address, email, phone, pan }
 * @param {object} input.donation   - { amount, date, payment_id, project_name, csr_reference_number }
 * @param {object} input.corporate  - { cin, gstin, csr_registration_number, industry, authorized_signatory_name, authorized_signatory_designation }
 * @param {string} input.certificateNumber
 * @param {WritableStream} stream
 */
const renderCsrReceipt = ({ org, donor, donation, corporate, certificateNumber }, stream) => {
    const doc = new PDFDocument(PAGE);
    doc.pipe(stream);

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = PAGE.margin;
    const contentWidth = pageWidth - margin * 2;
    const corp = corporate || {};

    // Top brand bar
    doc.rect(0, 0, pageWidth, 6).fillColor(COLORS.primary).fill();
    doc.rect(0, 6, pageWidth, 2).fillColor(COLORS.accent).fill();

    // Watermark
    if (org.ice_logo) {
        const wmAbs = resolveUploadPath(org.ice_logo);
        if (wmAbs) {
            doc.save();
            doc.opacity(0.04);
            try { doc.image(wmAbs, pageWidth / 2 - 160, pageHeight / 2 - 160, { fit: [320, 320] }); }
            catch { /* noop */ }
            doc.opacity(1);
            doc.restore();
        }
    }

    // Header
    const headerTop = margin + 8;
    if (org.ice_logo) safeImage(doc, org.ice_logo, { x: margin, y: headerTop, width: 60, height: 60, fit: [60, 60] });

    const orgX = margin + 75;
    const orgWidth = contentWidth - 75;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(COLORS.accent)
        .text(org.ice_legal_name || '', orgX, headerTop + 4, { width: orgWidth });
    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
        .text(org.ice_registered_address || '', orgX, doc.y + 2, { width: orgWidth });
    const orgMeta = [
        org.ice_pan ? `PAN: ${org.ice_pan}` : null,
        org.ice_80g_reg_number ? `80G Reg. No.: ${org.ice_80g_reg_number}` : null
    ].filter(Boolean).join('   •   ');
    if (orgMeta) doc.text(orgMeta, orgX, doc.y + 2, { width: orgWidth });

    const headerBottomY = Math.max(headerTop + 60, doc.y) + 12;
    doc.lineWidth(0.5).strokeColor(COLORS.border)
        .moveTo(margin, headerBottomY).lineTo(margin + contentWidth, headerBottomY).stroke();

    doc.x = margin;
    doc.y = headerBottomY + 26;

    // Title
    doc.font('Helvetica-Bold').fontSize(22).fillColor(COLORS.accent)
        .text('CSR Donation Receipt', margin, doc.y, { align: 'center', width: contentWidth });

    const underlineY = doc.y + 6;
    const underlineW = 80;
    const underlineX = margin + (contentWidth - underlineW) / 2;
    doc.lineWidth(2.5).strokeColor(COLORS.primary)
        .moveTo(underlineX, underlineY).lineTo(underlineX + underlineW, underlineY).stroke();

    doc.x = margin;
    doc.y = underlineY + 14;

    doc.font('Helvetica').fontSize(9).fillColor(COLORS.muted)
        .text(`Receipt No.: ${certificateNumber}`, margin, doc.y, { align: 'center', width: contentWidth });
    doc.text(`Issued on: ${fmtDate(new Date())}`, margin, doc.y + 1, { align: 'center', width: contentWidth });

    // Intro
    doc.x = margin;
    doc.moveDown(1.4);
    doc.font('Helvetica').fontSize(11).fillColor(COLORS.text);
    const intro =
        `This is to acknowledge receipt of a CSR contribution of ${fmtCurrency(donation.amount)} ` +
        `(${rupeesInWords(donation.amount)}) from the corporate donor named below, in furtherance of ` +
        `their obligations under Section 135 of the Companies Act, 2013. ` +
        `Contribution received on ${fmtDate(donation.date)} via Razorpay ` +
        `(payment reference ${donation.payment_id || 'N/A'}).`;
    doc.text(intro, margin, doc.y, { align: 'justify', width: contentWidth, lineGap: 2 });

    if (donation.project_name) {
        doc.moveDown(0.4);
        doc.font('Helvetica-Oblique').fontSize(10).fillColor(COLORS.muted)
            .text(`CSR project supported: ${donation.project_name}`, margin, doc.y, { width: contentWidth });
    }

    // Corporate donor card (richer than the 80G donor card)
    doc.moveDown(1.1);
    drawCard(doc, 'Corporate Donor', [
        ['Company', donor.organization_name || donor.name],
        ...(corp.industry ? [['Industry', corp.industry]] : []),
        ['Registered address', donor.address],
        ['Contact', [donor.email, donor.phone].filter(Boolean).join('  •  ')],
        ['PAN', donor.pan],
        ...(corp.cin ? [['CIN', corp.cin]] : []),
        ...(corp.gstin ? [['GSTIN', corp.gstin]] : []),
        ...(corp.csr_registration_number ? [['CSR Registration #', corp.csr_registration_number]] : []),
        ...(corp.authorized_signatory_name ? [['Authorised signatory', [corp.authorized_signatory_name, corp.authorized_signatory_designation].filter(Boolean).join(', ')]] : [])
    ], margin, contentWidth);

    // CSR contribution card
    doc.moveDown(0.7);
    drawCard(doc, 'Contribution Details', [
        ['Amount', `${fmtCurrency(donation.amount)} (${rupeesInWords(donation.amount)})`],
        ['Date', fmtDate(donation.date)],
        ['Payment ID', donation.payment_id || 'N/A'],
        ...(donation.project_name ? [['Project', donation.project_name]] : []),
        ...(donation.csr_reference_number ? [['Donor reference', donation.csr_reference_number]] : [])
    ], margin, contentWidth);

    // Footer note — Form CSR-2 friendly wording
    doc.moveDown(0.9);
    doc.x = margin;
    const footerW = contentWidth - 200;
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted)
        .text(
            `This receipt may be retained as substantiation of the above CSR contribution for the donor company's ` +
            `Schedule VII reporting and Form CSR-2 annual filing. ${org.ice_legal_name || 'The recipient organisation'} ` +
            `is a registered implementing agency under Section 135 of the Companies Act, 2013.`,
            margin, doc.y, { width: footerW, align: 'justify', lineGap: 1.5 }
        );

    // Signature
    const sigBoxW = 180;
    const sigBoxH = 90;
    const sigX = margin + contentWidth - sigBoxW;
    const sigY = pageHeight - margin - sigBoxH;

    if (org.ice_signatory_image) {
        safeImage(doc, org.ice_signatory_image, {
            x: sigX, y: sigY, width: sigBoxW, height: 50, fit: [sigBoxW, 50]
        });
    }
    doc.lineWidth(0.5).strokeColor(COLORS.border)
        .moveTo(sigX, sigY + 55).lineTo(sigX + sigBoxW, sigY + 55).stroke();
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.text)
        .text(org.ice_signatory_name || 'Authorised Signatory', sigX, sigY + 60, { width: sigBoxW, align: 'center' });
    doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
        .text(`for ${org.ice_legal_name || ''}`, sigX, sigY + 75, { width: sigBoxW, align: 'center' });

    doc.end();
};

module.exports = { renderCertificate, renderCsrReceipt };

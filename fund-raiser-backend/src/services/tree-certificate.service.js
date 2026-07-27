const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const fs = require('fs');
const path = require('path');

// "Certificate of Tree Donation" — a celebratory PDF emailed to donors who
// fund tree planting (ROOTS). Landscape A4, matched to the ICE brand design:
//   - the real ICE logo (embedded from ice_logo.svg as vectors)
//   - Cinzel (engraved serif) for the CERTIFICATE title
//   - Great Vibes (script) for the donor name
//   - Noto Sans for body/values — includes the ₹ glyph
// Fonts + logo live in ../assets and are bundled with the app.

const ASSETS = path.join(__dirname, '..', 'assets');
const FONTS = path.join(ASSETS, 'fonts');
const F = {
    cinzel: path.join(FONTS, 'Cinzel.ttf'),
    script: path.join(FONTS, 'GreatVibes-Regular.ttf'),
    sans: path.join(FONTS, 'NotoSans-Regular.ttf'),
    sansBold: path.join(FONTS, 'NotoSans-Bold.ttf')
};
const LOGO_SVG = fs.readFileSync(path.join(ASSETS, 'ice_logo.svg'), 'utf8');

const GREEN = '#2f7d4f';    // title + accents (matches logo green family)
const GREEN_DK = '#1f5c39';
const NAVY = '#16305b';     // labels (matches logo navy)
const CREAM = '#f6f7f1';    // page background
const TEXT = '#374151';

const fmtCurrency = (amount) =>
    '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

// Draw a small leaf (two mirrored bezier curves) centred at (cx, cy).
const drawLeaf = (doc, cx, cy, size, color) => {
    const s = size;
    doc.save().fillColor(color);
    doc.moveTo(cx, cy + s)
        .bezierCurveTo(cx - s, cy + s * 0.3, cx - s * 0.4, cy - s, cx, cy - s)
        .bezierCurveTo(cx + s * 0.4, cy - s, cx + s, cy + s * 0.3, cx, cy + s)
        .fill();
    doc.restore();
};

/**
 * Draw all certificate content onto an existing PDFDocument.
 * @param {PDFDocument} doc
 * @param {object} data - { donorName, trees, amount, date, projectName, projectTagline }
 */
const drawCertificate = (doc, data) => {
    const { donorName, trees, amount, date, projectName, projectTagline } = data;

    doc.registerFont('Cinzel', F.cinzel);
    doc.registerFont('Script', F.script);
    doc.registerFont('Sans', F.sans);
    doc.registerFont('SansBold', F.sansBold);

    const W = doc.page.width;   // ~841.89
    const H = doc.page.height;  // ~595.28
    const cx = W / 2;

    // ===== Background + decorative border =====
    doc.rect(0, 0, W, H).fill(CREAM);
    doc.lineWidth(2).strokeColor(GREEN).rect(18, 18, W - 36, H - 36).stroke();
    doc.lineWidth(0.75).strokeColor(GREEN).rect(26, 26, W - 52, H - 52).stroke();

    // ===== Bottom layered waves =====
    doc.save();
    doc.opacity(0.45).moveTo(0, H - 62)
        .bezierCurveTo(W * 0.28, H - 100, W * 0.6, H - 26, W, H - 74)
        .lineTo(W, H).lineTo(0, H).fillColor(GREEN).fill();
    doc.opacity(1).moveTo(0, H - 48)
        .bezierCurveTo(W * 0.30, H - 16, W * 0.62, H - 88, W, H - 50)
        .lineTo(W, H).lineTo(0, H).fillColor(GREEN_DK).fill();
    doc.restore();

    // ===== Header: real ICE logo (centred) =====
    const logoW = 250;
    const logoH = logoW * 44 / 197;
    try {
        SVGtoPDF(doc, LOGO_SVG, cx - logoW / 2, 40, { width: logoW, height: logoH, assumePt: true });
    } catch (e) {
        // Fallback to text wordmark if SVG embedding fails.
        doc.font('SansBold').fontSize(28).fillColor(NAVY).text('ICE', 0, 46, { align: 'center' });
    }

    // ===== Title =====
    doc.font('Cinzel').fontSize(44).fillColor(GREEN)
        .text('CERTIFICATE', 0, 106, { align: 'center', characterSpacing: 3 });
    doc.font('SansBold').fontSize(15).fillColor(NAVY)
        .text('OF TREE DONATION', 0, 162, { align: 'center', characterSpacing: 5 });
    drawLeaf(doc, cx, 190, 6, GREEN);

    // ===== Presented to =====
    doc.font('SansBold').fontSize(12).fillColor(NAVY)
        .text('PROUDLY PRESENTED TO', 0, 206, { align: 'center', characterSpacing: 2 });

    doc.font('Script').fontSize(46).fillColor(GREEN)
        .text(donorName || 'Valued Donor', 0, 226, { align: 'center' });

    const nameW = Math.min(380, W - 200);
    doc.lineWidth(0.75).strokeColor(GREEN)
        .moveTo(cx - nameW / 2, 296).lineTo(cx + nameW / 2, 296).stroke();

    // ===== Thank-you line =====
    doc.font('Sans').fontSize(12).fillColor(TEXT)
        .text('Thank you for your contribution towards\na greener and more sustainable future.',
            0, 308, { align: 'center', lineGap: 3 });

    // ===== Highlighted project block (right after the thank-you line) =====
    const boxW = 380, boxH = 60;
    const boxX = cx - boxW / 2, boxY = 348;
    doc.save();
    doc.roundedRect(boxX, boxY, boxW, boxH, 10).fillColor('#eaf4ea').fill();
    doc.lineWidth(1).strokeColor(GREEN).roundedRect(boxX, boxY, boxW, boxH, 10).stroke();
    doc.restore();
    doc.font('SansBold').fontSize(9).fillColor(NAVY)
        .text('PROJECT NAME', 0, boxY + 9, { align: 'center', characterSpacing: 2 });
    doc.font('Cinzel').fontSize(19).fillColor(GREEN)
        .text((projectName || 'ROOTS').toUpperCase(), 0, boxY + 21, { align: 'center' });
    if (projectTagline) {
        doc.font('Sans').fontSize(9).fillColor(TEXT)
            .text(projectTagline, 0, boxY + 46, { align: 'center' });
    }

    // ===== Stat row: Trees / Amount / Date =====
    const rowY = 430;
    const cols = [
        { label: 'TREES DONATED', value: String(trees), icon: 'leaf' },
        { label: 'AMOUNT', value: fmtCurrency(amount), icon: 'rupee' },
        { label: 'DATE', value: fmtDate(date), icon: 'date' }
    ];
    const colW = 230;
    const startX = cx - (colW * cols.length) / 2;

    cols.forEach((c, i) => {
        const x = startX + i * colW;
        const iconCx = x + 26, iconCy = rowY + 16;

        doc.lineWidth(1.2).strokeColor(GREEN).circle(iconCx, iconCy, 16).stroke();
        if (c.icon === 'leaf') {
            drawLeaf(doc, iconCx, iconCy, 8, GREEN);
        } else if (c.icon === 'rupee') {
            doc.font('SansBold').fontSize(14).fillColor(GREEN)
                .text('₹', iconCx - 9, iconCy - 8, { width: 18, align: 'center' });
        } else {
            doc.lineWidth(1.2).strokeColor(GREEN).rect(iconCx - 8, iconCy - 7, 16, 14).stroke();
            doc.moveTo(iconCx - 8, iconCy - 2).lineTo(iconCx + 8, iconCy - 2).stroke();
        }

        const textX = x + 52;
        doc.font('SansBold').fontSize(10).fillColor(NAVY)
            .text(c.label, textX, rowY + 4, { characterSpacing: 1 });
        doc.font('SansBold').fontSize(15).fillColor(TEXT)
            .text(c.value, textX, rowY + 18);

        if (i < cols.length - 1) {
            doc.lineWidth(0.75).strokeColor(GREEN)
                .moveTo(x + colW - 10, rowY - 2).lineTo(x + colW - 10, rowY + 42).stroke();
        }
    });

    // ===== Tagline =====
    drawLeaf(doc, cx, 486, 5, GREEN);
    doc.font('SansBold').fontSize(11).fillColor(NAVY)
        .text('TOGETHER, WE GROW A GREENER TOMORROW.', 0, 498, { align: 'center', characterSpacing: 1 });
};

/** Render the certificate to a writable stream (file / HTTP response). */
const renderTreeCertificate = (data, stream) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
    doc.pipe(stream);
    drawCertificate(doc, data);
    doc.end();
};

/** Render the certificate and resolve to a PDF Buffer (for email attachment). */
const generateTreeCertificateBuffer = (data) => new Promise((resolve, reject) => {
    try {
        const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
        const chunks = [];
        doc.on('data', (c) => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);
        drawCertificate(doc, data);
        doc.end();
    } catch (err) {
        reject(err);
    }
});

module.exports = { renderTreeCertificate, generateTreeCertificateBuffer };

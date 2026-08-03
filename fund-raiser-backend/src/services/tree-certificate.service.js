const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const fs = require('fs');
const path = require('path');

// "Certificate of Tree Donation" — a celebratory PDF emailed to donors who
// fund tree planting (ROOTS). Landscape A4, matched to the ICE brand design:
//   - the real ICE logo (embedded from ice_logo.svg as vectors)
//   - Noto Sans throughout for a clean modern type scale — includes the ₹ glyph
//   - Cinzel / Great Vibes remain registered for the optional formal variant
// Fonts + logo live in ../assets and are bundled with the app.
//
// Layout is a modern branded one: solid green header band with the logo on a
// white plaque, a clear type hierarchy, and the facts in card-style blocks
// rather than the earlier ornate bordered/scripted treatment.

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
const CREAM = '#f6f7f1';    // retained: soft fill for the emphasised stat card
const TEXT = '#374151';
const WHITE = '#ffffff';
const BORDER = '#e2e8f0';   // hairline card borders
const SOFT = '#eef6f0';     // tinted fill behind the headline stat
const MUTED = '#6b7280';

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
    const SIDE = 56;                    // page side gutter
    const contentW = W - SIDE * 2;

    // ===== Page =====
    doc.rect(0, 0, W, H).fill(WHITE);

    // ===== Decorative corner ribbons (navy + green) — top-left & bottom-right =====
    // sx/sy flip the shape into the opposite corner.
    const cornerRibbon = (ox, oy, sx, sy) => {
        doc.save();
        doc.moveTo(ox, oy)
            .lineTo(ox + sx * 300, oy)
            .bezierCurveTo(ox + sx * 180, oy + sy * 62, ox + sx * 130, oy + sy * 78, ox, oy + sy * 190)
            .fill(NAVY);
        doc.moveTo(ox, oy)
            .lineTo(ox + sx * 215, oy)
            .bezierCurveTo(ox + sx * 128, oy + sy * 44, ox + sx * 84, oy + sy * 54, ox, oy + sy * 132)
            .fill(GREEN);
        doc.restore();
    };
    cornerRibbon(0, 0, 1, 1);
    cornerRibbon(W, H, -1, -1);

    // ===== Border frame =====
    doc.lineWidth(1.5).strokeColor(GREEN).rect(28, 28, W - 56, H - 56).stroke();
    doc.lineWidth(0.6).strokeColor(GREEN_DK).rect(33, 33, W - 66, H - 66).stroke();

    // ===== Logo plaque (top-left, sits over the ribbon) =====
    const logoW = 150, logoH = logoW * 44 / 197;
    const plW = logoW + 32, plH = logoH + 22, plX = 46, plY = 42;
    doc.roundedRect(plX, plY, plW, plH, 10).fill(WHITE);
    doc.lineWidth(0.8).strokeColor(GREEN).roundedRect(plX, plY, plW, plH, 10).stroke();
    try {
        // No assumePt: let width/height scale the SVG's viewBox to fit the plaque.
        SVGtoPDF(doc, LOGO_SVG, plX + (plW - logoW) / 2, plY + (plH - logoH) / 2, {
            width: logoW, height: logoH
        });
    } catch (e) {
        doc.font('SansBold').fontSize(20).fillColor(NAVY).text('ICE', plX, plY + 17, { width: plW, align: 'center' });
    }

    // ===== Award seal (top-right) =====
    const sCx = W - 104, sCy = 92, sR = 40;
    doc.save();
    doc.moveTo(sCx - 15, sCy + 24).lineTo(sCx - 24, sCy + 64).lineTo(sCx - 5, sCy + 52).lineTo(sCx - 3, sCy + 34).fill(GREEN_DK);
    doc.moveTo(sCx + 15, sCy + 24).lineTo(sCx + 24, sCy + 64).lineTo(sCx + 5, sCy + 52).lineTo(sCx + 3, sCy + 34).fill(GREEN_DK);
    doc.circle(sCx, sCy, sR).fill(GREEN);
    doc.lineWidth(2).strokeColor(WHITE).circle(sCx, sCy, sR - 5).stroke();
    drawLeaf(doc, sCx, sCy - 9, 9, WHITE);
    doc.font('SansBold').fontSize(8).fillColor(WHITE)
        .text('TREE', sCx - 30, sCy + 4, { width: 60, align: 'center', characterSpacing: 1 });
    doc.font('SansBold').fontSize(8).fillColor(WHITE)
        .text('DONATION', sCx - 34, sCy + 14, { width: 68, align: 'center' });
    doc.restore();

    // ===== Title =====
    doc.font('Cinzel').fontSize(42).fillColor(NAVY)
        .text('CERTIFICATE', SIDE, 148, { width: contentW, align: 'center', characterSpacing: 2 });

    // Ribbon banner "OF TREE DONATION"
    const banW = 300, banH2 = 30, banX = cx - banW / 2, banY = 204;
    doc.save();
    doc.moveTo(banX - 15, banY + 3).lineTo(banX, banY + banH2 / 2).lineTo(banX - 15, banY + banH2 - 3).fill(GREEN_DK);
    doc.moveTo(banX + banW + 15, banY + 3).lineTo(banX + banW, banY + banH2 / 2).lineTo(banX + banW + 15, banY + banH2 - 3).fill(GREEN_DK);
    doc.rect(banX, banY, banW, banH2).fill(GREEN);
    doc.font('SansBold').fontSize(13).fillColor(WHITE)
        .text('OF TREE DONATION', banX, banY + 8, { width: banW, align: 'center', characterSpacing: 3 });
    doc.restore();

    // ===== Presented to =====
    doc.font('SansBold').fontSize(10).fillColor(NAVY)
        .text('THIS CERTIFICATE IS PROUDLY PRESENTED TO', SIDE, 256, {
            width: contentW, align: 'center', characterSpacing: 2
        });

    doc.font('Script').fontSize(50).fillColor(GREEN)
        .text(donorName || 'Valued Donor', SIDE, 272, {
            width: contentW, align: 'center', lineBreak: false, ellipsis: true
        });

    const ruleW = 300, ruleY = 346;
    doc.lineWidth(1).strokeColor(NAVY).moveTo(cx - ruleW / 2, ruleY).lineTo(cx + ruleW / 2, ruleY).stroke();

    // ===== Bold summary line + paragraph =====
    const treesLabel = `${trees} TREE${Number(trees) === 1 ? '' : 'S'}`;
    doc.font('SansBold').fontSize(11).fillColor(NAVY)
        .text(`FOR FUNDING ${treesLabel}  •  ${fmtCurrency(amount)}`, SIDE, ruleY + 12, {
            width: contentW, align: 'center', characterSpacing: 1
        });

    const para = `Thank you for your generous contribution to the ${projectName || 'ROOTS'} project` +
        `${projectTagline ? ' — ' + projectTagline : ''}. Your support helps restore our forests, ` +
        `one tree at a time, towards a greener and more sustainable future.`;
    doc.font('Sans').fontSize(10).fillColor(MUTED)
        .text(para, cx - 290, ruleY + 34, { width: 580, align: 'center', lineGap: 2.5 });

    // ===== Signatures =====
    const sigY = H - 86, sigW = 180;
    const lX = cx - 210, rX = cx + 30;
    // left — authorised signatory
    doc.lineWidth(1).strokeColor(NAVY).moveTo(lX, sigY).lineTo(lX + sigW, sigY).stroke();
    doc.font('SansBold').fontSize(9).fillColor(NAVY)
        .text('AUTHORISED SIGNATORY', lX, sigY + 6, { width: sigW, align: 'center', characterSpacing: 1 });
    doc.font('Sans').fontSize(8).fillColor(MUTED)
        .text('ICE Network', lX, sigY + 18, { width: sigW, align: 'center' });
    // right — date
    doc.font('Sans').fontSize(11).fillColor(TEXT)
        .text(fmtDate(date), rX, sigY - 15, { width: sigW, align: 'center' });
    doc.lineWidth(1).strokeColor(NAVY).moveTo(rX, sigY).lineTo(rX + sigW, sigY).stroke();
    doc.font('SansBold').fontSize(9).fillColor(NAVY)
        .text('DATE', rX, sigY + 6, { width: sigW, align: 'center', characterSpacing: 1 });
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

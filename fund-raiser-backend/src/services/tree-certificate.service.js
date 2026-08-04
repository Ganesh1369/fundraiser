const PDFDocument = require('pdfkit');
const SVGtoPDF = require('svg-to-pdfkit');
const fs = require('fs');
const path = require('path');

// "Certificate of Tree Donation" — the client-approved SVG template does all
// the design work (header, title, ROOTS wave, decorative leaves). This module
// only paints four dynamic fields on top:
//   - donor name in Great Vibes green script, above the underline
//   - trees donated in Montserrat 23.2pt, under the TREES DONATED label
//   - amount (₹) in Montserrat 23.2pt, under the AMOUNT label
//   - date (e.g. "27 July 2026") in Montserrat 23.2pt, under the DATE label
// The template's placeholder values were removed by the designer, so no
// whitewash is needed — plain overlay is enough.

const ASSETS = path.join(__dirname, '..', 'assets');
const FONTS = path.join(ASSETS, 'fonts');
const F = {
    script: path.join(FONTS, 'GreatVibes-Regular.ttf'),
    montBold: path.join(FONTS, 'Montserrat-Bold.ttf')
};
// Warm cream tint painted over the SVG to spread the sandal tone from the
// template's central watercolor cloud to the whole cert. The template's own
// backdrop is an opaque JPEG (with decorations baked into it), so tinting on
// top is the least-destructive option — sandal × white ≈ sandal, and the
// dark greens / navy read fine through the film.
const SANDAL_BG = '#f5efe1';
const SANDAL_OPACITY = 0.35;
const TEMPLATE_SVG = fs.readFileSync(
    path.join(ASSETS, 'cert', 'tree-donation-certificate-plainv2.svg'),
    'utf8'
);

// SVG viewBox — used as the PDF page size so overlay coords map 1:1.
const PAGE_W = 1086;
const PAGE_H = 814.5;

// Matches the template palette (sampled from the CERTIFICATE title / GREENER accent).
const NAME_GREEN = '#2e6d49';
const VALUE_GREEN = '#2e6d49';

// Slot coordinates measured against the SVG viewBox by inspecting DOM bboxes.
// name.cx / name.y position a Great Vibes headline just above the underline.
// The three stat labels sit with baseline at ~y=582; values are left-aligned
// under each label at textY=602 (baseline lands ~y=623).
const SLOT = {
    name:   { cx: 545, y: 363, w: 540, fontSize: 54 },
    trees:  { textX: 283, textY: 591 },
    amount: { textX: 527, textY: 591 },
    date:   { textX: 773, textY: 591 }
};
const STAT_FONT_SIZE = 20;

const fmtCurrency = (amount) =>
    '₹' + Number(amount).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

/**
 * Draw the certificate onto an existing PDFDocument.
 * @param {PDFDocument} doc
 * @param {object} data - { donorName, trees, amount, date }
 */
const drawCertificate = (doc, data) => {
    const { donorName, trees, amount, date } = data;

    doc.registerFont('Script', F.script);
    doc.registerFont('MontBold', F.montBold);

    SVGtoPDF(doc, TEMPLATE_SVG, 0, 0, { width: PAGE_W, height: PAGE_H });

    // Sandal-tint film over the whole page so the cream reaches the corners —
    // the SVG's own tint is only a central watercolor cloud.
    doc.save().fillOpacity(SANDAL_OPACITY).rect(0, 0, PAGE_W, PAGE_H).fill(SANDAL_BG).restore();

    // Donor name — Great Vibes green script, centred above the underline.
    doc.font('Script').fontSize(SLOT.name.fontSize).fillColor(NAME_GREEN)
        .text(donorName || 'Valued Donor', SLOT.name.cx - SLOT.name.w / 2, SLOT.name.y, {
            width: SLOT.name.w, align: 'center', lineBreak: false, ellipsis: true
        });

    // Stats — Montserrat Bold 23.2pt, cert green, left-aligned under each label.
    doc.font('MontBold').fontSize(STAT_FONT_SIZE).fillColor(VALUE_GREEN);
    doc.text(String(trees), SLOT.trees.textX, SLOT.trees.textY, { lineBreak: false });
    doc.text(fmtCurrency(amount), SLOT.amount.textX, SLOT.amount.textY, { lineBreak: false });
    doc.text(fmtDate(date), SLOT.date.textX, SLOT.date.textY, { lineBreak: false });
};

/** Render the certificate to a writable stream (file / HTTP response). */
const renderTreeCertificate = (data, stream) => {
    const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });
    doc.pipe(stream);
    drawCertificate(doc, data);
    doc.end();
};

/** Render the certificate and resolve to a PDF Buffer (for email attachment). */
const generateTreeCertificateBuffer = (data) => new Promise((resolve, reject) => {
    try {
        const doc = new PDFDocument({ size: [PAGE_W, PAGE_H], margin: 0 });
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

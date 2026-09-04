const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const svc = require('../services/volunteer-admin.service');

const handleError = (res, next, error) => {
    if (error?.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
};

/** Filter options for the list screen. */
exports.getMeta = async (req, res, next) => {
    try {
        res.json({ success: true, data: await svc.meta() });
    } catch (error) { handleError(res, next, error); }
};

exports.list = async (req, res, next) => {
    try {
        const [result, summary] = await Promise.all([svc.list(req.query), svc.summary(req.query)]);
        res.json({ success: true, data: { ...result, summary } });
    } catch (error) { handleError(res, next, error); }
};

exports.getById = async (req, res, next) => {
    try {
        res.json({ success: true, data: await svc.getById(req.params.id) });
    } catch (error) { handleError(res, next, error); }
};

exports.setActive = async (req, res, next) => {
    try {
        const data = await svc.setActive(req.params.id, req.body.isActive);
        res.json({ success: true, message: data.is_active ? 'Volunteer marked active' : 'Volunteer marked inactive', data });
    } catch (error) { handleError(res, next, error); }
};

/** Stream a volunteer's photo or ID proof. The route requires an admin token. */
exports.downloadDocument = async (req, res, next) => {
    try {
        const doc = await svc.getDocument(req.params.id, req.params.kind);
        const filePath = path.join(__dirname, '../../uploads/volunteers', doc.storedName);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File is missing from storage.' });
        }
        res.download(filePath, doc.originalName);
    } catch (error) { handleError(res, next, error); }
};

/** Excel or CSV of whatever the current filters select. */
exports.exportVolunteers = async (req, res, next) => {
    try {
        const rows = await svc.exportRows(req.query);
        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'No volunteers match these filters.' });
        }

        const format = String(req.query.format || 'xlsx').toLowerCase();
        const stamp = new Date().toISOString().slice(0, 10);
        const sheet = XLSX.utils.json_to_sheet(rows);

        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(sheet);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="volunteers-${stamp}.csv"`);
            // BOM so Excel opens UTF-8 (Indian-language names) correctly.
            return res.send('﻿' + csv);
        }

        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, 'Volunteers');
        const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="volunteers-${stamp}.xlsx"`);
        res.send(buffer);
    } catch (error) { handleError(res, next, error); }
};

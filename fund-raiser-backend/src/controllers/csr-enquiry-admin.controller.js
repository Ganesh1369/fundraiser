const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');
const svc = require('../services/csr-enquiry-admin.service');

const handleError = (res, next, error) => {
    if (error?.status) {
        const body = { success: false, message: error.message };
        if (error.errors) body.errors = error.errors;
        return res.status(error.status).json(body);
    }
    next(error);
};

/**
 * Expand a `preset` query param (e.g. fy_current) into dateFrom/dateTo. An explicit
 * date range always wins, so a user can override a preset without clearing it first.
 */
const withPreset = (query) => {
    if (!query.preset) return query;
    const range = svc.dateRangePreset(query.preset);
    return { ...range, ...query };
};

// ── Reference data ───────────────────────────────────────────────────────────

/** Everything the list screen needs to render its filters. */
exports.getMeta = async (req, res, next) => {
    try {
        const [admins, areas, alertConfig] = await Promise.all([svc.admins(), svc.areas(), svc.alertConfig()]);
        res.json({
            success: true,
            data: {
                statuses: svc.STATUSES,
                datePresets: svc.PRESETS,
                admins,
                areas,
                alertConfig,
                currentAdmin: { id: req.admin?.id, role: req.admin?.role || 'admin' },
            },
        });
    } catch (error) { handleError(res, next, error); }
};

// ── List, metrics, detail ────────────────────────────────────────────────────

exports.list = async (req, res, next) => {
    try {
        const query = withPreset(req.query);
        const [result, metrics] = await Promise.all([svc.list(query), svc.metrics(query)]);
        res.json({ success: true, data: { ...result, metrics } });
    } catch (error) { handleError(res, next, error); }
};

exports.getById = async (req, res, next) => {
    try {
        res.json({ success: true, data: await svc.getById(req.params.id) });
    } catch (error) { handleError(res, next, error); }
};

// ── Workflow ─────────────────────────────────────────────────────────────────

exports.updateStatus = async (req, res, next) => {
    try {
        const data = await svc.updateStatus(req.params.id, req.body, req.admin);
        res.json({ success: true, message: 'Status updated', data });
    } catch (error) { handleError(res, next, error); }
};

exports.assignOwner = async (req, res, next) => {
    try {
        const data = await svc.assignOwner(req.params.id, req.body.ownerAdminId || null, req.admin);
        res.json({ success: true, message: 'Owner updated', data });
    } catch (error) { handleError(res, next, error); }
};

exports.updateAmounts = async (req, res, next) => {
    try {
        const data = await svc.updateAmounts(req.params.id, req.body, req.admin);
        res.json({ success: true, message: 'Amounts updated', data });
    } catch (error) { handleError(res, next, error); }
};

// ── Notes ────────────────────────────────────────────────────────────────────

exports.addNote = async (req, res, next) => {
    try {
        const data = await svc.addNote(req.params.id, req.body.body, req.admin);
        res.status(201).json({ success: true, message: 'Note added', data });
    } catch (error) { handleError(res, next, error); }
};

// ── Milestones ───────────────────────────────────────────────────────────────

exports.addMilestone = async (req, res, next) => {
    try {
        const data = await svc.addMilestone(req.params.id, req.body, req.admin);
        res.status(201).json({ success: true, message: 'Milestone added', data });
    } catch (error) { handleError(res, next, error); }
};

exports.updateMilestone = async (req, res, next) => {
    try {
        const data = await svc.updateMilestone(req.params.id, req.params.milestoneId, req.body, req.admin);
        res.json({ success: true, message: 'Milestone updated', data });
    } catch (error) { handleError(res, next, error); }
};

exports.deleteMilestone = async (req, res, next) => {
    try {
        const data = await svc.deleteMilestone(req.params.id, req.params.milestoneId, req.admin);
        res.json({ success: true, message: 'Milestone removed', data });
    } catch (error) { handleError(res, next, error); }
};

// ── Documents ────────────────────────────────────────────────────────────────

exports.uploadDocument = async (req, res, next) => {
    try {
        const data = await svc.addDocument(req.params.id, req.file, req.admin);
        res.status(201).json({ success: true, message: 'Document uploaded', data });
    } catch (error) { handleError(res, next, error); }
};

exports.downloadDocument = async (req, res, next) => {
    try {
        const doc = await svc.getDocument(req.params.id, req.params.documentId);
        const filePath = path.join(__dirname, '../../uploads/csr', doc.stored_name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'File is missing from storage.' });
        }
        res.download(filePath, doc.original_name);
    } catch (error) { handleError(res, next, error); }
};

exports.deleteDocument = async (req, res, next) => {
    try {
        const doc = await svc.deleteDocument(req.params.id, req.params.documentId, req.admin);
        // Remove the file after the row, so a failed unlink leaves an orphan file rather
        // than a row pointing at nothing.
        const filePath = path.join(__dirname, '../../uploads/csr', doc.stored_name);
        fs.promises.unlink(filePath).catch(err => console.error('CSR document unlink failed:', err.message));
        res.json({ success: true, message: 'Document removed', data: await svc.getById(req.params.id) });
    } catch (error) { handleError(res, next, error); }
};

// ── Reporting ────────────────────────────────────────────────────────────────

exports.pipelineReport = async (req, res, next) => {
    try {
        res.json({ success: true, data: await svc.pipelineReport(withPreset(req.query)) });
    } catch (error) { handleError(res, next, error); }
};

/** Excel or CSV of whatever the current filters select. */
exports.exportEnquiries = async (req, res, next) => {
    try {
        const rows = await svc.exportRows(withPreset(req.query));
        const format = String(req.query.format || 'xlsx').toLowerCase();
        const stamp = new Date().toISOString().slice(0, 10);

        if (!rows.length) {
            return res.status(404).json({ success: false, message: 'No enquiries match these filters.' });
        }

        const sheet = XLSX.utils.json_to_sheet(rows);

        if (format === 'csv') {
            const csv = XLSX.utils.sheet_to_csv(sheet);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="csr-enquiries-${stamp}.csv"`);
            // BOM so Excel opens UTF-8 (₹, Indian-language names) correctly.
            return res.send('﻿' + csv);
        }

        const book = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(book, sheet, 'CSR Enquiries');
        const buffer = XLSX.write(book, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="csr-enquiries-${stamp}.xlsx"`);
        res.send(buffer);
    } catch (error) { handleError(res, next, error); }
};

// ── Status alert configuration ───────────────────────────────────────────────

exports.updateAlertConfig = async (req, res, next) => {
    try {
        const data = await svc.updateAlertConfig(req.params.status, req.body);
        res.json({ success: true, message: 'Alert settings saved', data });
    } catch (error) { handleError(res, next, error); }
};

/**
 * How a CSR enquiry or volunteer registration was captured.
 *
 * Stored on the row as `submitted_via` and decided by the endpoint used, not by anything
 * the client sends. Shared by both admin services so the list, the detail screen and the
 * export can never label the same value differently.
 */

const SUBMITTED_VIA_LABELS = {
    self: 'Filled by user',
    ice: 'Filled by ICE',
};

/** Falls back to 'self' — the column's default, and the only possibility before it existed. */
const submittedViaLabel = (value) => SUBMITTED_VIA_LABELS[value] || SUBMITTED_VIA_LABELS.self;

module.exports = { SUBMITTED_VIA_LABELS, submittedViaLabel };

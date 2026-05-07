// Referral-points formula by version (locked PHASE-2-PLAN.md §5).
// v1: legacy, ₹1 = 1 pt. Frozen for pre-cutover donations.
// v2: Phase 2.1, ₹100 = 1 pt. Default for all new donations from cutover onward.

const FORMULA = {
    1: (amount) => Math.floor(amount),
    2: (amount) => Math.floor(amount / 100)
};

const computePoints = (amount, version) => {
    const v = Number(version) || 2;
    const fn = FORMULA[v] || FORMULA[2];
    return fn(parseFloat(amount));
};

module.exports = { computePoints, FORMULA };

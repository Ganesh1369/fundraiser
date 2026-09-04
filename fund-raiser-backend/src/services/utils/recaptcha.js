/**
 * Google reCAPTCHA v2 ("I'm not a robot" checkbox) verification.
 *
 * v2 is a straight pass/fail: the user ticks the box, Google returns success or not.
 * Unlike v3 there is no score and no action, so nothing here is judgement-based — a
 * response either verified or it did not.
 *
 * `expectedAction` is still accepted so callers need not change if the site is ever moved
 * back to v3; with v2 it is simply ignored by Google and used only for log messages.
 *
 * Shared by the CSR enquiry form and the volunteer registration form.
 */

const VERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const TIMEOUT_MS = 8000;

const minScore = () => {
    const v = Number(process.env.RECAPTCHA_MIN_SCORE);
    return Number.isFinite(v) ? v : 0.5;
};

/** False when no secret is configured — callers use this to fail closed rather than silently. */
const isConfigured = () => !!process.env.RECAPTCHA_SECRET_KEY;

/**
 * Verify a token with Google.
 *
 * Returns { ok, reason, score }. Never throws: a network failure is reported as a failed
 * verification so the caller decides what to do, rather than surfacing a 500 to a user who
 * did nothing wrong.
 *
 * `expectedAction` guards against a token minted on one form being replayed against
 * another — Google echoes back the action the browser declared.
 */
const verify = async (token, expectedAction, remoteIp) => {
    if (!isConfigured()) {
        return { ok: false, reason: 'not-configured' };
    }
    if (!token || typeof token !== 'string') {
        return { ok: false, reason: 'missing-token' };
    }

    const body = new URLSearchParams({
        secret: process.env.RECAPTCHA_SECRET_KEY,
        response: token,
    });
    // Google treats the IP as advisory; behind a proxy it can be wrong, so it is sent but
    // never relied upon.
    if (remoteIp) body.set('remoteip', remoteIp);

    let data;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(VERIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body,
            signal: controller.signal,
        });
        clearTimeout(timer);
        data = await res.json();
    } catch (err) {
        console.error('reCAPTCHA verification request failed:', err.message);
        return { ok: false, reason: 'network-error' };
    }

    if (!data.success) {
        const codes = (data['error-codes'] || []).join(', ');
        console.warn('reCAPTCHA rejected a token:', codes || 'unknown');
        return { ok: false, reason: codes || 'rejected' };
    }

    // v2 returns no score or action. If a v3 key were ever configured instead, Google would
    // include a score — so the threshold is applied only when one is actually present.
    if (typeof data.score === 'number' && data.score < minScore()) {
        console.warn(`reCAPTCHA blocked ${expectedAction}: score ${data.score} < ${minScore()}`);
        return { ok: false, reason: 'low-score', score: data.score };
    }

    // Logged on success too: without this a passing check is silent, which makes
    // "is reCAPTCHA actually running?" impossible to answer from the log.
    console.log(`reCAPTCHA passed ${expectedAction}${typeof data.score === 'number' ? `: score ${data.score}` : ''}`);
    return { ok: true, score: data.score };
};

/** The message shown to a user whose submission was refused. */
const failureMessage = (reason) => {
    switch (reason) {
        case 'missing-token':
            return 'Please confirm you are not a robot before submitting.';
        case 'network-error':
            return 'We could not reach the verification service. Please try again in a moment.';
        case 'not-configured':
            return 'Verification is not configured on this server. Please contact us directly.';
        case 'low-score':
            return 'Your submission looked automated and was blocked. If this is wrong, please contact us directly.';
        case 'timeout-or-duplicate':
            return 'The verification expired. Please tick the box again and resubmit.';
        default:
            return 'Verification failed. Please tick the box again and resubmit.';
    }
};

module.exports = { verify, isConfigured, failureMessage, minScore };

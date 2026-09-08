// Development environment.
// `production: false` enables verbose logging / source maps.
// In production builds, this file is replaced by environment.prod.ts via
// the angular.json `fileReplacements` mapping.

export const environment = {
    production: false,
    apiUrl: 'http://localhost:4000/api',
    // Google reCAPTCHA v2 site key. Public by design — it identifies the site to Google;
    // the matching secret key lives only in the backend .env.
    recaptchaSiteKey: '6LdN5agtAAAAAOZ-20iEOL9ExquEG291UsbaMY3l'
};

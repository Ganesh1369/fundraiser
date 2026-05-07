// Production environment.
// Swapped in for `environment.ts` at build time via angular.json `fileReplacements`.
//
// TODO: confirm the apiUrl below matches the deployed backend host before
// running `ng build --configuration production`. If the backend is on a
// subdomain like api.icenetwork.in, set that here.

export const environment = {
    production: true,
    apiUrl: 'https://api.icenetwork.in/api'
};

const express = require('express');
const router = express.Router();
const { getCountries, getStatesOfCountry, getCitiesOfState } = require('@countrystatecity/countries');

// In-memory cache (static data, never changes at runtime)
let countriesCache = null;
const statesCache = {};
const citiesCache = {};

router.get('/countries', async (req, res) => {
    try {
        if (!countriesCache) {
            const all = await getCountries();
            countriesCache = all.map(c => ({ name: c.name, iso2: c.iso2 }));
        }
        res.json({ success: true, data: countriesCache });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load countries' });
    }
});

router.get('/states/:countryCode', async (req, res) => {
    try {
        const { countryCode } = req.params;
        if (!statesCache[countryCode]) {
            const states = await getStatesOfCountry(countryCode);
            statesCache[countryCode] = states.map(s => ({ name: s.name, iso2: s.iso2 }));
        }
        res.json({ success: true, data: statesCache[countryCode] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load states' });
    }
});

router.get('/cities/:countryCode/:stateCode', async (req, res) => {
    try {
        const { countryCode, stateCode } = req.params;
        const key = `${countryCode}_${stateCode}`;
        if (!citiesCache[key]) {
            const cities = await getCitiesOfState(countryCode, stateCode);
            citiesCache[key] = cities.map(c => ({ name: c.name, id: c.id }));
        }
        res.json({ success: true, data: citiesCache[key] });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to load cities' });
    }
});

module.exports = router;

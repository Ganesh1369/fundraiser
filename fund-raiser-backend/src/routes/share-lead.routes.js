const express = require('express');
const router = express.Router();
const shareLeadController = require('../controllers/share-lead.controller');

router.post('/share-leads', shareLeadController.create);

module.exports = router;

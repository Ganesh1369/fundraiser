const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const pushController = require('../controllers/push.controller');

router.get('/push/public-key', pushController.getPublicKey);
router.post('/push/subscribe', verifyToken, pushController.subscribe);
router.delete('/push/subscribe', verifyToken, pushController.unsubscribe);

module.exports = router;

const express = require('express');
const viewsController = require('../controllers/viewsController');
const authController = require('../controllers/authController');
const router = express.Router();
router.use(authController.isLoggedIn);
router.get('/login', viewsController.getLoginForm);
router.get('/', viewsController.getHomepage);
router.get('/dashboard', authController.protect, viewsController.getDashboard);
module.exports = router;

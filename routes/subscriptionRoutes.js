const express = require('express');
const subscriptionController = require('../controllers/subscriptionController');

const router = express.Router();

router
    .route('/')
    .get(subscriptionController.getAllSubscription)
    .post(
        subscriptionController.validateSubscriptionData,
        subscriptionController.createSubscription
    );
//.post(serviceController.createService);

router
    .route('/:subscriptionId')
    .patch(
        subscriptionController.validateSubscriptionData,
        subscriptionController.editSubscription
    )
    .delete(subscriptionController.deleteSubscription);

module.exports = router;

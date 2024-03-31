const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Cart = require('../models/cartModel');
const Service = require('../models/servicesModel');
const ServiceAvailed = require('../models/serviceAvailedModel');
const Subscription = require('../models/subscriptionModel');
const Booking = require('../models/bookingModel');
const AppError = require('../utils/appError');
const catchAsync = require('../utils/catchAsync');
const User = require('../models/userModel');

exports.getCheckoutSession = catchAsync(async (req, res, next) => {
    //req.params.userId

    const cartItems = await Cart.find({ owner: req.user._id });
    console.log(cartItems);
    // console.log(req.user);
    console.log('checkout session');
    let line_items1 = [];
    for (item of cartItems) {
        let newItem = {
            price_data: {
                currency: 'eur',
                unit_amount: item.price * 100,
                product_data: {
                    name: `${item.product}-${item.plateNumber}`,
                    description: item.description,
                },
            },
            quantity: 1,
        };
        line_items1.push(newItem);
    }
    console.log(line_items1);
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        success_url: `${req.protocol}://${req.get('host')}/dashboard`,
        cancel_url: `${req.protocol}://${req.get('host')}/carts`,
        customer_email: req.user.email,
        client_reference_id: req.params.userId,
        line_items: line_items1,
        mode: 'payment',
    });

    res.status(200).json({
        status: 'success',
        session,
    });
});
const createBookingCheckout = async (session) => {
    // if successful booking create a checkout and clear the items in cart by the user
    console.log('inside create booking checkout');
    const owner = session.client_reference_id;

    const carts = await Cart.find({ owner: owner });

    for (cart of carts) {
        const newBooking = await Booking.create({
            tokensAmount: 1,
            owner: owner,
            product: cart.product,
            classification: cart.classification,
            plateNumber: cart.plateNumber,
        });
        generateTokenForUser(newBooking._id);
    }
};

const generateTokenForUser = async (newBookingId) => {
    const subscriptions = await Subscription.find();
    const services = await Service.find();
    const booking = await Booking.findById(newBookingId);

    const serviceExists = services.some(
        (service) => service.name === booking.product
    );
    const subscriptionExists = subscriptions.some(
        (subscription) => subscription.name === booking.product
    );
    if (serviceExists) {
        console.log('CHECKING IF IT GOES HERE');
        await ServiceAvailed.create({
            tokensAmount: booking.tokensAmount,
            owner: booking.owner,
            plateNumber: booking.plateNumber,
            product: booking.product,
            bookingId: booking._id,
        });
    }

    if (subscriptionExists) {
        // generate token
    }
};

const deleteItemsInCart = async (session) => {
    const owner = session.client_reference_id;
    await Cart.deleteMany({ owner: owner });
};
exports.webhookCheckout = catchAsync(async (req, res, next) => {
    console.log('INSIDE WEBHOOK CHECKOUT');

    const sig = req.headers['stripe-signature'];
    let event;
    try {
        event = stripe.webhooks.constructEvent(
            req.body,
            sig,
            process.env.STRIPE_WEBHOOK_SECRET
        );
    } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
        return;
    }
    if (event.type === 'checkout.session.completed') {
        console.log('CREATING BOOKING');
        // create a booking for the admin
        createBookingCheckout(event.data.object);
        // generate the tokens
        //   generateTokenForUser(event.data.object);
        // clear the cart of user
        deleteItemsInCart(event.data.object);
    }
    console.log('FINISHED');

    res.status(200).json({
        received: true,
    });
});

exports.getAllBookings = catchAsync(async (req, res, next) => {
    const bookings = await Booking.find();
    res.status(200).json({
        status: 'success',
        data: {
            booking: bookings,
        },
    });
});
exports.updateBookingStatus = catchAsync(async (req, res, next) => {
    console.log('INSIDE UPDATING BOOKING');
    console.log(req.body);
    const updatedBooking = await Booking.findByIdAndUpdate(
        req.params.bookingId,
        {
            scheduledDate: req.body.scheduledDate,
        },
        {
            new: true,
            runValidators: true,
        }
    );
    console.log(updatedBooking);
    res.status(200).json({
        status: 'success',
        data: {
            booking: updatedBooking,
        },
    });
});
exports.createCheckoutSessionSubscription = async (req, res, next) => {
    // pass in here the data
    // which is the subscription_id selected
    // req.params.userId
    console.log('Inside create checkout session subscription');
    const subscriptionToAvail = req.body;
    console.log(subscriptionToAvail);
    // first of create a customer
    const user = await User.findById(subscriptionToAvail.owner);

    const fullName = `${user.firstName} ${user.lastName}`;

    // try to create the customer
    const customer = await stripe.customers.create({
        email: user.email,
        name: fullName,
    });
    // conver the productName to SUBSCRIPTION 1 to Subscription 1
    let productNameToAvail = subscriptionToAvail.product;
    console.log(productNameToAvail);
    productNameToAvail = productNameToAvail
        .toLowerCase()
        .split(' ')
        .map((word) => {
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');

    const productName = `${productNameToAvail}-${subscriptionToAvail.classification}`;

    const priceId = req.body.price;

    const products = await stripe.products.list({ limit: 100 });

    let selectedProduct;

    // Iterate through the list of products
    for (const product of products.data) {
        if (product.name == productName) {
            selectedProduct = product;
            break; // Exit the loop once a match is found
        }
    }
    const selectedProductId = selectedProduct.id;

    const stripePrices = await stripe.prices.list({ limit: 100 });

    let selectedPrice;
    for (price of stripePrices.data) {
        if (price.product == selectedProductId) {
            selectedPrice = price;
            break;
        }
    }
    const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        line_items: [
            {
                price: selectedPrice.id,
                // For metered billing, do not pass quantity
                quantity: 1,
            },
        ],
        // {CHECKOUT_SESSION_ID} is a string literal; do not change it!
        // the actual Session ID is returned in the query parameter when your customer
        // is redirected to the success page.
        success_url: `${req.protocol}://${req.get('host')}/dashboard`,
        cancel_url: `${req.protocol}://${req.get('host')}/subscriptions`,
    });

    console.log(session);
    // console.log(products);
    // console.log(products.data.length);

    // create the user first
};

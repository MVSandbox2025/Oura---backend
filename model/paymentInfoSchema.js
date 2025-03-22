const mongoose = require('mongoose');
const { Schema, model } = mongoose;


const paymentSchema = new Schema({
    sessionID: String,
    customerID: String,
    subscriptionID: String,
    productName: String,
    email: String,
    startDate: Date,
    expiryDate: Date,
    words: Number,
    status: String,
});


const Payment = model('payment', paymentSchema);

module.exports = Payment;
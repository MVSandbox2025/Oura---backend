const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const systemSchema = new Schema({
  email: String,
  message: String,
});


const message = model('message', systemSchema);

module.exports = message;
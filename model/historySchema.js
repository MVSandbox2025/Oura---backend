const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const chatSchema = new Schema({
    role: { type: String, enum: ['user'] },
    content: { type: String }
});

const historySchema = new Schema({
    email: String,
    chat: [chatSchema],
});


const History = model('history', historySchema);

module.exports = History;
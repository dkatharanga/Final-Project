// src/config/mongo.js
const mongoose = require('mongoose')
const logger   = require('../utils/logger')

async function connectMongo() {
  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 5000,
  })
}

mongoose.connection.on('disconnected', () => logger.warn('MongoDB disconnected'))
mongoose.connection.on('error', (err) => logger.error('MongoDB error:', err))

module.exports = { connectMongo }

// src/models/AttendanceLog.js — MongoDB schema
const mongoose = require('mongoose')

const attendanceSchema = new mongoose.Schema({
  branchId:   { type: String, required: true, index: true },
  tenantId:   { type: String, required: true, index: true },
  memberId:   { type: String, index: true },
  memberName: String,
  memberCode: String,
  method:     { type: String, enum: ['FACE', 'FINGERPRINT', 'QR', 'RFID', 'MANUAL'], default: 'FACE' },
  result:     { type: String, enum: ['GRANTED', 'DENIED', 'FROZEN', 'EXPIRED'],       default: 'GRANTED' },
  confidence: { type: Number, min: 0, max: 100 },
  deviceId:   String,
  ipAddress:  String,
  note:       String,
  checkedAt:  { type: Date, default: Date.now, index: true },
}, {
  timestamps: true,
  collection: 'attendance_logs',
})

// Compound index for fast queries
attendanceSchema.index({ branchId: 1, checkedAt: -1 })
attendanceSchema.index({ memberId: 1, checkedAt: -1 })

const AttendanceLog = mongoose.model('AttendanceLog', attendanceSchema)
module.exports = AttendanceLog

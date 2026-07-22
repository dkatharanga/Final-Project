// src/utils/response.js — Standardised API responses

const ok = (res, data = {}, message = 'Success', statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data })

const created = (res, data = {}, message = 'Created successfully') =>
  ok(res, data, message, 201)

const noContent = (res) =>
  res.status(204).send()

const badRequest = (res, message = 'Bad request', errors = null) =>
  res.status(400).json({ success: false, message, ...(errors && { errors }) })

const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, message })

const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, message })

const notFound = (res, message = 'Not found') =>
  res.status(404).json({ success: false, message })

const conflict = (res, message = 'Conflict') =>
  res.status(409).json({ success: false, message })

const serverError = (res, message = 'Internal server error') =>
  res.status(500).json({ success: false, message })

const paginated = (res, data, pagination) =>
  res.status(200).json({ success: true, data, pagination })

module.exports = { ok, created, noContent, badRequest, unauthorized, forbidden, notFound, conflict, serverError, paginated }

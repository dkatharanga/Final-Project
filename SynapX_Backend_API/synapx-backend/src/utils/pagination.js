// src/utils/pagination.js

function getPagination(query) {
  const page  = Math.max(parseInt(query.page  || 1),  1)
  const limit = Math.min(parseInt(query.limit || 20), 100)
  const skip  = (page - 1) * limit
  return { page, limit, skip }
}

function buildMeta(total, page, limit) {
  return {
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1,
  }
}

module.exports = { getPagination, buildMeta }

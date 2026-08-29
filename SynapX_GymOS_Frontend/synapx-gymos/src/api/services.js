// src/api/services.js
import api from './client'

export const authService = {
  login:  (email, password) => api.post('/auth/login', { email, password }),
  logout: ()                => api.post('/auth/logout'),
  getMe:  ()                => api.get('/auth/me'),
}

export const dashboardService = {
  kpis:             (params) => api.get('/dashboard/kpis',             params),
  revenueChart:     (params) => api.get('/dashboard/revenue-chart',     params),
  memberGrowth:     (params) => api.get('/dashboard/member-growth',     params),
  planDistribution: (params) => api.get('/dashboard/plan-distribution', params),
  weeklyAttendance: (params) => api.get('/dashboard/weekly-attendance', params),
}

export const memberService = {
  list:     (params)    => api.get('/members',              params),
  getOne:   (id)        => api.get(`/members/${id}`),
  create:   (body)      => api.post('/members',             body),
  update:   (id, body)  => api.put(`/members/${id}`,        body),
  renew:    (id, body)  => api.post(`/members/${id}/renew`, body),
  remove:   (id)        => api.delete(`/members/${id}`),      // SUPER_ADMIN only
  freeze:   (id, body)  => api.patch(`/members/${id}/freeze`, body),
  unfreeze: (id)        => api.patch(`/members/${id}/unfreeze`),
}

export const biometricService = {
  get:          (memberId)          => api.get(`/biometric/${memberId}`),
  // SUPER_ADMIN only (enforced server-side). Backend forwards captures to the
  // biometric microservice and stores the returned embedding/template bytes.
  enrollFace:   (memberId, image)   => api.post(`/biometric/${memberId}/enroll`, { type: 'face', faceImage: image }),
  // Legacy ZKTeco desk-reader path (bridge captures from its own attached reader).
  enrollFinger: (memberId)          => api.post(`/biometric/${memberId}/enroll`, { type: 'fingerprint' }),
  // Fingerprint via THIS device's own sensor (WebAuthn platform authenticator —
  // Windows Hello / an ASUS laptop's built-in reader / Touch ID).
  fingerprintOptions: (memberId)                       => api.get(`/biometric/${memberId}/fingerprint/options`),
  fingerprintVerify:  (memberId, attestationResponse)  => api.post(`/biometric/${memberId}/fingerprint/verify`, { attestationResponse }),
  remove:       (memberId, type)    => api.delete(`/biometric/${memberId}${type ? `?type=${type}` : ''}`),
}

export const attendanceService = {
  checkIn:    (body)   => api.post('/attendance/checkin', body),
  fingerprintOptions: () => api.get('/attendance/checkin/fingerprint-options'),
  list:       (params) => api.get('/attendance',          params),
  todayStats: (params) => api.get('/attendance/today',    params),
  heatmap:    (params) => api.get('/attendance/heatmap',  params),
  liveFeed:   (params) => api.get('/attendance/live',     params),
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'

export const paymentService = {
  list:           (params) => api.get('/payments',                params),
  create:         (body)   => api.post('/payments',               body),
  markPaid:       (id)     => api.patch(`/payments/${id}/paid`),
  revenueSummary: (params) => api.get('/payments/summary/revenue', params),
  // No PDF endpoint yet — return the payment resource URL so the UI never crashes.
  invoiceUrl:     (id)     => `${API_BASE}/payments/${id}`,
}

export const classService = {
  list:   (params)    => api.get('/classes',       params),
  create: (body)      => api.post('/classes',      body),
  update: (id, body)  => api.put(`/classes/${id}`, body),
  remove: (id)        => api.delete(`/classes/${id}`),
}

export const staffService = {
  list:   (params)    => api.get('/staff',         params),
  getOne: (id)        => api.get(`/staff/${id}`),
  create: (body)      => api.post('/staff',        body),   // ADMIN only
  update: (id, body)  => api.put(`/staff/${id}`,   body),   // ADMIN only
  remove: (id)        => api.delete(`/staff/${id}`),        // ADMIN only
}

export const reportService = {
  members:        (params) => api.get('/reports/members',          params),
  revenue:        (params) => api.get('/reports/revenue',          params),
  churn:          (params) => api.get('/reports/churn',            params),
  monthlySummary: (params) => api.get('/reports/monthly-summary',  params),
}
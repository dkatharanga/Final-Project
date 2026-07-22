# SynapX GymOS — Backend API

> Node.js + Express + PostgreSQL + MongoDB + Redis  
> REST API for the complete GymOS platform

---

## ⚡ Quick Start (4 Steps)

### Step 1 — Install Dependencies
```bash
npm install
```

### Step 2 — Configure Environment
Edit `.env` file — update your database URLs:
```env
DATABASE_URL="postgresql://USER:PASS@localhost:5432/synapx_gymos"
MONGODB_URI=mongodb://localhost:27017/synapx_logs
REDIS_URL=redis://localhost:6379
JWT_SECRET=change_this_to_a_long_random_string
```

### Step 3 — Setup Database
```bash
# Run Prisma migrations (creates all tables)
npx prisma migrate dev --name init

# Seed with demo data
npm run seed
```

### Step 4 — Start Server
```bash
npm run dev
```
API runs at: **http://localhost:5000**

---

## 📁 Project Structure

```
synapx-backend/
├── prisma/
│   └── schema.prisma          ← Full DB schema (14 tables)
├── src/
│   ├── server.js              ← Entry point
│   ├── config/
│   │   ├── prisma.js          ← PostgreSQL connection
│   │   ├── mongo.js           ← MongoDB connection
│   │   └── redis.js           ← Redis connection + helpers
│   ├── controllers/
│   │   ├── authController.js       ← Login, JWT, refresh
│   │   ├── memberController.js     ← Full member CRUD
│   │   ├── attendanceController.js ← Check-in, heatmap, live feed
│   │   ├── paymentController.js    ← Invoices, Stripe, PDF
│   │   └── dashboardController.js  ← KPIs, charts
│   ├── middleware/
│   │   ├── auth.js            ← JWT verify + RBAC guard
│   │   ├── errorHandler.js    ← Global error handler
│   │   ├── rateLimiter.js     ← Rate limiting
│   │   └── validate.js        ← express-validator wrapper
│   ├── models/
│   │   └── AttendanceLog.js   ← MongoDB schema
│   ├── routes/
│   │   ├── auth.js            ← /api/v1/auth
│   │   ├── members.js         ← /api/v1/members
│   │   ├── memberships.js     ← /api/v1/memberships
│   │   ├── attendance.js      ← /api/v1/attendance
│   │   ├── classes.js         ← /api/v1/classes
│   │   ├── bookings.js        ← /api/v1/bookings
│   │   ├── payments.js        ← /api/v1/payments
│   │   ├── staff.js           ← /api/v1/staff
│   │   ├── biometric.js       ← /api/v1/biometric
│   │   ├── equipment.js       ← /api/v1/equipment
│   │   ├── reports.js         ← /api/v1/reports
│   │   ├── dashboard.js       ← /api/v1/dashboard
│   │   └── webhooks.js        ← /api/v1/webhooks/stripe
│   └── utils/
│       ├── logger.js          ← Winston logger
│       ├── response.js        ← Standardised responses
│       ├── pagination.js      ← Pagination helpers
│       └── seed.js            ← Demo data seeder
├── .env                       ← Environment variables
├── nodemon.json
└── package.json
```

---

## 🗺️ API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Staff login → returns JWT |
| POST | `/api/v1/auth/register` | First admin setup |
| POST | `/api/v1/auth/refresh` | Refresh access token |
| POST | `/api/v1/auth/logout` | Revoke session |
| GET  | `/api/v1/auth/me` | Current user info |
| PATCH| `/api/v1/auth/password` | Change password |

### Members
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET    | `/api/v1/members` | List + search + filter |
| POST   | `/api/v1/members` | Create member |
| GET    | `/api/v1/members/:id` | Get member details |
| PUT    | `/api/v1/members/:id` | Update member |
| DELETE | `/api/v1/members/:id` | Deactivate member |
| PATCH  | `/api/v1/members/:id/freeze` | Freeze membership |
| PATCH  | `/api/v1/members/:id/unfreeze` | Unfreeze |
| POST   | `/api/v1/members/:id/photo` | Upload photo |

### Attendance
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/attendance/checkin` | Kiosk check-in |
| GET  | `/api/v1/attendance` | Log list |
| GET  | `/api/v1/attendance/today` | Today stats |
| GET  | `/api/v1/attendance/heatmap` | Weekly heatmap |
| GET  | `/api/v1/attendance/live` | Live feed |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET  | `/api/v1/payments` | List invoices |
| POST | `/api/v1/payments` | Record payment |
| PATCH| `/api/v1/payments/:id/paid` | Mark as paid |
| GET  | `/api/v1/payments/:id/invoice` | Download PDF |
| POST | `/api/v1/payments/stripe-session` | Create Stripe checkout |

### Dashboard
| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/dashboard/kpis` | All KPI metrics |
| `GET /api/v1/dashboard/revenue-chart` | Revenue chart data |
| `GET /api/v1/dashboard/member-growth` | Growth chart |
| `GET /api/v1/dashboard/weekly-attendance` | Attendance bars |

---

## 🔐 Authentication

All protected routes need:
```
Authorization: Bearer <accessToken>
```

**Roles (highest → lowest):**
- `SUPER_ADMIN` — full access
- `MANAGER` — all except admin settings
- `TRAINER` — classes + bookings + members (read)
- `RECEPTIONIST` — check-in + member creation
- `READ_ONLY` — view only

---

## 🗄️ Databases Required

Install locally or use Docker:

```bash
# PostgreSQL
docker run -d --name synapx-pg \
  -e POSTGRES_USER=synapx_user \
  -e POSTGRES_PASSWORD=synapx_pass \
  -e POSTGRES_DB=synapx_gymos \
  -p 5432:5432 postgres:16

# MongoDB
docker run -d --name synapx-mongo \
  -p 27017:27017 mongo:7

# Redis
docker run -d --name synapx-redis \
  -p 6379:6379 redis:7
```

Or install all 3 at once:
```bash
docker-compose up -d
```

---

## 🧪 Test the API

```bash
# Login
curl -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@synapx.io","password":"Admin@1234"}'

# Health check
curl http://localhost:5000/health
```

---

## 🔗 Connect to Frontend

In your frontend (`synapx-gymos`) add:
```js
// src/api/client.js
const API = 'http://localhost:5000/api/v1'
const token = localStorage.getItem('token')

export const fetchDashboard = () =>
  fetch(`${API}/dashboard/kpis`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.json())
```

---

**SynapX Technologies** · synapx.io

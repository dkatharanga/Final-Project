// src/data/mockData.js
// All mock data for SynapX GymOS — replace with real API calls later

export const revenueData = [
  { month: 'Sep', revenue: 8400,  target: 9000  },
  { month: 'Oct', revenue: 9200,  target: 9000  },
  { month: 'Nov', revenue: 8800,  target: 9500  },
  { month: 'Dec', revenue: 11200, target: 10000 },
  { month: 'Jan', revenue: 10400, target: 10500 },
  { month: 'Feb', revenue: 12100, target: 11000 },
  { month: 'Mar', revenue: 13800, target: 12000 },
]

export const attendanceData = [
  { day: 'Mon', checkins: 87  },
  { day: 'Tue', checkins: 102 },
  { day: 'Wed', checkins: 94  },
  { day: 'Thu', checkins: 118 },
  { day: 'Fri', checkins: 130 },
  { day: 'Sat', checkins: 155 },
  { day: 'Sun', checkins: 76  },
]

export const planDistribution = [
  { name: 'Monthly',   value: 38, color: '#E11D2E' },
  { name: 'Quarterly', value: 24, color: '#F0616D' },
  { name: 'Annual',    value: 28, color: '#8E1420' },
  { name: 'Daily',     value: 10, color: '#F8A9B0' },
]

export const members = [
  { id: 'MBR-001', name: 'Ashan Perera',       plan: 'Annual',    status: 'Active',  joined: 'Jan 12, 2025', expiry: 'Jan 12, 2026', checkins: 142, avatar: 'AP', email: 'ashan@email.com',   phone: '+94 77 123 4567' },
  { id: 'MBR-002', name: 'Dilini Fernando',     plan: 'Monthly',   status: 'Active',  joined: 'Feb 3, 2025',  expiry: 'Apr 3, 2025',  checkins: 28,  avatar: 'DF', email: 'dilini@email.com',  phone: '+94 76 234 5678' },
  { id: 'MBR-003', name: 'Kasun Jayawardena',   plan: 'Quarterly', status: 'Frozen',  joined: 'Nov 15, 2024', expiry: 'May 15, 2025', checkins: 61,  avatar: 'KJ', email: 'kasun@email.com',   phone: '+94 71 345 6789' },
  { id: 'MBR-004', name: 'Nimesha Silva',        plan: 'Annual',    status: 'Active',  joined: 'Mar 1, 2025',  expiry: 'Mar 1, 2026',  checkins: 19,  avatar: 'NS', email: 'nimesha@email.com', phone: '+94 70 456 7890' },
  { id: 'MBR-005', name: 'Rajith Bandara',       plan: 'Monthly',   status: 'Expired', joined: 'Dec 5, 2024',  expiry: 'Feb 5, 2025',  checkins: 45,  avatar: 'RB', email: 'rajith@email.com',  phone: '+94 77 567 8901' },
  { id: 'MBR-006', name: 'Sachini Wickrama',     plan: 'Quarterly', status: 'Active',  joined: 'Jan 20, 2025', expiry: 'Apr 20, 2025', checkins: 88,  avatar: 'SW', email: 'sachini@email.com', phone: '+94 75 678 9012' },
  { id: 'MBR-007', name: 'Tharaka Dissanayake', plan: 'Annual',    status: 'Active',  joined: 'Sep 10, 2024', expiry: 'Sep 10, 2025', checkins: 201, avatar: 'TD', email: 'tharaka@email.com', phone: '+94 71 789 0123' },
]

export const recentCheckins = [
  { name: 'Ashan Perera',       time: '08:02 AM', method: 'Face ID',     status: 'granted', memberId: 'MBR-001' },
  { name: 'Sachini Wickrama',   time: '08:14 AM', method: 'Fingerprint', status: 'granted', memberId: 'MBR-006' },
  { name: 'Tharaka Dissanayake',time: '08:29 AM', method: 'Face ID',     status: 'granted', memberId: 'MBR-007' },
  { name: 'Unknown',            time: '08:31 AM', method: 'Face ID',     status: 'denied',  memberId: null      },
  { name: 'Nimesha Silva',      time: '08:45 AM', method: 'QR Code',     status: 'granted', memberId: 'MBR-004' },
]

export const classes = [
  { id: 1, name: 'Morning Yoga',   trainer: 'Shenali M.', time: '06:00 AM', duration: 60, capacity: 20, booked: 18, color: '#E11D2E', day: 'Mon/Wed/Fri', type: 'Yoga'     },
  { id: 2, name: 'CrossFit HIIT',  trainer: 'Nuwan K.',   time: '07:00 AM', duration: 45, capacity: 15, booked: 15, color: '#8E1420', day: 'Tue/Thu/Sat', type: 'CrossFit' },
  { id: 3, name: 'Zumba Dance',    trainer: 'Priya R.',   time: '09:00 AM', duration: 50, capacity: 25, booked: 21, color: '#F0616D', day: 'Mon/Wed/Sat', type: 'Zumba'    },
  { id: 4, name: 'Pilates Core',   trainer: 'Shenali M.', time: '10:00 AM', duration: 55, capacity: 12, booked: 9,  color: '#9B1C2E', day: 'Tue/Thu',     type: 'Pilates'  },
  { id: 5, name: 'Boxing Basics',  trainer: 'Chamara P.', time: '05:00 PM', duration: 60, capacity: 16, booked: 12, color: '#C4142B', day: 'Mon/Wed/Fri', type: 'Boxing'   },
  { id: 6, name: 'Spinning Cycle', trainer: 'Nuwan K.',   time: '06:00 PM', duration: 45, capacity: 20, booked: 20, color: '#6B7280', day: 'Daily',       type: 'Cycling'  },
]

export const payments = [
  { id: 'INV-2025-0312', member: 'Ashan Perera',       plan: 'Annual',    amount: 580, date: 'Mar 9, 2025',  method: 'Card',   status: 'Paid'    },
  { id: 'INV-2025-0311', member: 'Sachini Wickrama',   plan: 'Quarterly', amount: 165, date: 'Mar 8, 2025',  method: 'Online', status: 'Paid'    },
  { id: 'INV-2025-0310', member: 'Dilini Fernando',    plan: 'Monthly',   amount: 65,  date: 'Mar 7, 2025',  method: 'Cash',   status: 'Paid'    },
  { id: 'INV-2025-0309', member: 'Rajith Bandara',     plan: 'Monthly',   amount: 65,  date: 'Mar 5, 2025',  method: 'Card',   status: 'Overdue' },
  { id: 'INV-2025-0308', member: 'Kasun Jayawardena',  plan: 'Quarterly', amount: 165, date: 'Mar 3, 2025',  method: 'Online', status: 'Pending' },
  { id: 'INV-2025-0307', member: 'Nimesha Silva',      plan: 'Annual',    amount: 580, date: 'Mar 1, 2025',  method: 'Card',   status: 'Paid'    },
]

export const staff = [
  { name: 'Nuwan Karunaratne',    role: 'Trainer',      specs: 'CrossFit, Spinning', status: 'On Duty',  rating: 4.9, sessions: 284, avatar: 'NK', shift: '6AM–2PM'  },
  { name: 'Shenali Mendis',       role: 'Trainer',      specs: 'Yoga, Pilates',      status: 'On Duty',  rating: 4.8, sessions: 312, avatar: 'SM', shift: '6AM–12PM' },
  { name: 'Priya Rajapaksha',     role: 'Trainer',      specs: 'Zumba, Aerobics',    status: 'Off Duty', rating: 4.7, sessions: 198, avatar: 'PR', shift: '9AM–5PM'  },
  { name: 'Chamara Peris',        role: 'Trainer',      specs: 'Boxing, MMA',        status: 'On Duty',  rating: 4.6, sessions: 145, avatar: 'CP', shift: '3PM–9PM'  },
  { name: 'Dinusha Samaraweera',  role: 'Receptionist', specs: 'Front Desk',         status: 'On Duty',  rating: 4.9, sessions: 0,   avatar: 'DS', shift: '7AM–3PM'  },
  { name: 'Madara Wijesinghe',    role: 'Manager',      specs: 'Operations',         status: 'On Duty',  rating: 5.0, sessions: 0,   avatar: 'MW', shift: '9AM–6PM'  },
]

export const monthlyStats = [
  { m: 'Oct', members: 710, revenue: 9200,  classes: 180, newJoins: 14, churned: 6 },
  { m: 'Nov', members: 742, revenue: 8800,  classes: 195, newJoins: 18, churned: 4 },
  { m: 'Dec', members: 788, revenue: 11200, classes: 210, newJoins: 26, churned: 3 },
  { m: 'Jan', members: 802, revenue: 10400, classes: 220, newJoins: 22, churned: 8 },
  { m: 'Feb', members: 830, revenue: 12100, classes: 228, newJoins: 19, churned: 5 },
  { m: 'Mar', members: 847, revenue: 13800, classes: 235, newJoins: 18, churned: 2 },
]

export const avatarColors = [
  '#E11D2E', '#3F4350', '#9B1C2E',
  '#6B7280', '#C4142B', '#E11D2E', '#3F4350',
]

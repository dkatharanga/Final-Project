// src/utils/seed.js — Seed demo data for SynapX GymOS
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding SynapX GymOS database...')

  // ── TENANT ──────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where:  { subdomain: 'fitnation' },
    update: {},
    create: { name: 'FitNation Gym', subdomain: 'fitnation', planTier: 'PRO', email: 'admin@fitnation.lk', phone: '+94 11 234 5678' },
  })
  console.log('✅ Tenant:', tenant.name)

  // ── BRANCH ──────────────────────────────────────────────────────
  const branch = await prisma.branch.upsert({
    where:  { id: 'branch-colombo-01' },
    update: {},
    create: { id: 'branch-colombo-01', tenantId: tenant.id, name: 'FitNation Colombo', address: '12 Galle Road, Colombo 03', phone: '+94 11 234 5678', timezone: 'Asia/Colombo' },
  })
  console.log('✅ Branch:', branch.name)

  // ── SUPER ADMIN ──────────────────────────────────────────────────
  const hashed = await bcrypt.hash('Admin@1234', 12)
  const admin  = await prisma.staff.upsert({
    where:  { email: 'admin@synapx.io' },
    update: {},
    create: { tenantId: tenant.id, branchId: branch.id, fullName: 'Madara Wijesinghe', email: 'admin@synapx.io', hashedPassword: hashed, role: 'SUPER_ADMIN', phone: '+94 77 100 2000' },
  })
  console.log('✅ Super Admin:', admin.email, '/ password: Admin@1234')

  // ── MEMBERSHIP PLANS ─────────────────────────────────────────────
  const plans = await Promise.all([
    prisma.membershipPlan.upsert({ where: { id: 'plan-monthly' },   update: {}, create: { id: 'plan-monthly',   tenantId: tenant.id, name: 'Monthly',   durationDays: 30,  price: 65,  currency: 'USD' } }),
    prisma.membershipPlan.upsert({ where: { id: 'plan-quarterly' }, update: {}, create: { id: 'plan-quarterly', tenantId: tenant.id, name: 'Quarterly', durationDays: 90,  price: 165, currency: 'USD' } }),
    prisma.membershipPlan.upsert({ where: { id: 'plan-annual' },    update: {}, create: { id: 'plan-annual',    tenantId: tenant.id, name: 'Annual',    durationDays: 365, price: 580, currency: 'USD' } }),
  ])
  console.log('✅ Plans created:', plans.map(p => p.name).join(', '))

  // ── SAMPLE MEMBERS ───────────────────────────────────────────────
  const membersData = [
    { fullName: 'Ashan Perera',       email: 'ashan@email.com',   phone: '+94771234567', memberCode: 'MBR-001', planId: 'plan-annual'    },
    { fullName: 'Dilini Fernando',    email: 'dilini@email.com',  phone: '+94762345678', memberCode: 'MBR-002', planId: 'plan-monthly'   },
    { fullName: 'Kasun Jayawardena',  email: 'kasun@email.com',   phone: '+94713456789', memberCode: 'MBR-003', planId: 'plan-quarterly' },
    { fullName: 'Nimesha Silva',      email: 'nimesha@email.com', phone: '+94704567890', memberCode: 'MBR-004', planId: 'plan-annual'    },
    { fullName: 'Sachini Wickrama',   email: 'sachini@email.com', phone: '+94756789012', memberCode: 'MBR-005', planId: 'plan-quarterly' },
  ]

  for (const m of membersData) {
    const { planId, ...mData } = m
    const member = await prisma.member.upsert({
      where:  { memberCode: m.memberCode },
      update: {},
      create: { branchId: branch.id, ...mData },
    })
    // Create active membership
    await prisma.membership.upsert({
      where:  { id: `mem-${member.memberCode}` },
      update: {},
      create: {
        id:        `mem-${member.memberCode}`,
        memberId:  member.id,
        planId,
        startDate: new Date(),
        endDate:   new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    })
    console.log('✅ Member:', member.fullName)
  }

  // ── TRAINER STAFF ─────────────────────────────────────────────────
  const trainer = await prisma.staff.upsert({
    where:  { email: 'nuwan@fitnation.lk' },
    update: {},
    create: { tenantId: tenant.id, branchId: branch.id, fullName: 'Nuwan Karunaratne', email: 'nuwan@fitnation.lk', hashedPassword: hashed, role: 'TRAINER' },
  })
  const trainerProfile = await prisma.trainer.upsert({
    where:  { staffId: trainer.id },
    update: {},
    create: { staffId: trainer.id, specializations: ['CrossFit', 'HIIT', 'Spinning'], certifications: ['ACSM', 'CrossFit L2'] },
  })

  // ── CLASSES ───────────────────────────────────────────────────────
  await prisma.class.upsert({
    where:  { id: 'class-crossfit' },
    update: {},
    create: { id: 'class-crossfit', branchId: branch.id, trainerId: trainerProfile.id, name: 'CrossFit HIIT', type: 'CrossFit', capacity: 15, durationMin: 45, startTime: '07:00', recurrence: 'Tue/Thu/Sat', color: '#00C2FF' },
  })
  console.log('✅ Class: CrossFit HIIT')

  console.log('\n🎉 Seed complete!')
  console.log('─────────────────────────────────────────')
  console.log('  Admin login:  admin@synapx.io')
  console.log('  Password:     Admin@1234')
  console.log('  API:          http://localhost:5000')
  console.log('─────────────────────────────────────────')
}

main()
  .catch(e => { console.error('❌ Seed failed:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

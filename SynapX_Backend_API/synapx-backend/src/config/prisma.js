const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient({
  log: ['error'],
})

async function connectPrisma() {
  await prisma.$connect()
  console.log('✅ PostgreSQL connected via Prisma')
}

module.exports = { prisma, connectPrisma }
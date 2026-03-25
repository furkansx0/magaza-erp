import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hashedPassword = await bcrypt.hash('1234', 10)
  
  const admin = await prisma.user.upsert({
    where: { username: 'Admin' },
    update: {},
    create: {
      username: 'Admin',
      password: hashedPassword,
      name: 'Sistem Yöneticisi',
      role: 'ADMIN',
    },
  })
  
  console.log('Seeding finished. Admin user updated/created.')
  console.log({ username: admin.username, role: admin.role })
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })

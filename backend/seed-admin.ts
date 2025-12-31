require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createAdmin() {
  const email = 'admin@ilumap.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('Admin ya existe');
    return;
  }

  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.create({
    data: {
      name: 'Administrador Principal',
      email,
      password: passwordHash,
      role: 'ADMIN',
    },
  });

  console.log('Admin creado exitosamente: admin@ilumap.com / admin123');
}

createAdmin()
  .catch(e => console.error('Error creando admin:', e))
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
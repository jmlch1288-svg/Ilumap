require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const prisma = new PrismaClient();

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_cambia_esto';

class AuthService {
  async register({ name, email, password, role = 'OPERATOR' }: { name: string; email: string; password: string; role?: string }) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role,
      },
      select: { id: true, email: true, name: true, role: true },
    });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    return { user, token };
  }

  async login({ email, password }: { email: string; password: string }) {
    const user = await prisma.user.findUnique({ 
      where: { email },
      select: { id: true, email: true, name: true, password: true, role: true },
    });

    if (!user) {
      throw new Error('Credenciales inválidas');
    }

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      throw new Error('Credenciales inválidas');
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });

    const { password: _, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, token };
  }

  async getMe(userId: string) {
    return await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, role: true },
    });
  }
}

module.exports = new AuthService();
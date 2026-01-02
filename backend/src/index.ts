require('dotenv').config();
const pqrRoutes = require('./routes/pqrRoutes');
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Rutas
app.use('/api/auth', authRoutes);

app.use('/api/pqr', pqrRoutes);

// Health check
app.get('/api/health', (req: any, res: any) => {
  res.json({ status: 'OK', message: 'Backend funcionando 🚀', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
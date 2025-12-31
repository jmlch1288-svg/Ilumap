const express = require('express');
const authService = require('../services/authService');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

router.post('/register', async (req: any, res: any) => {
  try {
    const { name, email, password, role } = req.body;
    const result = await authService.register({ name, email, password, role });
    res.json(result);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

router.post('/login', async (req: any, res: any) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login({ email, password });
    res.json(result);
  } catch (error: any) {
    res.status(401).json({ error: error.message });
  }
});

router.get('/me', authMiddleware, async (req: any, res: any) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ user });
  } catch (error) {
    res.status(404).json({ error: 'Usuario no encontrado' });
  }
});

module.exports = router;
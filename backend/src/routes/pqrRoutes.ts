const express = require('express');
const pqrService = require('../services/pqrService');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Crear PQR (cualquiera autenticado)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const pqr = await pqrService.createPqr(req.body, req.user.id);
    res.json(pqr);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Listar PQRs (ADMIN ve todas, otros solo las suyas)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const filters = req.user.role === 'ADMIN' ? {} : { usuarioCreadorId: req.user.id };
    const pqrs = await pqrService.getPqrs(filters);
    res.json(pqrs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado (solo ADMIN o TECHNICIAN)
router.patch('/:id/estado', authMiddleware, async (req, res) => {
  try {
    if (!['ADMIN', 'TECHNICIAN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const { estado, comentario } = req.body;
    const pqr = await pqrService.updateEstadoPqr(req.params.id, estado, req.user.id, comentario);
    res.json(pqr);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
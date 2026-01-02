const express = require('express');
const pqrService = require('../services/pqrService');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();

// Búsqueda de clientes
router.get('/clientes/search', authMiddleware, async (req: any, res: any) => {
  try {
    const query = req.query.q || '';
    const clientes = await pqrService.searchClientes(query);
    res.json(clientes);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Crear PQR
router.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const pqr = await pqrService.createPqr(req.body, req.user.id);
    res.json(pqr);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

// Listar PQRs
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const filters = req.user.role === 'ADMIN' ? {} : { usuarioCreadorId: req.user.id };
    const pqrs = await pqrService.getPqrs(filters);
    res.json(pqrs);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Actualizar estado
router.patch('/:id/estado', authMiddleware, async (req: any, res: any) => {
  try {
    if (!['ADMIN', 'TECHNICIAN'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Acceso denegado' });
    }
    const { estado, comentario } = req.body;
    const pqr = await pqrService.updateEstadoPqr(req.params.id, estado, req.user.id, comentario);
    res.json(pqr);
  } catch (error: any) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
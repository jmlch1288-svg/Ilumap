const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware");
const pqrService = require("../services/pqrService");

const router = express.Router();

// Búsqueda de clientes
router.get('/clientes/search', authMiddleware, async (req: any, res: any) => {
  try {
    const query = req.query.q || '';
    const clientes = await pqrService.searchClientes(query);
    res.json(clientes);
  } catch (error: any) {
    console.error("Error en búsqueda clientes:", error);
    res.status(500).json({ error: error.message });
  }
});

// Crear cliente (para el modal en frontend)
router.post('/clientes', authMiddleware, async (req: any, res: any) => {
  try {
    const cliente = await pqrService.createCliente(req.body);
    res.json(cliente);
  } catch (error: any) {
    console.error("Error creando cliente:", error);
    res.status(400).json({ error: error.message });
  }
});

// Actualizar cliente existente
router.put('/clientes/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params;
    const updatedCliente = await pqrService.updateCliente(id, req.body);
    res.json(updatedCliente);
  } catch (error: any) {
    console.error("Error actualizando cliente:", error);
    if (error.code === 'P2025') { // Prisma: registro no encontrado
      res.status(404).json({ error: "Cliente no encontrado" });
    } else {
      res.status(400).json({ error: error.message });
    }
  }
});

// Listar inventario (para autocomplete serie)
router.get('/inventario', authMiddleware, async (req: any, res: any) => {
  try {
    const inventario = await pqrService.getInventario();
    res.json(inventario);
  } catch (error: any) {
    console.error("Error obteniendo inventario:", error);
    res.status(500).json({ error: "Error al obtener inventario" });
  }
});

// Crear PQR
router.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const pqr = await pqrService.createPqr(req.body, req.user.id);
    res.json(pqr);
  } catch (error: any) {
    console.error("Error creando PQR:", error);
    res.status(400).json({ error: error.message });
  }
});

// Listar PQRs
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const pqrs = await pqrService.getPqrs();
    res.json(pqrs);
  } catch (error: any) {
    console.error("Error listando PQRs:", error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
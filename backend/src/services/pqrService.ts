const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PqrService {
  // Cálculo de plazo según tipoPqr
  getPlazoDias(tipoPqr) {
    const plazos = {
      PETICION: 5,
      QUEJA: 15,
      RECLAMO: 15,
      REPORTE: 3,
    };
    return plazos[tipoPqr] || 10;
  }

  async createPqr(data, usuarioId) {
    const plazoDias = this.getPlazoDias(data.tipoPqr);
    const fechaPlazo = new Date(data.fechaPqr || new Date());
    fechaPlazo.setDate(fechaPlazo.getDate() + plazoDias);

    // Si tiene serie, buscar luminaria y autocompletar datos
    let luminariaData = {};
    if (data.hasSerie && data.serieLuminaria) {
      const luminaria = await prisma.inventario.findUnique({
        where: { serie: data.serieLuminaria },
      });
      if (!luminaria) {
        throw new Error('Serie de luminaria no encontrada en inventario');
      }
      luminariaData = {
        direccionPqr: luminaria.direccion,
        sectorPqr: luminaria.sector,
        barrio: luminaria.barrio,
        lat: luminaria.lat,
        lng: luminaria.lng,
      };
    }

    const pqr = await prisma.pqr.create({
      data: {
        ...data,
        ...luminariaData,
        plazoDias,
        fechaPlazo,
        usuarioCreadorId: usuarioId,
        estado: 'PENDIENTE',
      },
      include: {
        usuarioCreador: { select: { name: true, email: true } },
        luminaria: true,
      },
    });

    // Guardar historial automático de Registro
    await prisma.pqrHistorial.create({
      data: {
        pqrId: pqr.id,
        proceso: 'Registro',
        usuarioId,
      },
    });

    return pqr;
  }

  async getPqrs(filters = {}) {
    return await prisma.pqr.findMany({
      where: filters,
      include: {
        usuarioCreador: { select: { name: true } },
        luminaria: true,
        historial: { orderBy: { fecha: 'asc' } },
      },
      orderBy: { fechaPqr: 'desc' },
    });
  }

  async updateEstadoPqr(pqrId, nuevoEstado, usuarioId, comentario = '') {
    const procesos = {
      ASIGNACION: 'Asignación',
      INTERVENCION: 'Intervención',
      REVISION: 'Revisión',
      CIERRE: 'Cierre',
    };

    const pqr = await prisma.pqr.update({
      where: { id: pqrId },
      data: { estado: nuevoEstado },
    });

    // Guardar historial del cambio
    const proceso = procesos[nuevoEstado] || 'Cambio de estado';
    await prisma.pqrHistorial.create({
      data: {
        pqrId,
        proceso,
        usuarioId,
        comentario,
      },
    });

    return pqr;
  }
}

module.exports = new PqrService();
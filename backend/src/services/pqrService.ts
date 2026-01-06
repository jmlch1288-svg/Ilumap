const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PqrService {
  // Cálculo de plazo según tipoPqr
  getPlazoDias(tipoPqr: string): number {
    const plazos: { [key: string]: number } = {
      PETICION: 5,
      QUEJA: 15,
      RECLAMO: 15,
      REPORTE: 3,
    };
    return plazos[tipoPqr] || 10;
  }

  // Crear nuevo cliente (usado desde el modal en frontend)
  async createCliente(data: any) {
    return await prisma.cliente.create({
      data: {
        id: data.id,
        nombre: data.nombre,
        telefono: data.telefono || null,
        correo: data.correo || null,
        observacion: data.observacion || null,
      },
    });
  }

  // Actualizar cliente existente (si se edita)
  async updateCliente(id: string, data: any) {
    return await prisma.cliente.update({
      where: { id },
      data: {
        nombre: data.nombre,
        telefono: data.telefono || null,
        correo: data.correo || null,
        observacion: data.observacion || null,
      },
    });
  }

  // Búsqueda de clientes por documento, teléfono o nombre
  async searchClientes(query: string) {
    return await prisma.cliente.findMany({
      where: {
        OR: [
          { id: { contains: query, mode: 'insensitive' } },
          { telefono: { contains: query } },
          { nombre: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  // Obtener inventario para autocomplete de serie
  async getInventario() {
    return await prisma.inventario.findMany({
      select: {
        serie: true,
        direccion: true,
        sector: true,
        barrio: true,
        lat: true,
        lng: true,
      },
    });
  }

  // Crear PQR
  async createPqr(data: any, usuarioId: string) {
    const plazoDias = this.getPlazoDias(data.tipoPqr);
    const fechaPqr = data.fechaPqr ? new Date(data.fechaPqr) : new Date();
    const fechaPlazo = new Date(fechaPqr);
    fechaPlazo.setDate(fechaPlazo.getDate() + plazoDias);

    // Autocompletar desde inventario si tiene serie
    let luminariaData: any = {};
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
        clienteId: data.clienteId,
        fechaPqr,
        plazoDias,
        fechaPlazo,
        usuarioCreadorId: usuarioId,
        estado: 'PENDIENTE',
      },
      include: {
        cliente: true,
        usuarioCreador: { select: { name: true, email: true } },
        luminaria: true,
      },
    });

    // Historial automático: Registro
    await prisma.pqrHistorial.create({
      data: {
        pqrId: pqr.id,
        proceso: 'Registro',
        usuarioId,
      },
    });

    return pqr;
  }

  // Listar todas las PQRs
  async getPqrs(filters: any = {}) {
    return await prisma.pqr.findMany({
      where: filters,
      include: {
        cliente: true,
        usuarioCreador: { select: { name: true } },
        luminaria: true,
        historial: {
          orderBy: { fecha: 'asc' },
        },
      },
      orderBy: { fechaPqr: 'desc' },
    });
  }

  // Cambiar estado de PQR y registrar en historial
  async updateEstadoPqr(pqrId: string, nuevoEstado: string, usuarioId: string, comentario: string = '') {
    const procesos: { [key: string]: string } = {
      ASIGNACION: 'Asignación',
      INTERVENCION: 'Intervención',
      REVISION: 'Revisión',
      CIERRE: 'Cierre',
    };

    const pqr = await prisma.pqr.update({
      where: { id: pqrId },
      data: { estado: nuevoEstado as any },
    });

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
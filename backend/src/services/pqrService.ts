const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

class PqrService {
  // ... getPlazoDias igual

  async createPqr(data, usuarioId) {
    let clienteId = data.clienteId;

    if (data.nuevoClienteId) {
      // Crear nuevo cliente
      const cliente = await prisma.cliente.create({
        data: {
          id: data.nuevoClienteId,
          nombre: data.nombreCliente,
          telefono: data.telefonoCliente,
          correo: data.correoCliente,
          observacion: data.observacionCliente,
        },
      });
      clienteId = cliente.id;
    } else if (data.editCliente && data.clienteId) {
      // Actualizar cliente existente
      await prisma.cliente.update({
        where: { id: data.clienteId },
        data: {
          nombre: data.nombreCliente,
          telefono: data.telefonoCliente,
          correo: data.correoCliente,
          observacion: data.observacionCliente,
        },
      });
    }

    const plazoDias = this.getPlazoDias(data.tipoPqr);
    const fechaPqr = data.fechaPqr ? new Date(data.fechaPqr) : new Date();
    const fechaPlazo = new Date(fechaPqr);
    fechaPlazo.setDate(fechaPlazo.getDate() + plazoDias);

    // ... luminariaData igual

    const pqr = await prisma.pqr.create({
      data: {
        ...data,
        ...luminariaData,
        clienteId,
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

    // Historial automático
    await prisma.pqrHistorial.create({
      data: {
        pqrId: pqr.id,
        proceso: 'Registro',
        usuarioId,
      },
    });

    return pqr;
  }

  // Método para buscar clientes por id, telefono o nombre
  async searchClientes(query) {
    return await prisma.cliente.findMany({
      where: {
        OR: [
          { id: { contains: query } },
          { telefono: { contains: query } },
          { nombre: { contains: query, mode: 'insensitive' } },
        ],
      },
    });
  }

  // ... getPqrs y updateEstadoPqr iguales
}

module.exports = new PqrService();
-- CreateEnum
CREATE TYPE "MedioReporte" AS ENUM ('PERSONAL', 'TELEFONICO', 'ESCRITO', 'CORREO_ELECTRONICO', 'WHATSAPP', 'AUTONOMO');

-- CreateEnum
CREATE TYPE "TipoPqr" AS ENUM ('PETICION', 'QUEJA', 'RECLAMO', 'REPORTE');

-- CreateEnum
CREATE TYPE "EstadoPqr" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'PROCESADA');

-- CreateEnum
CREATE TYPE "PrioridadPqr" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'CRITICA');

-- CreateEnum
CREATE TYPE "TipoInventario" AS ENUM ('LUMINARIA', 'POSTE', 'TRANSFORMADOR');

-- CreateEnum
CREATE TYPE "MaterialApoyo" AS ENUM ('CONCRETO', 'FIBRA_VIDRIO', 'MADERA', 'METALICO');

-- CreateEnum
CREATE TYPE "AnguloApoyo" AS ENUM ('GRADOS_90', 'GRADOS_30');

-- CreateEnum
CREATE TYPE "AlturaApoyo" AS ENUM ('M_6_6_7', 'M_4_6_5', 'M_7_6_8');

-- CreateEnum
CREATE TYPE "ZonaInventario" AS ENUM ('URBANA', 'RURAL');

-- CreateEnum
CREATE TYPE "AccesoInventario" AS ENUM ('VEHICULAR', 'PEATONAL');

-- CreateEnum
CREATE TYPE "EstadoInventario" AS ENUM ('ACTIVO', 'SUSPENDIDO');

-- CreateEnum
CREATE TYPE "PropietarioInventario" AS ENUM ('MUNICIPIO_YARUMAL', 'ALUMBRADO_YARUMAL_SAS');

-- CreateEnum
CREATE TYPE "TecnologiaLuminaria" AS ENUM ('LED', 'SODIO', 'HALOGENA');

-- CreateEnum
CREATE TYPE "OrientacionLuminaria" AS ENUM ('HORIZONTAL', 'VERTICAL');

-- CreateEnum
CREATE TYPE "ControlLuminaria" AS ENUM ('FOTOCELDA', 'NA');

-- CreateTable
CREATE TABLE "pqrs" (
    "id" TEXT NOT NULL,
    "prioridad" "PrioridadPqr" NOT NULL DEFAULT 'MEDIA',
    "fechaPqr" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "nombreCliente" TEXT NOT NULL,
    "telefonoCliente" TEXT,
    "correoCliente" TEXT,
    "medioReporte" "MedioReporte" NOT NULL,
    "tipoPqr" "TipoPqr" NOT NULL,
    "condicion" TEXT,
    "hasSerie" BOOLEAN NOT NULL DEFAULT false,
    "serieLuminaria" TEXT,
    "direccionPqr" TEXT NOT NULL,
    "sectorPqr" TEXT,
    "barrio" TEXT,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "observacionPqr" TEXT,
    "estado" "EstadoPqr" NOT NULL DEFAULT 'PENDIENTE',
    "plazoDias" INTEGER NOT NULL,
    "fechaPlazo" TIMESTAMP(3),
    "responsableAtencionId" TEXT,
    "usuarioCreadorId" TEXT NOT NULL,
    "inventarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pqrs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pqr_historial" (
    "id" TEXT NOT NULL,
    "pqrId" TEXT NOT NULL,
    "proceso" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "comentario" TEXT,

    CONSTRAINT "pqr_historial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario" (
    "id" SERIAL NOT NULL,
    "serie" TEXT NOT NULL,
    "tipo" "TipoInventario" NOT NULL,
    "potencia" INTEGER,
    "medida" BOOLEAN,
    "configuracion" TEXT,
    "trafo" TEXT,
    "voltaje" TEXT,
    "apoyo" TEXT NOT NULL,
    "materialApoyo" "MaterialApoyo",
    "angulo" "AnguloApoyo",
    "altura" "AlturaApoyo",
    "zona" "ZonaInventario" NOT NULL,
    "acceso" "AccesoInventario" NOT NULL,
    "direccion" TEXT NOT NULL,
    "sector" TEXT NOT NULL,
    "barrio" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "EstadoInventario" NOT NULL DEFAULT 'ACTIVO',
    "propietario" "PropietarioInventario" NOT NULL,
    "caracteristicaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "caracteristicas_luminaria" (
    "id" SERIAL NOT NULL,
    "modelo" TEXT NOT NULL,
    "fabricante" TEXT NOT NULL,
    "serialFabrica" TEXT,
    "tecnologia" "TecnologiaLuminaria" NOT NULL,
    "orientacion" "OrientacionLuminaria" NOT NULL,
    "control" "ControlLuminaria" NOT NULL,

    CONSTRAINT "caracteristicas_luminaria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pqrs_estado_idx" ON "pqrs"("estado");

-- CreateIndex
CREATE INDEX "pqrs_barrio_idx" ON "pqrs"("barrio");

-- CreateIndex
CREATE INDEX "pqrs_tipoPqr_idx" ON "pqrs"("tipoPqr");

-- CreateIndex
CREATE INDEX "pqr_historial_pqrId_idx" ON "pqr_historial"("pqrId");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_serie_key" ON "inventario"("serie");

-- CreateIndex
CREATE UNIQUE INDEX "inventario_caracteristicaId_key" ON "inventario"("caracteristicaId");

-- CreateIndex
CREATE INDEX "inventario_serie_idx" ON "inventario"("serie");

-- CreateIndex
CREATE INDEX "inventario_barrio_idx" ON "inventario"("barrio");

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_usuarioCreadorId_fkey" FOREIGN KEY ("usuarioCreadorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_inventarioId_fkey" FOREIGN KEY ("inventarioId") REFERENCES "inventario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqr_historial" ADD CONSTRAINT "pqr_historial_pqrId_fkey" FOREIGN KEY ("pqrId") REFERENCES "pqrs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_caracteristicaId_fkey" FOREIGN KEY ("caracteristicaId") REFERENCES "caracteristicas_luminaria"("id") ON DELETE SET NULL ON UPDATE CASCADE;

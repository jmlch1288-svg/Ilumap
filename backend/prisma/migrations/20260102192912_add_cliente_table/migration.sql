/*
  Warnings:

  - You are about to drop the column `correoCliente` on the `pqrs` table. All the data in the column will be lost.
  - You are about to drop the column `inventarioId` on the `pqrs` table. All the data in the column will be lost.
  - You are about to drop the column `nombreCliente` on the `pqrs` table. All the data in the column will be lost.
  - You are about to drop the column `telefonoCliente` on the `pqrs` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "pqrs" DROP CONSTRAINT "pqrs_inventarioId_fkey";

-- DropIndex
DROP INDEX "pqrs_barrio_idx";

-- DropIndex
DROP INDEX "pqrs_estado_idx";

-- DropIndex
DROP INDEX "pqrs_tipoPqr_idx";

-- AlterTable
ALTER TABLE "pqrs" DROP COLUMN "correoCliente",
DROP COLUMN "inventarioId",
DROP COLUMN "nombreCliente",
DROP COLUMN "telefonoCliente",
ADD COLUMN     "clienteId" TEXT;

-- CreateTable
CREATE TABLE "clientes" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT,
    "correo" TEXT,
    "observacion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "clientes_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_serieLuminaria_fkey" FOREIGN KEY ("serieLuminaria") REFERENCES "inventario"("serie") ON DELETE SET NULL ON UPDATE CASCADE;

/*
  Warnings:

  - Made the column `clienteId` on table `pqrs` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "pqrs" DROP CONSTRAINT "pqrs_clienteId_fkey";

-- AlterTable
ALTER TABLE "pqrs" ALTER COLUMN "clienteId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "pqrs" ADD CONSTRAINT "pqrs_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

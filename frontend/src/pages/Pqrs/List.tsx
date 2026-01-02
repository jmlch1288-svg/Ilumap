import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";

export default function PqrList() {
  const { token } = useAuthStore();
  const [search, setSearch] = useState("");
  const [filterEstado, setFilterEstado] = useState("TODOS");

  const { data: pqrs = [], isLoading } = useQuery({
    queryKey: ["pqrs"],
    queryFn: async () => {
      const response = await axios.get("http://localhost:5000/api/pqr", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const filteredPqrs = pqrs.filter((pqr: any) => {
    const matchesSearch = 
      pqr.nombreCliente.toLowerCase().includes(search.toLowerCase()) ||
      pqr.direccionPqr.toLowerCase().includes(search.toLowerCase());
    const matchesEstado = filterEstado === "TODOS" || pqr.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  if (isLoading) return <div className="p-8 text-center">Cargando PQRs...</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Lista de PQRs</h1>

      {/* Filtros */}
      <div className="mb-6 flex gap-4">
        <input
          type="text"
          placeholder="Buscar por cliente o dirección..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg flex-1"
        />
        <select
          value={filterEstado}
          onChange={(e) => setFilterEstado(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="TODOS">Todos los estados</option>
          <option value="PENDIENTE">Pendiente</option>
          <option value="EN_PROCESO">En proceso</option>
          <option value="PROCESADA">Procesada</option>
        </select>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full table-auto border-collapse">
          <thead>
            <tr className="bg-gray-100 dark:bg-gray-800">
              <th className="px-4 py-3 text-left">Folio</th>
              <th className="px-4 py-3 text-left">Cliente</th>
              <th className="px-4 py-3 text-left">Tipo</th>
              <th className="px-4 py-3 text-left">Estado</th>
              <th className="px-4 py-3 text-left">Fecha</th>
              <th className="px-4 py-3 text-left">Plazo</th>
              <th className="px-4 py-3 text-left">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredPqrs.map((pqr: any) => (
              <tr key={pqr.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-800">
                <td className="px-4 py-3">{pqr.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{pqr.nombreCliente}</td>
                <td className="px-4 py-3">{pqr.tipoPqr}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded text-xs ${
                    pqr.estado === 'PENDIENTE' ? 'bg-yellow-100 text-yellow-800' :
                    pqr.estado === 'EN_PROCESO' ? 'bg-blue-100 text-blue-800' :
                    'bg-green-100 text-green-800'
                  }`}>
                    {pqr.estado}
                  </span>
                </td>
                <td className="px-4 py-3">{format(new Date(pqr.fechaPqr), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3">{format(new Date(pqr.fechaPlazo), 'dd/MM/yyyy')}</td>
                <td className="px-4 py-3">
                  <button className="text-indigo-600 hover:underline">Ver detalle</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPqrs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No se encontraron PQRs
        </div>
      )}
    </div>
  );
}
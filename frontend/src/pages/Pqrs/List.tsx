import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import { Link } from "react-router-dom";

interface Pqr {
  id: string;
  nombreCliente: string;
  direccionPqr: string;
  tipoPqr: string;
  estado: "PENDIENTE" | "EN_PROCESO" | "PROCESADA";
  fechaPqr: string;
  fechaPlazo: string;
}

export default function PqrList() {
  const { token } = useAuthStore();
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterEstado, setFilterEstado] = useState<"TODOS" | "PENDIENTE" | "EN_PROCESO" | "PROCESADA">("TODOS");

  const { data: pqrs = [], isLoading } = useQuery<Pqr[]>({
    queryKey: ["pqrs"],
    queryFn: async () => {
      const response = await axios.get("http://localhost:5000/api/pqr", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Cache 5 minutos para carga más rápida
  });

  // Filtrado
  const filteredPqrs = pqrs.filter((pqr) => {
    const matchesSearch = 
      pqr.nombreCliente.toLowerCase().includes(search.toLowerCase()) ||
      pqr.direccionPqr.toLowerCase().includes(search.toLowerCase());
    const matchesEstado = filterEstado === "TODOS" || pqr.estado === filterEstado;
    return matchesSearch && matchesEstado;
  });

  // Paginación
  const totalPages = Math.ceil(filteredPqrs.length / entries);
  const paginatedPqrs = filteredPqrs.slice(
    (currentPage - 1) * entries,
    currentPage * entries
  );

  if (isLoading) {
    return (
      <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
        <div className="px-6 py-6">
          <h4 className="text-xl font-semibold text-black dark:text-white">
            Lista de PQRs
          </h4>
        </div>
        <div className="p-6.5">
          <div className="animate-pulse">
            <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-200 dark:bg-gray-700 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="px-6 py-6">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Lista de PQRs
        </h4>
      </div>

      <div className="flex flex-col gap-5.5 p-6.5">
        {/* Filtros y búsqueda */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            {/* Show entries */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-black dark:text-white">Mostrar</span>
              <select
                value={entries}
                onChange={(e) => setEntries(Number(e.target.value))}
                className="rounded border border-stroke bg-transparent py-2 px-5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-sm text-black dark:text-white">entradas</span>
            </div>

            {/* Filtro por estado */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-black dark:text-white">Filtrar por estado</span>
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value as typeof filterEstado)}
                className="rounded border border-stroke bg-transparent py-2 px-5 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
              >
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="PROCESADA">Procesada</option>
              </select>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-11 pr-4 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabla */}
        <div className="max-w-full overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">Folio</th>
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">Cliente</th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Tipo</th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Estado</th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Fecha</th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Plazo</th>
                <th className="py-4 px-4 font-medium text-black dark:text-white text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPqrs.map((pqr) => (
                <tr key={pqr.id}>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-sm text-black dark:text-white">{pqr.id.slice(0, 8)}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{pqr.nombreCliente}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{pqr.tipoPqr}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                      pqr.estado === 'PENDIENTE' ? 'bg-warning text-white' :
                      pqr.estado === 'EN_PROCESO' ? 'bg-primary text-white' :
                      'bg-success text-white'
                    }`}>
                      {pqr.estado}
                    </span>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{format(new Date(pqr.fechaPqr), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{format(new Date(pqr.fechaPlazo), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark text-right">
                    <Link to={`/pqrs/${pqr.id}`} className="text-primary hover:underline">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
          <p className="text-sm text-black dark:text-white">
            Mostrar {(currentPage - 1) * entries + 1} a {Math.min(currentPage * entries, filteredPqrs.length)} de {filteredPqrs.length} entradas
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded border border-stroke dark:border-strokedark disabled:opacity-50"
            >
              Anterior
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-4 py-2 rounded ${
                  page === currentPage
                    ? 'bg-primary text-white'
                    : 'border border-stroke dark:border-strokedark'
                }`}
              >
                {page}
              </button>
            ))}
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded border border-stroke dark:border-strokedark disabled:opacity-50"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
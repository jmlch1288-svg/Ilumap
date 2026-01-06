import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/badge/Badge"; // ← Componente Badge oficial de TailAdmin

interface Pqr {
  id: string;
  cliente: { nombre: string } | null;
  direccionPqr: string;
  tipoPqr: string;
  condicion: string;
  estado: "PENDIENTE" | "EN_PROCESO" | "PROCESADA";
  fechaPqr: string;
  fechaPlazo: string;
}

// Función para formatear condiciones: "APAGADA" → "Apagada"
const formatConditionLabel = (value: string) => {
  if (!value) return "Sin condición";
  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

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
  });

  // Filtro combinado: búsqueda + estado
  const filteredPqrs = pqrs.filter((pqr) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || (
      (pqr.id || "").toLowerCase().includes(searchLower) ||
      (pqr.cliente?.nombre || "").toLowerCase().includes(searchLower) ||
      (pqr.direccionPqr || "").toLowerCase().includes(searchLower) ||
      (pqr.condicion || "").replace(/_/g, " ").toLowerCase().includes(searchLower) ||
      (pqr.tipoPqr || "").toLowerCase().includes(searchLower) ||
      (pqr.estado || "").toLowerCase().includes(searchLower)
    );

    const matchesEstado = filterEstado === "TODOS" || pqr.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const totalPages = Math.ceil(filteredPqrs.length / entries);
  const paginatedPqrs = filteredPqrs.slice((currentPage - 1) * entries, currentPage * entries);

  if (isLoading) {
    return <div className="p-6 text-center text-black dark:text-white">Cargando PQRs...</div>;
  }

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="px-6 py-6">
        <h4 className="text-xl font-semibold text-black dark:text-white">Lista de PQRs</h4>
      </div>

      <div className="p-6.5">
        {/* Filtros: entradas, filtro estado y búsqueda */}
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex flex-wrap items-center gap-6">
            {/* Mostrar entradas */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-black dark:text-white">Mostrar</span>
              <select
                value={entries}
                onChange={(e) => setEntries(Number(e.target.value))}
                className="rounded border border-stroke bg-transparent py-2 px-5 text-black dark:text-white focus:border-primary"
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
                className="rounded border border-stroke bg-transparent py-2 px-5 text-black dark:text-white focus:border-primary"
              >
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="PROCESADA">Procesada</option>
              </select>
            </div>
          </div>

          {/* Búsqueda */}
          <div className="relative w-full md:w-auto">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-stroke bg-transparent py-2 pl-11 pr-4 text-black dark:text-white focus:border-primary"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Tabla */}
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">Folio</th>
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">Cliente</th>
                <th className="min-w-[200px] py-4 px-4 font-medium text-black dark:text-white">Dirección</th>
                <th className="min-w-[100px] py-4 px-4 font-medium text-black dark:text-white">Tipo</th>
                <th className="min-w-[150px] py-4 px-4 font-medium text-black dark:text-white">Condición</th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Estado</th>
                <th className="min-w-[120px] py-4 px-4 font-medium text-black dark:text-white">Fecha</th>
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
                    <p className="text-black dark:text-white">{pqr.cliente?.nombre || "Sin cliente"}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{pqr.direccionPqr}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{pqr.tipoPqr}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{formatConditionLabel(pqr.condicion)}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    {pqr.estado === "PENDIENTE" && (
                      <Badge variant="light" color="error">
                        Pendiente
                      </Badge>
                    )}
                    {pqr.estado === "EN_PROCESO" && (
                      <Badge variant="light" color="info">
                        En Proceso
                      </Badge>
                    )}
                    {pqr.estado === "PROCESADA" && (
                      <Badge variant="light" color="success">
                        Procesada
                      </Badge>
                    )}
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark">
                    <p className="text-black dark:text-white">{format(new Date(pqr.fechaPqr), 'dd/MM/yyyy')}</p>
                  </td>
                  <td className="border-b border-[#eee] py-5 px-4 dark:border-strokedark text-right">
                    <Link to={`/pqrs/${pqr.id}`} className="text-primary hover:underline font-medium">
                      Ver detalle
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-black dark:text-white">
            Mostrando {(currentPage - 1) * entries + 1} a {Math.min(currentPage * entries, filteredPqrs.length)} de {filteredPqrs.length} entradas
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded border border-stroke dark:border-strokedark disabled:opacity-50 text-black dark:text-white"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded border border-stroke dark:border-strokedark disabled:opacity-50 text-black dark:text-white"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
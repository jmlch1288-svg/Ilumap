import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import Badge from "../../components/ui/badge/Badge";

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

  const filteredPqrs = pqrs.filter((pqr) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = !search || [
      pqr.id,
      pqr.cliente?.nombre,
      pqr.direccionPqr,
      pqr.condicion?.replace(/_/g, " "),
      pqr.tipoPqr,
      pqr.estado,
    ].some(val => val?.toLowerCase().includes(searchLower));

    const matchesEstado = filterEstado === "TODOS" || pqr.estado === filterEstado;

    return matchesSearch && matchesEstado;
  });

  const totalPages = Math.ceil(filteredPqrs.length / entries);
  const paginatedPqrs = filteredPqrs.slice((currentPage - 1) * entries, currentPage * entries);

  if (isLoading) {
    return <div className="py-10 text-center text-xl text-black dark:text-white">Cargando PQRs...</div>;
  }

  return (
    <div className="card">
      <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
        <h4 className="text-xl font-semibold text-black dark:text-white">Lista de PQRs</h4>
      </div>

      <div className="p-6.5">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <span className="text-body text-black dark:text-white">Mostrar</span>
              <select
                value={entries}
                onChange={(e) => { setEntries(Number(e.target.value)); setCurrentPage(1); }}
                className="select-default"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-body text-black dark:text-white">entradas</span>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-body text-black dark:text-white">Filtrar por estado</span>
              <select
                value={filterEstado}
                onChange={(e) => { setFilterEstado(e.target.value as any); setCurrentPage(1); }}
                className="select-default"
              >
                <option value="TODOS">Todos</option>
                <option value="PENDIENTE">Pendiente</option>
                <option value="EN_PROCESO">En Proceso</option>
                <option value="PROCESADA">Procesada</option>
              </select>
            </div>
          </div>

          <div className="relative w-full md:w-64">
            <input
              type="text"
              placeholder="Buscar..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent py-2.5 pl-10 pr-4 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
            />
            <svg className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="min-w-[100px] px-4 py-4 font-medium text-black dark:text-white">Folio</th>
                <th className="min-w-[180px] px-4 py-4 font-medium text-black dark:text-white">Cliente</th>
                <th className="min-w-[220px] px-4 py-4 font-medium text-black dark:text-white">Dirección</th>
                <th className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white">Tipo</th>
                <th className="min-w-[160px] px-4 py-4 font-medium text-black dark:text-white">Condición</th>
                <th className="min-w-[140px] px-4 py-4 font-medium text-black dark:text-white">Estado</th>
                <th className="min-w-[140px] px-4 py-4 font-medium text-black dark:text-white">Fecha</th>
                <th className="px-4 py-4 font-medium text-black dark:text-white text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {paginatedPqrs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-black dark:text-white">
                    No hay PQRs que coincidan con los filtros
                  </td>
                </tr>
              ) : (
                paginatedPqrs.map((pqr) => (
                  <tr key={pqr.id} className="border-b border-[#eee] dark:border-strokedark hover:bg-gray-50 dark:hover:bg-meta-4/10">
                    <td className="px-4 py-5">
                      <p className="text-sm text-black dark:text-white">{pqr.id.slice(0, 8).toUpperCase()}</p>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-black dark:text-white">{pqr.cliente?.nombre || "Sin cliente"}</p>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-black dark:text-white">{pqr.direccionPqr || "-"}</p>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-black dark:text-white">{pqr.tipoPqr}</p>
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-black dark:text-white">{formatConditionLabel(pqr.condicion)}</p>
                    </td>
                    <td className="px-4 py-5">
                      {pqr.estado === "PENDIENTE" && <Badge variant="light" color="error">Pendiente</Badge>}
                      {pqr.estado === "EN_PROCESO" && <Badge variant="light" color="info">En Proceso</Badge>}
                      {pqr.estado === "PROCESADA" && <Badge variant="light" color="success">Procesada</Badge>}
                    </td>
                    <td className="px-4 py-5">
                      <p className="text-black dark:text-white">{format(new Date(pqr.fechaPqr), 'dd/MM/yyyy HH:mm')}</p>
                    </td>
                    <td className="px-4 py-5 text-right">
                      <Link to={`/pqrs/${pqr.id}`} className="text-primary hover:underline">
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
          <p className="text-sm text-black dark:text-white">
            Mostrando {(currentPage - 1) * entries + 1}–{Math.min(currentPage * entries, filteredPqrs.length)} de {filteredPqrs.length} entradas
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded border border-stroke px-4 py-2 text-black disabled:opacity-50 dark:border-strokedark dark:text-white"
            >
              Anterior
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="rounded border border-stroke px-4 py-2 text-black disabled:opacity-50 dark:border-strokedark dark:text-white"
            >
              Siguiente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
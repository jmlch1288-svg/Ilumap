import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  observacion: string;
}

interface Inventario {
  serie: string;
  direccion: string;
  sector: string;
  barrio: string;
  lat: number;
  lng: number;
}

function LocationMarker({ position, setPosition, setDireccion }: { position: [number, number]; setPosition: (pos: [number, number]) => void; setDireccion: (dir: string) => void }) {
  useMapEvents({
    click(e) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);

      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=18&addressdetails=1`, {
        headers: { "User-Agent": "ILUMAP-App/1.0" },
      })
        .then(res => res.json())
        .then(data => setDireccion(data.display_name || "Dirección no encontrada"))
        .catch(() => setDireccion("Error al obtener dirección"));
    },
  });
  return position ? <Marker position={position} /> : null;
}

// Función para formatear texto: Primera letra mayúscula, resto minúscula por palabra
const formatConditionLabel = (value: string) => {
  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export default function PqrCreate() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [documentoQuery, setDocumentoQuery] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [editCliente, setEditCliente] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [newCliente, setNewCliente] = useState({
    id: "",
    nombre: "",
    telefono: "",
    correo: "",
    observacion: "",
  });

  const [formData, setFormData] = useState({
    fechaPqr: format(new Date(), 'yyyy-MM-dd\'T\'HH:mm'),
    prioridad: "MEDIA" as "ALTA" | "MEDIA" | "BAJA",
    medioReporte: "PERSONAL" as const,
    tipoPqr: "PETICION" as const,
    condicion: "",
    sectorPqr: "CABECERA_MUNICIPAL" as const,
    hasSerie: false,
    serieLuminaria: "",
    direccionPqr: "",
    barrio: "",
    lat: 6.963,
    lng: -75.417,
    observacionPqr: "",
  });

  const [position, setPosition] = useState<[number, number]>([formData.lat, formData.lng]);
  const [searchSerie, setSearchSerie] = useState("");

  // Búsqueda clientes
  const { data: clientes = [], isLoading: loadingClientes } = useQuery<Cliente[]>({
    queryKey: ["clientes", documentoQuery],
    queryFn: async () => {
      if (!documentoQuery.trim()) return [];
      const response = await axios.get(`http://localhost:5000/api/pqr/clientes/search?q=${documentoQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  // Búsqueda series
  const { data: inventarios = [] } = useQuery<Inventario[]>({
    queryKey: ["inventario"],
    queryFn: async () => {
      const response = await axios.get("http://localhost:5000/api/pqr/inventario", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const filteredSeries = inventarios.filter((inv) =>
    inv.serie.toLowerCase().includes(searchSerie.toLowerCase())
  );

  const handleSelectSerie = (serie: string) => {
    const inv = inventarios.find((i) => i.serie === serie);
    if (inv) {
      setFormData({
        ...formData,
        serieLuminaria: serie,
        direccionPqr: inv.direccion,
        sectorPqr: inv.sector as any,
        barrio: inv.barrio,
        lat: inv.lat,
        lng: inv.lng,
      });
      setPosition([inv.lat, inv.lng]);
    }
  };

  const createClienteMutation = useMutation({
    mutationFn: async (newClienteData: any) => {
      const response = await axios.post("http://localhost:5000/api/pqr/clientes", newClienteData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: (newCliente) => {
      setCliente(newCliente);
      setShowNewClientModal(false);
      setNewCliente({ id: "", nombre: "", telefono: "", correo: "", observacion: "" });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const pqrMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await axios.post("http://localhost:5000/api/pqr", data, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pqrs"] });
      alert("PQR creada exitosamente");
      navigate("/pqrs");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!cliente) {
      alert("Debes seleccionar o crear un cliente");
      return;
    }

    if (!formData.condicion) {
      alert("La condición es obligatoria");
      return;
    }

    const submitData = {
      ...formData,
      clienteId: cliente.id,
    };

    pqrMutation.mutate(submitData);
  };

  const handleCancel = () => {
    if (window.confirm("¿Deseas realmente cancelar la creación de la PQR?")) {
      navigate("/pqrs");
    }
  };

  // Opciones de condición según tipoPqr
  const getCondiciones = () => {
    if (formData.tipoPqr === "REPORTE") {
      return [
        "APAGADA", "ENCENDIDA_24H", "INTERMITENTE", "BAJA_INTENSIDAD", "PARPADEO",
        "FALLA_ELECTRICA", "FALLA_FOTOCONTROL", "LUMINARIA_DAÑADA", "LUMINARIA_CAIDA",
        "POSTE_INCLINADO", "POSTE_CAIDO", "VANDALISMO", "HURTO_LUMINARIA", "HURTO_CABLEADO",
        "OBSTRUCCION_ARBOL", "ACCIDENTE_TRANSITO", "LUMINARIA_INEXISTENTE", "MANTENIMIENTO_PREVENTIVO"
      ];
    }
    if (formData.tipoPqr === "PETICION") {
      return ["REPOTENCIACION", "MODERNIZACION", "REUBICACION", "REVISION_TECNICA", "APOYO_MUNICIPAL"];
    }
    if (formData.tipoPqr === "RECLAMO") {
      return ["RECLAMO_IMPUESTO", "SERVICIO_AP"];
    }
    return []; // QUEJA u otros
  };

  return (
    <>
      <PageMeta title="Crear PQR | ILUMAP" description="Crear nueva PQR" />
      <PageBreadcrumb pageTitle="Crear PQR" />

      <div className="grid grid-cols-1 gap-9">
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Información del Cliente y Reporte
              </h3>
            </div>
            <form onSubmit={handleSubmit} className="p-6.5">
              {/* Búsqueda cliente */}
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Cliente (documento) <span className="text-meta-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por documento..."
                    value={documentoQuery}
                    onChange={(e) => setDocumentoQuery(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 pl-11 pr-4 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>

                {clientes.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {clientes.map((cl) => (
                      <div
                        key={cl.id}
                        onClick={() => setCliente(cl)}
                        className="cursor-pointer rounded border border-stroke p-3 hover:bg-gray-50 dark:hover:bg-meta-4"
                      >
                        <p className="font-medium">{cl.id} - {cl.nombre}</p>
                        <p className="text-sm text-meta-5">{cl.telefono || "Sin teléfono"} | {cl.correo || "Sin correo"}</p>
                      </div>
                    ))}
                  </div>
                )}

                {documentoQuery && clientes.length === 0 && !loadingClientes && (
                  <div className="mt-4">
                    <p className="text-red-500 mb-3">Cliente no encontrado</p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCliente({ ...newCliente, id: documentoQuery });
                        setShowNewClientModal(true);
                      }}
                      className="rounded bg-brand-600 py-2 px-6 text-white font-medium hover:bg-brand-700"
                    >
                      Agregar nuevo cliente
                    </button>
                  </div>
                )}
              </div>

              {/* Modal nuevo cliente */}
              {showNewClientModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
                  <div className="w-full max-w-md rounded-lg bg-white shadow-lg dark:bg-boxdark p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-medium text-black dark:text-white">Personal Information</h3>
                      <button onClick={() => setShowNewClientModal(false)} className="text-gray-500 hover:text-gray-700">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="space-y-4">
                      <input
                        type="text"
                        placeholder="Documento (ID)"
                        value={newCliente.id}
                        onChange={(e) => setNewCliente({ ...newCliente, id: e.target.value })}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <input
                        type="text"
                        placeholder="Nombre"
                        value={newCliente.nombre}
                        onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <input
                        type="tel"
                        placeholder="Teléfono"
                        value={newCliente.telefono}
                        onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <input
                        type="email"
                        placeholder="Correo"
                        value={newCliente.correo}
                        onChange={(e) => setNewCliente({ ...newCliente, correo: e.target.value })}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <textarea
                        placeholder="Observación"
                        value={newCliente.observacion}
                        onChange={(e) => setNewCliente({ ...newCliente, observacion: e.target.value })}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                    </div>
                    <div className="flex justify-end gap-4 mt-6">
                      <button
                        type="button"
                        onClick={() => setShowNewClientModal(false)}
                        className="rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                      >
                        Cerrar
                      </button>
                      <button
                        type="button"
                        onClick={() => createClienteMutation.mutate(newCliente)}
                        className="rounded bg-brand-600 py-2 px-6 text-white font-medium hover:bg-opacity-90"
                      >
                        Guardar Cambios
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Información del cliente seleccionado */}
              {cliente && (
                <div className="mb-4.5">
                  <div className="flex items-center gap-4 mb-3">
                    <input
                      type="checkbox"
                      id="editCliente"
                      checked={editCliente}
                      onChange={(e) => setEditCliente(e.target.checked)}
                      className="h-5 w-5 rounded border-stroke dark:border-strokedark"
                    />
                    <label htmlFor="editCliente" className="text-black dark:text-white">
                      Editar información del cliente
                    </label>
                  </div>
                  <input
                    type="text"
                    disabled
                    value={cliente.id}
                    className="w-full rounded border-[1.5px] border-stroke bg-gray dark:bg-meta-4 py-3 px-5 text-black dark:text-white mb-3"
                  />
                  <input
                    type="text"
                    disabled={!editCliente}
                    value={cliente.nombre}
                    onChange={(e) => setCliente({ ...cliente, nombre: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3 disabled:opacity-70"
                  />
                  <input
                    type="tel"
                    disabled={!editCliente}
                    value={cliente.telefono}
                    onChange={(e) => setCliente({ ...cliente, telefono: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3 disabled:opacity-70"
                  />
                  <input
                    type="email"
                    disabled={!editCliente}
                    value={cliente.correo}
                    onChange={(e) => setCliente({ ...cliente, correo: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3 disabled:opacity-70"
                  />
                  <textarea
                    disabled={!editCliente}
                    value={cliente.observacion}
                    onChange={(e) => setCliente({ ...cliente, observacion: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary disabled:opacity-70"
                  />
                </div>
              )}

              {/* Fecha PQR + Prioridad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-4.5">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Fecha de PQR <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.fechaPqr}
                    onChange={(e) => setFormData({ ...formData, fechaPqr: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Prioridad <span className="text-meta-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>
              </div>

              {/* Medio, Tipo PQR y Condición */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mb-4.5">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Medio de reporte <span className="text-meta-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.medioReporte}
                    onChange={(e) => setFormData({ ...formData, medioReporte: e.target.value as any })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="PERSONAL">Personal</option>
                    <option value="TELEFONICO">Telefónico</option>
                    <option value="ESCRITO">Escrito</option>
                    <option value="CORREO_ELECTRONICO">Correo Electrónico</option>
                    <option value="WHATSAPP">Whatsapp</option>
                    <option value="AUTONOMO">Autónomo</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Tipo de PQR <span className="text-meta-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.tipoPqr}
                    onChange={(e) => {
                      setFormData({ ...formData, tipoPqr: e.target.value as any, condicion: "" });
                    }}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="PETICION">Petición</option>
                    <option value="QUEJA">Queja</option>
                    <option value="RECLAMO">Reclamo</option>
                    <option value="REPORTE">Reporte</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Condición <span className="text-meta-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.condicion}
                    onChange={(e) => setFormData({ ...formData, condicion: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="">Selecciona condición</option>
                    {getCondiciones().map((cond) => (
                      <option key={cond} value={cond}>
                        {formatConditionLabel(cond)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Sector */}
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Sector <span className="text-meta-1">*</span>
                </label>
                <select
                  required
                  value={formData.sectorPqr}
                  onChange={(e) => setFormData({ ...formData, sectorPqr: e.target.value as any })}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="CABECERA_MUNICIPAL">Cabecera Municipal</option>
                  <option value="OCHALI">Ochalí</option>
                  <option value="EL_PUEBLITO">El Pueblito</option>
                  <option value="EL_CEDRO">El Cedro</option>
                  <option value="CEDENO">Cedeño</option>
                  <option value="LLANOS_DE_CUIVA">Llanos de Cuiva</option>
                  <option value="LA_LOMA">La Loma</option>
                </select>
              </div>

              {/* Resto del formulario (serie, dirección, mapa, observación, botones) igual */}

              {/* Botones */}
              <div className="flex justify-end gap-4.5 mt-8">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-stroke py-3 px-8 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pqrMutation.isPending || !cliente}
                  className="rounded bg-brand-600 py-3 px-8 text-white font-medium hover:bg-opacity-90 disabled:opacity-70"
                >
                  {pqrMutation.isPending ? "Creando..." : "Crear PQR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
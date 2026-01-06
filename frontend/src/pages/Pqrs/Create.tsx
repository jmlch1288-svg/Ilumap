import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// Componentes oficiales de TailAdmin
import DefaultInputs from "../../components/form/form-elements/DefaultInputs";
import InputGroup from "../../components/form/form-elements/InputGroup";
import SelectInputs from "../../components/form/form-elements/SelectInputs";
import TextAreaInput from "../../components/form/form-elements/TextAreaInput";
import { Modal } from "../../components/ui/modal/index"; // ← Tu modal oficial

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

const formatConditionLabel = (value: string) => {
  if (!value) return "Sin condición";
  return value
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

function LocationMarker({ position, setPosition, setDireccion }: { 
  position: [number, number]; 
  setPosition: (pos: [number, number]) => void; 
  setDireccion: (dir: string) => void 
}) {
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

export default function PqrCreate() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [documentoQuery, setDocumentoQuery] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
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
    medioReporte: "PERSONAL",
    tipoPqr: "PETICION",
    condicion: "",
    sectorPqr: "CABECERA_MUNICIPAL",
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
        sectorPqr: inv.sector,
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
    onError: (error: any) => {
      alert(error.response?.data?.message || error.message || "Error al crear la PQR");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return alert("Debes seleccionar o crear un cliente");
    if (!formData.condicion) return alert("La condición es obligatoria");

    pqrMutation.mutate({
      ...formData,
      clienteId: cliente.id,
    });
  };

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
    return [];
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

            <form onSubmit={handleSubmit} className="p-6.5 space-y-9">
              {/* Búsqueda de cliente */}
              <div>
                <DefaultInputs
                  label="Cliente (documento)"
                  type="text"
                  placeholder="Ingrese documento para buscar..."
                  value={documentoQuery}
                  onChange={(e) => setDocumentoQuery(e.target.value)}
                  required
                  icon={
                    <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20" fill="none">
                      <path d="M9.16667 3.33333C5.94501 3.33333 3.33334 5.94501 3.33334 9.16667C3.33334 12.3883 5.94501 15 9.16667 15C12.3883 15 15 12.3883 15 9.16667C15 5.94501 12.3883 3.33333 9.16667 3.33333ZM1.66667 9.16667C1.66667 5.02452 5.02452 1.66667 9.16667 1.66667C13.3088 1.66667 16.6667 5.02452 16.6667 9.16667C16.6667 13.3088 13.3088 16.6667 9.16667 16.6667C5.02452 16.6667 1.66667 13.3088 1.66667 9.16667Z" />
                      <path d="M13.2857 13.2857C13.6112 12.9602 14.1388 12.9602 14.4643 13.2857L18.0893 16.9107C18.4147 17.2362 18.4147 17.7638 18.0893 18.0893C17.7638 18.4147 17.2362 18.4147 16.9107 18.0893L13.2857 14.4643C12.9602 14.1388 12.9602 13.6112 13.2857 13.2857Z" />
                    </svg>
                  }
                />

                {/* Mensajes de estado */}
                {clientes.length > 0 && (
                  <div className="mt-4 rounded-sm border border-success bg-success/10 p-4">
                    <p className="text-success font-medium">Cliente encontrado</p>
                  </div>
                )}

                {documentoQuery && clientes.length === 0 && !loadingClientes && (
                  <div className="mt-4 rounded-sm border border-danger bg-danger/10 p-4">
                    <p className="text-danger font-medium">Cliente no encontrado. Please enter a valid document.</p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewCliente({ ...newCliente, id: documentoQuery });
                        setShowNewClientModal(true);
                      }}
                      className="mt-3 inline-flex items-center justify-center rounded-lg bg-primary py-3 px-6 font-medium text-white hover:bg-opacity-90"
                    >
                      Agregar nuevo cliente
                    </button>
                  </div>
                )}
              </div>

              {/* Modal oficial con InputGroup */}
              <Modal
                isOpen={showNewClientModal}
                onClose={() => setShowNewClientModal(false)}
                className="max-w-2xl p-8"
              >
                <h3 className="mb-6 text-xl font-semibold text-black dark:text-white">
                  Información Personal
                </h3>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <DefaultInputs
                    label="Documento (ID)"
                    type="text"
                    placeholder="Ingrese documento"
                    value={newCliente.id}
                    onChange={(e) => setNewCliente({ ...newCliente, id: e.target.value })}
                    required
                  />

                  <DefaultInputs
                    label="Nombre"
                    type="text"
                    placeholder="Ingrese nombre completo"
                    value={newCliente.nombre}
                    onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                    required
                  />

                  <InputGroup
                    label="Teléfono"
                    type="tel"
                    placeholder="Ingrese teléfono"
                    value={newCliente.telefono}
                    onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })}
                    icon={
                      <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20">
                        <path d="M13.5833 2.5H6.41667C4.75 2.5 3.33333 3.91667 3.33333 5.58333V14.4167C3.33333 16.0833 4.75 17.5 6.41667 17.5H13.5833C15.25 17.5 16.6667 16.0833 16.6667 14.4167V5.58333C16.6667 3.91667 15.25 2.5 13.5833 2.5ZM10 15.8333C9.08333 15.8333 8.33333 15.0833 8.33333 14.1667C8.33333 13.25 9.08333 12.5 10 12.5C10.9167 12.5 11.6667 13.25 11.6667 14.1667C11.6667 15.0833 10.9167 15.8333 10 15.8333Z" />
                      </svg>
                    }
                  />

                  <InputGroup
                    label="Correo"
                    type="email"
                    placeholder="Ingrese correo electrónico"
                    value={newCliente.correo}
                    onChange={(e) => setNewCliente({ ...newCliente, correo: e.target.value })}
                    icon={
                      <svg className="fill-current" width="20" height="20" viewBox="0 0 20 20">
                        <path d="M17.5 15.8333H2.5V6.66667L10 11.6667L17.5 6.66667V15.8333ZM17.5 4.16667H2.5L10 9.16667L17.5 4.16667Z" />
                      </svg>
                    }
                  />
                </div>

                <div className="mt-6">
                  <TextAreaInput
                    label="Observación"
                    value={newCliente.observacion}
                    onChange={(e) => setNewCliente({ ...newCliente, observacion: e.target.value })}
                    rows={4}
                    placeholder="Ingrese observación adicional"
                  />
                </div>

                <div className="mt-8 flex justify-end gap-4">
                  <button
                    type="button"
                    onClick={() => setShowNewClientModal(false)}
                    className="rounded-lg border border-stroke py-3 px-8 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                  >
                    Cerrar
                  </button>
                  <button
                    type="button"
                    onClick={() => createClienteMutation.mutate(newCliente)}
                    className="rounded-lg bg-primary py-3 px-8 font-medium text-white hover:bg-opacity-90"
                  >
                    Guardar Cambios
                  </button>
                </div>
              </Modal>

              {/* Campos principales del formulario */}
              <div className="grid grid-cols-1 gap-9 sm:grid-cols-2">
                <div className="space-y-9">
                  <DefaultInputs
                    label="Fecha de PQR"
                    type="datetime-local"
                    value={formData.fechaPqr}
                    onChange={(e) => setFormData({ ...formData, fechaPqr: e.target.value })}
                    required
                  />

                  <SelectInputs
                    label="Prioridad"
                    value={formData.prioridad}
                    onChange={(e) => setFormData({ ...formData, prioridad: e.target.value as any })}
                    options={[
                      { value: "ALTA", label: "Alta" },
                      { value: "MEDIA", label: "Media" },
                      { value: "BAJA", label: "Baja" },
                    ]}
                    required
                  />
                </div>

                <div className="space-y-9">
                  <SelectInputs
                    label="Medio de reporte"
                    value={formData.medioReporte}
                    onChange={(e) => setFormData({ ...formData, medioReporte: e.target.value })}
                    options={[
                      { value: "PERSONAL", label: "Personal" },
                      { value: "TELEFONICO", label: "Telefónico" },
                      { value: "ESCRITO", label: "Escrito" },
                      { value: "CORREO_ELECTRONICO", label: "Correo Electrónico" },
                      { value: "WHATSAPP", label: "Whatsapp" },
                      { value: "AUTONOMO", label: "Autónomo" },
                    ]}
                    required
                  />

                  <SelectInputs
                    label="Tipo de PQR"
                    value={formData.tipoPqr}
                    onChange={(e) => {
                      setFormData({ ...formData, tipoPqr: e.target.value, condicion: "" });
                    }}
                    options={[
                      { value: "PETICION", label: "Petición" },
                      { value: "QUEJA", label: "Queja" },
                      { value: "RECLAMO", label: "Reclamo" },
                      { value: "REPORTE", label: "Reporte" },
                    ]}
                    required
                  />
                </div>
              </div>

              <SelectInputs
                label="Condición"
                value={formData.condicion}
                onChange={(e) => setFormData({ ...formData, condicion: e.target.value })}
                options={getCondiciones().map(cond => ({
                  value: cond,
                  label: formatConditionLabel(cond)
                }))}
                placeholder="Selecciona condición"
                required
              />

              <SelectInputs
                label="Sector"
                value={formData.sectorPqr}
                onChange={(e) => setFormData({ ...formData, sectorPqr: e.target.value })}
                options={[
                  { value: "CABECERA_MUNICIPAL", label: "Cabecera Municipal" },
                  { value: "OCHALI", label: "Ochalí" },
                  { value: "EL_PUEBLITO", label: "El Pueblito" },
                  { value: "EL_CEDRO", label: "El Cedro" },
                  { value: "CEDENO", label: "Cedeño" },
                  { value: "LLANOS_DE_CUIVA", label: "Llanos de Cuiva" },
                  { value: "LA_LOMA", label: "La Loma" },
                ]}
                required
              />

              <TextAreaInput
                label="Observación"
                value={formData.observacionPqr}
                onChange={(e) => setFormData({ ...formData, observacionPqr: e.target.value })}
                rows={6}
                placeholder="Ingrese observación adicional"
              />

              {/* Botones finales */}
              <div className="flex justify-end gap-6">
                <button
                  type="button"
                  onClick={() => navigate("/pqrs")}
                  className="rounded-lg border border-stroke py-3 px-10 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pqrMutation.isPending || !cliente}
                  className="rounded-lg bg-primary py-3 px-10 font-medium text-white hover:bg-opacity-90 disabled:opacity-70"
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
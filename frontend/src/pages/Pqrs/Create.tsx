import { FormModal } from "@/components/ui/modal";
import Form from "@/components/form/Form";
import InputGroup from "@/components/form/group-input/InputGroup";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/input/Label";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
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
import { Mail, Phone, User, BadgeCheck } from "lucide-react";

/* ------------------ INTERFACES ------------------ */
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

/* ------------------ HELPERS ------------------ */
const formatConditionLabel = (value: string): string => {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/* ------------------ MAP COMPONENT ------------------ */
function LocationMarker({
  position,
  setPosition,
  setDireccion,
  setLatLng,
  disabled,
}: {
  position: [number, number];
  setPosition: (pos: [number, number]) => void;
  setDireccion: (dir: string) => void;
  setLatLng: (lat: number, lng: number) => void;
  disabled: boolean;
}) {
  useMapEvents({
    click(e) {
      if (disabled) return;
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);
      setLatLng(e.latlng.lat, e.latlng.lng);

      fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=18&addressdetails=1`,
        { headers: { "User-Agent": "ILUMAP-App/1.0" } }
      )
        .then((res) => res.json())
        .then((data) => setDireccion(data.display_name || "Dirección no encontrada"))
        .catch(() => setDireccion("Error al obtener dirección"));
    },
  });

  return <Marker position={position} />;
}

/* ------------------ MAIN COMPONENT ------------------ */
export default function PqrCreate() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  /* ------------------ STATE ------------------ */
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
    fechaPqr: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
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
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [createdPqr, setCreatedPqr] = useState<any>(null);

  /* ------------------ QUERIES ------------------ */
  const { data: clientes = [], isLoading: loadingClientes } = useQuery<Cliente[]>({
    queryKey: ["clientes", documentoQuery],
    queryFn: async () => {
      if (!documentoQuery.trim()) return [];
      const { data } = await axios.get(
        `http://localhost:5000/api/pqr/clientes/search?q=${documentoQuery}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    },
    enabled: !!documentoQuery.trim(),
  });

  const { data: inventarios = [] } = useQuery<Inventario[]>({
    queryKey: ["inventario"],
    queryFn: async () => {
      const { data } = await axios.get("http://localhost:5000/api/pqr/inventario", {
        headers: { Authorization: `Bearer ${token}` },
      });
      return data;
    },
    enabled: formData.hasSerie,
  });

  const filteredSeries = inventarios.filter((inv: Inventario) =>
    inv.serie.toLowerCase().includes(searchSerie.toLowerCase())
  );

  /* ------------------ MUTATIONS ------------------ */
  const createClienteMutation = useMutation({
    mutationFn: (payload: typeof newCliente) =>
      axios.post("http://localhost:5000/api/pqr/clientes", payload, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: (res) => {
      const newClienteData = res.data;
      setCliente(newClienteData);
      setShowNewClientModal(false);
      setNewCliente({ id: "", nombre: "", telefono: "", correo: "", observacion: "" });
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const pqrMutation = useMutation({
    mutationFn: (payload: any) =>
      axios.post("http://localhost:5000/api/pqr", payload, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: (res) => {
      const data = res.data;
      setCreatedPqr(data);
      setShowSuccessAlert(true);
      queryClient.invalidateQueries({ queryKey: ["pqrs"] });
      setTimeout(() => {
        setShowSuccessAlert(false);
        navigate("/pqrs");
      }, 6000);
    },
  });

  /* ------------------ HANDLERS ------------------ */
  const handleSelectSerie = (serie: string) => {
    const inv = inventarios.find((i: Inventario) => i.serie === serie);
    if (inv) {
      setFormData((prev) => ({
        ...prev,
        serieLuminaria: serie,
        direccionPqr: inv.direccion,
        sectorPqr: inv.sector,
        barrio: inv.barrio,
        lat: inv.lat,
        lng: inv.lng,
      }));
      setPosition([inv.lat, inv.lng]);
    }
  };

  const handleMapUpdate = (lat: number, lng: number, direccion: string) => {
    setFormData((prev) => ({
      ...prev,
      lat,
      lng,
      direccionPqr: direccion,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cliente) return alert("Debes seleccionar o crear un cliente");
    if (!formData.condicion) return alert("La condición es obligatoria");

    const payload = {
      ...formData,
      clienteId: cliente.id,
    };

    pqrMutation.mutate(payload);
  };

  const handleCancel = () => {
    if (window.confirm("¿Deseas cancelar la creación de la PQR?")) {
      navigate("/pqrs");
    }
  };

  const getCondiciones = () => {
    if (formData.tipoPqr === "REPORTE")
      return [
        "APAGADA",
        "ENCENDIDA_24H",
        "INTERMITENTE",
        "BAJA_INTENSIDAD",
        "PARPADEO",
        "FALLA_ELECTRICA",
        "FALLA_FOTOCONTROL",
        "LUMINARIA_DAÑADA",
        "LUMINARIA_CAIDA",
        "POSTE_INCLINADO",
        "POSTE_CAIDO",
        "VANDALISMO",
        "HURTO_LUMINARIA",
        "HURTO_CABLEADO",
        "OBSTRUCCION_ARBOL",
        "ACCIDENTE_TRANSITO",
        "LUMINARIA_INEXISTENTE",
        "MANTENIMIENTO_PREVENTIVO",
      ];
    if (formData.tipoPqr === "PETICION")
      return ["REPOTENCIACION", "MODERNIZACION", "REUBICACION", "REVISION_TECNICA", "APOYO_MUNICIPAL"];
    if (formData.tipoPqr === "RECLAMO") return ["RECLAMO_IMPUESTO", "SERVICIO_AP"];
    return [];
  };

  const isLocationDisabled = formData.hasSerie && !!formData.serieLuminaria;

  /* ------------------ RENDER ------------------ */
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
              {/* Alert de éxito */}
              {showSuccessAlert && createdPqr && (
                <div className="mb-6">
                  <Alert
                    variant="success"
                    title="¡PQR creada exitosamente!"
                    message={`Estado: ${createdPqr.estado || "PENDIENTE"}. Plazo de atención: ${createdPqr.plazoDias} días.`}
                  />
                </div>
              )}

              {/* Búsqueda de cliente */}
              <div className="mb-6">
                <label className="mb-2.5 block text-black dark:text-white">
                  Cliente (documento) <span className="text-meta-1">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por documento..."
                    value={documentoQuery}
                    onChange={(e) => setDocumentoQuery(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 pl-11 pr-4 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
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
                        <p className="text-sm text-meta-5">
                          {cl.telefono || "Sin teléfono"} | {cl.correo || "Sin correo"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {documentoQuery && clientes.length === 0 && !loadingClientes && (
                  <div className="mt-4">
                    <p className="text-red-500 mb-3">Cliente no encontrado</p>
                    <Button
                      onClick={() => {
                        setNewCliente((prev) => ({ ...prev, id: documentoQuery }));
                        setShowNewClientModal(true);
                      }}
                    >
                      Agregar nuevo cliente
                    </Button>
                  </div>
                )}
              </div>

              {/* Modal crear cliente */}
              <FormModal
                isOpen={showNewClientModal}
                onClose={() => setShowNewClientModal(false)}
                title="Crear Nuevo Cliente"
                widthClass="md:max-w-4xl"
                footer={
                  <>
                    <Button variant="outline" onClick={() => setShowNewClientModal(false)}>
                      Cancelar
                    </Button>
                    <Button
                      onClick={() => createClienteMutation.mutate(newCliente)}
                      loading={createClienteMutation.isPending}
                      disabled={!newCliente.id || !newCliente.nombre}
                    >
                      Guardar cliente
                    </Button>
                  </>
                }
              >
                <Form onSubmit={() => createClienteMutation.mutate(newCliente)}>
                  <InputGroup
                    label="Documento *"
                    placeholder="Número de identificación"
                    icon={<BadgeCheck className="h-5 w-5" />}
                    value={newCliente.id}
                    onChange={(e) => setNewCliente((prev) => ({ ...prev, id: e.target.value }))}
                    disabled
                  />
                  <InputGroup
                    label="Nombre completo *"
                    placeholder="Nombre del cliente"
                    icon={<User className="h-5 w-5" />}
                    value={newCliente.nombre}
                    onChange={(e) => setNewCliente((prev) => ({ ...prev, nombre: e.target.value }))}
                  />
                  <InputGroup
                    type="email"
                    label="Correo electrónico"
                    placeholder="correo@ejemplo.com"
                    icon={<Mail className="h-5 w-5" />}
                    value={newCliente.correo}
                    onChange={(e) => setNewCliente((prev) => ({ ...prev, correo: e.target.value }))}
                  />
                  <InputGroup
                    type="tel"
                    label="Teléfono"
                    placeholder="300 123 4567"
                    icon={<Phone className="h-5 w-5" />}
                    value={newCliente.telefono}
                    onChange={(e) => setNewCliente((prev) => ({ ...prev, telefono: e.target.value }))}
                  />
                  <div>
                    <Label htmlFor="observacion">Observación</Label>
                    <TextArea
                      id="observacion"
                      placeholder="Observación adicional"
                      value={newCliente.observacion}
                      onChange={(e) => setNewCliente((prev) => ({ ...prev, observacion: e.target.value }))}
                    />
                  </div>
                </Form>
              </FormModal>

              {/* Cliente seleccionado - edición */}
              {cliente && (
                <div className="mb-6">
                  <div className="flex items-center gap-4 mb-4">
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
                  {/* Campos de cliente (simplificados, puedes agregar mutation de update si lo deseas) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input type="text" disabled value={cliente.id} className="input-disabled" />
                    <input type="text" disabled={!editCliente} value={cliente.nombre} onChange={(e) => setCliente((prev) => prev ? {...prev, nombre: e.target.value} : null)} className="input-base" />
                    <input type="tel" disabled={!editCliente} value={cliente.telefono} onChange={(e) => setCliente((prev) => prev ? {...prev, telefono: e.target.value} : null)} className="input-base" />
                    <input type="email" disabled={!editCliente} value={cliente.correo} onChange={(e) => setCliente((prev) => prev ? {...prev, correo: e.target.value} : null)} className="input-base" />
                  </div>
                  <textarea disabled={!editCliente} value={cliente.observacion} onChange={(e) => setCliente((prev) => prev ? {...prev, observacion: e.target.value} : null)} className="w-full mt-4 textarea-base" />
                </div>
              )}

              {/* Resto del formulario (campos PQR) */}
              {/* Fecha y Prioridad */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-6">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Fecha de PQR <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.fechaPqr}
                    onChange={(e) => setFormData((prev) => ({ ...prev, fechaPqr: e.target.value }))}
                    className="w-full input-base"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Prioridad <span className="text-meta-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.prioridad}
                    onChange={(e) => setFormData((prev) => ({ ...prev, prioridad: e.target.value as any }))}
                    className="w-full input-base"
                  >
                    <option value="ALTA">Alta</option>
                    <option value="MEDIA">Media</option>
                    <option value="BAJA">Baja</option>
                  </select>
                </div>
              </div>

              {/* Medio, Tipo y Condición */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mb-6">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Medio de reporte <span className="text-meta-1">*</span>
                  </label>
                  <select
                    required
                    value={formData.medioReporte}
                    onChange={(e) => setFormData((prev) => ({ ...prev, medioReporte: e.target.value }))}
                    className="w-full input-base"
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
                      setFormData((prev) => ({
                        ...prev,
                        tipoPqr: e.target.value,
                        condicion: "",
                      }));
                    }}
                    className="w-full input-base"
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, condicion: e.target.value }))}
                    className="w-full input-base"
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
              <div className="mb-6">
                <label className="mb-2.5 block text-black dark:text-white">
                  Sector <span className="text-meta-1">*</span>
                </label>
                <select
                  required
                  value={formData.sectorPqr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sectorPqr: e.target.value }))}
                  disabled={isLocationDisabled}
                  className="w-full input-base disabled:opacity-70"
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

              {/* Checkbox serie */}
              <div className="mb-6 flex items-center gap-4">
                <input
                  type="checkbox"
                  id="hasSerie"
                  checked={formData.hasSerie}
                  onChange={(e) => setFormData((prev) => ({ ...prev, hasSerie: e.target.checked }))}
                  className="h-5 w-5 rounded border-stroke dark:border-strokedark"
                />
                <label htmlFor="hasSerie" className="text-black dark:text-white">
                  ¿Tiene serie de luminaria?
                </label>
              </div>

              {/* Búsqueda y selección de serie */}
              {formData.hasSerie && (
                <div className="mb-6">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Serie de luminaria <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar serie..."
                    value={searchSerie}
                    onChange={(e) => setSearchSerie(e.target.value)}
                    className="w-full input-base mb-3"
                  />
                  <select
                    required
                    value={formData.serieLuminaria}
                    onChange={(e) => handleSelectSerie(e.target.value)}
                    className="w-full input-base"
                  >
                    <option value="">Selecciona una serie</option>
                    {filteredSeries.map((inv) => (
                      <option key={inv.serie} value={inv.serie}>
                        {inv.serie} - {inv.direccion}
                      </option>
                    ))}
                  </select>
                  {searchSerie && filteredSeries.length === 0 && (
                    <p className="text-red-500 mt-2">Serie no encontrada</p>
                  )}
                </div>
              )}

              {/* Dirección y Barrio */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-6">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Dirección <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.direccionPqr}
                    onChange={(e) => setFormData((prev) => ({ ...prev, direccionPqr: e.target.value }))}
                    disabled={isLocationDisabled}
                    className="w-full input-base disabled:opacity-70"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">Barrio</label>
                  <input
                    type="text"
                    value={formData.barrio}
                    onChange={(e) => setFormData((prev) => ({ ...prev, barrio: e.target.value }))}
                    disabled={isLocationDisabled}
                    className="w-full input-base disabled:opacity-70"
                  />
                </div>
              </div>

              {/* Mapa restringido a Yarumal */}
              <div className="mb-6">
                <label className="mb-2.5 block text-black dark:text-white">
                  Ubicación (click para seleccionar)
                </label>
                <div className="h-96 rounded-lg overflow-hidden border border-stroke dark:border-strokedark">
                  <MapContainer
                    center={position}
                    zoom={13}
                    minZoom={11}
                    maxBounds={[[6.80, -75.60], [7.15, -75.25]]}
                    maxBoundsViscosity={1.0}
                    style={{ height: "100%", width: "100%" }}
                  >
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker
                      position={position}
                      setPosition={setPosition}
                      setDireccion={(dir) => setFormData((prev) => ({ ...prev, direccionPqr: dir }))}
                      setLatLng={(lat, lng) => setFormData((prev) => ({ ...prev, lat, lng }))}
                      disabled={isLocationDisabled}
                    />
                  </MapContainer>
                </div>
                <p className="mt-2 text-sm text-meta-5">
                  Dirección detectada: {formData.direccionPqr || "Haz click en el mapa para obtenerla"}
                </p>
              </div>

              {/* Observación PQR */}
              <div className="mb-6">
                <label className="mb-2.5 block text-black dark:text-white">Observación</label>
                <textarea
                  rows={6}
                  value={formData.observacionPqr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, observacionPqr: e.target.value }))}
                  className="w-full textarea-base"
                />
              </div>

              {/* Botones de acción */}
              <div className="flex justify-end gap-4.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-stroke py-3 px-8 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={pqrMutation.isPending || !cliente || !formData.condicion}
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
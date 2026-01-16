import { FormModal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/input/Label";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import InputGroup from "@/components/form/group-input/InputGroup";
import Switch from "@/components/form/switch/Switch";
import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import Flatpickr from "react-flatpickr";
import "flatpickr/dist/flatpickr.css";
import {
  Mail,
  Phone,
  User,
  BadgeCheck,
  Edit,
  Search,
  Plus,
} from "lucide-react";

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

/* ------------------ MAP COMPONENTS ------------------ */
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

function MapController({ position }: { position: [number, number] }) {
  const map = useMap();
  const initializedRef = useRef(false);

  useEffect(() => {
    if (!map || initializedRef.current) return;

    if (isNaN(position[0]) || isNaN(position[1])) return;

    map.setView(position, 15, { animate: false });
    initializedRef.current = true;
  }, [map]);

  return null;
}

function MapResizer() {
  const map = useMap();

  useEffect(() => {
    if (map) {
      setTimeout(() => {
        map.invalidateSize({ animate: false });
      }, 100);
    }
  }, [map]);

  return null;
}

/* ------------------ MAIN COMPONENT ------------------ */
export default function PqrCreate() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [documentoQuery, setDocumentoQuery] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [showEditClienteModal, setShowEditClienteModal] = useState(false);
  const [showNewClientModal, setShowNewClientModal] = useState(false);
  const [editedCliente, setEditedCliente] = useState<Cliente | null>(null);

  const [newCliente, setNewCliente] = useState({
    id: "",
    nombre: "",
    telefono: "",
    correo: "",
    observacion: "",
  });

  const [formData, setFormData] = useState({
    fechaPqr: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    prioridad: "MEDIA" as "ALTA" | "MEDIA" | "BAJA" | "CRITICA",
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
  const [clienteFound, setClienteFound] = useState(false);
  const [clienteNotFound, setClienteNotFound] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);

  /* ------------------ QUERIES ------------------ */
  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", documentoQuery],
    queryFn: async (): Promise<Cliente[]> => {
      if (!documentoQuery.trim()) return [];
      const { data } = await axios.get(
        `http://localhost:5000/api/pqr/clientes/search?q=${documentoQuery}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return data;
    },
    enabled: !!documentoQuery.trim(),
  });

  useEffect(() => {
    if (documentoQuery.trim() && clientes.length === 0) {
      setClienteNotFound(true);
    } else {
      setClienteNotFound(false);
    }
  }, [clientes, documentoQuery]);

  const { data: inventarios = [] } = useQuery<Inventario[]>({
    queryKey: ["inventario"],
    queryFn: async (): Promise<Inventario[]> => {
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
  const createClienteMutation = useMutation<Cliente, Error, typeof newCliente>({
    mutationFn: (payload) =>
      axios.post("http://localhost:5000/api/pqr/clientes", payload, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.data),
    onSuccess: (newClienteData) => {
      setCliente(newClienteData);
      setShowNewClientModal(false);
      setNewCliente({ id: "", nombre: "", telefono: "", correo: "", observacion: "" });
      setClienteFound(true);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const updateClienteMutation = useMutation<Cliente, Error, Cliente>({
    mutationFn: (payload) =>
      axios.put(`http://localhost:5000/api/pqr/clientes/${payload.id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      }).then((res) => res.data),
    onSuccess: (updatedCliente) => {
      setCliente(updatedCliente);
      setShowEditClienteModal(false);
      setClienteFound(true);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const pqrMutation = useMutation<void, Error, any>({
    mutationFn: (payload) =>
      axios.post("http://localhost:5000/api/pqr", payload, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: () => {
      setShowSuccessAlert(true);
      queryClient.invalidateQueries({ queryKey: ["pqrs"] });
      setTimeout(() => {
        setShowSuccessAlert(false);
        navigate("/pqrs");
      }, 3000);
    },
  });

  /* ------------------ HANDLERS ------------------ */
  const handleSelectCliente = (cl: Cliente) => {
    setCliente(cl);
    setClienteFound(true);
    setClienteNotFound(false);
  };

  const handleOpenEditModal = () => {
    if (cliente) {
      setEditedCliente({ ...cliente });
      setShowEditClienteModal(true);
    }
  };

  const handleOpenNewClientModal = () => {
    setNewCliente((prev) => ({ ...prev, id: documentoQuery.trim() }));
    setShowNewClientModal(true);
  };

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

  return (
    <>
      <PageMeta title="Crear PQR | ILUMAP" description="Crear nueva PQR" />
      <PageBreadcrumb pageTitle="Crear PQR" />

      <div className="grid grid-cols-1 gap-9">
        <div className="card">
          <div className="border-b border-stroke px-6.5 py-4 dark:border-strokedark">
            <h3 className="font-medium text-black dark:text-white">
              Información del Cliente y Reporte
            </h3>
          </div>

          <form onSubmit={handleSubmit} className="p-6.5 grid grid-cols-1 gap-6 md:grid-cols-2">
            {showSuccessAlert && (
              <div className="col-span-2">
                <Alert
                  variant="success"
                  title="Éxito"
                  message="PQR creada correctamente. Redirigiendo..."
                />
              </div>
            )}

            {/* Fecha PQR */}
            <div className="col-span-2 md:col-span-1">
              <Label htmlFor="fechaPqr">Fecha PQR <span className="text-meta-1">*</span></Label>
              <Flatpickr
                id="fechaPqr"
                value={formData.fechaPqr}
                onChange={([date]) => setFormData(prev => ({ ...prev, fechaPqr: format(date, "yyyy-MM-dd'T'HH:mm") }))}
                options={{ enableTime: true, dateFormat: "Y-m-d H:i", time_24hr: true }}
                className="input-default"
                required
              />
            </div>

            {/* Cliente (documento) */}
            <div className="col-span-2">
              <Label htmlFor="documentoQuery">Cliente (documento) <span className="text-meta-1">*</span></Label>
              <div className="relative">
                <input
                  id="documentoQuery"
                  type="text"
                  placeholder="Buscar por documento..."
                  value={documentoQuery}
                  onChange={e => setDocumentoQuery(e.target.value)}
                  className="input-default pl-10"
                />
                <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
              </div>

              {/* Resultados búsqueda cliente */}
              {clientes.length > 0 && !clienteFound && (
                <div className="mt-3 max-h-64 overflow-y-auto rounded border border-stroke dark:border-strokedark">
                  {clientes.map(cl => (
                    <div
                      key={cl.id}
                      onClick={() => handleSelectCliente(cl)}
                      className="cursor-pointer border-b border-stroke p-4 last:border-none hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4/10"
                    >
                      <p className="font-medium text-black dark:text-white">{cl.id} - {cl.nombre}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {cl.telefono || "—"} | {cl.correo || "—"}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {clienteFound && cliente && (
                <div className="mt-4 rounded border border-stroke bg-gray-50 p-5 dark:border-strokedark dark:bg-boxdark-2">
                  <div className="mb-4 flex flex-wrap gap-x-8 gap-y-2 text-sm">
                    <div className="flex items-center gap-2"><BadgeCheck size={16} className="text-primary" /> <span>ID: {cliente.id}</span></div>
                    <div className="flex items-center gap-2"><User size={16} className="text-primary" /> <span>{cliente.nombre}</span></div>
                    <div className="flex items-center gap-2"><Phone size={16} className="text-primary" /> <span>{cliente.telefono || "N/A"}</span></div>
                    <div className="flex items-center gap-2"><Mail size={16} className="text-primary" /> <span>{cliente.correo || "N/A"}</span></div>
                  </div>
                  <Button variant="secondary" size="sm" onClick={handleOpenEditModal}>
                    <Edit size={16} className="mr-2" /> Editar cliente
                  </Button>
                </div>
              )}

              {clienteNotFound && (
                <div className="mt-4">
                  <p className="mb-3 text-meta-1">Cliente no encontrado. ¿Quieres agregarlo?</p>
                  <Button variant="secondary" onClick={handleOpenNewClientModal}>
                    <Plus size={16} className="mr-2" /> Agregar nuevo cliente
                  </Button>
                </div>
              )}
            </div>

            {/* Prioridad y Medio */}
            <div>
              <Label htmlFor="prioridad">Prioridad <span className="text-meta-1">*</span></Label>
              <select
                id="prioridad"
                value={formData.prioridad}
                onChange={e => setFormData(prev => ({ ...prev, prioridad: e.target.value as any }))}
                className="select-default"
                required
              >
                <option value="" disabled>Selecciona...</option>
                <option value="BAJA">Baja</option>
                <option value="MEDIA">Media</option>
                <option value="ALTA">Alta</option>
                <option value="CRITICA">Crítica</option>
              </select>
            </div>

            <div>
              <Label htmlFor="medioReporte">Medio de Reporte <span className="text-meta-1">*</span></Label>
              <select
                id="medioReporte"
                value={formData.medioReporte}
                onChange={e => setFormData(prev => ({ ...prev, medioReporte: e.target.value }))}
                className="select-default"
                required
              >
                <option value="" disabled>Selecciona...</option>
                <option value="PERSONAL">Personal</option>
                <option value="TELEFONICO">Telefónico</option>
                <option value="EMAIL">Email</option>
                <option value="APP">App</option>
              </select>
            </div>

            {/* Tipo y Condición */}
            <div>
              <Label htmlFor="tipoPqr">Tipo PQR <span className="text-meta-1">*</span></Label>
              <select
                id="tipoPqr"
                value={formData.tipoPqr}
                onChange={e => setFormData(prev => ({ ...prev, tipoPqr: e.target.value, condicion: "" }))}
                className="select-default"
                required
              >
                <option value="" disabled>Selecciona...</option>
                <option value="PETICION">Petición</option>
                <option value="QUEJA">Queja</option>
                <option value="RECLAMO">Reclamo</option>
                <option value="REPORTE">Reporte</option>
              </select>
            </div>

            <div>
              <Label htmlFor="condicion">Condición <span className="text-meta-1">*</span></Label>
              <select
                id="condicion"
                value={formData.condicion}
                onChange={e => setFormData(prev => ({ ...prev, condicion: e.target.value }))}
                className="select-default"
                required
              >
                <option value="" disabled>Selecciona...</option>
                {getCondiciones().map(cond => (
                  <option key={cond} value={cond}>{formatConditionLabel(cond)}</option>
                ))}
              </select>
            </div>

            {/* Switch serie + búsqueda serie */}
            <div className="col-span-2">
              <div className="flex items-center justify-between mb-4">
                <label className="flex items-center gap-3 cursor-pointer select-none">
                  <Switch
                    checked={formData.hasSerie}
                    onChange={checked => setFormData(prev => ({ ...prev, hasSerie: checked }))}
                  />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-400">
                    ¿Tiene serie de luminaria?
                  </span>
                </label>
              </div>
              {formData.hasSerie && (
                <div className="mt-2">
                  <Label htmlFor="searchSerie">Número de Serie</Label>
                  <div className="relative mt-2">
                    <input
                      id="searchSerie"
                      type="text"
                      placeholder="Buscar serie..."
                      value={searchSerie}
                      onChange={e => setSearchSerie(e.target.value)}
                      className="input-default pl-10"
                    />
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 dark:text-gray-400" />
                  </div>

                  {filteredSeries.length > 0 && (
                    <div className="mt-3 max-h-64 overflow-y-auto rounded border border-stroke dark:border-strokedark">
                      {filteredSeries.map(inv => (
                        <div
                          key={inv.serie}
                          onClick={() => handleSelectSerie(inv.serie)}
                          className="cursor-pointer border-b border-stroke p-4 last:border-none hover:bg-gray-50 dark:border-strokedark dark:hover:bg-meta-4/10"
                        >
                          <p className="font-medium text-black dark:text-white">{inv.serie}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {inv.direccion} • {inv.sector} • {inv.barrio}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="bg-boxdark border-strokedark text-meta-4 p-4 rounded">
              Prueba TailAdmin: debería ser fondo oscuro, borde strokedark y texto azul
            </div>
            {/* Sector, Barrio, Dirección */}
            <div>
              <Label htmlFor="sectorPqr">Sector <span className="text-meta-1">*</span></Label>
              <select
                id="sectorPqr"
                value={formData.sectorPqr}
                onChange={e => setFormData(prev => ({ ...prev, sectorPqr: e.target.value }))}
                disabled={isLocationDisabled}
                className="select-default"
              >
                <option value="" disabled>Selecciona...</option>
                <option value="CABECERA_MUNICIPAL">Cabecera Municipal</option>
                {/* Agrega más opciones según tu backend */}
              </select>
            </div>

            <div>
              <Label htmlFor="barrio">Barrio</Label>
              <input
                id="barrio"
                type="text"
                value={formData.barrio}
                onChange={e => setFormData(prev => ({ ...prev, barrio: e.target.value }))}
                disabled={isLocationDisabled}
                className="input-default"
              />
            </div>

            <div className="col-span-2">
              <Label htmlFor="direccionPqr">Dirección <span className="text-meta-1">*</span></Label>
              <input
                id="direccionPqr"
                type="text"
                value={formData.direccionPqr}
                onChange={e => setFormData(prev => ({ ...prev, direccionPqr: e.target.value }))}
                disabled={isLocationDisabled}
                className="input-default"
                required
              />
            </div>

            {/* Mapa */}
            <div className="col-span-2">
              <Label>Ubicación Geográfica</Label>
              <div 
                ref={mapContainerRef}
                className="mt-2 h-96 w-full overflow-hidden rounded border border-stroke dark:border-strokedark relative z-0"
              >
                <MapContainer 
                  zoom={15} 
                  style={{ height: "100%", width: "100%" }}
                  scrollWheelZoom={false}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <MapController position={position} />
                  <LocationMarker
                    position={position}
                    setPosition={setPosition}
                    setDireccion={dir => setFormData(prev => ({ ...prev, direccionPqr: dir }))}
                    setLatLng={(lat, lng) => setFormData(prev => ({ ...prev, lat, lng }))}
                    disabled={isLocationDisabled}
                  />
                  <MapResizer />
                </MapContainer>
              </div>
            </div>

            {/* Observación */}
            <div className="col-span-2">
              <Label htmlFor="observacionPqr">Observación</Label>
              <TextArea
                id="observacionPqr"
                value={formData.observacionPqr}
                onChange={e => setFormData(prev => ({ ...prev, observacionPqr: e.target.value }))}
                rows={4}
                className="input-default"
              />
            </div>

            {/* Botones */}
            <div className="col-span-2 flex justify-end gap-4 mt-6">
              <Button variant="secondary" type="button" onClick={() => navigate("/pqrs")}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                type="submit"
                disabled={pqrMutation.isPending}
              >
                {pqrMutation.isPending ? "Guardando..." : "Guardar PQR"}
              </Button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal Nuevo Cliente */}
      <FormModal
        isOpen={showNewClientModal}
        onClose={() => setShowNewClientModal(false)}
        title="Crear Nuevo Cliente"
        widthClass="max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowNewClientModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => createClienteMutation.mutate(newCliente)}
              loading={createClienteMutation.isPending}
              disabled={!newCliente.id.trim() || !newCliente.nombre.trim()}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputGroup icon={<BadgeCheck size={18} />}>
            <Label htmlFor="newClienteId">ID (Documento)</Label>
            <input
              id="newClienteId"
              value={newCliente.id}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, id: e.target.value }))}
              className="input-default"
            />
          </InputGroup>
          <InputGroup icon={<User size={18} />}>
            <Label htmlFor="newClienteNombre">Nombre</Label>
            <input
              id="newClienteNombre"
              value={newCliente.nombre}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, nombre: e.target.value }))}
              className="input-default"
            />
          </InputGroup>
          <InputGroup icon={<Phone size={18} />}>
            <Label htmlFor="newClienteTelefono">Teléfono</Label>
            <input
              id="newClienteTelefono"
              value={newCliente.telefono}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, telefono: e.target.value }))}
              className="input-default"
            />
          </InputGroup>
          <InputGroup icon={<Mail size={18} />}>
            <Label htmlFor="newClienteCorreo">Correo</Label>
            <input
              id="newClienteCorreo"
              value={newCliente.correo}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, correo: e.target.value }))}
              className="input-default"
            />
          </InputGroup>
          <div className="col-span-2">
            <Label htmlFor="newClienteObservacion">Observación</Label>
            <TextArea
              id="newClienteObservacion"
              value={newCliente.observacion}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, observacion: e.target.value }))}
              rows={3}
              className="input-default"
            />
          </div>
        </div>
      </FormModal>

      {/* Modal Editar Cliente */}
      <FormModal
        isOpen={showEditClienteModal}
        onClose={() => setShowEditClienteModal(false)}
        title="Editar Cliente"
        widthClass="max-w-4xl"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowEditClienteModal(false)}>Cancelar</Button>
            <Button
              variant="primary"
              onClick={() => editedCliente && updateClienteMutation.mutate(editedCliente)}
              loading={updateClienteMutation.isPending}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        {editedCliente && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <InputGroup icon={<BadgeCheck size={18} />}>
              <Label>ID (Documento)</Label>
              <input
                value={editedCliente.id}
                disabled
                className="input-default disabled:cursor-not-allowed disabled:bg-gray-100 dark:disabled:bg-boxdark-2"
              />
            </InputGroup>
            <InputGroup icon={<User size={18} />}>
              <Label htmlFor="editNombre">Nombre</Label>
              <input
                id="editNombre"
                value={editedCliente.nombre}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, nombre: e.target.value }) : null)}
                className="input-default"
              />
            </InputGroup>
            <InputGroup icon={<Phone size={18} />}>
              <Label htmlFor="editTelefono">Teléfono</Label>
              <input
                id="editTelefono"
                value={editedCliente.telefono}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, telefono: e.target.value }) : null)}
                className="input-default"
              />
            </InputGroup>
            <InputGroup icon={<Mail size={18} />}>
              <Label htmlFor="editCorreo">Correo</Label>
              <input
                id="editCorreo"
                value={editedCliente.correo}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, correo: e.target.value }) : null)}
                className="input-default"
              />
            </InputGroup>
            <div className="col-span-2">
              <Label htmlFor="editObservacion">Observación</Label>
              <TextArea
                id="editObservacion"
                value={editedCliente.observacion}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, observacion: e.target.value }) : null)}
                rows={3}
                className="input-default"
              />
            </div>
          </div>
        )}
      </FormModal>
    </>
  );
}
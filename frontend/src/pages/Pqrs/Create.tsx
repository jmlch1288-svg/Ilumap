import { FormModal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/input/Label";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
import InputGroup from "@/components/form/group-input/InputGroup";
import Switch from "@/components/form/switch/Switch";
import { useState, useEffect } from "react";
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

function MapResizer({ position, hasSerie }: { position: [number, number]; hasSerie: boolean }) {
  const map = useMap();
  useEffect(() => {
    const resizeObserver = new ResizeObserver(() => map.invalidateSize());
    resizeObserver.observe(document.body);
    return () => resizeObserver.disconnect();
  }, [map]);

  useEffect(() => {
    map.invalidateSize();
  }, [map, position, hasSerie]);

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
        <div className="flex flex-col gap-9">
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-6.5 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                Información del Cliente y Reporte
              </h3>
            </div>

            <form onSubmit={handleSubmit} className="p-6.5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {showSuccessAlert && (
                <div className="col-span-2 mb-6">
                  <Alert
                    variant="success"
                    title="PQR creada con éxito"
                    message="La PQR ha sido registrada correctamente. Serás redirigido al listado."
                  />
                </div>
              )}

              {/* Fecha PQR */}
              <div className="col-span-2">
                <Label>Fecha PQR <span className="text-meta-1">*</span></Label>
                <Flatpickr
                  value={formData.fechaPqr}
                  onChange={([date]) => setFormData((prev) => ({ ...prev, fechaPqr: format(date, "yyyy-MM-dd'T'HH:mm") }))}
                  options={{
                    enableTime: true,
                    dateFormat: "Y-m-d H:i",
                    time_24hr: true,
                  }}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              {/* Cliente */}
              <div className="col-span-2">
                <Label>Cliente (documento) <span className="text-meta-1">*</span></Label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Buscar por documento..."
                    value={documentoQuery}
                    onChange={(e) => setDocumentoQuery(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent pl-10 pr-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>

                {clientes.length > 0 && !clienteFound && (
                  <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                    {clientes.map((cl) => (
                      <div
                        key={cl.id}
                        onClick={() => handleSelectCliente(cl)}
                        className="cursor-pointer rounded border border-stroke p-4 hover:bg-gray-50 dark:hover:bg-meta-4 dark:border-strokedark"
                      >
                        <p className="font-medium">{cl.id} - {cl.nombre}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {cl.telefono || "Sin teléfono"} | {cl.correo || "Sin correo"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {clienteFound && cliente && (
                  <div className="mt-4">
                    <Alert variant="success" message="Cliente encontrado" className="mb-3" />
                    <div className="flex flex-wrap gap-6 p-4 rounded border border-stroke bg-gray-50 dark:bg-boxdark-2 dark:border-strokedark">
                      <div className="flex items-center gap-2"><BadgeCheck size={16} /> ID: {cliente.id}</div>
                      <div className="flex items-center gap-2"><User size={16} /> Nombre: {cliente.nombre}</div>
                      <div className="flex items-center gap-2"><Phone size={16} /> Teléfono: {cliente.telefono || "N/A"}</div>
                      <div className="flex items-center gap-2"><Mail size={16} /> Correo: {cliente.correo || "N/A"}</div>
                    </div>
                    <Button variant="secondary" onClick={handleOpenEditModal} className="mt-3">
                      <Edit size={16} className="mr-2" /> Editar información del cliente
                    </Button>
                  </div>
                )}

                {clienteNotFound && (
                  <div className="mt-4">
                    <p className="text-red-600 font-medium mb-3">Cliente no encontrado, ¿desea agregar uno?</p>
                    <Button variant="secondary" onClick={handleOpenNewClientModal}>
                      <Plus size={16} className="mr-2" /> Agregar nuevo cliente
                    </Button>
                  </div>
                )}
              </div>

              {/* Prioridad + Medio de Reporte */}
              <div>
                <Label>Prioridad <span className="text-meta-1">*</span></Label>
                <select
                  value={formData.prioridad}
                  onChange={(e) => setFormData((prev) => ({ ...prev, prioridad: e.target.value as any }))}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="BAJA">Baja</option>
                  <option value="MEDIA">Media</option>
                  <option value="ALTA">Alta</option>
                  <option value="CRITICA">Crítica</option>
                </select>
              </div>

              <div>
                <Label>Medio de Reporte <span className="text-meta-1">*</span></Label>
                <select
                  value={formData.medioReporte}
                  onChange={(e) => setFormData((prev) => ({ ...prev, medioReporte: e.target.value }))}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="PERSONAL">Personal</option>
                  <option value="TELEFONICO">Telefónico</option>
                  <option value="EMAIL">Email</option>
                  <option value="APP">App</option>
                </select>
              </div>

              {/* Tipo PQR + Condición */}
              <div>
                <Label>Tipo PQR <span className="text-meta-1">*</span></Label>
                <select
                  value={formData.tipoPqr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tipoPqr: e.target.value, condicion: "" }))}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="PETICION">Petición</option>
                  <option value="QUEJA">Queja</option>
                  <option value="RECLAMO">Reclamo</option>
                  <option value="REPORTE">Reporte</option>
                </select>
              </div>

              <div>
                <Label>Condición <span className="text-meta-1">*</span></Label>
                <select
                  value={formData.condicion}
                  onChange={(e) => setFormData((prev) => ({ ...prev, condicion: e.target.value }))}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                >
                  <option value="" disabled>Selecciona una condición</option>
                  {getCondiciones().map((cond) => (
                    <option key={cond} value={cond}>{formatConditionLabel(cond)}</option>
                  ))}
                </select>
              </div>

              {/* Toggle Switch para serie */}
              <div className="col-span-2">
                <Label>¿Tiene serie de luminaria?</Label>
                <Switch
                  checked={formData.hasSerie}
                  onChange={(checked) => setFormData((prev) => ({ ...prev, hasSerie: checked }))}
                />
                {formData.hasSerie && (
                  <div className="mt-6">
                    <Label>Número de Serie</Label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar serie..."
                        value={searchSerie}
                        onChange={(e) => setSearchSerie(e.target.value)}
                        className="w-full rounded border-[1.5px] border-stroke bg-transparent pl-10 pr-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    </div>

                    {filteredSeries.length > 0 && (
                      <div className="mt-4 space-y-2 max-h-60 overflow-y-auto">
                        {filteredSeries.map((inv) => (
                          <div
                            key={inv.serie}
                            onClick={() => handleSelectSerie(inv.serie)}
                            className="cursor-pointer rounded border border-stroke p-4 hover:bg-gray-50 dark:hover:bg-meta-4 dark:border-strokedark"
                          >
                            <p className="font-medium">{inv.serie} - {inv.direccion}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Sector: {inv.sector} | Barrio: {inv.barrio}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sector + Barrio */}
              <div>
                <Label>Sector <span className="text-meta-1">*</span></Label>
                <select
                  value={formData.sectorPqr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, sectorPqr: e.target.value }))}
                  disabled={isLocationDisabled}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="CABECERA_MUNICIPAL">Cabecera Municipal</option>
                  {/* Agrega más opciones según tu enum */}
                </select>
              </div>

              <div>
                <Label>Barrio</Label>
                <input
                  type="text"
                  value={formData.barrio}
                  onChange={(e) => setFormData((prev) => ({ ...prev, barrio: e.target.value }))}
                  disabled={isLocationDisabled}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>

              {/* Dirección */}
              <div className="col-span-2">
                <Label>Dirección <span className="text-meta-1">*</span></Label>
                <input
                  type="text"
                  value={formData.direccionPqr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, direccionPqr: e.target.value }))}
                  disabled={isLocationDisabled}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  required
                />
              </div>

              {/* Mapa */}
              <div className="col-span-2">
                <Label>Ubicación Geográfica</Label>
                <div className="relative z-10 h-96 w-full rounded border border-stroke dark:border-strokedark overflow-hidden">
                  <MapContainer center={position} zoom={15} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker
                      position={position}
                      setPosition={setPosition}
                      setDireccion={(dir) => setFormData((prev) => ({ ...prev, direccionPqr: dir }))}
                      setLatLng={(lat, lng) => setFormData((prev) => ({ ...prev, lat, lng }))}
                      disabled={isLocationDisabled}
                    />
                    <MapResizer position={position} hasSerie={formData.hasSerie} />
                  </MapContainer>
                </div>
              </div>

              {/* Observación */}
              <div className="col-span-2">
                <Label>Observación</Label>
                <TextArea
                  value={formData.observacionPqr}
                  onChange={(e) => setFormData((prev) => ({ ...prev, observacionPqr: e.target.value }))}
                  rows={4}
                />
              </div>

              {/* Botones */}
              <div className="col-span-2 flex justify-end gap-4">
                <Button variant="secondary" type="button" onClick={() => navigate("/pqrs")}>
                  Cancelar
                </Button>
                <Button variant="primary" type="submit" loading={pqrMutation.isPending}>
                  Guardar PQR
                </Button>
              </div>
            </form>
          </div>
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
              disabled={!newCliente.id || !newCliente.nombre}
            >
              Guardar
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <InputGroup icon={<BadgeCheck size={18} />}>
            <Label>ID (Documento)</Label>
            <input
              value={newCliente.id}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, id: e.target.value }))}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
          </InputGroup>
          <InputGroup icon={<User size={18} />}>
            <Label>Nombre</Label>
            <input
              value={newCliente.nombre}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, nombre: e.target.value }))}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
          </InputGroup>
          <InputGroup icon={<Phone size={18} />}>
            <Label>Teléfono</Label>
            <input
              value={newCliente.telefono}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, telefono: e.target.value }))}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
          </InputGroup>
          <InputGroup icon={<Mail size={18} />}>
            <Label>Correo</Label>
            <input
              value={newCliente.correo}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, correo: e.target.value }))}
              className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
          </InputGroup>
          <div className="col-span-2">
            <Label>Observación</Label>
            <TextArea
              value={newCliente.observacion}
              onChange={(e) => setNewCliente((prev) => ({ ...prev, observacion: e.target.value }))}
              rows={3}
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
                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </InputGroup>
            <InputGroup icon={<User size={18} />}>
              <Label>Nombre</Label>
              <input
                value={editedCliente.nombre}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, nombre: e.target.value }) : null)}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </InputGroup>
            <InputGroup icon={<Phone size={18} />}>
              <Label>Teléfono</Label>
              <input
                value={editedCliente.telefono}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, telefono: e.target.value }) : null)}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </InputGroup>
            <InputGroup icon={<Mail size={18} />}>
              <Label>Correo</Label>
              <input
                value={editedCliente.correo}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, correo: e.target.value }) : null)}
                className="w-full rounded border-[1.5px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
              />
            </InputGroup>
            <div className="col-span-2">
              <Label>Observación</Label>
              <TextArea
                value={editedCliente.observacion}
                onChange={(e) => setEditedCliente((prev) => prev ? ({ ...prev, observacion: e.target.value }) : null)}
                rows={3}
              />
            </div>
          </div>
        )}
      </FormModal>
    </>
  );
}
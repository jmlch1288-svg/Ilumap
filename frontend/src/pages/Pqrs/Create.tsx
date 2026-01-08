import { FormModal } from "@/components/ui/modal";
import Button from "@/components/ui/button/Button";
import Label from "@/components/form/input/Label";
import TextArea from "@/components/form/input/TextArea";
import Alert from "@/components/ui/alert/Alert";
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
import { Mail, Phone, User, BadgeCheck, Edit, Search, Plus } from "lucide-react";
import Checkbox from "@/components/form/input/Checkbox";
import Select from "@/components/form/input/Select";
import Input from "@/components/form/input/Input";

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
  const [createdPqr, setCreatedPqr] = useState<any>(null);
  const [clienteFound, setClienteFound] = useState(false);
  const [clienteNotFound, setClienteNotFound] = useState(false);

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
      axios.post("http://localhost:5000/api/clientes", payload, {  // Cambiado a /api/clientes si /pqr da error; ajusta si no
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: (res) => {
      const newClienteData = res.data;
      setCliente(newClienteData);
      setShowNewClientModal(false);
      setNewCliente({ id: "", nombre: "", telefono: "", correo: "", observacion: "" });
      setClienteFound(true);
      queryClient.invalidateQueries({ queryKey: ["clientes"] });
    },
  });

  const updateClienteMutation = useMutation({
    mutationFn: (payload: Cliente) =>
      axios.put(`http://localhost:5000/api/clientes/${payload.id}`, payload, {  // Cambiado a /api/clientes
        headers: { Authorization: `Bearer ${token}` },
      }),
    onSuccess: (res) => {
      const updatedData = res.data;
      setCliente(updatedData);
      setShowEditClienteModal(false);
      setClienteFound(true);
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
  const handleDocumentoChange = (value: string) => {  // Cambiado a value directo si Input onChange(value)
    setDocumentoQuery(value);
    if (!value) {
      setCliente(null);
      setClienteFound(false);
      setClienteNotFound(false);
    } else {
      setClienteNotFound(false);
    }
  };

  const handleSelectCliente = (cl: Cliente) => {
    setCliente(cl);
    setClienteFound(true);
    setClienteNotFound(false);
  };

  const handleOpenEditModal = () => {
    if (cliente) {
      setEditedCliente(cliente);
      setShowEditClienteModal(true);
    }
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

  const handleSerieChange = (value: string) => {
    setSearchSerie(value);
    if (!value) {
      setFormData((prev) => ({
        ...prev,
        serieLuminaria: "",
        direccionPqr: "",
        sectorPqr: "CABECERA_MUNICIPAL",
        barrio: "",
        lat: 6.963,
        lng: -75.417,
      }));
      setPosition([6.963, -75.417]);
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

  // Fix bug mapa resize mejorado
  const MapResizer = () => {
    const map = useMap();
    useEffect(() => {
      setTimeout(() => map.invalidateSize(), 100); // Inicial
      const handleResize = () => map.invalidateSize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }, [map]);
    return null;
  };

  useEffect(() => {
    if (documentoQuery && clientes.length === 0 && !loadingClientes) {
      setClienteNotFound(true);
    } else {
      setClienteNotFound(false);
    }
  }, [clientes, documentoQuery, loadingClientes]);

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

            <form onSubmit={handleSubmit} className="p-6.5 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Alert de éxito global */}
              {showSuccessAlert && createdPqr && (
                <div className="col-span-2 mb-6">
                  <Alert
                    variant="success"
                    title="¡PQR creada exitosamente!"
                    message={`Estado: ${createdPqr.estado || "PENDIENTE"}. Plazo de atención: ${createdPqr.plazoDias} días.`}
                  />
                </div>
              )}

              {/* Fecha primero, full width */}
              <div className="col-span-2">
                <Label>Fecha PQR <span className="text-meta-1">*</span></Label>
                <Input
                  type="datetime-local"
                  value={formData.fechaPqr}
                  onChange={(value) => setFormData((prev) => ({ ...prev, fechaPqr: value }))}
                  className="w-full"
                />
              </div>

              {/* Sección Cliente, full width */}
              <div className="col-span-2">
                <Label>Cliente (documento) <span className="text-meta-1">*</span></Label>
                <div className="relative">
                  <Input
                    type="text"
                    placeholder="Buscar por documento..."
                    value={documentoQuery}
                    onChange={handleDocumentoChange}
                    className="w-full pl-10"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                </div>

                {clientes.length > 0 && !clienteFound && (
                  <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                    {clientes.map((cl) => (
                      <div
                        key={cl.id}
                        onClick={() => handleSelectCliente(cl)}
                        className="cursor-pointer rounded border border-stroke p-3 hover:bg-gray-50 dark:hover:bg-meta-4 dark:border-strokedark"
                      >
                        <p className="font-medium text-black dark:text-white">{cl.id} - {cl.nombre}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {cl.telefono || "Sin teléfono"} | {cl.correo || "Sin correo"}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {clienteFound && cliente && (
                  <div className="mt-4">
                    <Alert variant="success" message="Cliente encontrado" className="mb-2" />
                    <div className="flex flex-row flex-wrap gap-4 p-3 rounded border border-stroke dark:border-strokedark bg-gray-50 dark:bg-boxdark-2">
                      <div className="flex items-center gap-2"><BadgeCheck size={16} /> ID: {cliente.id}</div>
                      <div className="flex items-center gap-2"><User size={16} /> Nombre: {cliente.nombre}</div>
                      <div className="flex items-center gap-2"><Phone size={16} /> Teléfono: {cliente.telefono || "N/A"}</div>
                      <div className="flex items-center gap-2"><Mail size={16} /> Correo: {cliente.correo || "N/A"}</div>
                    </div>
                    <Button variant="outline" onClick={handleOpenEditModal} className="mt-2">
                      <Edit size={16} className="mr-2" /> Editar información del cliente
                    </Button>
                  </div>
                )}

                {clienteNotFound && (
                  <div className="mt-4">
                    <p className="text-red-500 mb-3 font-medium">Cliente no encontrado, ¿desea agregar uno?</p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setNewCliente((prev) => ({ ...prev, id: documentoQuery }));
                        setShowNewClientModal(true);
                      }}
                      className="mt-2"
                    >
                      <Plus size={16} className="mr-2" /> Agregar nuevo cliente
                    </Button>
                  </div>
                )}
              </div>

              {/* Prioridad y Medio de Reporte en una línea */}
              <div className="col-span-1">
                <Label>Prioridad <span className="text-meta-1">*</span></Label>
                <Select
                  value={formData.prioridad}
                  onChange={(value) => setFormData((prev) => ({ ...prev, prioridad: value }))}
                  options={[{ value: "BAJA", label: "Baja" }, { value: "MEDIA", label: "Media" }, { value: "ALTA", label: "Alta" }, { value: "CRITICA", label: "Crítica" }]}
                />
              </div>
              <div className="col-span-1">
                <Label>Medio de Reporte <span className="text-meta-1">*</span></Label>
                <Select
                  value={formData.medioReporte}
                  onChange={(value) => setFormData((prev) => ({ ...prev, medioReporte: value }))}
                  options={[{ value: "PERSONAL", label: "Personal" }, { value: "TELEFONICO", label: "Telefónico" }, { value: "EMAIL", label: "Email" }, { value: "APP", label: "App" }]}
                />
              </div>

              {/* Tipo PQR y Condición en una línea */}
              <div className="col-span-1">
                <Label>Tipo PQR <span className="text-meta-1">*</span></Label>
                <Select
                  value={formData.tipoPqr}
                  onChange={(value) => setFormData((prev) => ({ ...prev, tipoPqr: value, condicion: "" }))}
                  options={[{ value: "PETICION", label: "Petición" }, { value: "QUEJA", label: "Queja" }, { value: "RECLAMO", label: "Reclamo" }, { value: "REPORTE", label: "Reporte" }]}
                />
              </div>
              <div className="col-span-1">
                <Label>Condición <span className="text-meta-1">*</span></Label>
                <Select
                  value={formData.condicion}
                  onChange={(value) => setFormData((prev) => ({ ...prev, condicion: value }))}
                  options={getCondiciones().map((cond) => ({ value: cond, label: formatConditionLabel(cond) }))}
                />
              </div>

              {/* Checkbox full width */}
              <div className="col-span-2">
                <Checkbox
                  checked={formData.hasSerie}
                  onChange={(checked) => setFormData((prev) => ({ ...prev, hasSerie: checked }))}
                >
                  ¿Tiene serie de luminaria?
                </Checkbox>

                {formData.hasSerie && (
                  <div className="mt-4">
                    <Label>Número de Serie</Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Buscar serie de luminaria..."
                        value={searchSerie}
                        onChange={handleSerieChange}
                        className="w-full pl-10"
                      />
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                    </div>

                    {filteredSeries.length > 0 && (
                      <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                        {filteredSeries.map((inv) => (
                          <div
                            key={inv.serie}
                            onClick={() => handleSelectSerie(inv.serie)}
                            className="cursor-pointer rounded border border-stroke p-3 hover:bg-gray-50 dark:hover:bg-meta-4 dark:border-strokedark"
                          >
                            <p className="font-medium text-black dark:text-white">{inv.serie} - {inv.direccion}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Sector: {inv.sector} | Barrio: {inv.barrio}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Sector y Barrio en una línea */}
              <div className="col-span-1">
                <Label>Sector <span className="text-meta-1">*</span></Label>
                <Select
                  value={formData.sectorPqr}
                  onChange={(value) => setFormData((prev) => ({ ...prev, sectorPqr: value }))}
                  options={[{ value: "CABECERA_MUNICIPAL", label: "Cabecera Municipal" } /* agrega más */ ]}
                  disabled={isLocationDisabled}
                />
              </div>
              <div className="col-span-1">
                <Label>Barrio</Label>
                <Input
                  type="text"
                  value={formData.barrio}
                  onChange={(value) => setFormData((prev) => ({ ...prev, barrio: value }))}
                  disabled={isLocationDisabled}
                  className="w-full"
                />
              </div>

              {/* Dirección full width */}
              <div className="col-span-2">
                <Label>Dirección <span className="text-meta-1">*</span></Label>
                <Input
                  type="text"
                  value={formData.direccionPqr}
                  onChange={(value) => setFormData((prev) => ({ ...prev, direccionPqr: value }))}
                  disabled={isLocationDisabled}
                  className="w-full mb-4"
                />
              </div>

              {/* Mapa full width */}
              <div className="col-span-2">
                <Label>Ubicación Geográfica</Label>
                <div className="h-64 w-full rounded border border-stroke dark:border-strokedark overflow-hidden">
                  <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker
                      position={position}
                      setPosition={setPosition}
                      setDireccion={(dir) => setFormData((prev) => ({ ...prev, direccionPqr: dir }))}
                      setLatLng={(lat, lng) => setFormData((prev) => ({ ...prev, lat, lng }))}
                      disabled={isLocationDisabled}
                    />
                    <MapResizer />
                  </MapContainer>
                </div>
              </div>

              {/* Observación full width */}
              <div className="col-span-2">
                <Label>Observación</Label>
                <TextArea
                  value={formData.observacionPqr}
                  onChange={(value) => setFormData((prev) => ({ ...prev, observacionPqr: value }))}
                  className="w-full"
                />
              </div>

              {/* Botones */}
              <div className="col-span-2 flex justify-end gap-4">
                <Button variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
                <Button type="submit" loading={pqrMutation.isPending}>
                  Guardar PQR
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Modal Crear Nuevo Cliente */}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <Label>ID (Documento)</Label>
            <div className="relative">
              <Input value={newCliente.id} onChange={(value) => setNewCliente((prev) => ({ ...prev, id: value }))} className="pl-10" />
              <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>
          <div>
            <Label>Nombre</Label>
            <div className="relative">
              <Input value={newCliente.nombre} onChange={(value) => setNewCliente((prev) => ({ ...prev, nombre: value }))} className="pl-10" />
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>
          <div>
            <Label>Teléfono</Label>
            <div className="relative">
              <Input value={newCliente.telefono} onChange={(value) => setNewCliente((prev) => ({ ...prev, telefono: value }))} className="pl-10" />
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>
          <div>
            <Label>Correo</Label>
            <div className="relative">
              <Input value={newCliente.correo} onChange={(value) => setNewCliente((prev) => ({ ...prev, correo: value }))} className="pl-10" />
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            </div>
          </div>
          <div className="col-span-2">
            <Label>Observación</Label>
            <TextArea value={newCliente.observacion} onChange={(value) => setNewCliente((prev) => ({ ...prev, observacion: value }))} />
          </div>
        </div>
      </FormModal>

      {/* Modal Editar Cliente */}
      <FormModal
        isOpen={showEditClienteModal}
        onClose={() => setShowEditClienteModal(false)}
        title="Editar Cliente"
        widthClass="md:max-w-4xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setShowEditClienteModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => editedCliente && updateClienteMutation.mutate(editedCliente)}
              loading={updateClienteMutation.isPending}
              disabled={!editedCliente?.id || !editedCliente?.nombre}
            >
              Guardar cambios
            </Button>
          </>
        }
      >
        {editedCliente && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label>ID (Documento)</Label>
              <div className="relative">
                <Input value={editedCliente.id} disabled className="pl-10" />
                <BadgeCheck className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>
            <div>
              <Label>Nombre</Label>
              <div className="relative">
                <Input value={editedCliente.nombre} onChange={(value) => setEditedCliente((prev) => prev ? ({ ...prev, nombre: value }) : null)} className="pl-10" />
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>
            <div>
              <Label>Teléfono</Label>
              <div className="relative">
                <Input value={editedCliente.telefono} onChange={(value) => setEditedCliente((prev) => prev ? ({ ...prev, telefono: value }) : null)} className="pl-10" />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>
            <div>
              <Label>Correo</Label>
              <div className="relative">
                <Input value={editedCliente.correo} onChange={(value) => setEditedCliente((prev) => prev ? ({ ...prev, correo: value }) : null)} className="pl-10" />
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              </div>
            </div>
            <div className="col-span-2">
              <Label>Observación</Label>
              <TextArea value={editedCliente.observacion} onChange={(value) => setEditedCliente((prev) => prev ? ({ ...prev, observacion: value }) : null)} />
            </div>
          </div>
        )}
      </FormModal>
    </>
  );
}
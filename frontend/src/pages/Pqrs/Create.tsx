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

interface Inventario {
  serie: string;
  direccion: string;
  sector: string;
  barrio: string;
  lat: number;
  lng: number;
}

interface Cliente {
  id: string;
  nombre: string;
  telefono: string;
  correo: string;
  observacion: string;
}

function LocationMarker({ position, setPosition, setDireccion }: { position: [number, number]; setPosition: (pos: [number, number]) => void; setDireccion: (dir: string) => void }) {
  useMapEvents({
    click(e) {
      const newPos: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPosition(newPos);

      // Reverse geocoding con Nominatim (gratis)
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&zoom=18&addressdetails=1`, {
        headers: { "User-Agent": "ILUMAP-App/1.0" },
      })
        .then(res => res.json())
        .then(data => {
          const addr = data.display_name || "Dirección no encontrada";
          setDireccion(addr);
        })
        .catch(() => setDireccion("Error al obtener dirección"));
    },
  });
  return position ? <Marker position={position} /> : null;
}

export default function PqrCreate() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [clienteQuery, setClienteQuery] = useState("");
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [editCliente, setEditCliente] = useState(false);
  const [nuevoClienteId, setNuevoClienteId] = useState("");

  const [formData, setFormData] = useState({
    fechaPqr: format(new Date(), 'yyyy-MM-ddTHH:mm'),
    medioReporte: "PERSONAL",
    tipoPqr: "PETICION",
    condicion: "",
    hasSerie: false,
    serieLuminaria: "",
    direccionPqr: "",
    sectorPqr: "",
    barrio: "",
    lat: 6.963,
    lng: -75.417,
    observacionPqr: "",
  });

  const [position, setPosition] = useState<[number, number]>([formData.lat, formData.lng]);
  const [searchSerie, setSearchSerie] = useState("");

  // Búsqueda clientes
  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", clienteQuery],
    queryFn: async () => {
      if (!clienteQuery) return [];
      const response = await axios.get(`http://localhost:5000/api/pqr/clientes/search?q=${clienteQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  // Búsqueda series
  const { data: inventarios = [] } = useQuery<Inventario[]>({
    queryKey: ["inventario"],
    queryFn: async () => {
      const response = await axios.get("http://localhost:5000/api/inventario", {
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

  const mutation = useMutation({
    mutationFn: async (submitData: any) => {
      const response = await axios.post("http://localhost:5000/api/pqr", submitData, {
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

    const submitData = {
      ...formData,
      clienteId: cliente?.id || nuevoClienteId,
      nombreCliente: cliente?.nombre || "",
      telefonoCliente: cliente?.telefono || "",
      correoCliente: cliente?.correo || "",
      observacionCliente: cliente?.observacion || "",
      nuevoClienteId: nuevoClienteId || undefined,
      editCliente,
    };

    mutation.mutate(submitData);
  };

  const handleCancel = () => {
    if (window.confirm("¿Deseas realmente cancelar la creación de la PQR?")) {
      navigate("/pqrs");
    }
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
                  Buscar cliente por ID, teléfono o nombre
                </label>
                <input
                  type="text"
                  placeholder="Buscar cliente..."
                  value={clienteQuery}
                  onChange={(e) => setClienteQuery(e.target.value)}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                />
                <select
                  value={cliente?.id || ""}
                  onChange={(e) => {
                    const selected = clientes.find((cl) => cl.id === e.target.value);
                    setCliente(selected || null);
                  }}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                >
                  <option value="">Selecciona un cliente</option>
                  {clientes.map((cl) => (
                    <option key={cl.id} value={cl.id}>
                      {cl.id} - {cl.nombre} ({cl.telefono || "Sin teléfono"})
                    </option>
                  ))}
                </select>
              </div>

              {/* Crear nuevo cliente si no existe */}
              {!cliente && clienteQuery && clientes.length === 0 && (
                <div className="mb-4.5 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded">
                  <p className="text-yellow-800 dark:text-yellow-200 mb-3">
                    Cliente no encontrado. Crea uno nuevo:
                  </p>
                  <input
                    type="text"
                    required
                    placeholder="Documento (ID)"
                    value={nuevoClienteId}
                    onChange={(e) => setNuevoClienteId(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nombre"
                    value={formData.nombreCliente || ""}
                    onChange={(e) => setFormData({ ...formData, nombreCliente: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={formData.telefonoCliente || ""}
                    onChange={(e) => setFormData({ ...formData, telefonoCliente: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <input
                    type="email"
                    placeholder="Correo"
                    value={formData.correoCliente || ""}
                    onChange={(e) => setFormData({ ...formData, correoCliente: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <textarea
                    placeholder="Observación del cliente"
                    value={formData.observacionCliente || ""}
                    onChange={(e) => setFormData({ ...formData, observacionCliente: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              )}

              {/* Editar cliente existente */}
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

              {/* Fecha PQR */}
              <div className="mb-4.5">
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

              {/* Medio y tipo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-4.5">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Medio de reporte
                  </label>
                  <select
                    value={formData.medioReporte}
                    onChange={(e) => setFormData({ ...formData, medioReporte: e.target.value })}
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
                    Tipo de PQR
                  </label>
                  <select
                    value={formData.tipoPqr}
                    onChange={(e) => setFormData({ ...formData, tipoPqr: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="PETICION">Petición</option>
                    <option value="QUEJA">Queja</option>
                    <option value="RECLAMO">Reclamo</option>
                    <option value="REPORTE">Reporte</option>
                  </select>
                </div>
              </div>

              {/* Checkbox serie */}
              <div className="mb-4.5 flex items-center gap-4">
                <input
                  type="checkbox"
                  id="hasSerie"
                  checked={formData.hasSerie}
                  onChange={(e) => setFormData({ ...formData, hasSerie: e.target.checked })}
                  className="h-5 w-5 rounded border-stroke dark:border-strokedark"
                />
                <label htmlFor="hasSerie" className="text-black dark:text-white">
                  Tiene serie de luminaria?
                </label>
              </div>

              {/* Dropdown serie con búsqueda */}
              {formData.hasSerie && (
                <div className="mb-4.5">
                  <label className="mb-2.5 block text-black dark:text-white">
                    Serie de luminaria <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Buscar serie..."
                    value={searchSerie}
                    onChange={(e) => setSearchSerie(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <select
                    required
                    value={formData.serieLuminaria}
                    onChange={(e) => handleSelectSerie(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  >
                    <option value="">Selecciona una serie</option>
                    {filteredSeries.map((inv) => (
                      <option key={inv.serie} value={inv.serie}>
                        {inv.serie} - {inv.direccion}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Dirección, sector, barrio */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 mb-4.5">
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Dirección <span className="text-meta-1">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.direccionPqr}
                    onChange={(e) => setFormData({ ...formData, direccionPqr: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Sector
                  </label>
                  <input
                    type="text"
                    value={formData.sectorPqr}
                    onChange={(e) => setFormData({ ...formData, sectorPqr: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
                <div>
                  <label className="mb-2.5 block text-black dark:text-white">
                    Barrio
                  </label>
                  <input
                    type="text"
                    value={formData.barrio}
                    onChange={(e) => setFormData({ ...formData, barrio: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                  />
                </div>
              </div>

              {/* Mapa */}
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Ubicación (click para seleccionar - dirección automática)
                </label>
                <div className="h-96 rounded-lg overflow-hidden border border-stroke dark:border-strokedark">
                  <MapContainer center={position} zoom={13} style={{ height: "100%", width: "100%" }} maxBounds={[[6.80, -75.60], [7.15, -75.25]]} maxBoundsViscosity={1.0} minZoom={11}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <LocationMarker position={position} setPosition={setPosition} setDireccion={(dir) => setFormData({ ...formData, direccionPqr: dir })} />
                  </MapContainer>
                </div>
                <p className="mt-2 text-sm text-meta-5">Dirección detectada: {formData.direccionPqr || "Haz click en el mapa"}</p>
              </div>

              {/* Observación */}
              <div className="mb-4.5">
                <label className="mb-2.5 block text-black dark:text-white">
                  Observación
                </label>
                <textarea
                  rows={6}
                  value={formData.observacionPqr}
                  onChange={(e) => setFormData({ ...formData, observacionPqr: e.target.value })}
                  className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                />
              </div>

              {/* Botones */}
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
                  disabled={mutation.isPending}
                  className="rounded bg-primary py-3 px-8 text-white font-medium hover:bg-opacity-90 disabled:opacity-70"
                >
                  {mutation.isPending ? "Creando..." : "Crear PQR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
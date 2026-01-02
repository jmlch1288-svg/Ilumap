import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axios from "axios";
import { useAuthStore } from "@/store/authStore";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import { useNavigate } from "react-router-dom";

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

function LocationMarker({ lat, lng, setLatLng, setDireccion }: { lat: number; lng: number; setLatLng: (lat: number, lng: number) => void; setDireccion: (dir: string) => void }) {
  useMapEvents({
    click(e) {
      const newLat = e.latlng.lat;
      const newLng = e.latlng.lng;
      setLatLng(newLat, newLng);

      // Reverse geocoding
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${newLat}&lon=${newLng}&zoom=18&addressdetails=1`, {
        headers: { "User-Agent": "ILUMAP-App/1.0" },
      })
        .then(res => res.json())
        .then(data => setDireccion(data.display_name || "Dirección no encontrada"))
        .catch(() => setDireccion("Error al obtener dirección"));
    },
  });
  return <Marker position={[lat, lng]} />;
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
    fechaPqr: format(new Date(), 'yyyy-MM-ddTHH:mm'), // Fecha automática editable
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

  const [searchSerie, setSearchSerie] = useState("");

  // Búsqueda clientes
  const { data: clientes = [] } = useQuery<Cliente[]>({
    queryKey: ["clientes", clienteQuery],
    queryFn: async () => {
      const response = await axios.get(`http://localhost:5000/api/pqr/clientes/search?q=${clienteQuery}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
  });

  const handleSelectCliente = (selectedCliente: Cliente) => {
    setCliente(selectedCliente);
  };

  // ... (inventarios, filteredSeries, handleSelectSerie igual)

  const mutation = useMutation({
    mutationFn: async (data) => {
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
    const submitData = {
      ...formData,
      clienteId: cliente?.id || nuevoClienteId,
      nombreCliente: cliente?.nombre || "",
      telefonoCliente: cliente?.telefono || "",
      correoCliente: cliente?.correo || "",
      observacionCliente: cliente?.observacion || "",
      nuevoClienteId: nuevoClienteId, // Si nuevo
      editCliente, // Si editar
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
                      {cl.id} - {cl.nombre} ({cl.telefono})
                    </option>
                  ))}
                </select>
              </div>

              {/* Si no existe, crear nuevo */}
              {!cliente && clienteQuery && (
                <div className="mb-4.5">
                  <p className="text-red-500 mb-2">Cliente no encontrado. Crea uno nuevo:</p>
                  <input
                    type="text"
                    required
                    placeholder="Documento nuevo"
                    value={nuevoClienteId}
                    onChange={(e) => setNuevoClienteId(e.target.value)}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Nombre"
                    value={formData.nombreCliente}
                    onChange={(e) => setFormData({ ...formData, nombreCliente: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <input
                    type="tel"
                    placeholder="Teléfono"
                    value={formData.telefonoCliente}
                    onChange={(e) => setFormData({ ...formData, telefonoCliente: e.target.value })}
                    className="w-full rounded border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary mb-3"
                  />
                  <input
                    type="email"
                    placeholder="Correo"
                    value={formData.correoCliente}
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

              {/* Si existe, mostrar/editar */}
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
                    required
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

              {/* ... Resto de campos (medioReporte, tipoPqr, checkbox serie, dropdown serie con búsqueda, dirección, sector, barrio, observación PQR) */}

              {/* Botones guardar/cancelar */}
              <div className="flex justify-end gap-4.5">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="flex justify-center rounded border border-stroke py-2 px-6 font-medium text-black hover:shadow-1 dark:border-strokedark dark:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="flex justify-center rounded bg-primary py-2 px-6 font-medium text-white hover:bg-opacity-90 disabled:opacity-70"
                >
                  {mutation.isPending ? "Creando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuthStore } from "@/store/authStore"; // Ajusta la ruta si tu store está en otra carpeta

export default function SignInForm() {
  const [email, setEmail] = useState("admin@ilumap.com");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuthStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", {
        email,
        password,
      });

      const { user, token } = response.data;
      login(user, token);
      navigate("/"); // Redirige al dashboard
    } catch (err: any) {
      setError(err.response?.data?.error || "Error al iniciar sesión. Verifica tus credenciales.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="w-full p-4 sm:p-12 xl:p-16">
        <h2 className="mb-9 text-2xl font-bold text-black dark:text-white sm:text-title-xl2">
          Iniciar Sesión
        </h2>

        {error && (
          <div className="mb-4 rounded-md bg-red-100 p-4 text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="mb-2.5 block font-medium text-black dark:text-white">
              Email
            </label>
            <div className="relative">
              <input
                type="email"
                placeholder="admin@ilumap.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />

              <span className="absolute right-4 top-4">
                <svg
                  className="fill-current"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g opacity="0.5">
                    <path
                      d="M19.2516 3.30005H2.75156C1.55781 3.30005 0.580078 4.27778 0.580078 5.47153V16.5284C0.580078 17.7222 1.55781 18.7 2.75156 18.7H19.2516C20.4453 18.7 21.4231 17.7222 21.4231 16.5284V5.47153C21.4231 4.27778 20.4453 3.30005 19.2516 3.30005ZM19.2516 4.8469C19.2852 4.8469 19.3188 4.8469 19.3523 4.8469H2.75156C2.71804 4.8469 2.68452 4.8469 2.651 4.8469H19.2516ZM19.2516 17.1531H2.75156C2.40781 17.1531 2.13281 16.8781 2.13281 16.5344V6.35981C2.13281 6.32328 2.16633 6.29063 2.19985 6.29063H19.3523C19.3858 6.29063 19.4193 6.32328 19.4193 6.35981V16.5344C19.4193 16.8781 19.1443 17.1531 18.8006 17.1531H19.2516Z"
                      fill=""
                    />
                    <path
                      d="M10.7516 11.9875C10.718 11.9875 10.6845 11.954 10.651 11.9205L3.26875 6.10303C3.13281 5.99878 3.10016 5.81028 3.20441 5.67434C3.30866 5.53841 3.49716 5.50566 3.6331 5.60991L10.9844 11.3599L18.3016 5.60991C18.4375 5.50566 18.626 5.53841 18.7303 5.67434C18.8345 5.81028 18.8019 5.99878 18.666 6.10303L11.2837 11.9205C11.2502 11.954 11.2167 11.9875 11.1832 11.9875H10.7516Z"
                      fill=""
                    />
                  </g>
                </svg>
              </span>
            </div>
          </div>

          <div className="mb-6">
            <label className="mb-2.5 block font-medium text-black dark:text-white">
              Contraseña
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="admin123"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-lg border border-stroke bg-transparent py-4 pl-6 pr-10 text-black outline-none focus:border-primary focus-visible:shadow-none dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />

              <span className="absolute right-4 top-4">
                <svg
                  className="fill-current"
                  width="22"
                  height="22"
                  viewBox="0 0 22 22"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g opacity="0.5">
                    <path
                      d="M16.1547 6.80626V5.91251C16.1547 3.16251 14.0128 0.825012 11.479 0.618762C10.0357 0.481262 8.59235 0.996875 7.43751 1.94999C6.28266 2.90312 5.63751 4.18626 5.63751 5.91251V6.80626C5.09376 6.84876 4.54999 7.09063 4.04999 7.48126C3.39999 7.99688 3.02499 8.78751 3.02499 9.66251V16.3125C3.02499 17.1875 3.39999 17.9781 4.04999 18.4938C4.54999 18.8844 5.09376 19.1263 5.63751 19.1688H17.1625C17.7063 19.1263 18.25 18.8844 18.75 18.4938C19.4 17.9781 19.775 17.1875 19.775 16.3125V9.66251C19.775 8.78751 19.4 7.99688 18.75 7.48126C18.25 7.09063 17.7063 6.84876 17.1625 6.80626H16.1547ZM8.55751 3.09376C9.31406 2.40626 10.3109 2.06251 11.479 2.06251C12.6471 2.06251 13.6439 2.40626 14.4005 3.09376C15.157 3.78126 15.6439 4.70626 15.6439 5.91251V6.70313H7.14999V5.91251C7.14999 4.70626 7.63688 3.78126 8.55751 3.09376Z"
                      fill=""
                    />
                  </g>
                </svg>
              </span>
            </div>
          </div>

          <div className="mb-5">
            <button
              type="submit"
              disabled={loading}
              className="w-full cursor-pointer rounded-lg border border-primary bg-primary p-4 text-white transition hover:bg-opacity-90 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </button>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              ¿No tienes cuenta?{" "}
              <Link to="/signup" className="text-primary hover:underline">
                Regístrate
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}

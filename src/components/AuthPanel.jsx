import { useState } from "react";
import { usePharmacy } from "../context/pharmacy";
import { Icon } from "./UI";

export default function AuthPanel() {
  const { login, needsSetup, canSetup } = usePharmacy();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login({
        action: needsSetup ? "setup" : "login",
        username,
        password,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="card panel mx-auto my-4" style={{ maxWidth: 480 }}>
      <div className="panel-heading">
        <div>
          <h1 className="h5 mb-2">
            <Icon name="shield-lock" />{" "}
            {needsSetup
              ? "Configura tu administrador"
              : "Bienvenido a NOVA SALUD"}
          </h1>
          <p>
            {needsSetup
              ? "Este paso se realiza una sola vez desde tu equipo local."
              : "Inicia sesión para acceder al inventario y registrar ventas."}
          </p>
        </div>
      </div>
      <div className="card-body p-4 pt-0">
        {needsSetup && !canSetup ? (
          <div className="alert alert-warning">
            Inicia la aplicación localmente con las variables de Turso y crea el
            administrador antes de usar el despliegue.
          </div>
        ) : (
          <form onSubmit={submit}>
            {error && (
              <div className="alert alert-danger" role="alert">
                {error}
              </div>
            )}
            <div className="mb-3">
              <label className="form-label" htmlFor="login-user">
                Usuario
              </label>
              <input
                id="login-user"
                className="form-control"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                minLength={3}
                maxLength={40}
                pattern="[A-Za-z0-9_.\-]{3,40}"
                autoComplete="username"
                required
                disabled={busy}
              />
            </div>
            <div className="mb-3">
              <label className="form-label" htmlFor="login-password">
                Contraseña
              </label>
              <input
                id="login-password"
                className="form-control"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={12}
                maxLength={128}
                autoComplete={needsSetup ? "new-password" : "current-password"}
                required
                disabled={busy}
              />
              <div className="form-text">
                Entre 12 y 128 caracteres. El servidor conserva únicamente un
                hash seguro.
              </div>
            </div>
            <button
              type="submit"
              className="btn btn-primary w-100"
              disabled={busy}
            >
              <Icon name="box-arrow-in-right" />
              {busy
                ? "Verificando..."
                : needsSetup
                  ? "Crear administrador y entrar"
                  : "Iniciar sesión"}
            </button>
          </form>
        )}
      </div>
    </section>
  );
}

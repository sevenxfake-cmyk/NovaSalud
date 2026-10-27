import { useState } from "react";
import { usePharmacy } from "../context/pharmacy";
import { Icon } from "./UI";

export default function AuthPanel() {
  const { login } = usePharmacy();
  const [registering, setRegistering] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault();
    setError("");
    if (registering && password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setBusy(true);
    try {
      await login({
        action: registering ? "register" : "login",
        username,
        password,
        ...(registering ? { passwordConfirmation: confirmation } : {}),
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
            {registering ? "Crea tu cuenta" : "Bienvenido a NOVA SALUD"}
          </h1>
          <p>
            {registering
              ? "Tendrás tu propio inventario con 10 productos de demostración y ventas independientes."
              : "Inicia sesión para acceder a tus productos y ventas."}
          </p>
        </div>
      </div>
      <div className="card-body p-4 pt-0">
        <div
          className="nav nav-pills nav-fill gap-2 mb-4"
          role="group"
          aria-label="Acceso a tu cuenta"
        >
          {[
            [false, "Iniciar sesión"],
            [true, "Crear cuenta"],
          ].map(([mode, label]) => (
            <button
              key={label}
              type="button"
              disabled={busy}
              className={`nav-link ${registering === mode ? "active" : ""}`}
              aria-pressed={registering === mode}
              onClick={() => {
                setRegistering(mode);
                setError("");
                setPassword("");
                setConfirmation("");
              }}
            >
              {label}
            </button>
          ))}
        </div>
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
              autoComplete={registering ? "new-password" : "current-password"}
              required
              disabled={busy}
            />
            <div className="form-text">
              Entre 12 y 128 caracteres. El servidor conserva únicamente un hash
              seguro.
            </div>
          </div>
          {registering && (
            <div className="mb-3">
              <label className="form-label" htmlFor="register-confirmation">
                Repite la contraseña
              </label>
              <input
                id="register-confirmation"
                className="form-control"
                type="password"
                autoComplete="new-password"
                required
                minLength={12}
                maxLength={128}
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                disabled={busy}
              />
              <p className="form-text mt-2">
                Tus cambios de stock y tus ventas no afectan a las demás
                cuentas. Podrás entrar desde otra PC con estas mismas
                credenciales.
              </p>
            </div>
          )}
          <button
            type="submit"
            className="btn btn-primary w-100"
            disabled={busy}
          >
            <Icon name="box-arrow-in-right" />
            {busy
              ? "Verificando..."
              : registering
                ? "Registrarme y entrar"
                : "Iniciar sesión"}
          </button>
        </form>
      </div>
    </section>
  );
}

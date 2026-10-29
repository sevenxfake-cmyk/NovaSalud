import { usePharmacy } from "../context/pharmacy";
import AuthPanel from "./AuthPanel";
import ThemeToggle from "./ThemeToggle";
import { Icon } from "./UI";

export default function AccessScreen() {
  const { loading, loadError, retry, connection, schemaReady } = usePharmacy();
  return (
    <div className="access-shell">
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <header className="access-header">
        <a href="/" className="brand" aria-label="NOVA SALUD, inicio">
          <img src="/nova-salud.svg" alt="" />
          <span>NOVA<span className="brand-light">SALUD</span><small>SISTEMA DE GESTIÓN</small></span>
        </a>
        <ThemeToggle />
      </header>
      <main id="main-content" className="access-main" tabIndex="-1">
        <div className="access-intro">
          <span className="access-emblem"><Icon name="heart-pulse" /></span>
          <p className="eyebrow">TU BOTICA, MEJOR CONECTADA</p>
          <p className="access-tagline">Cuidamos tu gestión.<br />Tú cuidas de los demás.</p>
        </div>
        {loading ? (
          <div className="access-status" role="status">
            <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />
            Verificando tu sesión...
          </div>
        ) : (
          <>
            {loadError && (
              <div className="access-status alert alert-warning" role="alert">
                <p>{loadError}</p>
                <button className="btn btn-outline-secondary" onClick={retry}>Reintentar</button>
              </div>
            )}
            {connection === "connected" && schemaReady && <AuthPanel />}
          </>
        )}
      </main>
      <footer className="access-footer">
        <span><Icon name="shield-check" /> Acceso seguro · Inventario personal</span>
        <span>© {new Date().getFullYear()} Nova Salud</span>
      </footer>
    </div>
  );
}

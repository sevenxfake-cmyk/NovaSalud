import { useEffect, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { usePharmacy } from "../context/pharmacy";
import { stockStatus, dateLabel } from "../lib/format";
import { Icon } from "./UI";
import AuthPanel from "./AuthPanel";
import ThemeToggle from "./ThemeToggle";
import "../theme.css";

const links = [
  { to: "/", label: "Resumen general", icon: "grid-1x2" },
  { to: "/inventario", label: "Inventario", icon: "box-seam" },
  { to: "/ventas", label: "Nueva venta", icon: "bag-plus" },
  { to: "/historial", label: "Historial de ventas", icon: "receipt" },
  { to: "/alertas", label: "Alertas de stock", icon: "bell" },
];

export default function Layout() {
  const {
    products,
    globalSearch,
    setGlobalSearch,
    notice,
    dismissNotice,
    user,
    logout,
    connection,
    schemaReady,
    loading,
    loadError,
    retry,
  } = usePharmacy();
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const alerts = products.filter(
    (product) => stockStatus(product) !== "ok",
  ).length;
  useEffect(() => {
    const page =
      links.find((link) => link.to === location.pathname)?.label ??
      "Página no encontrada";
    document.title = `${page} · NOVA SALUD`;
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label="Cerrar menú de navegación"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "is-open" : ""}`}
        aria-label="Menú principal"
      >
        <Link to="/" className="brand" onClick={() => setMenuOpen(false)}>
          <img src="/nova-salud.svg" alt="" />
          <span>
            NOVA<span className="brand-light">SALUD</span>
            <small>SISTEMA DE GESTIÓN</small>
          </span>
        </Link>
        <div className="branch">
          <span className="branch-icon">
            <Icon name="shop" />
          </span>
          <div>
            <strong>Botica Nova Salud</strong>
            <small>Sede principal · Perú</small>
          </div>
          <Icon name="chevron-expand" />
        </div>
        <p className="nav-caption">PRINCIPAL</p>
        <nav>
          {links.map(({ to, label, icon }) => (
            <NavLink
              end={to === "/"}
              to={to}
              key={to}
              onClick={() => setMenuOpen(false)}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon name={icon} />
              <span>{label}</span>
              {to === "/alertas" && alerts > 0 && (
                <span className="nav-count">{alerts}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-card">
            <span className="care-cross">
              <Icon name="heart-pulse" />
            </span>
            <strong>
              Cuidamos tu gestión.
              <br />
              Tú cuidas de los demás.
            </strong>
            <p>
              Todo lo que tu botica necesita,
              <br />
              en un solo lugar.
            </p>
          </div>
          <div className="sidebar-version">
            <span className="status-dot" /> NOVA SALUD{" "}
            <span>v0.1 · SENATI</span>
          </div>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-toggle"
              aria-label="Abrir menú de navegación"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="list" />
            </button>
            <span className="breadcrumb-label">
              <span className="d-none d-sm-inline">Mi botica</span>{" "}
              <Icon name="chevron-right" className="d-none d-sm-inline" />{" "}
              <strong>
                {links.find((link) => link.to === location.pathname)?.label ??
                  "Página no encontrada"}
              </strong>
            </span>
          </div>
          <div className="topbar-right">
            <form
              className="global-search"
              role="search"
              onSubmit={(event) => {
                event.preventDefault();
                navigate("/inventario");
              }}
            >
              <Icon name="search" />
              <input
                aria-label="Buscar en el inventario"
                placeholder="Buscar un producto..."
                value={globalSearch}
                onChange={(event) => setGlobalSearch(event.target.value)}
              />
              <kbd>↵</kbd>
            </form>
            <ThemeToggle />
            <Link
              className="icon-button notification-button"
              to="/alertas"
              aria-label={`${alerts} alertas de reposición`}
            >
              <Icon name="bell" />
              {alerts > 0 && <span />}
            </Link>
            <div className="profile">
              <span className="profile-avatar">NS</span>
              <div>
                <strong>{user?.username ?? "Equipo Nova Salud"}</strong>
                <small>
                  {user
                    ? user.role === "admin"
                      ? "Administrador"
                      : "Vendedor"
                    : "Acceso protegido"}
                </small>
              </div>
            </div>
            {user && (
              <button
                className="icon-button"
                aria-label="Cerrar sesión"
                onClick={logout}
              >
                <Icon name="box-arrow-right" />
              </button>
            )}
          </div>
        </header>
        <main id="main-content" tabIndex="-1">
          <div className="demo-banner">
            <span>
              <Icon name="database-check" />{" "}
              <strong>Inventario persistente</strong>
              <span className="demo-explanation">
                {" "}
                · Los registros se almacenan en la base de datos de la botica.{" "}
                {products.some((product) => product.demo) &&
                  "Incluye ejemplos académicos."}
              </span>
            </span>
            <span
              className="connection-label"
              role="status"
              style={
                connection === "connected"
                  ? { color: "var(--connection-ok, #278563)" }
                  : undefined
              }
            >
              <span
                className="status-dot"
                style={
                  connection === "connected"
                    ? { background: "var(--connection-ok, #278563)" }
                    : undefined
                }
              />
              {connection === "connected"
                ? "Turso conectado"
                : connection === "checking"
                  ? "Verificando conexión..."
                  : "Sin conexión verificada"}
            </span>
          </div>
          {loading ? (
            <div className="py-5 text-center text-secondary" role="status">
              <span className="spinner-border spinner-border-sm me-2" />
              Cargando datos de la botica...
            </div>
          ) : (
            <>
              {loadError && (
                <div
                  className="alert alert-warning d-flex flex-wrap align-items-center gap-2"
                  role="alert"
                >
                  <span>{loadError}</span>
                  <button
                    className="btn btn-sm btn-outline-secondary ms-auto"
                    onClick={retry}
                  >
                    Reintentar / actualizar
                  </button>
                </div>
              )}
              {connection === "connected" &&
                schemaReady &&
                (user ? <Outlet /> : <AuthPanel />)}
            </>
          )}
        </main>
        <footer className="app-footer">
          <span>
            © {new Date().getFullYear()} Nova Salud. Gestión que cuida.
          </span>
          <span>
            <Icon name="geo-alt" /> Perú{" "}
            <span className="footer-divider">·</span> {dateLabel(new Date())}
          </span>
        </footer>
      </div>
      {notice && (
        <div
          className="notification-region"
          aria-live={notice.type === "danger" ? "assertive" : "polite"}
        >
          <div
            key={notice.id}
            className={`toast show border-0 notification-toast ${notice.type}`}
            role={notice.type === "danger" ? "alert" : "status"}
          >
            <div className="d-flex align-items-center">
              <Icon
                name={
                  notice.type === "danger"
                    ? "exclamation-circle"
                    : "check-circle"
                }
              />
              <div className="toast-body">{notice.text}</div>
              <button
                className="btn-close me-3"
                aria-label="Cerrar notificación"
                onClick={dismissNotice}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

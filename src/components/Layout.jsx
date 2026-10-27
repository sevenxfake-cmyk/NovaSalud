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

const links = [
  { to: "/", label: "Resumen general", icon: "grid-1x2" },
  { to: "/inventario", label: "Inventario", icon: "box-seam" },
  { to: "/ventas", label: "Nueva venta", icon: "bag-plus" },
  { to: "/historial", label: "Historial de ventas", icon: "receipt" },
  { to: "/alertas", label: "Alertas de stock", icon: "bell" },
];

export default function Layout() {
  const { products, globalSearch, setGlobalSearch, notice, dismissNotice } =
    usePharmacy();
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
              Mi botica <Icon name="chevron-right" />{" "}
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
                <strong>Equipo Nova Salud</strong>
                <small>Perfil de demostración</small>
              </div>
            </div>
          </div>
        </header>
        <main id="main-content" tabIndex="-1">
          <div className="demo-banner">
            <span>
              <Icon name="info-circle" /> <strong>Modo demostración</strong>
              <span className="demo-explanation">
                {" "}
                · Datos ficticios. Los cambios se reinician al recargar.
              </span>
            </span>
            <span className="connection-label">
              <span className="status-dot" />
              Turso pendiente
            </span>
          </div>
          <Outlet />
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

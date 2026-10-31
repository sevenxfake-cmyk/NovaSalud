import { useEffect, useRef, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { usePharmacy } from "../context/pharmacy";
import { stockStatus, dateLabel, normalize, money } from "../lib/format";
import { Icon } from "./UI";
import AccessScreen from "./AccessScreen";
import ThemeToggle from "./ThemeToggle";
import "../theme.css";

const links = [
  { to: "/", label: "Resumen general", icon: "grid-1x2" },
  { to: "/inventario", label: "Inventario", icon: "box-seam" },
  { to: "/ventas", label: "Nueva venta", icon: "bag-plus" },
  { to: "/historial", label: "Historial de ventas", icon: "receipt" },
  { to: "/alertas", label: "Alertas de stock", icon: "bell" },
];

const uiDemo = import.meta.env.DEV && import.meta.env.MODE === "ui-demo";

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
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const alerts = products.filter(
    (product) => stockStatus(product) !== "ok",
  ).length;

  useEffect(() => {
    function handleGlobalKeys(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      } else if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName,
        )
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }
    }
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, []);

  const searchResults = globalSearch.trim()
    ? products
        .filter((p) =>
          normalize(`${p.name} ${p.code} ${p.category}`).includes(
            normalize(globalSearch),
          ),
        )
        .slice(0, 5)
    : [];
  useEffect(() => {
    const page =
      !user ? "Accede a tu cuenta" : links.find((link) => link.to === location.pathname)?.label ??
      "Página no encontrada";
    document.title = `${page} · NOVA SALUD`;
    document.getElementById("main-content")?.focus({ preventScroll: true });
  }, [location.pathname, user]);
  if (!user) return <AccessScreen />;
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
            <small>Inventario personal · Perú</small>
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
            <div className="global-search-container">
              <form
                className="global-search"
                role="search"
                onSubmit={(event) => {
                  event.preventDefault();
                  setSearchFocused(false);
                  navigate("/inventario");
                }}
              >
                <Icon name="search" />
                <input
                  ref={searchInputRef}
                  aria-label="Buscar en el inventario"
                  placeholder="Buscar producto... (Ctrl + K)"
                  value={globalSearch}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setTimeout(() => setSearchFocused(false), 220)}
                  onChange={(event) => {
                    setGlobalSearch(event.target.value);
                    setSearchFocused(true);
                  }}
                />
                <kbd
                  className="search-shortcut"
                  title="Presiona Ctrl + K o / para buscar"
                >
                  <span className="d-none d-md-inline">Ctrl </span>K
                </kbd>
              </form>
              {searchFocused && globalSearch.trim().length > 0 && (
                <div
                  className="search-results-dropdown"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <div className="search-dropdown-header">
                    <span>Resultados rápidos</span>
                    <small className="text-secondary">
                      {searchResults.length} de {products.length}
                    </small>
                  </div>
                  {searchResults.length ? (
                    <div className="search-results-list">
                      {searchResults.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          className="search-result-item"
                          onClick={() => {
                            setGlobalSearch(item.name);
                            setSearchFocused(false);
                            navigate("/inventario");
                          }}
                        >
                          <div className="search-result-info">
                            <strong>{item.name}</strong>
                            <small>
                              {item.code} · {item.presentation} ·{" "}
                              {item.category}
                            </small>
                          </div>
                          <div className="search-result-meta">
                            <span className="search-result-price">
                              {money(item.price)}
                            </span>
                            <span
                              className={`badge ${
                                item.stock === 0
                                  ? "text-bg-danger"
                                  : item.stock <= item.minStock
                                    ? "text-bg-warning"
                                    : "text-bg-success"
                              }`}
                            >
                              {item.stock} unid.
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="search-empty-text">
                      No hay productos que coincidan con &quot;{globalSearch}&quot;.
                    </div>
                  )}
                  <div className="search-dropdown-footer">
                    <button
                      type="button"
                      className="btn btn-primary btn-sm w-100"
                      onClick={() => {
                        setSearchFocused(false);
                        navigate("/inventario");
                      }}
                    >
                      Ver en inventario completo ↵
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                onClick={() => {
                  setMenuOpen(false);
                  logout();
                }}
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
              <strong>{uiDemo ? "Vista previa de diseño" : "Inventario persistente"}</strong>
              <span className="demo-explanation">
                {" "}
                {uiDemo
                  ? "· Datos ficticios en memoria: al recargar se restablecen."
                  : "· Los registros se almacenan en la base de datos de la botica."}{" "}
                {!uiDemo && products.some((product) => product.demo) &&
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
              {uiDemo
                ? "Modo diseño sin Turso"
                : connection === "connected"
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
                <div className="page-transition" key={location.pathname}>
                  <Outlet />
                </div>}
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

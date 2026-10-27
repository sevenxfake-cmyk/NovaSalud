import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { stockStatus } from "../lib/format";

export function Icon({ name, className = "" }) {
  return <i className={`bi bi-${name} ${className}`} aria-hidden="true" />;
}

export function StockBadge({ product }) {
  const status = stockStatus(product);
  return (
    <span className={`status-badge ${status}`}>
      <span className="status-dot" />
      {status === "out"
        ? "Agotado"
        : status === "low"
          ? "Stock bajo"
          : "Disponible"}
    </span>
  );
}

export function ProductAvatar({ product }) {
  const icons = {
    Analgésicos: "capsule",
    Antibióticos: "capsule-pill",
    Antialérgicos: "flower1",
    Gastrointestinales: "bandaid",
    Vitaminas: "sun",
    "Cuidado personal": "droplet",
  };
  return (
    <span
      className={`product-avatar category-${Object.keys(icons).indexOf(product.category)}`}
    >
      <Icon name={icons[product.category] || "capsule"} />
    </span>
  );
}

export function PageHeading({
  eyebrow = "TU BOTICA, MEJOR CONECTADA",
  title,
  description,
  children,
}) {
  return (
    <div className="page-heading">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      <div className="page-actions">{children}</div>
    </div>
  );
}

export function EmptyState({
  title = "No encontramos resultados",
  text = "Prueba con otra búsqueda o cambia los filtros.",
  icon = "search",
  children,
}) {
  return (
    <div className="empty-state">
      <span className="empty-icon">
        <Icon name={icon} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}

export function Modal({ title, subtitle, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const container = ref.current;
    const focusable = () => [
      ...container.querySelectorAll(
        'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
      ),
    ];
    focusable()[0]?.focus();
    function onKey(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements.at(-1);
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
      previous?.focus();
    };
  }, [onClose]);
  return createPortal(
    <div
      className="modal d-block modal-surface"
      tabIndex="-1"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={ref}
        className={`modal-dialog modal-dialog-centered ${wide ? "modal-lg" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={subtitle ? "modal-subtitle" : undefined}
      >
        <div className="modal-content">
          <div className="modal-header">
            <div>
              <h2 className="modal-title" id="modal-title">
                {title}
              </h2>
              {subtitle && (
                <p
                  className="text-secondary small mb-0 mt-1"
                  id="modal-subtitle"
                >
                  {subtitle}
                </p>
              )}
            </div>
            <button
              className="btn-close"
              aria-label="Cerrar ventana"
              onClick={onClose}
            />
          </div>
          <div className="modal-body">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

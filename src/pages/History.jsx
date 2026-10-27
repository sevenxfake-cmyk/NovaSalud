import { useCallback, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { usePharmacy } from "../context/pharmacy";
import { dateLabel, dayKey, money, normalize, timeLabel } from "../lib/format";
import { EmptyState, Icon, Modal, PageHeading } from "../components/UI";

export default function History() {
  const { sales } = usePharmacy();
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const selected = sales.find((sale) => sale.id === params.get("venta"));
  const close = useCallback(
    () => setParams({}, { replace: true }),
    [setParams],
  );
  const invalidDates = !!(from && to && from > to);
  const filtered = invalidDates
    ? []
    : sales.filter(
        (sale) =>
          normalize(
            `${sale.id} ${sale.items.map((item) => item.name).join(" ")}`,
          ).includes(normalize(query)) &&
          (!from || dayKey(sale.date) >= from) &&
          (!to || dayKey(sale.date) <= to),
      );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * 8, current * 8);
  const total = filtered.reduce((sum, sale) => sum + sale.total, 0);
  return (
    <>
      <PageHeading
        eyebrow="REGISTRO DE MOVIMIENTOS"
        title="Cada venta cuenta"
        description="Consulta tus ventas y revisa el detalle de cada atención."
      >
        <Link className="btn btn-primary" to="/ventas">
          <Icon name="plus-lg" /> Nueva venta
        </Link>
      </PageHeading>
      <div className="history-totals">
        <div>
          <span>Ventas en esta consulta</span>
          <strong>{filtered.length}</strong>
        </div>
        <div>
          <span>Importe acumulado</span>
          <strong>{money(total)}</strong>
        </div>
        <div>
          <span>Promedio por venta</span>
          <strong>
            {money(filtered.length ? Math.round(total / filtered.length) : 0)}
          </strong>
        </div>
        <span className="demo-tag">
          <Icon name="database-check" /> Registros persistentes
        </span>
      </div>
      <section className="card panel">
        <div className="panel-heading">
          <div>
            <h2>Historial de ventas</h2>
            <p>Fechas y horas de Perú · Moneda: soles (PEN).</p>
          </div>
          <span className="subtle-label">{filtered.length} registros</span>
        </div>
        <div className="filter-bar history-filters">
          <div className="search-field">
            <Icon name="search" />
            <input
              className="form-control"
              aria-label="Buscar ventas por número o producto"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar n.º de venta o producto..."
            />
          </div>
          <div className="date-filter">
            <label htmlFor="date-from">Desde</label>
            <input
              id="date-from"
              type="date"
              className="form-control"
              value={from}
              onChange={(event) => {
                setFrom(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <div className="date-filter">
            <label htmlFor="date-to">Hasta</label>
            <input
              id="date-to"
              type="date"
              className="form-control"
              value={to}
              onChange={(event) => {
                setTo(event.target.value);
                setPage(1);
              }}
            />
          </div>
          {(query || from || to) && (
            <button
              className="btn btn-light"
              aria-label="Limpiar filtros de ventas"
              onClick={() => {
                setQuery("");
                setFrom("");
                setTo("");
                setPage(1);
              }}
            >
              <Icon name="x-lg" />
            </button>
          )}
        </div>
        {invalidDates && (
          <div className="alert alert-warning mx-3" role="alert">
            La fecha de inicio no puede ser posterior a la fecha final.
          </div>
        )}
        {visible.length ? (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>N.º de venta</th>
                  <th>Fecha y hora</th>
                  <th>Productos</th>
                  <th>Medio de pago</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th className="text-end">Detalle</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <button
                        className="btn-link sale-id"
                        onClick={() => setParams({ venta: sale.id })}
                      >
                        {sale.id}
                      </button>
                    </td>
                    <td>
                      <div className="date-cell">
                        {dateLabel(sale.date)}
                        <small>{timeLabel(sale.date)}</small>
                      </div>
                    </td>
                    <td>
                      {sale.items.reduce((sum, item) => sum + item.quantity, 0)}{" "}
                      unid.
                    </td>
                    <td>
                      <span className="payment-label">
                        <Icon
                          name={
                            sale.payment === "Efectivo"
                              ? "cash-stack"
                              : sale.payment === "Tarjeta"
                                ? "credit-card"
                                : "phone"
                          }
                        />
                        {sale.payment}
                      </span>
                    </td>
                    <td className="fw-semibold text-nowrap">
                      {money(sale.total)}
                    </td>
                    <td>
                      <span className="status-badge ok">
                        <Icon name="check-circle" /> Completada
                      </span>
                    </td>
                    <td className="text-end">
                      <button
                        className="icon-button"
                        aria-label={`Ver detalle de ${sale.id}`}
                        onClick={() => setParams({ venta: sale.id })}
                      >
                        <Icon name="eye" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="No hay ventas para esta consulta"
            text="Cambia los filtros o registra una nueva venta."
          />
        )}
        <div className="table-footer">
          <span>
            {filtered.length
              ? `Mostrando ${(current - 1) * 8 + 1}–${Math.min(current * 8, filtered.length)} de ${filtered.length} ventas`
              : "Sin registros"}
          </span>
          <nav
            className="pagination-controls"
            aria-label="Paginación del historial"
          >
            <button
              className="icon-button"
              disabled={current <= 1}
              aria-label="Página anterior"
              onClick={() => setPage(current - 1)}
            >
              <Icon name="chevron-left" />
            </button>
            <span>
              {current} / {pages}
            </span>
            <button
              className="icon-button"
              disabled={current >= pages}
              aria-label="Página siguiente"
              onClick={() => setPage(current + 1)}
            >
              <Icon name="chevron-right" />
            </button>
          </nav>
        </div>
      </section>
      {selected && (
        <Modal
          title="Detalle de venta"
          subtitle={`${selected.id} · ${dateLabel(selected.date)} · ${timeLabel(selected.date)}`}
          onClose={close}
          wide
        >
          <div className="receipt-meta">
            <span className="status-badge ok">
              <Icon name="check-circle" /> Completada
            </span>
            <span>
              Pago: <strong>{selected.payment}</strong>
            </span>
          </div>
          <div className="table-responsive">
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                  <th className="text-end">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {selected.items.map((item) => (
                  <tr key={item.productId}>
                    <td>
                      <strong>{item.name}</strong>
                      <small className="d-block text-secondary">
                        {item.code}
                      </small>
                    </td>
                    <td>{item.quantity}</td>
                    <td className="text-nowrap">{money(item.price)}</td>
                    <td className="text-end text-nowrap">
                      {money(item.subtotal)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="receipt-total">
            <span>Total de la venta</span>
            <strong>{money(selected.total)}</strong>
          </div>
          <div className="form-info">
            <Icon name="info-circle" /> Registro interno de la botica. No es un
            comprobante fiscal.
          </div>
          <div className="modal-actions">
            <button className="btn btn-primary" onClick={close}>
              Cerrar detalle
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

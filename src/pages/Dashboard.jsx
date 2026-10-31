import { useState } from "react";
import { Link } from "react-router-dom";
import { usePharmacy } from "../context/pharmacy";
import {
  dateLabel,
  dayKey,
  money,
  number,
  stockStatus,
  timeLabel,
} from "../lib/format";
import {
  EmptyState,
  Icon,
  PageHeading,
  ProductAvatar,
  StockBadge,
} from "../components/UI";

export default function Dashboard() {
  const { products, sales } = usePharmacy();
  const [period, setPeriod] = useState(7);
  const today = dayKey(new Date());
  const todaySales = sales.filter((sale) => dayKey(sale.date) === today);
  const alerts = products
    .filter((product) => stockStatus(product) !== "ok")
    .sort((a, b) => a.stock - b.stock);
  const available = products.filter(
    (product) => stockStatus(product) === "ok",
  ).length;
  const low = alerts.filter((product) => product.stock > 0).length;
  const out = alerts.length - low;
  const units = products.reduce((sum, product) => sum + product.stock, 0);
  const days = Array.from({ length: period }, (_, index) => {
    const date = new Date(`${today}T12:00:00-05:00`);
    date.setUTCDate(date.getUTCDate() - (period - index - 1));
    const key = dayKey(date);
    return {
      date,
      key,
      total: sales
        .filter((sale) => dayKey(sale.date) === key)
        .reduce((sum, sale) => sum + sale.total, 0),
    };
  });
  const totalPeriod = days.reduce((sum, day) => sum + day.total, 0);
  const max = Math.max(...days.map((day) => day.total), 10000);
  const metricCards = [
    {
      title: "Ventas de hoy",
      value: money(todaySales.reduce((sum, sale) => sum + sale.total, 0)),
      icon: "wallet2",
      color: "blue",
      detail: `${todaySales.length} ventas registradas`,
      to: "/historial",
    },
    {
      title: "Productos en inventario",
      value: number(products.length),
      icon: "box-seam",
      color: "violet",
      detail: `${number(units)} unidades en total`,
      to: "/inventario",
    },
    {
      title: "Productos con stock bajo",
      value: number(low),
      icon: "exclamation-triangle",
      color: "amber",
      detail: "Requieren reposición",
      to: "/alertas",
    },
    {
      title: "Productos agotados",
      value: number(out),
      icon: "box",
      color: "red",
      detail: out ? "Necesitan atención prioritaria" : "Sin productos agotados",
      to: "/alertas",
    },
  ];
  return (
    <>
      <PageHeading
        title="Todo listo para cuidar mejor."
        description="Este es el pulso de tu botica. Mantén todo bajo control, cada día."
      >
        <span className="date-chip">
          <Icon name="calendar4" />
          {dateLabel(new Date(), { weekday: "short" })}
        </span>
        <Link to="/ventas" className="btn btn-primary">
          <Icon name="plus-lg" /> Nueva venta
        </Link>
      </PageHeading>
      <div className="row g-3 metric-grid">
        {metricCards.map((metric) => (
          <div className="col-6 col-xl-3" key={metric.title}>
            <Link to={metric.to} className="card metric-card">
              <div className="metric-top">
                <span>{metric.title}</span>
                <span className={`metric-icon ${metric.color}`}>
                  <Icon name={metric.icon} />
                </span>
              </div>
              <strong className="metric-value">{metric.value}</strong>
              <div
                className={`metric-detail ${metric.color === "red" || metric.color === "amber" ? metric.color : ""}`}
              >
                {metric.color === "blue" && <Icon name="receipt" />}
                {metric.detail}
                <Icon name="arrow-up-right" className="ms-auto" />
              </div>
            </Link>
          </div>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card panel sales-chart-panel">
          <div className="panel-heading">
            <div>
              <h2>Así van tus ventas</h2>
              <p>Un vistazo al movimiento de tu botica.</p>
            </div>
            <select
              className="form-select period-select"
              aria-label="Período del gráfico de ventas"
              value={period}
              onChange={(event) => setPeriod(Number(event.target.value))}
            >
              <option value={7}>Últimos 7 días</option>
              <option value={14}>Últimos 14 días</option>
            </select>
          </div>
          <div className="chart-total">
            {money(totalPeriod)}
            <span>
              <span className="legend-dot" /> Ventas registradas
            </span>
          </div>
          <div
            className="sales-chart"
            role="img"
            aria-label={`Ventas de los últimos ${period} días: ${days.map((day) => `${dateLabel(day.date)}, ${money(day.total)}`).join("; ")}`}
          >
            <div className="chart-axis">
              {[1, 0.75, 0.5, 0.25, 0].map((fraction) => (
                <span key={fraction}>{money(Math.round(max * fraction))}</span>
              ))}
            </div>
            <div className="chart-plot">
              <div className="chart-gridlines">
                {[0, 1, 2, 3, 4].map((line) => (
                  <span key={line} />
                ))}
              </div>
              <div className="chart-bars">
                {days.map((day, index) => (
                  <div className="chart-column" key={day.key}>
                    <div className="chart-tooltip">
                      <strong>{money(day.total)}</strong>
                      <small>{dateLabel(day.date)}</small>
                    </div>
                    <div
                      className={`chart-bar ${index === days.length - 1 ? "today" : ""}`}
                      title={`${dateLabel(day.date)}: ${money(day.total)}`}
                      style={{
                        height: `${Math.max((day.total / max) * 100, 0)}%`,
                      }}
                    />
                    <span
                      className={index === days.length - 1 ? "today-label" : ""}
                    >
                      {period === 14
                        ? dateLabel(day.date, {
                            month: undefined,
                            year: undefined,
                          })
                        : dateLabel(day.date, {
                            weekday: "short",
                            day: undefined,
                            month: undefined,
                            year: undefined,
                          }).replace(".", "")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="chart-footer">
            <span>
              <Icon name="info-circle" /> Importes en soles peruanos
            </span>
            <Link to="/historial">
              Ver historial <Icon name="arrow-right" />
            </Link>
          </div>
        </section>
        <section className="card panel inventory-health">
          <div className="panel-heading">
            <div>
              <h2>Salud de tu inventario</h2>
              <p>El equilibrio que tu botica necesita.</p>
            </div>
            <Icon name="box2-heart" className="text-secondary" />
          </div>
          <div
            className="inventory-ring"
            style={{
              "--available": `${(available / (products.length || 1)) * 100}%`,
              "--low": `${((available + low) / (products.length || 1)) * 100}%`,
            }}
          >
            <div>
              <strong>{products.length}</strong>
              <span>productos</span>
            </div>
          </div>
          <div className="health-legend">
            {[
              ["green", "Stock disponible", available],
              ["amber", "Stock bajo", low],
              ["red", "Agotados", out],
            ].map(([color, label, value]) => (
              <div key={color}>
                <span>
                  <span className={`status-dot ${color}`} />
                  {label}
                </span>
                <strong>{value}</strong>
              </div>
            ))}
          </div>
          <Link to="/inventario" className="health-link">
            Gestionar inventario <Icon name="arrow-right" />
          </Link>
        </section>
        <section className="card panel recent-sales">
          <div className="panel-heading">
            <div>
              <h2>Últimas ventas</h2>
              <p>Cada atención, registrada.</p>
            </div>
            <Link className="text-link" to="/historial">
              Ver todas <Icon name="arrow-right" />
            </Link>
          </div>
          {sales.length ? (
            <div className="table-responsive">
              <table className="table align-middle mb-0">
                <thead>
                  <tr>
                    <th>N.º de venta</th>
                    <th>Fecha y hora</th>
                    <th>Importe</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 5).map((sale) => (
                    <tr key={sale.id}>
                      <td>
                        <Link
                          className="sale-id"
                          to={`/historial?venta=${sale.id}`}
                        >
                          {sale.id}
                        </Link>
                      </td>
                      <td>
                        <div className="date-cell">
                          {dateLabel(sale.date, { year: undefined })}
                          <small>{timeLabel(sale.date)}</small>
                        </div>
                      </td>
                      <td className="fw-semibold text-nowrap">
                        {money(sale.total)}
                      </td>
                      <td>
                        <span className="status-badge ok">
                          <Icon name="check-circle" /> Completada
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Aún no hay ventas"
              text="Registra la primera venta de tu botica."
            />
          )}
        </section>
        <section className="card panel restock-panel">
          <div className="panel-heading">
            <div>
              <h2>
                Atención al stock{" "}
                <span className="count-chip">{alerts.length}</span>
              </h2>
              <p>Pequeñas alertas, mejores decisiones.</p>
            </div>
            <span className="alert-heading-icon">
              <Icon name="bell" />
            </span>
          </div>
          {alerts.length ? (
            <div className="restock-list">
              {alerts.slice(0, 4).map((product) => (
                <Link to="/alertas" className="restock-item" key={product.id}>
                  <ProductAvatar product={product} />
                  <div>
                    <strong>{product.name}</strong>
                    <small>
                      {product.stock} unidades <span>·</span> Mín.{" "}
                      {product.minStock}
                    </small>
                  </div>
                  <StockBadge product={product} />
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="check2-circle"
              title="Todo en orden"
              text="No tienes alertas de reposición."
            />
          )}
          <Link to="/alertas" className="restock-link">
            Ver alertas de reposición <Icon name="arrow-right" />
          </Link>
        </section>
      </div>
      <div className="quick-sale-banner">
        <div className="quick-sale-icon">
          <Icon name="bag-heart" />
        </div>
        <div>
          <h2>Más tiempo para tus clientes.</h2>
          <p>Encuentra productos y registra una venta en pocos pasos.</p>
        </div>
        <Link to="/ventas" className="btn btn-white">
          Registrar una venta <Icon name="arrow-right" />
        </Link>
        <span className="banner-decoration" aria-hidden="true">
          +
        </span>
      </div>
    </>
  );
}

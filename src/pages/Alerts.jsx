import { useCallback, useState } from "react";
import { usePharmacy } from "../context/pharmacy";
import { matchesProduct, stockStatus } from "../lib/format";
import {
  EmptyState,
  Icon,
  PageHeading,
  ProductAvatar,
  StockBadge,
} from "../components/UI";
import ProductForm from "../components/ProductForm";

export default function Alerts() {
  const { products } = usePharmacy();
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(null);
  const close = useCallback(() => setEditing(null), []);
  const alerts = products
    .filter((product) => stockStatus(product) !== "ok")
    .sort((a, b) => a.stock - b.stock);
  const filtered = alerts.filter(
    (product) =>
      matchesProduct(product, query) &&
      (filter === "all" || stockStatus(product) === filter),
  );
  return (
    <>
      <PageHeading
        eyebrow="REPOSICIÓN INTELIGENTE"
        title="Anticípate al desabastecimiento"
        description="Identifica los productos que necesitan tu atención y mantén tu botica abastecida."
      />
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <div className="alert-summary total">
            <Icon name="bell" />
            <div>
              <strong>{alerts.length}</strong>
              <span>Productos por reponer</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="alert-summary warning">
            <Icon name="exclamation-triangle" />
            <div>
              <strong>
                {alerts.filter((product) => product.stock > 0).length}
              </strong>
              <span>Con stock bajo</span>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="alert-summary critical">
            <Icon name="box" />
            <div>
              <strong>
                {alerts.filter((product) => !product.stock).length}
              </strong>
              <span>Productos agotados</span>
            </div>
          </div>
        </div>
      </div>
      <section className="card panel">
        <div className="panel-heading">
          <div>
            <h2>Necesitan tu atención</h2>
            <p>Las alertas se actualizan al cambiar las existencias.</p>
          </div>
          <span className="live-label">
            <span className="status-dot" /> Actualización automática
          </span>
        </div>
        <div className="filter-bar">
          <div
            className="filter-tabs"
            role="group"
            aria-label="Estado de reposición"
          >
            {[
              ["all", "Todas"],
              ["out", "Agotados"],
              ["low", "Stock bajo"],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? "selected" : ""}
                onClick={() => setFilter(value)}
                aria-pressed={filter === value}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="search-field">
            <Icon name="search" />
            <input
              className="form-control"
              aria-label="Buscar productos en alertas"
              placeholder="Buscar producto..."
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </div>
        </div>
        {filtered.length ? (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Stock actual / mínimo</th>
                  <th>Estado</th>
                  <th className="text-end">Acción</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="product-cell">
                        <ProductAvatar product={product} />
                        <div>
                          <strong>{product.name}</strong>
                          <small>
                            {product.code} · {product.category}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div className="stock-level">
                        <strong>
                          {product.stock}{" "}
                          <span>/ {product.minStock} unid.</span>
                        </strong>
                        <div
                          className="progress"
                          role="progressbar"
                          aria-label={`Stock de ${product.name}`}
                          aria-valuenow={product.stock}
                          aria-valuemin={0}
                          aria-valuemax={product.minStock || 1}
                        >
                          <div
                            className={`progress-bar ${product.stock ? "bg-warning" : "bg-danger"}`}
                            style={{
                              width: `${Math.min((product.stock / (product.minStock || 1)) * 100, 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>
                      <StockBadge product={product} />
                    </td>
                    <td className="text-end">
                      <button
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => setEditing(product)}
                      >
                        <Icon name="plus-lg" /> Reponer stock
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={alerts.length ? "search" : "check2-circle"}
            title={
              alerts.length
                ? "No encontramos resultados"
                : "¡Tu inventario está al día!"
            }
            text={
              alerts.length
                ? "Prueba con otro nombre o estado."
                : "Todos tus productos superan el stock mínimo."
            }
          />
        )}
        <div className="table-footer">
          <span>{filtered.length} productos en esta vista</span>
          <span>Alerta cuando stock actual ≤ stock mínimo</span>
        </div>
      </section>
      <div className="help-note">
        <Icon name="lightbulb" />
        <p>
          <strong>Un inventario saludable comienza con la prevención.</strong>{" "}
          Ajusta el stock mínimo de cada producto según la demanda de tu botica.
          Las reposiciones de esta etapa son de demostración.
        </p>
      </div>
      {editing && <ProductForm product={editing} onClose={close} />}
    </>
  );
}

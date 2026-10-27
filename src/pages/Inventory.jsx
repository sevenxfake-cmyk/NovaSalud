import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { usePharmacy } from "../context/pharmacy";
import { categories, matchesProduct, money, stockStatus } from "../lib/format";
import {
  EmptyState,
  Icon,
  PageHeading,
  ProductAvatar,
  StockBadge,
} from "../components/UI";
import ProductForm from "../components/ProductForm";

export default function Inventory() {
  const { products, globalSearch, setGlobalSearch } = usePharmacy();
  const [params, setParams] = useSearchParams();
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [editing, setEditing] = useState(null);
  const [adding, setAdding] = useState(params.get("nuevo") === "1");
  const close = useCallback(() => {
    setEditing(null);
    setAdding(false);
    setParams({}, { replace: true });
  }, [setParams]);
  const filtered = products.filter(
    (product) =>
      matchesProduct(product, globalSearch) &&
      (!category || product.category === category) &&
      (!status || stockStatus(product) === status),
  );
  return (
    <>
      <PageHeading
        eyebrow="CONTROL DE INVENTARIO"
        title="Cada producto, bajo control"
        description="Consulta, registra y actualiza los productos de tu botica."
      >
        <button className="btn btn-primary" onClick={() => setAdding(true)}>
          <Icon name="plus-lg" /> Nuevo producto
        </button>
      </PageHeading>
      <div className="inventory-summary">
        <span>
          <Icon name="box-seam" /> <strong>{products.length}</strong> productos
          registrados
        </span>
        <span>
          <span className="status-dot green" />
          {
            products.filter((product) => stockStatus(product) === "ok").length
          }{" "}
          con stock disponible
        </span>
        <span>
          <span className="status-dot amber" />
          {
            products.filter((product) => stockStatus(product) === "low").length
          }{" "}
          con stock bajo
        </span>
        <span>
          <span className="status-dot red" />
          {products.filter((product) => !product.stock).length} agotados
        </span>
      </div>
      <section className="card panel">
        <div className="panel-heading">
          <div>
            <h2>Productos</h2>
            <p>Tu inventario actualizado, en un solo lugar.</p>
          </div>
          <span className="subtle-label">{filtered.length} resultados</span>
        </div>
        <div className="filter-bar">
          <div className="search-field">
            <Icon name="search" />
            <input
              className="form-control"
              aria-label="Buscar productos por nombre o código"
              placeholder="Buscar por nombre o código..."
              value={globalSearch}
              onChange={(event) => setGlobalSearch(event.target.value)}
            />
            {globalSearch && (
              <button
                className="search-clear"
                aria-label="Limpiar búsqueda"
                onClick={() => setGlobalSearch("")}
              >
                <Icon name="x" />
              </button>
            )}
          </div>
          <select
            className="form-select"
            aria-label="Filtrar por categoría"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="">Todas las categorías</option>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          <select
            className="form-select"
            aria-label="Filtrar por estado"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="">Todos los estados</option>
            <option value="ok">Disponible</option>
            <option value="low">Stock bajo</option>
            <option value="out">Agotado</option>
          </select>
        </div>
        {filtered.length ? (
          <div className="table-responsive">
            <table className="table align-middle mb-0">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Categoría</th>
                  <th>Precio</th>
                  <th>Stock actual</th>
                  <th>Mínimo</th>
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
                          {product.demo && (
                            <span className="badge text-bg-light border ms-2">
                              Demo
                            </span>
                          )}
                          <small>
                            {product.code} <span>·</span> {product.presentation}
                          </small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="category-text">{product.category}</span>
                    </td>
                    <td className="fw-semibold text-nowrap">
                      {money(product.price)}
                    </td>
                    <td>
                      <strong
                        className={
                          product.stock <= product.minStock ? "text-danger" : ""
                        }
                      >
                        {product.stock}
                      </strong>
                      <span className="unit-label"> unid.</span>
                    </td>
                    <td className="text-secondary">{product.minStock}</td>
                    <td>
                      <StockBadge product={product} />
                    </td>
                    <td className="text-end">
                      <button
                        className="icon-button edit-button"
                        aria-label={`Editar ${product.name}`}
                        onClick={() => setEditing(product)}
                      >
                        <Icon name="pencil-square" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState />
        )}
        <div className="table-footer">
          <span>
            Mostrando {filtered.length} de {products.length} productos
          </span>
          <span>
            <Icon name="database-check" /> Inventario guardado en Turso
          </span>
        </div>
      </section>
      {(editing || adding) && <ProductForm product={editing} onClose={close} />}
    </>
  );
}

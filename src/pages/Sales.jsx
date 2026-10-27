import { useCallback, useState } from "react";
import { Link } from "react-router-dom";
import { usePharmacy } from "../context/pharmacy";
import { categories, matchesProduct, money } from "../lib/format";
import {
  EmptyState,
  Icon,
  Modal,
  PageHeading,
  ProductAvatar,
  StockBadge,
} from "../components/UI";

export default function Sales() {
  const { products, cart, setQuantity, clearCart, registerSale } =
    usePharmacy();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [payment, setPayment] = useState("Efectivo");
  const [confirming, setConfirming] = useState(false);
  const close = useCallback(() => setConfirming(false), []);
  const filtered = products.filter(
    (product) =>
      matchesProduct(product, query) &&
      (!category || product.category === category),
  );
  const items = cart.map((item) => ({
    ...item,
    product: products.find((product) => product.id === item.productId),
  }));
  const total = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const invalid = items.some((item) => item.quantity > item.product.stock);
  return (
    <>
      <PageHeading
        eyebrow="PUNTO DE VENTA"
        title="Una atención más ágil"
        description="Selecciona los productos, revisa el detalle y registra tu venta."
      >
        <Link className="btn btn-outline-secondary" to="/historial">
          <Icon name="clock-history" /> Ver historial
        </Link>
      </PageHeading>
      <div className="sale-layout">
        <section className="card panel catalog-panel">
          <div className="panel-heading">
            <div>
              <h2>Catálogo de productos</h2>
              <p>El precio corresponde a la presentación indicada.</p>
            </div>
            <span className="count-chip">{filtered.length}</span>
          </div>
          <div className="filter-bar">
            <div className="search-field">
              <Icon name="search" />
              <input
                className="form-control"
                aria-label="Buscar medicamentos para la venta"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar nombre o código..."
              />
            </div>
            <select
              className="form-select"
              aria-label="Categoría de productos en venta"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">Todas las categorías</option>
              {categories.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </div>
          {filtered.length ? (
            <div className="catalog-grid">
              {filtered.map((product) => {
                const quantity =
                  cart.find((item) => item.productId === product.id)
                    ?.quantity ?? 0;
                return (
                  <article
                    className={`catalog-product ${!product.stock ? "unavailable" : ""}`}
                    key={product.id}
                  >
                    <div className="d-flex align-items-center justify-content-between mb-3">
                      <ProductAvatar product={product} />
                      <StockBadge product={product} />
                    </div>
                    <span className="product-code">{product.code}</span>
                    <h3>{product.name}</h3>
                    <p>{product.presentation}</p>
                    <div className="catalog-stock">
                      {product.stock} unidades disponibles
                      {quantity > 0 && <span> · {quantity} en la venta</span>}
                    </div>
                    <div className="catalog-bottom">
                      <strong>{money(product.price)}</strong>
                      <button
                        className="btn btn-outline-primary btn-sm"
                        disabled={quantity >= product.stock}
                        aria-label={`Agregar ${product.name}`}
                        onClick={() => setQuantity(product.id, quantity + 1)}
                      >
                        <Icon name="plus-lg" /> Agregar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <EmptyState />
          )}
        </section>
        <aside
          className="card panel cart-panel"
          aria-label="Detalle de la venta"
        >
          <div className="panel-heading">
            <div>
              <h2>
                <Icon name="bag" /> Detalle de venta
              </h2>
              <p>{cart.length} productos seleccionados</p>
            </div>
            {cart.length > 0 && (
              <button
                className="icon-button"
                title="Vaciar venta"
                aria-label="Vaciar venta"
                onClick={clearCart}
              >
                <Icon name="trash3" />
              </button>
            )}
          </div>
          {items.length ? (
            <div className="cart-items">
              {items.map(({ product, quantity }) => (
                <div className="cart-item" key={product.id}>
                  <div className="cart-item-top">
                    <div>
                      <strong>{product.name}</strong>
                      <small>{money(product.price)} por presentación</small>
                    </div>
                    <button
                      className="icon-button"
                      aria-label={`Quitar ${product.name}`}
                      onClick={() => setQuantity(product.id, 0)}
                    >
                      <Icon name="x-lg" />
                    </button>
                  </div>
                  <div className="cart-item-bottom">
                    <div className="quantity-control">
                      <button
                        aria-label={`Reducir cantidad de ${product.name}`}
                        onClick={() => setQuantity(product.id, quantity - 1)}
                      >
                        <Icon name="dash" />
                      </button>
                      <input
                        aria-label={`Cantidad de ${product.name}`}
                        type="number"
                        min="1"
                        max={product.stock}
                        step="1"
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(product.id, Number(event.target.value))
                        }
                      />
                      <button
                        aria-label={`Aumentar cantidad de ${product.name}`}
                        disabled={quantity >= product.stock}
                        onClick={() => setQuantity(product.id, quantity + 1)}
                      >
                        <Icon name="plus" />
                      </button>
                    </div>
                    <strong>{money(product.price * quantity)}</strong>
                  </div>
                  {quantity > product.stock && (
                    <small className="text-danger">
                      Stock insuficiente. Disponible: {product.stock}.
                    </small>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon="bag-plus"
              title="Tu venta comienza aquí"
              text="Agrega productos del catálogo para preparar la atención."
            />
          )}
          <div className="cart-summary">
            <label htmlFor="payment" className="form-label">
              Medio de pago
            </label>
            <select
              id="payment"
              className="form-select"
              value={payment}
              onChange={(event) => setPayment(event.target.value)}
            >
              <option>Efectivo</option>
              <option>Yape / Plin</option>
              <option>Tarjeta</option>
            </select>
            <div className="sale-total">
              <span>Total a cobrar</span>
              <strong>{money(total)}</strong>
            </div>
            <p className="price-note">
              Importe final. No se agregan cargos adicionales.
            </p>
            <button
              className="btn btn-primary w-100"
              disabled={!cart.length || invalid}
              onClick={() => setConfirming(true)}
            >
              <Icon name="check2-circle" /> Registrar venta
            </button>
            <p className="cart-demo-note">
              <Icon name="info-circle" /> Venta de demostración. No emite
              comprobante fiscal ni procesa pagos.
            </p>
          </div>
        </aside>
      </div>
      {confirming && (
        <Modal
          title="Confirmar venta de demostración"
          subtitle="Revisa el importe antes de continuar."
          onClose={close}
        >
          <div className="confirmation-total">
            <Icon name="bag-check" />
            <span>Total a registrar</span>
            <strong>{money(total)}</strong>
          </div>
          <p className="text-secondary">
            Se registrarán {items.length} productos y se descontarán sus
            cantidades del inventario de demostración. Medio de pago:{" "}
            <strong>{payment}</strong>.
          </p>
          <div className="alert alert-primary small">
            Los cambios se conservarán durante esta sesión y se reiniciarán al
            recargar.
          </div>
          <div className="modal-actions">
            <button className="btn btn-light" onClick={close}>
              Seguir editando
            </button>
            <button
              className="btn btn-primary"
              disabled={invalid || !cart.length}
              onClick={() => {
                registerSale(payment);
                close();
              }}
            >
              <Icon name="check2" /> Confirmar venta
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}

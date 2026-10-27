import { useState } from "react";
import { usePharmacy } from "../context/pharmacy";
import { categories } from "../lib/format";
import { Icon, Modal } from "./UI";

export default function ProductForm({ product, onClose }) {
  const { saveProduct, saving } = usePharmacy();
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    code: product?.code ?? "",
    name: product?.name ?? "",
    category: product?.category ?? categories[0],
    presentation: product?.presentation ?? "",
    price: product ? (product.price / 100).toFixed(2) : "",
    stock: product?.stock ?? 0,
    minStock: product?.minStock ?? 10,
  });
  const change = (event) =>
    setForm({ ...form, [event.target.name]: event.target.value });
  async function submit(event) {
    event.preventDefault();
    try {
      await saveProduct({
        ...form,
        id: product?.id,
        version: product?.version,
        price: Math.round(Number(form.price) * 100),
        stock: Number(form.stock),
        minStock: Number(form.minStock),
      });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  }
  return (
    <Modal
      title={product ? "Editar producto" : "Nuevo producto"}
      subtitle="Completa la información para mantener tu inventario al día."
      onClose={onClose}
      wide
    >
      <form onSubmit={submit}>
        {error && (
          <div role="alert" className="alert alert-danger">
            {error}
          </div>
        )}
        <div className="row g-3">
          <div className="col-md-4">
            <label className="form-label" htmlFor="product-code">
              Código <span>*</span>
            </label>
            <input
              id="product-code"
              name="code"
              className="form-control"
              value={form.code}
              onChange={change}
              required
              minLength={3}
              maxLength={24}
              pattern="[A-Za-z0-9\-]{3,24}"
              placeholder="MED-011"
            />
            <div className="form-text">Código único del producto.</div>
          </div>
          <div className="col-md-8">
            <label className="form-label" htmlFor="product-name">
              Nombre del producto <span>*</span>
            </label>
            <input
              id="product-name"
              name="name"
              className="form-control"
              value={form.name}
              onChange={change}
              required
              minLength={3}
              maxLength={100}
              placeholder="Ej. Paracetamol 500 mg"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="product-category">
              Categoría <span>*</span>
            </label>
            <select
              id="product-category"
              name="category"
              className="form-select"
              value={form.category}
              onChange={change}
            >
              {categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label" htmlFor="product-presentation">
              Presentación <span>*</span>
            </label>
            <input
              id="product-presentation"
              name="presentation"
              className="form-control"
              value={form.presentation}
              onChange={change}
              required
              maxLength={100}
              placeholder="Ej. Caja · 100 tabletas"
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="product-price">
              Precio (S/) <span>*</span>
            </label>
            <input
              id="product-price"
              name="price"
              type="number"
              className="form-control"
              min="0.01"
              max="1000000"
              step="0.01"
              value={form.price}
              onChange={change}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="product-stock">
              Stock actual <span>*</span>
            </label>
            <input
              id="product-stock"
              name="stock"
              type="number"
              className="form-control"
              min="0"
              max="1000000"
              step="1"
              value={form.stock}
              onChange={change}
              required
            />
          </div>
          <div className="col-md-4">
            <label className="form-label" htmlFor="product-minStock">
              Stock mínimo <span>*</span>
            </label>
            <input
              id="product-minStock"
              name="minStock"
              type="number"
              className="form-control"
              min="0"
              max="1000000"
              step="1"
              value={form.minStock}
              onChange={change}
              required
            />
          </div>
        </div>
        <div className="form-info">
          <Icon name="info-circle" /> El medicamento se guardará permanentemente
          en Turso.
        </div>
        <div className="modal-actions">
          <button type="button" className="btn btn-light" onClick={onClose}>
            Cancelar
          </button>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            <Icon name="check2" />{" "}
            {saving ? "Guardando..." : "Guardar producto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

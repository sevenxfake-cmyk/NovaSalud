import { useEffect } from "react";
import { dateLabel, money, timeLabel } from "../lib/format";
import { Icon } from "./UI";
import "./SaleReceipt.css";

export default function SaleReceipt({ sale, onClose }) {
  useEffect(() => {
    const finish = () => document.body.classList.remove("receipt-print");
    window.addEventListener("afterprint", finish);
    return () => {
      window.removeEventListener("afterprint", finish);
      finish();
    };
  }, []);

  function print() {
    document.body.classList.add("receipt-print");
    window.print();
  }

  return (
    <>
      <section
        className="sale-receipt"
        aria-label={
          sale.demo ? "Boleta de demostración" : "Comprobante interno"
        }
      >
        <div className="receipt-heading">
          <div className="d-flex align-items-center gap-2">
            <img src="/nova-salud.svg" alt="" width="38" height="38" />
            <div>
              <h3>NOVA SALUD</h3>
              <p>Botica · Sistema de gestión</p>
            </div>
          </div>
          <div className="text-end">
            <strong>
              {sale.demo ? "BOLETA DE DEMOSTRACIÓN" : "COMPROBANTE INTERNO"}
            </strong>
            <small>{sale.id}</small>
          </div>
        </div>
        <div
          className={`alert ${sale.demo ? "alert-warning" : "alert-light border"} py-2 small mb-3`}
        >
          {sale.demo
            ? "EJEMPLO ACADÉMICO · SIN VALIDEZ FISCAL. Productos, precios y operaciones de demostración."
            : "Registro interno de venta. No es un comprobante fiscal."}
        </div>
        <div className="receipt-meta">
          <span>
            Fecha: <strong>{dateLabel(sale.date)}</strong> ·{" "}
            {timeLabel(sale.date)}
          </span>
          <span>
            Pago: <strong>{sale.payment}</strong>
          </span>
        </div>
        <div className="table-responsive">
          <table className="table align-middle">
            <thead>
              <tr>
                <th>Producto / presentación</th>
                <th>Cant.</th>
                <th>Precio</th>
                <th className="text-end">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {sale.items.map((item) => (
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
          <strong>{money(sale.total)}</strong>
        </div>
        <p className="receipt-footer">
          Importes en soles peruanos (PEN). Cantidades expresadas en las
          presentaciones registradas.
          <br />
          Gracias por confiar en Nova Salud.
        </p>
      </section>
      <div className="modal-actions">
        <button className="btn btn-outline-primary" onClick={print}>
          <Icon name="printer" /> Imprimir boleta
        </button>
        <button className="btn btn-primary" onClick={onClose}>
          Cerrar detalle
        </button>
      </div>
    </>
  );
}

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
        <div className="receipt-security-block">
          <div className="receipt-thermal-divider" />
          <div className="receipt-qr-section">
            <svg
              className="receipt-qr-code"
              viewBox="0 0 80 80"
              width="68"
              height="68"
              aria-label="Código QR de verificación interna"
            >
              <rect width="80" height="80" fill="white" />
              <rect x="6" y="6" width="22" height="22" fill="#111" />
              <rect x="10" y="10" width="14" height="14" fill="white" />
              <rect x="13" y="13" width="8" height="8" fill="#111" />
              <rect x="52" y="6" width="22" height="22" fill="#111" />
              <rect x="56" y="10" width="14" height="14" fill="white" />
              <rect x="59" y="13" width="8" height="8" fill="#111" />
              <rect x="6" y="52" width="22" height="22" fill="#111" />
              <rect x="10" y="56" width="14" height="14" fill="white" />
              <rect x="13" y="59" width="8" height="8" fill="#111" />
              <rect x="34" y="8" width="4" height="8" fill="#111" />
              <rect x="42" y="14" width="6" height="4" fill="#111" />
              <rect x="32" y="24" width="16" height="4" fill="#111" />
              <rect x="10" y="34" width="6" height="6" fill="#111" />
              <rect x="22" y="36" width="4" height="8" fill="#111" />
              <rect x="34" y="34" width="12" height="12" fill="#111" />
              <rect x="54" y="34" width="8" height="4" fill="#111" />
              <rect x="66" y="36" width="6" height="8" fill="#111" />
              <rect x="38" y="52" width="6" height="8" fill="#111" />
              <rect x="50" y="50" width="8" height="6" fill="#111" />
              <rect x="64" y="54" width="8" height="8" fill="#111" />
              <rect x="34" y="66" width="8" height="6" fill="#111" />
              <rect x="48" y="64" width="10" height="4" fill="#111" />
              <rect x="62" y="68" width="10" height="4" fill="#111" />
            </svg>
            <div className="receipt-qr-meta">
              <span className="receipt-qr-title">COMPROBANTE ELECTRÓNICO / INTERNO</span>
              <span className="receipt-qr-hash">SERIE: B001-{sale.id.slice(-6).toUpperCase()}</span>
              <span className="receipt-qr-sub">Representación impresa autorizada para control de stock en botica.</span>
            </div>
          </div>
          <div className="receipt-barcode-wrap">
            <svg
              className="receipt-barcode"
              viewBox="0 0 240 28"
              width="100%"
              height="28"
              preserveAspectRatio="none"
              aria-label="Código de barras"
            >
              <rect x="0" y="0" width="240" height="28" fill="white" />
              {[0, 4, 10, 14, 18, 22, 28, 34, 38, 44, 48, 54, 58, 62, 68, 72, 78, 84, 88, 92, 98, 102, 108, 114, 120, 124, 130, 136, 140, 144, 150, 156, 160, 164, 170, 176, 182, 186, 192, 198, 202, 208, 214, 218, 224, 230, 236].map((x, i) => (
                <rect key={i} x={x} y="0" width={i % 3 === 0 ? "3" : i % 2 === 0 ? "2" : "1"} height="24" fill="#111" />
              ))}
            </svg>
            <span className="receipt-barcode-text">*{sale.id.slice(0, 18).toUpperCase()}*</span>
          </div>
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

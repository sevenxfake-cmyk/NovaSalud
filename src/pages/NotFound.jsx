import { Link } from "react-router-dom";
import { EmptyState } from "../components/UI";

export default function NotFound() {
  return (
    <section className="card panel">
      <EmptyState
        icon="signpost-split"
        title="Esta página no está en el inventario"
        text="La dirección que abriste no existe. Vuelve al resumen de tu botica."
      >
        <Link className="btn btn-primary mt-3" to="/">
          Volver al inicio
        </Link>
      </EmptyState>
    </section>
  );
}

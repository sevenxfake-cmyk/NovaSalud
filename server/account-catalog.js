import { randomUUID } from "node:crypto";
import { demoProducts } from "../src/data/demo.js";

export async function createAccountCatalog(tx, userId, now = new Date()) {
  await tx.batch(
    demoProducts.map((product) => ({
      sql: "INSERT INTO productos_cuenta(id,usuario_id,codigo,nombre,categoria,presentacion,precio_centimos,stock,stock_minimo,creado_en,actualizado_en,es_demo) VALUES (?,?,?,?,?,?,?,?,?,?,?,1)",
      args: [
        randomUUID(),
        userId,
        `DEMO-${product.code.slice(4)}`,
        product.name,
        product.category,
        product.presentation,
        product.price,
        product.stock,
        product.minStock,
        now.toISOString(),
        now.toISOString(),
      ],
    })),
  );
}

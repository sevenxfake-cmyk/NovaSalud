import { createHash, randomUUID } from "node:crypto";
import { demoProducts } from "../src/data/demo.js";
import { inTransaction } from "./db.js";
import { AppError } from "./errors.js";
import { registerSale } from "./store.js";

// Catálogo académico persistente. No incluye MED-001 para conservar el producto
// que el propietario ya registró. Los códigos DEMO-* reservan este conjunto.
export const presentationProducts = demoProducts
  .slice(1)
  .map((product) => ({ ...product, code: `DEMO-${product.code.slice(4)}` }));
export const presentationSales = [
  {
    number: 1,
    daysAgo: 0,
    payment: "Efectivo",
    items: [
      ["DEMO-003", 2],
      ["DEMO-006", 1],
    ],
  },
  {
    number: 2,
    daysAgo: 1,
    payment: "Yape / Plin",
    items: [
      ["DEMO-007", 3],
      ["DEMO-010", 2],
    ],
  },
  {
    number: 3,
    daysAgo: 2,
    payment: "Tarjeta",
    items: [
      ["DEMO-009", 1],
      ["DEMO-006", 2],
    ],
  },
  {
    number: 4,
    daysAgo: 3,
    payment: "Efectivo",
    items: [
      ["DEMO-003", 1],
      ["DEMO-010", 5],
    ],
  },
  {
    number: 5,
    daysAgo: 4,
    payment: "Yape / Plin",
    items: [
      ["DEMO-007", 2],
      ["DEMO-009", 1],
    ],
  },
  {
    number: 6,
    daysAgo: 5,
    payment: "Efectivo",
    items: [
      ["DEMO-006", 1],
      ["DEMO-010", 3],
    ],
  },
];

export function seedRequestId(number) {
  const hash = createHash("sha256")
    .update(`nova-salud-presentation-v1-${number}`)
    .digest("hex")
    .slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-${hash.slice(12, 16)}-${hash.slice(16, 20)}-${hash.slice(20)}`;
}

export async function seedPresentation(db, now = new Date()) {
  const admin = (
    await db.execute(
      "SELECT id FROM usuarios WHERE rol='admin' ORDER BY creado_en,id LIMIT 1",
    )
  ).rows[0];
  if (!admin)
    throw new AppError(
      409,
      "Crea tu administrador antes de cargar los ejemplos. No se crean cuentas ni contraseñas predeterminadas.",
    );
  const createdProducts = await inTransaction(db, async (tx) => {
    const commands = presentationProducts.map((product) => ({
      sql: "INSERT OR IGNORE INTO productos(id,codigo,nombre,categoria,presentacion,precio_centimos,stock,stock_minimo,creado_en,actualizado_en,es_demo) VALUES (?,?,?,?,?,?,?,?,?,?,1)",
      args: [
        randomUUID(),
        product.code,
        product.name,
        product.category,
        product.presentation,
        product.price,
        product.stock,
        product.minStock,
        now.toISOString(),
        now.toISOString(),
      ],
    }));
    const inserted = await tx.batch(commands);
    const found = await tx.execute({
      sql: `SELECT codigo,es_demo FROM productos WHERE codigo IN (${presentationProducts.map(() => "?").join(",")})`,
      args: presentationProducts.map((product) => product.code),
    });
    if (found.rows.some((row) => Number(row.es_demo) !== 1))
      throw new AppError(
        409,
        "Un código DEMO ya pertenece a un producto registrado manualmente. No se modificó ese producto.",
      );
    return inserted.reduce((sum, result) => sum + result.rowsAffected, 0);
  });

  let createdSales = 0;
  let skippedSales = 0;
  for (const plan of presentationSales) {
    const requestId = seedRequestId(plan.number);
    const existing = await db.execute({
      sql: "SELECT id FROM ventas WHERE clave_idempotencia=?",
      args: [requestId],
    });
    if (existing.rows.length) {
      skippedSales++;
      continue;
    }
    const records = await db.execute({
      sql: `SELECT id,codigo,precio_centimos FROM productos WHERE codigo IN (${plan.items.map(() => "?").join(",")}) AND es_demo=1`,
      args: plan.items.map(([code]) => code),
    });
    const items = plan.items.map(([code, quantity]) => {
      const product = records.rows.find((row) => row.codigo === code);
      if (!product)
        throw new AppError(409, "Falta un producto de demostración.");
      return {
        productId: product.id,
        quantity,
        price: Number(product.precio_centimos),
      };
    });
    const date = new Date(
      now.getTime() - plan.daysAgo * 86400000 - plan.number * 60000,
    ).toISOString();
    await registerSale(
      db,
      {
        items: items.map(({ productId, quantity }) => ({
          productId,
          quantity,
        })),
        expectedTotal: items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        ),
        payment: plan.payment,
        requestId,
      },
      admin.id,
      {
        id: `DEMO-B001-${String(plan.number).padStart(6, "0")}`,
        date,
        demo: true,
      },
    );
    createdSales++;
  }
  return { createdProducts, createdSales, skippedSales };
}

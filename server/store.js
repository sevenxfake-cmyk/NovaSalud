import { createHash, randomUUID } from "node:crypto";
import { validateProduct } from "../src/lib/operations.js";
import { inTransaction } from "./db.js";
import { AppError } from "./errors.js";

export const productFromRow = (row) => ({
  id: row.id,
  code: row.codigo,
  name: row.nombre,
  category: row.categoria,
  presentation: row.presentacion,
  price: Number(row.precio_centimos),
  stock: Number(row.stock),
  minStock: Number(row.stock_minimo),
  version: Number(row.version),
  demo: Number(row.es_demo ?? 0) === 1,
});
const saleFromRow = (row, details) => ({
  id: row.id,
  date: row.fecha,
  total: Number(row.total_centimos),
  payment: row.medio_pago,
  demo: Number(row.es_demo ?? 0) === 1,
  items: details.map((item) => ({
    productId: item.producto_id,
    code: item.codigo_historico,
    name: item.nombre_historico,
    quantity: Number(item.cantidad),
    price: Number(item.precio_unitario_centimos),
    subtotal: Number(item.subtotal_centimos),
  })),
});

function requireOwner(userId) {
  if (typeof userId !== "string" || !userId || userId.length > 64)
    throw new AppError(
      403,
      "No se pudo identificar el inventario de tu cuenta.",
    );
}

export async function getSnapshot(db, userId) {
  requireOwner(userId);
  return inTransaction(
    db,
    async (tx) => {
      const results = await tx.batch([
        {
          sql: "SELECT * FROM productos_cuenta WHERE usuario_id=? ORDER BY nombre COLLATE NOCASE",
          args: [userId],
        },
        {
          sql: "SELECT * FROM ventas_cuenta WHERE usuario_id=? ORDER BY fecha DESC,id DESC",
          args: [userId],
        },
        {
          sql: "SELECT * FROM detalle_cuenta WHERE usuario_id=?",
          args: [userId],
        },
      ]);
      return {
        products: results[0].rows.map(productFromRow),
        sales: results[1].rows.map((row) =>
          saleFromRow(
            row,
            results[2].rows.filter((detail) => detail.venta_id === row.id),
          ),
        ),
      };
    },
    "read",
  );
}

export async function saveProduct(db, input, id = null, userId) {
  requireOwner(userId);
  if (!input || typeof input !== "object" || Array.isArray(input))
    throw new AppError(400, "El producto no es válido.");
  let product;
  try {
    product = validateProduct(input, []);
  } catch (error) {
    throw new AppError(400, error.message);
  }
  const now = new Date().toISOString();
  return inTransaction(db, async (tx) => {
    const fields = [
      product.code,
      product.name,
      product.category,
      product.presentation,
      product.price,
      product.stock,
      product.minStock,
    ];
    if (id) {
      if (!Number.isSafeInteger(input.version) || input.version < 1)
        throw new AppError(
          400,
          "Falta la versión del producto. Actualiza los datos.",
        );
      const result = await tx.execute({
        sql: "UPDATE productos_cuenta SET codigo=?, nombre=?, categoria=?, presentacion=?, precio_centimos=?, stock=?, stock_minimo=?, actualizado_en=?, version=version+1 WHERE id=? AND version=? AND usuario_id=?",
        args: [...fields, now, id, input.version, userId],
      });
      if (result.rowsAffected !== 1)
        throw new AppError(
          409,
          "El producto cambió o ya no está disponible. Cierra y vuelve a abrir el formulario antes de editarlo.",
        );
    } else {
      id = randomUUID();
      await tx.execute({
        sql: "INSERT INTO productos_cuenta(codigo,nombre,categoria,presentacion,precio_centimos,stock,stock_minimo,id,creado_en,actualizado_en,usuario_id) VALUES (?,?,?,?,?,?,?,?,?,?,?)",
        args: [...fields, id, now, now, userId],
      });
    }
    return productFromRow(
      (
        await tx.execute({
          sql: "SELECT * FROM productos_cuenta WHERE id=? AND usuario_id=?",
          args: [id, userId],
        })
      ).rows[0],
    );
  });
}

export async function registerSale(db, input, userId, serverOptions = {}) {
  requireOwner(userId);
  if (
    !input ||
    !Array.isArray(input.items) ||
    !input.items.length ||
    input.items.length > 100
  )
    throw new AppError(400, "Selecciona de 1 a 100 productos.");
  if (!["Efectivo", "Yape / Plin", "Tarjeta"].includes(input.payment))
    throw new AppError(400, "Selecciona un medio de pago válido.");
  if (!Number.isSafeInteger(input.expectedTotal) || input.expectedTotal < 1)
    throw new AppError(400, "El total esperado no es válido.");
  if (
    typeof input.requestId !== "string" ||
    !/^[a-f0-9-]{36}$/i.test(input.requestId)
  )
    throw new AppError(400, "La clave de la operación no es válida.");
  const ids = new Set();
  const requested = input.items
    .map((item) => {
      if (
        !item ||
        typeof item.productId !== "string" ||
        item.productId.length > 64 ||
        ids.has(item.productId)
      )
        throw new AppError(400, "Hay productos inválidos o repetidos.");
      ids.add(item.productId);
      if (
        !Number.isSafeInteger(item.quantity) ||
        item.quantity < 1 ||
        item.quantity > 1000000
      )
        throw new AppError(400, "Las cantidades deben ser enteros positivos.");
      return { productId: item.productId, quantity: item.quantity };
    })
    .sort((a, b) => a.productId.localeCompare(b.productId));
  const requestHash = createHash("sha256")
    .update(
      JSON.stringify({
        userId,
        payment: input.payment,
        expectedTotal: input.expectedTotal,
        items: requested,
      }),
    )
    .digest("hex");
  return inTransaction(db, async (tx) => {
    const previous = await tx.execute({
      sql: "SELECT * FROM ventas_cuenta WHERE clave_idempotencia=? AND usuario_id=?",
      args: [input.requestId, userId],
    });
    if (previous.rows.length) {
      if (previous.rows[0].solicitud_hash !== requestHash)
        throw new AppError(409, "Esta clave ya se utilizó en otra venta.");
      return saleFromRow(
        previous.rows[0],
        (
          await tx.execute({
            sql: "SELECT * FROM detalle_cuenta WHERE venta_id=? AND usuario_id=?",
            args: [previous.rows[0].id, userId],
          })
        ).rows,
      );
    }
    const rows = await tx.execute({
      sql: `SELECT * FROM productos_cuenta WHERE usuario_id=? AND id IN (${requested.map(() => "?").join(",")})`,
      args: [userId, ...requested.map((item) => item.productId)],
    });
    const items = requested.map((item) => {
      const row = rows.rows.find((product) => product.id === item.productId);
      if (!row)
        throw new AppError(
          409,
          "Uno de los productos ya no está disponible. Actualiza el inventario.",
        );
      if (Number(row.stock) < item.quantity)
        throw new AppError(
          409,
          `Stock insuficiente para ${row.nombre}. Disponible: ${row.stock}.`,
        );
      return {
        ...item,
        price: Number(row.precio_centimos),
        code: row.codigo,
        name: row.nombre,
        subtotal: Number(row.precio_centimos) * item.quantity,
        demo: Number(row.es_demo ?? 0) === 1,
      };
    });
    const total = items.reduce((sum, item) => sum + item.subtotal, 0);
    if (!Number.isSafeInteger(total))
      throw new AppError(
        400,
        "El total de la venta supera el límite permitido.",
      );
    if (total !== input.expectedTotal)
      throw new AppError(
        409,
        "Los precios cambiaron. Revisa el total actualizado antes de confirmar la venta.",
      );
    const updated = await tx.batch(
      items.map((item) => ({
        sql: "UPDATE productos_cuenta SET stock=stock-?, version=version+1, actualizado_en=? WHERE id=? AND stock>=? AND usuario_id=?",
        args: [
          item.quantity,
          new Date().toISOString(),
          item.productId,
          item.quantity,
          userId,
        ],
      })),
    );
    if (updated.some((result) => result.rowsAffected !== 1))
      throw new AppError(
        409,
        "Las existencias cambiaron. Actualiza el inventario.",
      );
    const sale = {
      id: serverOptions.id ?? `V-${randomUUID()}`,
      date: serverOptions.date ?? new Date().toISOString(),
      total,
      payment: input.payment,
      items,
      demo: serverOptions.demo === true || items.some((item) => item.demo),
    };
    await tx.execute({
      sql: "INSERT INTO ventas_cuenta(id,usuario_id,fecha,total_centimos,medio_pago,clave_idempotencia,solicitud_hash,es_demo) VALUES (?,?,?,?,?,?,?,?)",
      args: [
        sale.id,
        userId,
        sale.date,
        total,
        input.payment,
        input.requestId,
        requestHash,
        sale.demo ? 1 : 0,
      ],
    });
    await tx.batch(
      items.map((item) => ({
        sql: "INSERT INTO detalle_cuenta(id,venta_id,producto_id,codigo_historico,nombre_historico,cantidad,precio_unitario_centimos,subtotal_centimos,usuario_id) VALUES (?,?,?,?,?,?,?,?,?)",
        args: [
          randomUUID(),
          sale.id,
          item.productId,
          item.code,
          item.name,
          item.quantity,
          item.price,
          item.subtotal,
          userId,
        ],
      })),
    );
    return sale;
  });
}

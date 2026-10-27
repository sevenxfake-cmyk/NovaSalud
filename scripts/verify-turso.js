import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import {
  loadServerEnv,
  newDatabaseClient,
  inTransaction,
} from "../server/db.js";
import { health } from "../server/schema.js";
import { saveProduct, registerSale } from "../server/store.js";
import { passwordHash } from "../server/auth.js";
import { AppError, publicError } from "../server/errors.js";

// Prueba explícita sobre Turso. Nunca se ejecuta con npm test.
// Solo crea y retira registros propios, identificados por UUID y código único.
const tag = randomUUID();
const userId = randomUUID();
const code = `TEST-${tag.replaceAll("-", "").slice(0, 16)}`.toUpperCase();
const name = `PRUEBA AUTOMATIZADA ${tag}`;
let db;
let product;
let step = "conexión";
const clients = [];

try {
  loadServerEnv();
  db = newDatabaseClient();
  assert.equal((await health(db)).schemaReady, true);
  console.log("Conexión y esquema de Turso verificados.");
  step = "registros de prueba";
  await db.execute({
    sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
    args: [
      userId,
      `test-${tag.slice(0, 16)}`,
      await passwordHash(randomBytes(32).toString("hex")),
      "vendedor",
      new Date().toISOString(),
    ],
  });
  product = await saveProduct(db, {
    code,
    name,
    category: "Analgésicos",
    presentation: "Registro temporal de verificación",
    price: 150,
    stock: 2,
    minStock: 1,
  });

  step = "rollback completo";
  await assert.rejects(
    registerSale(
      db,
      {
        items: [{ productId: product.id, quantity: 1 }],
        payment: "Efectivo",
        expectedTotal: 150,
        requestId: randomUUID(),
      },
      `inexistente-${userId}`,
    ),
  );
  assert.equal(
    Number(
      (
        await db.execute({
          sql: "SELECT stock FROM productos WHERE id=?",
          args: [product.id],
        })
      ).rows[0].stock,
    ),
    2,
  );
  console.log(
    "Rollback verificado: un fallo posterior al descuento no altera el stock.",
  );

  step = "edición del medicamento";
  product = await saveProduct(db, { ...product, stock: 1 }, product.id);
  step = "lectura desde otro cliente";
  const independent = newDatabaseClient();
  clients.push(independent);
  const persisted = (
    await independent.execute({
      sql: "SELECT codigo,stock,version FROM productos WHERE id=?",
      args: [product.id],
    })
  ).rows[0];
  step = "persistencia del código";
  assert.equal(persisted.codigo, code);
  step = "persistencia del stock";
  assert.equal(Number(persisted.stock), 1);
  step = "persistencia de la versión";
  assert.equal(Number(persisted.version), 2);
  console.log(
    "Alta y edición persistentes, leídas desde un cliente independiente.",
  );

  step = "stock insuficiente";
  await assert.rejects(
    registerSale(
      db,
      {
        items: [{ productId: product.id, quantity: 2 }],
        payment: "Efectivo",
        expectedTotal: 300,
        requestId: randomUUID(),
      },
      userId,
    ),
    (error) => {
      if (!(error instanceof AppError && error.status === 409)) {
        const diagnostic = /^[A-Z0-9_]+$/.test(String(error.code ?? ""))
          ? error.code
          : "SIN_CODIGO";
        console.error(
          `Rechazo inesperado: estado ${publicError(error).status}, código ${diagnostic}.`,
        );
      }
      return error instanceof AppError && error.status === 409;
    },
  );
  console.log("Venta con stock insuficiente rechazada.");

  step = "concurrencia de ventas";
  const other = newDatabaseClient();
  clients.push(other);
  const requests = [0, 1].map(() => ({
    items: [{ productId: product.id, quantity: 1 }],
    payment: "Efectivo",
    expectedTotal: 150,
    requestId: randomUUID(),
  }));
  const results = await Promise.allSettled([
    registerSale(independent, requests[0], userId),
    registerSale(other, requests[1], userId),
  ]);
  const winningIndex = results.findIndex(
    (result) => result.status === "fulfilled",
  );
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  assert.equal(
    Number(
      (
        await db.execute({
          sql: "SELECT stock FROM productos WHERE id=?",
          args: [product.id],
        })
      ).rows[0].stock,
    ),
    0,
  );
  assert.equal(
    Number(
      (
        await db.execute({
          sql: "SELECT COUNT(*) AS total FROM ventas WHERE usuario_id=?",
          args: [userId],
        })
      ).rows[0].total,
    ),
    1,
  );
  const replay = await registerSale(db, requests[winningIndex], userId);
  assert.equal(replay.id, results[winningIndex].value.id);
  console.log(
    "Concurrencia verificada: una sola venta sobre la última unidad.",
  );
  console.log(
    "Reintento idempotente verificado: no duplica la venta ni el descuento.",
  );
} catch (error) {
  console.error(
    `La verificación falló en la etapa: ${step}. ${publicError(error).message}`,
  );
  if (/^[A-Z0-9_]+$/.test(String(error.code ?? "")))
    console.error(`Código de diagnóstico: ${error.code}`);
  process.exitCode = 1;
} finally {
  if (db) {
    try {
      await inTransaction(db, async (tx) => {
        await tx.execute({
          sql: "DELETE FROM detalle_ventas WHERE venta_id IN (SELECT id FROM ventas WHERE usuario_id=?)",
          args: [userId],
        });
        await tx.execute({
          sql: "DELETE FROM ventas WHERE usuario_id=?",
          args: [userId],
        });
        await tx.execute({
          sql: "DELETE FROM productos WHERE codigo=? AND nombre=?",
          args: [code, name],
        });
        await tx.execute({
          sql: "DELETE FROM usuarios WHERE id=? AND rol=?",
          args: [userId, "vendedor"],
        });
      });
      console.log("Registros temporales de esta verificación retirados.");
    } catch {
      console.error(
        "No se pudo retirar algún registro temporal. Revisa los registros PRUEBA AUTOMATIZADA antes de repetir la verificación.",
      );
      process.exitCode = 1;
    }
  }
  for (const client of clients) client.close();
  db?.close();
}

import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import {
  loadServerEnv,
  newDatabaseClient,
  inTransaction,
} from "../server/db.js";
import { passwordHash } from "../server/auth.js";

// Prueba explícita del despliegue: cuenta y medicamento técnicos temporales.
// Sus credenciales y la cookie nunca se imprimen. La limpieza usa claves exactas.
const tag = randomUUID();
const userId = randomUUID();
const username = `test-public-${tag.slice(0, 12)}`;
const password = randomBytes(32).toString("hex");
const code = `PUBLIC-${tag.replaceAll("-", "").slice(0, 15)}`.toUpperCase();
const name = `PRUEBA PUBLICA ${tag}`;
let db;
let cookie;
let base;
let stage = "preparación";

async function request(
  path,
  { method = "GET", body, authenticated = true } = {},
) {
  const response = await fetch(`${base}${path}`, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      "content-type": "application/json",
      origin: base,
      ...(authenticated && cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => null);
  return { response, data };
}

try {
  const url = new URL(process.argv[2]);
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error();
  base = url.origin;
  loadServerEnv();
  db = newDatabaseClient();
  stage = "conexión pública";
  const health = await request("/api/health", { authenticated: false });
  assert.equal(health.response.status, 200);
  assert.equal(health.data?.connected, true);
  assert.equal(health.data?.schemaReady, true);
  console.log("API pública conectada a Turso y esquema verificado.");
  assert.equal(
    (await request("/api/products", { authenticated: false })).response.status,
    401,
  );

  stage = "sesión de prueba";
  await db.execute({
    sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
    args: [
      userId,
      username,
      await passwordHash(password),
      "admin",
      new Date().toISOString(),
    ],
  });
  const login = await request("/api/auth", {
    method: "POST",
    body: { action: "login", username, password },
    authenticated: false,
  });
  assert.equal(login.response.status, 200);
  const header = login.response.headers.get("set-cookie");
  assert.match(header, /HttpOnly/i);
  assert.match(header, /; Secure/i);
  cookie = header.split(";")[0];
  console.log("Acceso protegido y cookie segura verificados.");

  stage = "alta y edición del medicamento";
  const created = await request("/api/products", {
    method: "POST",
    body: {
      code,
      name,
      category: "Analgésicos",
      presentation: "Registro temporal de prueba pública",
      price: 1500,
      stock: 3,
      minStock: 1,
    },
  });
  assert.equal(created.response.status, 201);
  const product = created.data.product;
  const updated = await request(
    `/api/products?id=${encodeURIComponent(product.id)}`,
    { method: "PATCH", body: { ...product, price: 1900, stock: 2 } },
  );
  assert.equal(updated.response.status, 200);
  const read = (await request("/api/products")).data.products.find(
    (item) => item.id === product.id,
  );
  assert.equal(read.stock, 2);
  assert.equal(read.price, 1900);
  console.log(
    "Registro y edición persistentes, recuperados con una nueva petición pública.",
  );

  stage = "venta e historial";
  const saleInput = {
    items: [{ productId: product.id, quantity: 1 }],
    payment: "Efectivo",
    expectedTotal: 1900,
    requestId: randomUUID(),
  };
  const sold = await request("/api/sales", { method: "POST", body: saleInput });
  assert.equal(sold.response.status, 201);
  const history = (await request("/api/sales")).data.sales;
  const saved = history.find((sale) => sale.id === sold.data.sale.id);
  assert.equal(saved.total, 1900);
  assert.equal(saved.items[0].quantity, 1);
  assert.equal(
    (await request("/api/products")).data.products.find(
      (item) => item.id === product.id,
    ).stock,
    1,
  );
  const replay = await request("/api/sales", {
    method: "POST",
    body: saleInput,
  });
  assert.equal(replay.data.sale.id, sold.data.sale.id);
  console.log(
    "Venta, historial, descuento e idempotencia verificados en Vercel.",
  );

  stage = "concurrencia pública";
  const concurrent = await Promise.all(
    [0, 1].map(() =>
      request("/api/sales", {
        method: "POST",
        body: { ...saleInput, requestId: randomUUID() },
      }),
    ),
  );
  assert.equal(
    concurrent.filter((result) => result.response.status === 201).length,
    1,
  );
  const finalStock = (await request("/api/products")).data.products.find(
    (item) => item.id === product.id,
  ).stock;
  assert.equal(finalStock, 0);
  assert.equal(
    Number(
      (
        await db.execute({
          sql: "SELECT COUNT(*) AS total FROM ventas WHERE usuario_id=?",
          args: [userId],
        })
      ).rows[0].total,
    ),
    2,
  );
  console.log(
    "Dos solicitudes simultáneas: una sola venta de la última unidad.",
  );

  stage = "recarga de rutas";
  for (const path of [
    "/",
    "/inventario",
    "/alertas",
    "/ventas",
    "/historial",
  ]) {
    const response = await fetch(`${base}${path}`, {
      signal: AbortSignal.timeout(30000),
    });
    assert.equal(response.status, 200);
    assert.match(await response.text(), /<div id="root"><\/div>/);
  }
  assert.equal(
    (await request("/api/auth", { method: "DELETE" })).response.status,
    200,
  );
  assert.equal((await request("/api/state")).response.status, 401);
  console.log(
    "Rutas directas, recarga de datos y cierre de sesión verificados.",
  );
} catch {
  // No se imprime el error original: puede contener cabeceras o información privada.
  console.error(`No se completó la prueba pública en la etapa: ${stage}.`);
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
          sql: "DELETE FROM sesiones WHERE usuario_id=?",
          args: [userId],
        });
        await tx.execute({
          sql: "DELETE FROM usuarios WHERE id=? AND usuario=?",
          args: [userId, username],
        });
      });
      console.log("Cuenta y registros temporales de esta prueba retirados.");
    } catch {
      console.error(
        "No se pudo completar la limpieza de los registros técnicos de esta ejecución.",
      );
      process.exitCode = 1;
    }
    db.close();
  }
}

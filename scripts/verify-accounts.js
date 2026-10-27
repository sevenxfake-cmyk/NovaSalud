import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import {
  loadServerEnv,
  newDatabaseClient,
  inTransaction,
} from "../server/db.js";
import { hashToken } from "../server/auth.js";

const tag = randomUUID().slice(0, 12);
const names = [`test-private-${tag}-a`, `test-private-${tag}-b`];
const password = randomBytes(32).toString("hex");
let db,
  base,
  stage = "conexión";
let cleanupAllowed = false;
async function request(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(base + "/api/" + path, {
    method,
    signal: AbortSignal.timeout(30000),
    headers: {
      origin: base,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    data: await response.json().catch(() => null),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
try {
  const url = new URL(process.argv[2]);
  if (url.protocol !== "https:" || url.username || url.password || url.search)
    throw new Error();
  base = url.origin;
  loadServerEnv();
  db = newDatabaseClient();
  assert.equal((await request("health")).data.schemaReady, true);
  assert.equal(
    Number(
      (
        await db.execute({
          sql: "SELECT COUNT(*) AS n FROM usuarios WHERE usuario IN (?,?)",
          args: names,
        })
      ).rows[0].n,
    ),
    0,
  );
  cleanupAllowed = true;
  stage = "registro de dos cuentas";
  const users = [];
  for (const username of names) {
    const account = await request("auth", {
      method: "POST",
      body: {
        action: "register",
        username,
        password,
        passwordConfirmation: password,
      },
    });
    assert.equal(account.status, 200);
    users.push(account);
  }
  const [a, b] = users;
  const sa = await request("state", { cookie: a.cookie }),
    sb = await request("state", { cookie: b.cookie });
  assert.equal(sa.data.products.length, 10);
  assert.equal(sb.data.products.length, 10);
  assert.equal(sa.data.sales.length, 0);
  assert.equal(sb.data.sales.length, 0);
  assert.ok(
    sa.data.products.every((p) => !sb.data.products.some((q) => q.id === p.id)),
  );
  console.log(
    "Dos registros públicos correctos: diez productos propios y ninguna venta ajena.",
  );
  stage = "aislamiento de edición y venta";
  const pa = sa.data.products.find((p) => p.code === "DEMO-001"),
    pb = sb.data.products.find((p) => p.code === pa.code);
  assert.equal(
    (
      await request(`products?id=${pb.id}`, {
        method: "PATCH",
        cookie: a.cookie,
        body: { ...pb, stock: 0 },
      })
    ).status,
    409,
  );
  assert.equal(
    (
      await request("sales", {
        method: "POST",
        cookie: a.cookie,
        body: {
          items: [{ productId: pb.id, quantity: 1 }],
          payment: "Efectivo",
          expectedTotal: pb.price,
          requestId: randomUUID(),
        },
      })
    ).status,
    409,
  );
  const sale = await request("sales", {
    method: "POST",
    cookie: a.cookie,
    body: {
      items: [{ productId: pa.id, quantity: 1 }],
      payment: "Efectivo",
      expectedTotal: pa.price,
      requestId: randomUUID(),
    },
  });
  assert.equal(sale.status, 201);
  const afterA = await request("state", { cookie: a.cookie }),
    afterB = await request("state", { cookie: b.cookie });
  assert.equal(
    afterA.data.products.find((p) => p.id === pa.id).stock,
    pa.stock - 1,
  );
  assert.equal(afterA.data.sales.length, 1);
  assert.equal(
    afterB.data.products.find((p) => p.id === pb.id).stock,
    pb.stock,
  );
  assert.equal(afterB.data.sales.length, 0);
  console.log(
    "Edición/venta de ID ajeno rechazadas. La venta propia solo modifica su inventario e historial.",
  );
  stage = "nuevo inicio de sesión";
  assert.equal(
    (await request("auth", { method: "DELETE", cookie: a.cookie })).status,
    200,
  );
  const login = await request("auth", {
    method: "POST",
    body: { action: "login", username: names[0], password },
  });
  assert.equal(login.status, 200);
  const reloaded = await request("state", { cookie: login.cookie });
  assert.equal(
    reloaded.data.products.find((p) => p.id === pa.id).stock,
    pa.stock - 1,
  );
  assert.equal(reloaded.data.sales[0].id, sale.data.sale.id);
  console.log(
    "Nuevo acceso con la misma cuenta recupera su stock y su venta persistentes.",
  );
} catch {
  console.error(
    `Falló la prueba de cuentas en: ${stage}. No se imprimieron credenciales.`,
  );
  process.exitCode = 1;
} finally {
  if (db) {
    try {
      const temporary = await db.execute({
        sql: "SELECT id,usuario FROM usuarios WHERE ?=1 AND usuario IN (?,?)",
        args: [cleanupAllowed ? 1 : 0, ...names],
      });
      await inTransaction(db, async (tx) => {
        for (const user of temporary.rows) {
          await tx.execute({
            sql: "DELETE FROM detalle_cuenta WHERE usuario_id=?",
            args: [user.id],
          });
          await tx.execute({
            sql: "DELETE FROM ventas_cuenta WHERE usuario_id=?",
            args: [user.id],
          });
          await tx.execute({
            sql: "DELETE FROM productos_cuenta WHERE usuario_id=?",
            args: [user.id],
          });
          await tx.execute({
            sql: "DELETE FROM sesiones WHERE usuario_id=?",
            args: [user.id],
          });
          await tx.execute({
            sql: "DELETE FROM intentos_login WHERE identificador=?",
            args: [hashToken(user.usuario)],
          });
          await tx.execute({
            sql: "DELETE FROM usuarios WHERE id=? AND usuario=?",
            args: [user.id, user.usuario],
          });
        }
      });
      console.log(
        "Solo las dos cuentas temporales y sus registros fueron retirados.",
      );
    } catch {
      console.error(
        "Revisa la limpieza de las cuentas técnicas de esta prueba.",
      );
      process.exitCode = 1;
    }
    db.close();
  }
}

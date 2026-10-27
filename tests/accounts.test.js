import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { migrate } from "../server/schema.js";
import { createApplication } from "../server/application.js";
import { getSnapshot, saveProduct } from "../server/store.js";

let db, server, base, a, b;
const password = "clave-solo-para-pruebas-2026";

async function request(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(base + "/api/" + path, {
    method,
    headers: {
      origin: base,
      "content-type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return {
    status: response.status,
    data: await response.json(),
    cookie: response.headers.get("set-cookie")?.split(";")[0],
  };
}
const signup = (username) =>
  request("auth", {
    method: "POST",
    body: {
      action: "register",
      username,
      password,
      passwordConfirmation: password,
    },
  });
const productBody = {
  code: "MISMO-001",
  name: "Producto privado",
  category: "Analgésicos",
  presentation: "Caja",
  price: 1000,
  stock: 5,
  minStock: 1,
};

beforeEach(async () => {
  db = createClient({ url: "file::memory:" });
  await migrate(db);
  const app = createApplication({ database: () => db });
  server = createServer((req, res) =>
    app[new URL(req.url, "http://localhost").pathname.slice(5)](req, res),
  );
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
  a = await signup("cuenta-a");
  b = await signup("cuenta-b");
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
});
afterEach(async () => {
  await new Promise((resolve) => {
    server.close(resolve);
    server.closeAllConnections();
  });
  db.close();
});

test("cuentas: registro con catálogo propio, códigos repetibles entre usuarios e identificadores distintos", async () => {
  const first = await request("state", { cookie: a.cookie });
  const second = await request("state", { cookie: b.cookie });
  assert.equal(first.data.products.length, 10);
  assert.equal(second.data.products.length, 10);
  assert.equal(first.data.sales.length, 0);
  assert.equal(second.data.sales.length, 0);
  assert.ok(first.data.products.every((p) => p.demo));
  assert.equal(
    first.data.products.filter((p) =>
      second.data.products.some((other) => other.id === p.id),
    ).length,
    0,
  );
  assert.deepEqual(
    first.data.products.map((p) => p.code).sort(),
    second.data.products.map((p) => p.code).sort(),
  );
  assert.equal(
    (
      await request("products", {
        method: "POST",
        cookie: a.cookie,
        body: productBody,
      })
    ).status,
    201,
  );
  assert.equal(
    (
      await request("products", {
        method: "POST",
        cookie: b.cookie,
        body: productBody,
      })
    ).status,
    201,
  );
});

test("cuentas: no permite editar ni vender un ID ajeno y rechaza inventarios sin propietario", async () => {
  const pa = (await getSnapshot(db, a.data.user.id)).products.find(
    (p) => p.code === "DEMO-001",
  );
  const pb = (await getSnapshot(db, b.data.user.id)).products.find(
    (p) => p.code === "DEMO-001",
  );
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
  await assert.rejects(getSnapshot(db), (e) => e.status === 403);
  await assert.rejects(saveProduct(db, productBody), (e) => e.status === 403);
  assert.equal(
    (await getSnapshot(db, a.data.user.id)).products.find((p) => p.id === pa.id)
      .stock,
    pa.stock,
  );
  assert.equal(
    (await getSnapshot(db, b.data.user.id)).products.find((p) => p.id === pb.id)
      .stock,
    pb.stock,
  );
});

test("cuentas: una venta afecta únicamente al stock e historial del usuario autenticado", async () => {
  const pa = (await getSnapshot(db, a.data.user.id)).products.find(
    (p) => p.code === "DEMO-001",
  );
  const pb = (await getSnapshot(db, b.data.user.id)).products.find(
    (p) => p.code === "DEMO-001",
  );
  const sale = await request("sales", {
    method: "POST",
    cookie: a.cookie,
    body: {
      items: [{ productId: pa.id, quantity: 2 }],
      payment: "Efectivo",
      expectedTotal: pa.price * 2,
      requestId: randomUUID(),
      usuario_id: b.data.user.id,
    },
  });
  assert.equal(sale.status, 201);
  const sa = await request("state", { cookie: a.cookie });
  const sb = await request("state", { cookie: b.cookie });
  assert.equal(
    sa.data.products.find((p) => p.id === pa.id).stock,
    pa.stock - 2,
  );
  assert.equal(sb.data.products.find((p) => p.id === pb.id).stock, pb.stock);
  assert.equal(sa.data.sales.length, 1);
  assert.equal(sb.data.sales.length, 0);
  const injected = await request("products", {
    method: "POST",
    cookie: a.cookie,
    body: { ...productBody, usuario_id: b.data.user.id },
  });
  assert.equal(injected.status, 201);
  assert.equal(
    (await request("products", { cookie: b.cookie })).data.products.some(
      (p) => p.id === injected.data.product.id,
    ),
    false,
  );
});

test("cuentas: SQL impide mezclar detalles y la idempotencia se limita a cada propietario", async () => {
  const pa = (await getSnapshot(db, a.data.user.id)).products.find(
    (p) => p.stock > 0,
  );
  const pb = (await getSnapshot(db, b.data.user.id)).products.find(
    (p) => p.code === pa.code,
  );
  const key = randomUUID();
  const body = (p) => ({
    items: [{ productId: p.id, quantity: 1 }],
    payment: "Efectivo",
    expectedTotal: p.price,
    requestId: key,
  });
  const sa = await request("sales", {
    method: "POST",
    cookie: a.cookie,
    body: body(pa),
  });
  const sb = await request("sales", {
    method: "POST",
    cookie: b.cookie,
    body: body(pb),
  });
  assert.equal(sa.status, 201);
  assert.equal(sb.status, 201);
  assert.notEqual(sa.data.sale.id, sb.data.sale.id);
  await assert.rejects(
    db.execute({
      sql: "INSERT INTO detalle_cuenta(id,usuario_id,venta_id,producto_id,codigo_historico,nombre_historico,cantidad,precio_unitario_centimos,subtotal_centimos) VALUES (?,?,?,?,?,?,?,?,?)",
      args: [
        randomUUID(),
        a.data.user.id,
        sa.data.sale.id,
        pb.id,
        pb.code,
        pb.name,
        1,
        pb.price,
        pb.price,
      ],
    }),
  );
  assert.equal((await db.execute("PRAGMA foreign_key_check")).rows.length, 0);
});

test("cuentas: valida confirmación, rechaza usuarios duplicados y recupera su inventario al volver a entrar", async () => {
  assert.equal((await signup("CUENTA-A")).status, 409);
  assert.equal(
    (
      await request("auth", {
        method: "POST",
        body: {
          action: "register",
          username: "otra-cuenta",
          password,
          passwordConfirmation: "distinta",
        },
      })
    ).status,
    400,
  );
  const ids = (
    await request("products", { cookie: a.cookie })
  ).data.products.map((p) => p.id);
  assert.equal(
    (await request("auth", { method: "DELETE", cookie: a.cookie })).status,
    200,
  );
  assert.equal((await request("state", { cookie: a.cookie })).status, 401);
  const login = await request("auth", {
    method: "POST",
    body: { action: "login", username: "cuenta-a", password },
  });
  assert.equal(login.status, 200);
  assert.deepEqual(
    (await request("products", { cookie: login.cookie })).data.products.map(
      (p) => p.id,
    ),
    ids,
  );
});

test("cuentas: un fallo en el catálogo inicial revierte usuario, productos y sesión", async () => {
  await db.execute(
    "CREATE TRIGGER fail_new_catalog BEFORE INSERT ON productos_cuenta BEGIN SELECT RAISE(ABORT,'fallo simulado'); END",
  );
  const result = await signup("registro-fallido");
  assert.ok(result.status >= 400);
  assert.equal(
    (
      await db.execute({
        sql: "SELECT id FROM usuarios WHERE usuario=?",
        args: ["registro-fallido"],
      })
    ).rows.length,
    0,
  );
  assert.equal(
    Number(
      (await db.execute("SELECT COUNT(*) AS n FROM productos_cuenta")).rows[0]
        .n,
    ),
    20,
  );
  assert.equal(
    Number((await db.execute("SELECT COUNT(*) AS n FROM sesiones")).rows[0].n),
    2,
  );
});

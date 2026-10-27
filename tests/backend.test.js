import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import { migrate, health } from "../server/schema.js";
import { getSnapshot, registerSale, saveProduct } from "../server/store.js";
import { createApplication } from "../server/application.js";
import { publicError } from "../server/errors.js";
import { passwordHash, sessionCookie } from "../server/auth.js";

let db;
let http;
let base;
const userId = "user-test";
const sample = {
  code: "TEST-001",
  name: "Medicamento de prueba",
  category: "Analgésicos",
  presentation: "Caja de prueba",
  price: 1500,
  stock: 3,
  minStock: 1,
};

beforeEach(async () => {
  db = createClient({ url: "file::memory:" });
  await migrate(db);
  await db.execute({
    sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
    args: [
      userId,
      "admin-test",
      await passwordHash("solo-para-pruebas-2026"),
      "admin",
      new Date().toISOString(),
    ],
  });
});

afterEach(async () => {
  if (http)
    await new Promise((resolve) => {
      http.close(resolve);
      http.closeAllConnections();
    });
  http = null;
  db?.close();
});

const sell = (product, quantity, requestId = randomUUID()) =>
  registerSale(
    db,
    {
      items: [{ productId: product.id, quantity }],
      payment: "Efectivo",
      expectedTotal: product.price * quantity,
      requestId,
    },
    userId,
  );

test("SQL: migración repetible, conexión real y persistencia de altas/ediciones", async () => {
  await migrate(db);
  assert.deepEqual(await health(db), { connected: true, schemaReady: true });
  const product = await saveProduct(db, sample);
  assert.equal((await getSnapshot(db)).products[0].code, sample.code);
  const updated = await saveProduct(db, { ...product, stock: 7 }, product.id);
  assert.equal(updated.stock, 7);
  assert.equal(updated.version, 2);
  await assert.rejects(
    saveProduct(db, { ...product, stock: 20 }, product.id),
    (error) => error.status === 409,
  );
  assert.equal((await getSnapshot(db)).products[0].stock, 7);
});

test("SQL: restricciones de código, stock y claves foráneas", async () => {
  await saveProduct(db, sample);
  await assert.rejects(saveProduct(db, sample));
  await assert.rejects(
    db.execute({ sql: "UPDATE productos SET stock=?", args: [-1] }),
  );
  await assert.rejects(
    db.execute({
      sql: "INSERT INTO ventas(id,usuario_id,fecha,total_centimos,medio_pago,clave_idempotencia,solicitud_hash) VALUES (?,?,?,?,?,?,?)",
      args: [
        "invalid",
        "missing",
        new Date().toISOString(),
        100,
        "Efectivo",
        randomUUID(),
        "hash",
      ],
    }),
  );
});

test("SQL: transacción de venta, historial e idempotencia sin doble descuento", async () => {
  const product = await saveProduct(db, sample);
  const requestId = randomUUID();
  const first = await sell(product, 2, requestId);
  const replay = await sell(product, 2, requestId);
  assert.equal(first.id, replay.id);
  const snapshot = await getSnapshot(db);
  assert.equal(snapshot.products[0].stock, 1);
  assert.equal(snapshot.sales.length, 1);
  assert.equal(snapshot.sales[0].total, 3000);
  assert.equal(snapshot.sales[0].items[0].price, 1500);
  await assert.rejects(
    sell(product, 1, requestId),
    (error) => error.status === 409,
  );
  await assert.rejects(
    saveProduct(db, { ...product, stock: 99 }, product.id),
    (error) => error.status === 409,
  );
});

test("SQL: rollback completo cuando falta stock o cambia el precio confirmado", async () => {
  const product = await saveProduct(db, sample);
  const second = await saveProduct(db, {
    ...sample,
    code: "TEST-002",
    stock: 0,
  });
  await assert.rejects(
    registerSale(
      db,
      {
        items: [
          { productId: product.id, quantity: 1 },
          { productId: second.id, quantity: 1 },
        ],
        expectedTotal: 3000,
        payment: "Efectivo",
        requestId: randomUUID(),
      },
      userId,
    ),
    (error) => error.status === 409,
  );
  await assert.rejects(
    registerSale(
      db,
      {
        items: [{ productId: product.id, quantity: 1 }],
        expectedTotal: 1,
        payment: "Efectivo",
        requestId: randomUUID(),
      },
      userId,
    ),
    (error) => error.status === 409,
  );
  const snapshot = await getSnapshot(db);
  assert.equal(
    snapshot.products.find((item) => item.id === product.id).stock,
    3,
  );
  assert.equal(snapshot.sales.length, 0);
});

test("SQL: dos ventas simultáneas no venden dos veces la última unidad", async () => {
  const product = await saveProduct(db, { ...sample, stock: 1 });
  const results = await Promise.allSettled([
    sell(product, 1),
    sell(product, 1),
  ]);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    1,
  );
  const snapshot = await getSnapshot(db);
  assert.equal(snapshot.products[0].stock, 0);
  assert.equal(snapshot.sales.length, 1);
});

test("SQL: un fallo posterior al descuento revierte stock, versión, cabecera y detalles", async () => {
  const product = await saveProduct(db, sample);
  await assert.rejects(
    registerSale(
      db,
      {
        items: [{ productId: product.id, quantity: 1 }],
        expectedTotal: 1500,
        payment: "Efectivo",
        requestId: randomUUID(),
      },
      "usuario-inexistente",
    ),
  );
  const snapshot = await getSnapshot(db);
  assert.equal(snapshot.products[0].stock, 3);
  assert.equal(snapshot.products[0].version, 1);
  assert.equal(snapshot.sales.length, 0);
  assert.equal(
    Number(
      (await db.execute("SELECT COUNT(*) AS total FROM detalle_ventas")).rows[0]
        .total,
    ),
    0,
  );
});

async function startApi({ allowSetup = false } = {}) {
  const app = createApplication({ database: () => db, allowSetup });
  http = createServer((req, res) => {
    const name = new URL(req.url, "http://localhost").pathname.slice(5);
    return app[name](req, res);
  });
  await new Promise((resolve) => http.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${http.address().port}`;
}

const request = (path, { method = "GET", body, cookie, origin = base } = {}) =>
  fetch(`${base}/api/${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      origin,
      ...(cookie ? { cookie } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

test("HTTP: sesión HttpOnly, autorización, origen, validación y cierre de sesión", async () => {
  await startApi();
  assert.equal((await request("products")).status, 401);
  assert.equal(
    (
      await request("auth", {
        method: "POST",
        body: {
          action: "login",
          username: "admin-test",
          password: "incorrecta-12345",
        },
      })
    ).status,
    401,
  );
  const login = await request("auth", {
    method: "POST",
    body: {
      action: "login",
      username: "admin-test",
      password: "solo-para-pruebas-2026",
    },
  });
  assert.equal(login.status, 200);
  const header = login.headers.get("set-cookie");
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Strict/);
  const cookie = header.split(";")[0];
  assert.equal(
    (
      await request("products", {
        method: "POST",
        cookie,
        body: sample,
        origin: "https://otro.example",
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("products", {
        method: "POST",
        cookie,
        body: { ...sample, stock: -1 },
      })
    ).status,
    400,
  );
  assert.equal(
    (await request("products", { method: "POST", cookie, body: sample }))
      .status,
    201,
  );
  assert.equal((await request("products", { cookie })).status, 200);
  assert.equal(
    (await request("auth", { method: "DELETE", cookie })).status,
    200,
  );
  assert.equal((await request("state", { cookie })).status, 401);
});

test("HTTP: el alta del primer administrador está bloqueada fuera del modo local", async () => {
  await db.execute({ sql: "DELETE FROM usuarios WHERE id=?", args: [userId] });
  await startApi();
  assert.equal(
    (
      await request("auth", {
        method: "POST",
        body: {
          action: "setup",
          username: "nuevo-admin",
          password: "solo-para-pruebas-2026",
        },
      })
    ).status,
    403,
  );
});

test("HTTP: el primer administrador se crea localmente una sola vez y permite volver a iniciar sesión", async () => {
  await db.execute({ sql: "DELETE FROM usuarios WHERE id=?", args: [userId] });
  await startApi({ allowSetup: true });
  assert.equal((await (await request("auth")).json()).canSetup, true);
  const body = {
    action: "setup",
    username: "nuevo-admin",
    password: "solo-para-pruebas-2026",
  };
  const setup = await request("auth", { method: "POST", body });
  assert.equal(setup.status, 200);
  assert.equal((await setup.json()).user.role, "admin");
  assert.equal((await request("auth", { method: "POST", body })).status, 409);
  assert.equal(
    (
      await request("auth", {
        method: "POST",
        body: { ...body, action: "login" },
      })
    ).status,
    200,
  );
  assert.match(sessionCookie("test", true), /; Secure/);
});

test("HTTP: el rol vendedor consulta y vende, pero no administra productos", async () => {
  const product = await saveProduct(db, sample);
  await startApi();
  const login = await request("auth", {
    method: "POST",
    body: {
      action: "login",
      username: "admin-test",
      password: "solo-para-pruebas-2026",
    },
  });
  const cookie = login.headers.get("set-cookie").split(";")[0];
  await db.execute({
    sql: "UPDATE usuarios SET rol=? WHERE id=?",
    args: ["vendedor", userId],
  });
  assert.equal((await request("products", { cookie })).status, 200);
  assert.equal(
    (
      await request("products", {
        method: "POST",
        cookie,
        body: { ...sample, code: "TEST-002" },
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await request("sales", {
        method: "POST",
        cookie,
        body: {
          items: [{ productId: product.id, quantity: 1 }],
          payment: "Efectivo",
          expectedTotal: 1500,
          requestId: randomUUID(),
        },
      })
    ).status,
    201,
  );
});

test("HTTP: bloquea temporalmente los intentos repetidos de contraseña", async () => {
  await startApi();
  for (let index = 0; index < 5; index++) {
    assert.equal(
      (
        await request("auth", {
          method: "POST",
          body: {
            action: "login",
            username: "admin-test",
            password: "incorrecta-12345",
          },
        })
      ).status,
      401,
    );
  }
  assert.equal(
    (
      await request("auth", {
        method: "POST",
        body: {
          action: "login",
          username: "admin-test",
          password: "solo-para-pruebas-2026",
        },
      })
    ).status,
    429,
  );
});

test("seguridad: los errores inesperados no revelan URL ni credenciales", () => {
  const safe = publicError(
    new Error("libsql://dato-privado.example token=valor-privado"),
  );
  assert.equal(safe.status, 503);
  assert.doesNotMatch(safe.message, /dato-privado|valor-privado/);
});

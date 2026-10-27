import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { migrate, health } from "../server/schema.js";
import {
  getSnapshot as scopedSnapshot,
  saveProduct as scopedSave,
  registerSale,
} from "../server/store.js";
import { seedPresentation } from "../server/demo-seed.js";
import { randomUUID } from "node:crypto";

let db;
const userId = "seed-owner";
const getSnapshot = (database) => scopedSnapshot(database, userId);
const saveProduct = (database, input, id = null) =>
  scopedSave(database, input, id, userId);
const original = {
  code: "MED-001",
  name: "Paracetamol 500 mg",
  category: "Analgésicos",
  presentation: "Caja de prueba",
  price: 1500,
  stock: 10,
  minStock: 5,
};

beforeEach(async () => {
  db = createClient({ url: "file::memory:" });
  await migrate(db);
  await db.execute({
    sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
    args: [
      userId,
      "propietario-test",
      "hash-no-usado-en-esta-prueba",
      "admin",
      new Date().toISOString(),
    ],
  });
});
afterEach(() => db.close());

test("demostración: añade nueve productos y seis boletas sin alterar el producto del usuario", async () => {
  const saved = await saveProduct(db, original);
  assert.deepEqual(await seedPresentation(db), {
    createdProducts: 9,
    createdSales: 6,
    skippedSales: 0,
  });
  const snapshot = await getSnapshot(db);
  assert.equal(snapshot.products.length, 10);
  assert.equal(
    snapshot.products.find((product) => product.id === saved.id).stock,
    10,
  );
  assert.equal(
    snapshot.products.find((product) => product.id === saved.id).demo,
    false,
  );
  assert.equal(snapshot.products.filter((product) => product.demo).length, 9);
  assert.equal(snapshot.sales.length, 6);
  assert.ok(
    snapshot.sales.every(
      (sale) => sale.demo && sale.id.startsWith("DEMO-B001-"),
    ),
  );
  assert.equal(
    snapshot.sales.reduce((sum, sale) => sum + sale.total, 0),
    26410,
  );
  assert.equal(
    snapshot.products.find((product) => product.code === "DEMO-003").stock,
    61,
  );
  assert.equal(
    snapshot.products.find((product) => product.code === "DEMO-010").stock,
    70,
  );
  assert.equal(
    snapshot.products.find((product) => product.code === "DEMO-004").stock,
    0,
  );
});

test("demostración: repetir la carga no duplica boletas, repone stock ni sobrescribe ediciones", async () => {
  await seedPresentation(db);
  const before = await getSnapshot(db);
  const product = before.products.find((item) => item.code === "DEMO-003");
  await saveProduct(db, { ...product, stock: 9, price: 1999 }, product.id);
  assert.deepEqual(await seedPresentation(db), {
    createdProducts: 0,
    createdSales: 0,
    skippedSales: 6,
  });
  const after = await getSnapshot(db);
  assert.equal(after.products.length, 9);
  assert.equal(after.sales.length, 6);
  assert.equal(after.products.find((item) => item.id === product.id).stock, 9);
  assert.equal(
    after.products.find((item) => item.id === product.id).price,
    1999,
  );
  assert.deepEqual(
    after.sales.map((sale) => sale.id),
    before.sales.map((sale) => sale.id),
  );
});

test("demostración: vender un producto de ejemplo marca también la venta como demostración", async () => {
  await seedPresentation(db);
  const product = (await getSnapshot(db)).products.find(
    (item) => item.code === "DEMO-003",
  );
  const sale = await registerSale(
    db,
    {
      items: [{ productId: product.id, quantity: 1 }],
      payment: "Efectivo",
      expectedTotal: product.price,
      requestId: randomUUID(),
      demo: false,
    },
    userId,
  );
  assert.equal(sale.demo, true);
  assert.equal(
    (await getSnapshot(db)).sales.find((item) => item.id === sale.id).demo,
    true,
  );
});

test("migración: conserva inventario e historial V2 y retira las tablas sin aislamiento", async () => {
  db.close();
  db = createClient({ url: "file::memory:" });
  await migrate(db, { legacyOnly: true });
  const now = new Date().toISOString();
  await db.batch(
    [
      {
        sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
        args: [userId, "propietario-test", "hash-prueba", "admin", now],
      },
      {
        sql: "INSERT INTO productos(id,codigo,nombre,categoria,presentacion,precio_centimos,stock,stock_minimo,creado_en,actualizado_en) VALUES (?,?,?,?,?,?,?,?,?,?)",
        args: [
          "legacy-product",
          original.code,
          original.name,
          original.category,
          original.presentation,
          original.price,
          10,
          5,
          now,
          now,
        ],
      },
      {
        sql: "INSERT INTO ventas(id,usuario_id,fecha,total_centimos,medio_pago,clave_idempotencia,solicitud_hash) VALUES (?,?,?,?,?,?,?)",
        args: [
          "legacy-sale",
          userId,
          now,
          3000,
          "Efectivo",
          randomUUID(),
          "hash",
        ],
      },
      {
        sql: "INSERT INTO detalle_ventas(id,venta_id,producto_id,codigo_historico,nombre_historico,cantidad,precio_unitario_centimos,subtotal_centimos) VALUES (?,?,?,?,?,?,?,?)",
        args: [
          "legacy-detail",
          "legacy-sale",
          "legacy-product",
          original.code,
          original.name,
          2,
          1500,
          3000,
        ],
      },
    ],
    "write",
  );
  assert.equal((await health(db)).schemaReady, false);
  await migrate(db);
  await migrate(db);
  const snapshot = await getSnapshot(db);
  assert.equal(snapshot.products.length, 1);
  assert.equal(snapshot.products[0].id, "legacy-product");
  assert.equal(snapshot.products[0].stock, 10);
  assert.equal(snapshot.sales[0].id, "legacy-sale");
  assert.equal(snapshot.sales[0].items[0].subtotal, 3000);
  assert.equal((await db.execute("PRAGMA foreign_key_check")).rows.length, 0);
  assert.equal(
    Number(
      (await db.execute("SELECT COUNT(*) AS n FROM _nova_backup_v2_productos"))
        .rows[0].n,
    ),
    1,
  );
  await assert.rejects(db.execute("SELECT * FROM productos"));
});

test("migración: separa un catálogo antiguo compartido y conserva cada venta con su propietario", async () => {
  db.close();
  db = createClient({ url: "file::memory:" });
  await migrate(db, { legacyOnly: true });
  const now = new Date().toISOString();
  await db.batch(
    [
      {
        sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
        args: [userId, "dueno-original", "hash", "admin", now],
      },
      {
        sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
        args: ["otro-usuario", "otro-dueno", "hash", "admin", new Date(Date.parse(now)+1000).toISOString()],
      },
      {
        sql: "INSERT INTO productos(id,codigo,nombre,categoria,presentacion,precio_centimos,stock,stock_minimo,creado_en,actualizado_en) VALUES (?,?,?,?,?,?,?,?,?,?)",
        args: [
          "compartido",
          original.code,
          original.name,
          original.category,
          original.presentation,
          1500,
          10,
          5,
          now,
          now,
        ],
      },
      {
        sql: "INSERT INTO ventas(id,usuario_id,fecha,total_centimos,medio_pago,clave_idempotencia,solicitud_hash) VALUES (?,?,?,?,?,?,?)",
        args: [
          "venta-otro",
          "otro-usuario",
          now,
          1500,
          "Efectivo",
          randomUUID(),
          "hash",
        ],
      },
      {
        sql: "INSERT INTO detalle_ventas(id,venta_id,producto_id,codigo_historico,nombre_historico,cantidad,precio_unitario_centimos,subtotal_centimos) VALUES (?,?,?,?,?,?,?,?)",
        args: [
          "detalle-otro",
          "venta-otro",
          "compartido",
          original.code,
          original.name,
          1,
          1500,
          1500,
        ],
      },
    ],
    "write",
  );
  await migrate(db);
  const first = await scopedSnapshot(db, userId),
    second = await scopedSnapshot(db, "otro-usuario");
  assert.equal(first.products.length, 1);
  assert.equal(second.products.length, 1);
  assert.equal(first.products[0].id, "compartido");
  assert.notEqual(second.products[0].id, "compartido");
  assert.equal(first.sales.length, 0);
  assert.equal(second.sales[0].id, "venta-otro");
  assert.equal(second.sales[0].items[0].productId, second.products[0].id);
  assert.equal((await db.execute("PRAGMA foreign_key_check")).rows.length, 0);
});

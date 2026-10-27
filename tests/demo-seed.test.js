import { afterEach, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { createClient } from "@libsql/client";
import { migrate, health } from "../server/schema.js";
import { getSnapshot, saveProduct, registerSale } from "../server/store.js";
import { seedPresentation } from "../server/demo-seed.js";
import { randomUUID } from "node:crypto";

let db;
const userId = "seed-owner";
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

test("migración: un esquema anterior conserva medicamentos, stock y usuarios al añadir las marcas demo", async () => {
  const saved = await saveProduct(db, original);
  await db.batch(
    [
      "ALTER TABLE productos DROP COLUMN es_demo",
      "ALTER TABLE ventas DROP COLUMN es_demo",
      "DELETE FROM schema_migrations WHERE version=2",
    ],
    "write",
  );
  assert.equal((await health(db)).schemaReady, false);
  await migrate(db);
  await migrate(db);
  assert.equal((await health(db)).schemaReady, true);
  const snapshot = await getSnapshot(db);
  assert.equal(snapshot.products.length, 1);
  assert.equal(snapshot.products[0].id, saved.id);
  assert.equal(snapshot.products[0].stock, 10);
  assert.equal(snapshot.products[0].demo, false);
  assert.equal(
    Number(
      (await db.execute("SELECT COUNT(*) AS total FROM usuarios")).rows[0]
        .total,
    ),
    1,
  );
});

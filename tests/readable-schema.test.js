import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createClient } from "@libsql/client";
import { migrate, health } from "../server/schema.js";
import { saveProduct, registerSale } from "../server/store.js";

test("consultas Turso: soles, hora peruana, estados, historial y totales por cuenta", async () => {
  const db = createClient({ url: "file::memory:" });
  try {
    await migrate(db);
    for (const id of ["ana", "luis", "sin-productos"]) {
      await db.execute({
        sql: "INSERT INTO usuarios VALUES (?,?,?,?,?)",
        args: [id, id, "hash-privado", "vendedor", "2026-10-28T03:30:00.000Z"],
      });
    }
    const input = {
      code: "MED-001", name: "Nombre original", category: "Analgésicos",
      presentation: "Caja", price: 1550, stock: 5, minStock: 2,
    };
    const product = await saveProduct(db, input, null, "ana");
    await saveProduct(db, { ...input, stock: 0 }, null, "luis");
    await registerSale(db, {
      items: [{ productId: product.id, quantity: 3 }], payment: "Efectivo",
      expectedTotal: 4650, requestId: randomUUID(),
    }, "ana");
    const current = await db.execute({ sql: "SELECT version FROM productos_cuenta WHERE id=?", args: [product.id] });
    await saveProduct(db, {
      ...input, stock: 2, name: "Nombre actualizado", version: Number(current.rows[0].version),
    }, product.id, "ana");
    const inventory = (await db.execute("SELECT * FROM consulta_inventario ORDER BY cuenta")).rows;
    assert.equal(inventory[0].precio_soles, 15.5);
    assert.equal(inventory[0].estado_stock, "Stock bajo");
    assert.equal(inventory[0].medicamento, "Nombre actualizado");
    assert.equal(inventory[1].estado_stock, "Agotado");
    const detail = (await db.execute("SELECT * FROM consulta_detalle_ventas")).rows[0];
    assert.equal(detail.medicamento_vendido, "Nombre original");
    assert.equal(detail.subtotal_soles, 46.5);
    const sale = (await db.execute("SELECT * FROM consulta_ventas")).rows[0];
    assert.equal(sale.productos_distintos, 1);
    assert.equal(sale.unidades_vendidas, 3);
    assert.equal(sale.total_soles, 46.5);
    const summaries = (await db.execute("SELECT * FROM consulta_resumen_cuentas ORDER BY cuenta")).rows;
    assert.equal(summaries[0].registro_hora_peru, "2026-10-27 22:30:00");
    assert.equal(summaries[0].productos_registrados, 1);
    assert.equal(summaries[0].total_vendido_soles, 46.5);
    assert.equal(summaries[1].total_vendido_soles, 0);
    assert.equal(summaries[2].productos_registrados, 0);
    assert.equal(summaries[2].unidades_disponibles, 0);
    for (const name of ["consulta_inventario", "consulta_ventas", "consulta_detalle_ventas", "consulta_resumen_cuentas"]) {
      const result = await db.execute(`SELECT * FROM ${name}`);
      assert.ok(!result.columns.some((column) => /hash|token|clave/.test(column)));
    }
    assert.equal((await db.execute("PRAGMA foreign_key_check")).rows.length, 0);
  } finally {
    db.close();
  }
});

test("migración V3 a V4: repetible, conserva tablas y registros sin recrear inventario antiguo", async () => {
  const db = createClient({ url: "file::memory:" });
  try {
    await migrate(db);
    const views = (await db.execute("SELECT name FROM sqlite_master WHERE type='view'")).rows;
    for (const { name } of views) await db.execute(`DROP VIEW ${name}`);
    await db.execute("DELETE FROM schema_migrations WHERE version=4");
    await db.execute("INSERT INTO usuarios VALUES ('test','test','hash','admin','2026-10-28T00:00:00Z')");
    const before = (await db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name")).rows;
    assert.equal((await health(db)).schemaReady, false);
    await migrate(db);
    await migrate(db);
    assert.equal((await health(db)).schemaReady, true);
    assert.deepEqual((await db.execute("SELECT name,sql FROM sqlite_master WHERE type='table' ORDER BY name")).rows, before);
    assert.equal((await db.execute("SELECT * FROM usuarios")).rows.length, 1);
    assert.equal((await db.execute("SELECT * FROM consulta_resumen_cuentas")).rows[0].cuenta, "test");
    assert.equal((await db.execute("SELECT * FROM guia_base_datos")).rows.length, 13);
  } finally {
    db.close();
  }
});

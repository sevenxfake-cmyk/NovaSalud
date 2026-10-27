import test from "node:test";
import assert from "node:assert/strict";
import { prepareSale, validateProduct } from "../src/lib/operations.js";
import { dayKey, matchesProduct, stockStatus } from "../src/lib/format.js";
import { demoProducts } from "../src/data/demo.js";

const initial = () => structuredClone(demoProducts);
const saleTime = new Date("2026-10-27T20:00:00Z");
const sell = (products, cart, payment = "Efectivo") =>
  prepareSale(products, cart, payment, saleTime, "DEMO-TEST");

test("venta: calcula precios del catálogo, descuenta stock y conserva una copia histórica", () => {
  const products = initial();
  const { sale, products: updated } = sell(products, [
    { productId: "p1", quantity: 2 },
    { productId: "p3", quantity: 1 },
  ]);
  assert.equal(sale.total, 5400);
  assert.equal(sale.items[0].subtotal, 3000);
  assert.equal(updated.find((product) => product.id === "p1").stock, 118);
  assert.equal(products.find((product) => product.id === "p1").stock, 120);
  updated[0].name = "Nombre modificado";
  updated[0].price = 9999;
  assert.equal(sale.items[0].name, "Paracetamol 500 mg");
  assert.equal(sale.items[0].price, 1500);
});

test("venta: rechaza stock insuficiente sin modificar parcialmente otros productos", () => {
  const products = initial();
  const before = structuredClone(products);
  assert.throws(
    () =>
      sell(products, [
        { productId: "p1", quantity: 1 },
        { productId: "p2", quantity: 9 },
      ]),
    /Stock insuficiente/,
  );
  assert.deepEqual(products, before);
});

test("venta: permite vender exactamente el stock y rechaza una segunda venta sobre el resultado", () => {
  const { products } = sell(initial(), [{ productId: "p2", quantity: 8 }]);
  assert.equal(products.find((product) => product.id === "p2").stock, 0);
  assert.throws(
    () => sell(products, [{ productId: "p2", quantity: 1 }]),
    /Stock insuficiente/,
  );
});

test("venta: rechaza carrito vacío, productos agotados, inexistentes y duplicados", () => {
  assert.throws(() => sell(initial(), []), /al menos/);
  assert.throws(
    () => sell(initial(), [{ productId: "p4", quantity: 1 }]),
    /Stock insuficiente/,
  );
  assert.throws(
    () => sell(initial(), [{ productId: "missing", quantity: 1 }]),
    /Revisa/,
  );
  assert.throws(
    () =>
      sell(initial(), [
        { productId: "p1", quantity: 1 },
        { productId: "p1", quantity: 1 },
      ]),
    /Revisa/,
  );
});

test("venta: rechaza cantidades negativas, nulas, fraccionarias y no finitas", () => {
  for (const quantity of [-1, 0, 1.5, NaN, Infinity, "2"]) {
    assert.throws(
      () => sell(initial(), [{ productId: "p1", quantity }]),
      /enteros/,
    );
  }
  assert.throws(
    () => sell(initial(), [{ productId: "p1", quantity: 1 }], "Otro"),
    /medio de pago/,
  );
});

test("productos: normaliza los campos y detecta códigos duplicados sin distinguir mayúsculas", () => {
  const product = {
    ...demoProducts[0],
    id: undefined,
    code: " med-011 ",
    name: "  Producto de prueba  ",
  };
  const validated = validateProduct(product, initial());
  assert.equal(validated.code, "MED-011");
  assert.equal(validated.name, "Producto de prueba");
  assert.throws(
    () => validateProduct({ ...product, code: "med-001" }, initial()),
    /Ya existe/,
  );
  assert.doesNotThrow(() =>
    validateProduct(
      { ...demoProducts[0], name: "Producto editado" },
      initial(),
    ),
  );
});

test("productos: valida precio, límites, presentación, categoría y existencias", () => {
  for (const changes of [
    { price: 0 },
    { price: -100 },
    { price: 1.5 },
    { price: Infinity },
    { stock: -1 },
    { stock: 1.5 },
    { minStock: -1 },
    { minStock: 1000001 },
    { presentation: " " },
    { category: "Otra" },
    { name: "ab" },
  ]) {
    assert.throws(() =>
      validateProduct({ ...demoProducts[0], ...changes }, initial()),
    );
  }
});

test("alertas: distingue agotados, stock igual al mínimo y productos disponibles", () => {
  assert.equal(stockStatus({ stock: 0, minStock: 0 }), "out");
  assert.equal(stockStatus({ stock: 10, minStock: 10 }), "low");
  assert.equal(stockStatus({ stock: 11, minStock: 10 }), "ok");
});

test("búsqueda: encuentra códigos, categorías y nombres con o sin tildes", () => {
  assert.equal(matchesProduct(demoProducts[0], "ANALGESICOS"), true);
  assert.equal(matchesProduct(demoProducts[0], "med-001"), true);
  assert.equal(matchesProduct(demoProducts[0], "  paracetamol  "), true);
  assert.equal(matchesProduct(demoProducts[0], "loratadina"), false);
});

test("fechas: agrupa movimientos por el día de Lima, incluso cerca de medianoche UTC", () => {
  assert.equal(dayKey("2026-10-28T02:00:00Z"), "2026-10-27");
  assert.equal(dayKey("2026-10-28T05:00:00Z"), "2026-10-28");
});

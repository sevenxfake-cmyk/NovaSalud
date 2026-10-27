import { after, afterEach, before, beforeEach, test } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { act, createElement } from "react";

let dom;
let server;
let App;
let root;
let container;
let createRoot;
const savedGlobals = new Map();

before(async () => {
  dom = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "http://localhost/",
  });
  const globals = {
    window: dom.window,
    document: dom.window.document,
    navigator: dom.window.navigator,
    HTMLElement: dom.window.HTMLElement,
    FormData: dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT: true,
  };
  for (const [key, value] of Object.entries(globals)) {
    savedGlobals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      value,
      writable: true,
      configurable: true,
    });
  }
  server = await createServer({
    cacheDir: "node_modules/.vite-tests",
    server: { middlewareMode: true },
    appType: "custom",
  });
  App = (await server.ssrLoadModule("/src/App.jsx")).default;
  ({ createRoot } = await import("react-dom/client"));
});

beforeEach(async () => {
  dom.window.history.replaceState({}, "", "/");
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => {
    root.render(createElement(App));
  });
});

afterEach(async () => {
  await act(async () => {
    root?.unmount();
  });
  container?.remove();
});

after(async () => {
  await server?.close();
  dom?.window.close();
  for (const [key, descriptor] of savedGlobals) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
});

function get(selector) {
  const element = document.querySelector(selector);
  assert.ok(element, `No se encontró ${selector}`);
  return element;
}

async function click(selector) {
  const element = typeof selector === "string" ? get(selector) : selector;
  await act(async () => {
    element.focus();
    element.dispatchEvent(
      new window.MouseEvent("click", {
        bubbles: true,
        cancelable: true,
        button: 0,
      }),
    );
  });
}

async function fill(selector, value) {
  const input = get(selector);
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      "value",
    ).set.call(input, value);
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
  });
}

async function submit(selector) {
  await act(async () => {
    get(selector).dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
}

test("interfaz: navega por las cinco pantallas y encuentra categorías sin tildes", async () => {
  assert.match(get("h1").textContent, /Todo listo/);
  assert.match(get(".demo-banner").textContent, /demostración/);
  for (const path of [
    "/inventario",
    "/alertas",
    "/ventas",
    "/historial",
    "/",
  ]) {
    await click(`.sidebar nav a[href="${path}"]`);
    assert.equal(window.location.pathname, path);
    assert.ok(get("h1").textContent);
  }
  await click('.sidebar nav a[href="/inventario"]');
  await fill(
    'input[aria-label="Buscar productos por nombre o código"]',
    "analgesicos",
  );
  assert.equal(document.querySelectorAll("tbody tr").length, 2);
});

test("interfaz: crea un producto, rechaza un código duplicado y mantiene el foco en el modal", async () => {
  await click('.sidebar nav a[href="/inventario"]');
  await click(".page-actions button");
  await fill("#product-code", "MED-TEST");
  await fill("#product-name", "Producto de prueba");
  await fill("#product-presentation", "Caja de prueba");
  await fill("#product-price", "12.50");
  await fill("#product-stock", "3");
  await fill("#product-minStock", "2");
  assert.equal(get('[role="dialog"] form').checkValidity(), true);
  await submit('[role="dialog"] form');
  assert.equal(document.querySelector('[role="dialog"]') === null, true);
  assert.match(get("tbody").textContent, /Producto de prueba/);
  await click(".page-actions button");
  await fill("#product-code", "MED-TEST");
  await fill("#product-name", "Otro producto");
  await fill("#product-presentation", "Frasco");
  await fill("#product-price", "15");
  await submit('[role="dialog"] form');
  assert.match(get('[role="alert"]').textContent, /Ya existe/);
  assert.ok(get('[role="dialog"]').contains(document.activeElement));
  await act(async () => {
    document.dispatchEvent(
      new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
  assert.equal(document.querySelector('[role="dialog"]') === null, true);
  assert.ok(document.activeElement === get(".page-actions button"));
});

test("interfaz: impide superar existencias, confirma una venta y conserva su detalle", async () => {
  await click('.sidebar nav a[href="/ventas"]');
  assert.equal(
    get('button[aria-label="Agregar Loratadina 10 mg"]').disabled,
    true,
  );
  await click('button[aria-label="Agregar Paracetamol 500 mg"]');
  await fill('input[aria-label="Cantidad de Paracetamol 500 mg"]', "121");
  assert.equal(
    get('input[aria-label="Cantidad de Paracetamol 500 mg"]').value,
    "1",
  );
  assert.match(get('[role="alert"]').textContent, /120 unidades/);
  await fill('input[aria-label="Cantidad de Paracetamol 500 mg"]', "2");
  await click(".cart-summary button");
  assert.match(get(".confirmation-total").textContent, /30[.,]00/);
  await click('[role="dialog"] .modal-actions .btn-primary');
  assert.match(get(".cart-panel").textContent, /Tu venta comienza aquí/);
  await click('.sidebar nav a[href="/inventario"]');
  const row = [...document.querySelectorAll("tbody tr")].find((item) =>
    item.textContent.includes("Paracetamol"),
  );
  assert.match(row.textContent, /118/);
  await click('.sidebar nav a[href="/historial"]');
  await click("tbody tr:first-child button.sale-id");
  assert.match(get('[role="dialog"]').textContent, /Paracetamol 500 mg/);
  assert.match(get(".receipt-total").textContent, /30[.,]00/);
});

test("interfaz: reponer un agotado actualiza inventario, alertas y resumen", async () => {
  await click('.sidebar nav a[href="/alertas"]');
  const row = [...document.querySelectorAll("tbody tr")].find((item) =>
    item.textContent.includes("Loratadina"),
  );
  await click(row.querySelector("button"));
  await fill("#product-stock", "25");
  await submit('[role="dialog"] form');
  assert.doesNotMatch(get("tbody").textContent, /Loratadina/);
  assert.equal(get(".nav-count").textContent, "3");
  await click('.sidebar nav a[href="/"]');
  const metrics = document.querySelectorAll(".metric-value");
  assert.equal(metrics[3].textContent, "0");
});

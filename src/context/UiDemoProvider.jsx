import { useState } from "react";
import { PharmacyContext } from "./pharmacy";
import { demoProducts, createDemoSales } from "../data/demo";
import { prepareSale, validateProduct } from "../lib/operations";

// Vista previa local para trabajar en la interfaz sin credenciales de Turso.
// Solo se usa con "npm run dev:ui" y nunca debe representar datos reales.
function initialData() {
  return {
    products: demoProducts.map((product) => ({
      ...product,
      version: 1,
      demo: true,
    })),
    sales: createDemoSales(),
  };
}

export function UiDemoProvider({ children }) {
  const [data, setData] = useState(initialData);
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [user, setUser] = useState({ username: "Diseño demo", role: "admin" });
  const [saving, setSaving] = useState(false);

  function notify(message, type = "success") {
    setNotice({ id: crypto.randomUUID(), text: message, type });
  }

  async function login() {
    setUser({ username: "Diseño demo", role: "admin" });
    notify("Modo diseño: sesión simulada, sin Turso.");
  }

  async function logout() {
    setUser(null);
    setCart([]);
  }

  async function saveProduct(input) {
    const clean = validateProduct(input, data.products);
    const existing = data.products.find((product) => product.id === input.id);
    const product = {
      ...clean,
      id: existing?.id ?? crypto.randomUUID(),
      version: (existing?.version ?? 0) + 1,
      demo: true,
    };
    setSaving(true);
    try {
      setData((previous) => ({
        ...previous,
        products: existing
          ? previous.products.map((item) =>
              item.id === existing.id ? product : item,
            )
          : [...previous.products, product],
      }));
      notify("Producto guardado solo en esta vista previa (sin Turso).");
    } finally {
      setSaving(false);
    }
  }

  function setQuantity(productId, quantity) {
    const product = data.products.find((item) => item.id === productId);
    if (!product || !Number.isSafeInteger(quantity) || quantity < 0) {
      notify("Ingresa una cantidad entera válida.", "danger");
      return;
    }
    if (quantity > product.stock) {
      notify("No hay suficientes unidades de ese producto.", "danger");
      return;
    }
    setCart((previous) =>
      quantity === 0
        ? previous.filter((item) => item.productId !== productId)
        : previous.some((item) => item.productId === productId)
          ? previous.map((item) =>
              item.productId === productId ? { ...item, quantity } : item,
            )
          : [...previous, { productId, quantity }],
    );
  }

  async function registerSale(payment) {
    setSaving(true);
    try {
      const result = prepareSale(data.products, cart, payment);
      const changed = new Set(cart.map((item) => item.productId));
      setData((previous) => ({
        sales: [result.sale, ...previous.sales],
        products: result.products.map((product) =>
          changed.has(product.id)
            ? { ...product, version: (product.version ?? 1) + 1 }
            : product,
        ),
      }));
      setCart([]);
      notify("Venta simulada: no se guardó en Turso.");
      return result.sale;
    } finally {
      setSaving(false);
    }
  }

  return (
    <PharmacyContext.Provider
      value={{
        ...data,
        cart,
        notice,
        globalSearch,
        setGlobalSearch,
        user,
        needsSetup: false,
        canSetup: false,
        connection: "connected",
        schemaReady: true,
        loading: false,
        loadError: "",
        saving,
        login,
        logout,
        saveProduct,
        setQuantity,
        registerSale,
        refresh: async () => data,
        retry: async () => data,
        clearCart: () => setCart([]),
        dismissNotice: () => setNotice(null),
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
}

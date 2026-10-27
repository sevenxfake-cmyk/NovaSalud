import { useCallback, useEffect, useRef, useState } from "react";
import { PharmacyContext } from "./pharmacy";
import { validateProduct } from "../lib/operations";
import { apiRequest } from "../lib/api";

export function PharmacyProvider({ children }) {
  const [data, setData] = useState({ products: [], sales: [] });
  const [cart, setCart] = useState([]);
  const [notice, setNotice] = useState(null);
  const [globalSearch, setGlobalSearch] = useState("");
  const [user, setUser] = useState(null);
  const [authState, setAuthState] = useState({
    needsSetup: false,
    canSetup: false,
  });
  const [connection, setConnection] = useState("checking");
  const [schemaReady, setSchemaReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const saleBusy = useRef(false);
  const productBusy = useRef(false);
  const pendingSale = useRef(null);
  const accountEpoch = useRef(0);

  const notify = useCallback((text, type = "success") => {
    setNotice({ id: crypto.randomUUID(), text, type });
  }, []);

  const refresh = useCallback(async (signal) => {
    const epoch = accountEpoch.current;
    try {
      const snapshot = await apiRequest("/state", { signal });
      if (epoch !== accountEpoch.current) return snapshot;
      setData(snapshot);
      setLoadError("");
      return snapshot;
    } catch (error) {
      if (epoch !== accountEpoch.current) throw error;
      if (error.status === 401) {
        setUser(null);
        setData({ products: [], sales: [] });
        setCart([]);
      }
      if (error.name !== "AbortError") setLoadError(error.message);
      throw error;
    }
  }, []);

  const initialize = useCallback(
    async (signal) => {
      try {
        const health = await apiRequest("/health", { signal });
        setConnection(health.connected === true ? "connected" : "error");
        setSchemaReady(health.schemaReady === true);
        if (!health.connected || !health.schemaReady) {
          setLoadError(
            "Ejecuta npm run db:migrate en la carpeta del proyecto para preparar las tablas.",
          );
          return;
        }
        const session = await apiRequest("/auth", { signal });
        setUser(session.user);
        setAuthState({
          needsSetup: session.needsSetup,
          canSetup: session.canSetup,
        });
        if (session.user) await refresh(signal);
      } catch (error) {
        if (error.name !== "AbortError") {
          setConnection("error");
          setLoadError(error.message);
        }
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [refresh],
  );

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(() => initialize(controller.signal), 0);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [initialize]);

  useEffect(() => {
    if (!user) return;
    const controller = new AbortController();
    const update = async () => {
      try {
        const health = await apiRequest("/health", {
          signal: controller.signal,
        });
        setConnection(health.connected === true ? "connected" : "error");
        await refresh(controller.signal);
      } catch (error) {
        if (error.name !== "AbortError" && error.status !== 401)
          setConnection("error");
      }
    };
    const timer = setInterval(update, 45000);
    window.addEventListener("focus", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      controller.abort();
    };
  }, [user, refresh]);

  async function login(credentials) {
    accountEpoch.current++;
    const result = await apiRequest("/auth", {
      method: "POST",
      body: credentials,
    });
    setData({ products: [], sales: [] });
    setCart([]);
    setGlobalSearch("");
    setNotice(null);
    pendingSale.current = null;
    setUser(result.user);
    setAuthState({ needsSetup: false, canSetup: false });
    await refresh();
    if (credentials.action === "register")
      notify(
        "Cuenta creada. Tu inventario personal incluye 10 productos de demostración.",
      );
  }

  async function logout() {
    try {
      await apiRequest("/auth", { method: "DELETE" });
    } catch (error) {
      notify(error.message, "danger");
      return;
    }
    accountEpoch.current++;
    setUser(null);
    setCart([]);
    setData({ products: [], sales: [] });
    setNotice(null);
    pendingSale.current = null;
  }

  async function saveProduct(input) {
    if (productBusy.current)
      throw new Error("Espera a que termine el registro actual.");
    validateProduct(input, data.products);
    productBusy.current = true;
    setSaving(true);
    try {
      const result = await apiRequest(
        input.id ? `/products?id=${encodeURIComponent(input.id)}` : "/products",
        { method: input.id ? "PATCH" : "POST", body: input },
      );
      setData((previous) => ({
        ...previous,
        products: previous.products.some(
          (item) => item.id === result.product.id,
        )
          ? previous.products.map((item) =>
              item.id === result.product.id ? result.product : item,
            )
          : [...previous.products, result.product],
      }));
      notify("Producto guardado permanentemente en Turso.");
    } catch (error) {
      if (error.status === 409) await refresh().catch(() => {});
      throw error;
    } finally {
      productBusy.current = false;
      setSaving(false);
    }
  }

  function setQuantity(productId, quantity) {
    if (saleBusy.current) return;
    const product = data.products.find((item) => item.id === productId);
    if (!product || !Number.isSafeInteger(quantity) || quantity < 0)
      return notify("Ingresa una cantidad entera válida.", "danger");
    if (quantity > product.stock)
      return notify(
        `Solo hay ${product.stock} unidades disponibles de ${product.name}.`,
        "danger",
      );
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
    if (saleBusy.current) throw new Error("La venta ya se está registrando.");
    if (!cart.length) throw new Error("Agrega productos a la venta.");
    const fingerprint = JSON.stringify({ cart, payment });
    if (pendingSale.current?.fingerprint !== fingerprint)
      pendingSale.current = {
        fingerprint,
        requestId: crypto.randomUUID(),
        expectedTotal: cart.reduce(
          (sum, item) =>
            sum +
            (data.products.find((product) => product.id === item.productId)
              ?.price ?? 0) *
              item.quantity,
          0,
        ),
      };
    saleBusy.current = true;
    setSaving(true);
    try {
      const { sale } = await apiRequest("/sales", {
        method: "POST",
        body: {
          items: cart,
          payment,
          requestId: pendingSale.current.requestId,
          expectedTotal: pendingSale.current.expectedTotal,
        },
      });
      setCart([]);
      pendingSale.current = null;
      setData((previous) => ({
        sales: [sale, ...previous.sales.filter((item) => item.id !== sale.id)],
        products: previous.products.map((product) => {
          const sold = sale.items.find((item) => item.productId === product.id);
          return sold
            ? {
                ...product,
                stock: Math.max(0, product.stock - sold.quantity),
                version: product.version + 1,
              }
            : product;
        }),
      }));
      notify(`Venta ${sale.id} guardada en Turso.`);
      await refresh().catch(() => {
        notify(
          "Venta guardada. Actualiza los datos para consultar las existencias más recientes.",
          "danger",
        );
      });
      return sale;
    } catch (error) {
      if (error.status === 409) {
        pendingSale.current = null;
        await refresh().catch(() => {});
      }
      throw error;
    } finally {
      saleBusy.current = false;
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
        ...authState,
        connection,
        schemaReady,
        loading,
        loadError,
        saving,
        login,
        logout,
        saveProduct,
        setQuantity,
        registerSale,
        refresh,
        retry: () => {
          setLoading(true);
          setLoadError("");
          return initialize();
        },
        clearCart: () => {
          if (!saleBusy.current) setCart([]);
        },
        dismissNotice: () => setNotice(null),
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
}

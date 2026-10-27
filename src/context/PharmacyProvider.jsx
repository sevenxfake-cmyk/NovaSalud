import { useReducer, useState } from "react";
import { PharmacyContext } from "./pharmacy";
import { demoProducts, createDemoSales } from "../data/demo";
import { prepareSale, validateProduct } from "../lib/operations";

function reducer(state, action) {
  try {
    if (action.type === "product") {
      const product = validateProduct(action.product, state.products);
      return {
        ...state,
        products: product.id
          ? state.products.map((item) =>
              item.id === product.id ? product : item,
            )
          : [...state.products, { ...product, id: action.productId }],
        notice: {
          id: action.noticeId,
          type: "success",
          text: "Producto guardado en la demostración.",
        },
      };
    }
    if (action.type === "sale") {
      const result = prepareSale(
        state.products,
        state.cart,
        action.payment,
        action.now,
        action.saleId,
      );
      return {
        ...state,
        products: result.products,
        sales: [result.sale, ...state.sales],
        cart: [],
        notice: {
          id: action.noticeId,
          type: "success",
          text: `Venta ${result.sale.id} registrada en la demostración.`,
        },
      };
    }
    if (action.type === "cart") {
      const product = state.products.find(
        (item) => item.id === action.productId,
      );
      if (!product) throw new Error("El producto ya no está disponible.");
      if (!Number.isSafeInteger(action.quantity) || action.quantity < 0)
        throw new Error("Ingresa una cantidad entera válida.");
      if (action.quantity > product.stock)
        throw new Error(
          `Solo hay ${product.stock} unidades disponibles de ${product.name}.`,
        );
      const cart =
        action.quantity === 0
          ? state.cart.filter((item) => item.productId !== action.productId)
          : state.cart.some((item) => item.productId === action.productId)
            ? state.cart.map((item) =>
                item.productId === action.productId
                  ? { ...item, quantity: action.quantity }
                  : item,
              )
            : [
                ...state.cart,
                { productId: action.productId, quantity: action.quantity },
              ];
      return { ...state, cart };
    }
    if (action.type === "clearCart") return { ...state, cart: [] };
    if (action.type === "dismiss") return { ...state, notice: null };
  } catch (error) {
    return {
      ...state,
      notice: { id: action.noticeId, type: "danger", text: error.message },
    };
  }
  return state;
}

export function PharmacyProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => ({
    products: demoProducts.map((product) => ({ ...product })),
    sales: createDemoSales(),
    cart: [],
    notice: null,
  }));
  const [globalSearch, setGlobalSearch] = useState("");
  const send = (action) =>
    dispatch({ ...action, noticeId: crypto.randomUUID() });
  const saveProduct = (product) => {
    validateProduct(product, state.products);
    send({ type: "product", product, productId: crypto.randomUUID() });
  };
  return (
    <PharmacyContext.Provider
      value={{
        ...state,
        globalSearch,
        setGlobalSearch,
        saveProduct,
        setQuantity: (productId, quantity) =>
          send({ type: "cart", productId, quantity }),
        clearCart: () => send({ type: "clearCart" }),
        registerSale: (payment) =>
          send({
            type: "sale",
            payment,
            now: new Date(),
            saleId: `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
          }),
        dismissNotice: () => send({ type: "dismiss" }),
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
}

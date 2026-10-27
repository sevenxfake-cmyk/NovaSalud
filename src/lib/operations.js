import { categories, normalize } from "./format.js";

export function validateProduct(input, products) {
  const code = String(input.code ?? "")
    .trim()
    .toUpperCase();
  const name = String(input.name ?? "").trim();
  if (!/^[A-Z0-9-]{3,24}$/.test(code))
    throw new Error(
      "El código debe tener de 3 a 24 letras, números o guiones.",
    );
  if (
    products.some(
      (product) =>
        product.id !== input.id && normalize(product.code) === normalize(code),
    )
  )
    throw new Error("Ya existe un producto con este código.");
  if (name.length < 3 || name.length > 100)
    throw new Error("El nombre debe tener entre 3 y 100 caracteres.");
  if (!categories.includes(input.category))
    throw new Error("Selecciona una categoría válida.");
  const presentation = String(input.presentation ?? "").trim();
  if (!presentation || presentation.length > 100)
    throw new Error(
      "La presentación es obligatoria y admite hasta 100 caracteres.",
    );
  if (
    !Number.isSafeInteger(input.price) ||
    input.price < 1 ||
    input.price > 100000000
  )
    throw new Error(
      "Ingresa un precio válido mayor que cero (máximo S/ 1 000 000).",
    );
  if (
    ![input.stock, input.minStock].every(
      (value) => Number.isSafeInteger(value) && value >= 0 && value <= 1000000,
    )
  )
    throw new Error("Las existencias deben ser enteros entre 0 y 1 000 000.");
  return { ...input, code, name, presentation };
}

// Simulación en memoria, NO una transacción de base de datos.
// En la siguiente fase, esta operación debe ejecutarse íntegramente en la API.
export function prepareSale(
  products,
  cart,
  payment,
  now = new Date(),
  saleId = `DEMO-${crypto.randomUUID().slice(0, 8).toUpperCase()}`,
) {
  if (!cart.length) throw new Error("Agrega al menos un producto a la venta.");
  if (!["Efectivo", "Yape / Plin", "Tarjeta"].includes(payment))
    throw new Error("Selecciona un medio de pago válido.");
  const seen = new Set();
  const items = cart.map(({ productId, quantity }) => {
    const product = products.find((item) => item.id === productId);
    if (!product || seen.has(productId))
      throw new Error("Revisa los productos de la venta.");
    seen.add(productId);
    if (!Number.isSafeInteger(quantity) || quantity < 1)
      throw new Error(
        "Las cantidades deben ser números enteros mayores que cero.",
      );
    if (quantity > product.stock)
      throw new Error(
        `Stock insuficiente para ${product.name}. Disponible: ${product.stock}.`,
      );
    return {
      productId,
      name: product.name,
      code: product.code,
      quantity,
      price: product.price,
      subtotal: product.price * quantity,
    };
  });
  const total = items.reduce((sum, item) => sum + item.subtotal, 0);
  if (!Number.isSafeInteger(total))
    throw new Error("El importe de la venta supera el límite permitido.");
  return {
    products: products.map((product) => ({
      ...product,
      stock:
        product.stock -
        (items.find((item) => item.productId === product.id)?.quantity ?? 0),
    })),
    sale: {
      id: saleId,
      date: now.toISOString(),
      items,
      total,
      payment,
      demo: true,
    },
  };
}

export const money = (cents) =>
  new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(
    cents / 100,
  );
export const number = (value) => new Intl.NumberFormat("es-PE").format(value);
export const dayKey = (date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
export const dateLabel = (date, options = {}) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    day: "2-digit",
    month: "short",
    year: "numeric",
    ...options,
  }).format(new Date(date));
export const timeLabel = (date) =>
  new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
export const normalize = (text) =>
  text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
export const matchesProduct = (product, query) =>
  normalize(`${product.name} ${product.code} ${product.category}`).includes(
    normalize(query),
  );
export const stockStatus = (product) =>
  product.stock === 0
    ? "out"
    : product.stock <= product.minStock
      ? "low"
      : "ok";
export const categories = [
  "Analgésicos",
  "Antibióticos",
  "Antialérgicos",
  "Gastrointestinales",
  "Vitaminas",
  "Cuidado personal",
];

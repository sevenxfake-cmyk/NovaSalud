import { inTransaction } from "./db.js";
import { migrateAccounts } from "./account-schema.js";

export const SCHEMA_VERSION = 3;

const statements = [
  `CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS usuarios (
    id TEXT PRIMARY KEY NOT NULL,
    usuario TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(usuario) BETWEEN 3 AND 40),
    password_hash TEXT NOT NULL,
    rol TEXT NOT NULL CHECK(rol IN ('admin', 'vendedor')),
    creado_en TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS productos (
    id TEXT PRIMARY KEY NOT NULL,
    codigo TEXT NOT NULL COLLATE NOCASE UNIQUE CHECK(length(codigo) BETWEEN 3 AND 24),
    nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 3 AND 100),
    categoria TEXT NOT NULL CHECK(categoria IN ('Analgésicos','Antibióticos','Antialérgicos','Gastrointestinales','Vitaminas','Cuidado personal')),
    presentacion TEXT NOT NULL CHECK(length(presentacion) BETWEEN 1 AND 100),
    precio_centimos INTEGER NOT NULL CHECK(typeof(precio_centimos) = 'integer' AND precio_centimos BETWEEN 1 AND 100000000),
    stock INTEGER NOT NULL CHECK(typeof(stock) = 'integer' AND stock BETWEEN 0 AND 1000000),
    stock_minimo INTEGER NOT NULL CHECK(typeof(stock_minimo) = 'integer' AND stock_minimo BETWEEN 0 AND 1000000),
    version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0),
    creado_en TEXT NOT NULL,
    actualizado_en TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS ventas (
    id TEXT PRIMARY KEY NOT NULL,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
    fecha TEXT NOT NULL,
    total_centimos INTEGER NOT NULL CHECK(typeof(total_centimos) = 'integer' AND total_centimos > 0),
    medio_pago TEXT NOT NULL CHECK(medio_pago IN ('Efectivo','Yape / Plin','Tarjeta')),
    clave_idempotencia TEXT NOT NULL UNIQUE,
    solicitud_hash TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS detalle_ventas (
    id TEXT PRIMARY KEY NOT NULL,
    venta_id TEXT NOT NULL REFERENCES ventas(id) ON DELETE RESTRICT,
    producto_id TEXT NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    codigo_historico TEXT NOT NULL,
    nombre_historico TEXT NOT NULL,
    cantidad INTEGER NOT NULL CHECK(typeof(cantidad) = 'integer' AND cantidad BETWEEN 1 AND 1000000),
    precio_unitario_centimos INTEGER NOT NULL CHECK(typeof(precio_unitario_centimos) = 'integer' AND precio_unitario_centimos > 0),
    subtotal_centimos INTEGER NOT NULL CHECK(typeof(subtotal_centimos) = 'integer' AND subtotal_centimos = cantidad * precio_unitario_centimos),
    UNIQUE(venta_id, producto_id)
  )`,
  `CREATE TABLE IF NOT EXISTS sesiones (
    token_hash TEXT PRIMARY KEY NOT NULL,
    usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    expira_en INTEGER NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS intentos_login (
    identificador TEXT PRIMARY KEY NOT NULL,
    fallos INTEGER NOT NULL DEFAULT 0,
    bloqueado_hasta INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(fecha DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_detalle_venta ON detalle_ventas(venta_id)`,
  `CREATE INDEX IF NOT EXISTS idx_sesiones_expira ON sesiones(expira_en)`,
];

export async function migrate(db, { legacyOnly = false } = {}) {
  const exists = await db.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name='schema_migrations'",
  );
  if (exists.rows.length) {
    const current = await db.execute({
      sql: "SELECT version FROM schema_migrations WHERE version=?",
      args: [SCHEMA_VERSION],
    });
    if (current.rows.length) return;
  }
  await db.batch(
    [
      ...statements,
      {
        sql: "INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)",
        args: [1, new Date().toISOString()],
      },
    ],
    "write",
  );
  await inTransaction(db, async (tx) => {
    const applied = await tx.execute({
      sql: "SELECT version FROM schema_migrations WHERE version=?",
      args: [2],
    });
    if (applied.rows.length) return;
    const columns = await tx.batch([
      "PRAGMA table_info(productos)",
      "PRAGMA table_info(ventas)",
    ]);
    if (!columns[0].rows.some((column) => column.name === "es_demo"))
      await tx.execute(
        "ALTER TABLE productos ADD COLUMN es_demo INTEGER NOT NULL DEFAULT 0 CHECK(es_demo IN (0,1))",
      );
    if (!columns[1].rows.some((column) => column.name === "es_demo"))
      await tx.execute(
        "ALTER TABLE ventas ADD COLUMN es_demo INTEGER NOT NULL DEFAULT 0 CHECK(es_demo IN (0,1))",
      );
    await tx.execute({
      sql: "INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)",
      args: [2, new Date().toISOString()],
    });
  });
  if (!legacyOnly) await migrateAccounts(db);
}

export async function health(db) {
  const ping = await db.execute("SELECT 1 AS ok");
  if (Number(ping.rows[0]?.ok) !== 1) throw new Error("Health check failed");
  let schemaReady = false;
  try {
    const version = await db.execute({
      sql: "SELECT version FROM schema_migrations WHERE version = ?",
      args: [SCHEMA_VERSION],
    });
    schemaReady = version.rows.length === 1;
  } catch {
    /* Conexión válida, pero aún no se ha migrado el esquema. */
  }
  return { connected: true, schemaReady };
}

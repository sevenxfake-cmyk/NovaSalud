// Tablas nuevas para que las funciones antiguas sin filtro no puedan consultar
// los inventarios privados después de la migración.
export async function migrateAccounts(db) {
  const owner =
    "(SELECT id FROM usuarios ORDER BY CASE rol WHEN 'admin' THEN 0 ELSE 1 END, creado_en,id LIMIT 1)";
  await db.migrate([
    `CREATE TABLE _nova_backup_v2_productos AS SELECT * FROM productos`,
    `CREATE TABLE _nova_backup_v2_ventas AS SELECT * FROM ventas`,
    `CREATE TABLE _nova_backup_v2_detalle AS SELECT * FROM detalle_ventas`,
    `CREATE TABLE productos_cuenta (
      id TEXT PRIMARY KEY NOT NULL,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
      codigo TEXT NOT NULL COLLATE NOCASE CHECK(length(codigo) BETWEEN 3 AND 24),
      nombre TEXT NOT NULL CHECK(length(nombre) BETWEEN 3 AND 100),
      categoria TEXT NOT NULL CHECK(categoria IN ('Analgésicos','Antibióticos','Antialérgicos','Gastrointestinales','Vitaminas','Cuidado personal')),
      presentacion TEXT NOT NULL CHECK(length(presentacion) BETWEEN 1 AND 100),
      precio_centimos INTEGER NOT NULL CHECK(typeof(precio_centimos)='integer' AND precio_centimos BETWEEN 1 AND 100000000),
      stock INTEGER NOT NULL CHECK(typeof(stock)='integer' AND stock BETWEEN 0 AND 1000000),
      stock_minimo INTEGER NOT NULL CHECK(typeof(stock_minimo)='integer' AND stock_minimo BETWEEN 0 AND 1000000),
      version INTEGER NOT NULL DEFAULT 1 CHECK(version>0),
      creado_en TEXT NOT NULL, actualizado_en TEXT NOT NULL,
      es_demo INTEGER NOT NULL DEFAULT 0 CHECK(es_demo IN (0,1)),
      UNIQUE(usuario_id,codigo), UNIQUE(id,usuario_id)
    )`,
    `CREATE TABLE ventas_cuenta (
      id TEXT PRIMARY KEY NOT NULL,
      usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT,
      fecha TEXT NOT NULL,
      total_centimos INTEGER NOT NULL CHECK(typeof(total_centimos)='integer' AND total_centimos>0),
      medio_pago TEXT NOT NULL CHECK(medio_pago IN ('Efectivo','Yape / Plin','Tarjeta')),
      clave_idempotencia TEXT NOT NULL, solicitud_hash TEXT NOT NULL,
      es_demo INTEGER NOT NULL DEFAULT 0 CHECK(es_demo IN (0,1)),
      UNIQUE(usuario_id,clave_idempotencia), UNIQUE(id,usuario_id)
    )`,
    `CREATE TABLE detalle_cuenta (
      id TEXT PRIMARY KEY NOT NULL, usuario_id TEXT NOT NULL,
      venta_id TEXT NOT NULL, producto_id TEXT NOT NULL,
      codigo_historico TEXT NOT NULL, nombre_historico TEXT NOT NULL,
      cantidad INTEGER NOT NULL CHECK(typeof(cantidad)='integer' AND cantidad BETWEEN 1 AND 1000000),
      precio_unitario_centimos INTEGER NOT NULL CHECK(typeof(precio_unitario_centimos)='integer' AND precio_unitario_centimos>0),
      subtotal_centimos INTEGER NOT NULL CHECK(typeof(subtotal_centimos)='integer' AND subtotal_centimos=cantidad*precio_unitario_centimos),
      UNIQUE(venta_id,producto_id),
      FOREIGN KEY(venta_id,usuario_id) REFERENCES ventas_cuenta(id,usuario_id) ON DELETE RESTRICT,
      FOREIGN KEY(producto_id,usuario_id) REFERENCES productos_cuenta(id,usuario_id) ON DELETE RESTRICT
    )`,
    `CREATE TEMP TABLE _nova_product_map(old_id TEXT NOT NULL, usuario_id TEXT NOT NULL, new_id TEXT NOT NULL, PRIMARY KEY(old_id,usuario_id))`,
    // Para instalaciones antiguas con varios usuarios se conserva una copia del
    // catálogo compartido por cuenta, relacionando cada venta con su propietario.
    `INSERT INTO _nova_product_map SELECT p.id,u.id,CASE WHEN u.id=${owner} THEN p.id ELSE lower(hex(randomblob(16))) END FROM productos p CROSS JOIN usuarios u`,
    `INSERT INTO productos_cuenta SELECT m.new_id,m.usuario_id,p.codigo,p.nombre,p.categoria,p.presentacion,p.precio_centimos,p.stock,p.stock_minimo,p.version,p.creado_en,p.actualizado_en,p.es_demo FROM productos p JOIN _nova_product_map m ON m.old_id=p.id`,
    `INSERT INTO ventas_cuenta SELECT id,usuario_id,fecha,total_centimos,medio_pago,clave_idempotencia,solicitud_hash,es_demo FROM ventas`,
    `INSERT INTO detalle_cuenta SELECT d.id,v.usuario_id,d.venta_id,m.new_id,d.codigo_historico,d.nombre_historico,d.cantidad,d.precio_unitario_centimos,d.subtotal_centimos FROM detalle_ventas d JOIN ventas v ON v.id=d.venta_id JOIN _nova_product_map m ON m.old_id=d.producto_id AND m.usuario_id=v.usuario_id`,
    `CREATE TEMP TABLE _nova_migration_guard(ok INTEGER CHECK(ok=1))`,
    `INSERT INTO _nova_migration_guard SELECT CASE WHEN (SELECT COUNT(*) FROM detalle_cuenta)=(SELECT COUNT(*) FROM detalle_ventas) AND (SELECT COUNT(*) FROM ventas_cuenta)=(SELECT COUNT(*) FROM ventas) AND (SELECT COUNT(*) FROM productos_cuenta)=(SELECT COUNT(*) FROM productos)*(SELECT COUNT(*) FROM usuarios) AND ((SELECT COUNT(*) FROM productos)=0 OR (SELECT COUNT(*) FROM usuarios)>0) THEN 1 ELSE 0 END`,
    `DROP TABLE detalle_ventas`,
    `DROP TABLE ventas`,
    `DROP TABLE productos`,
    `INSERT INTO _nova_migration_guard SELECT CASE WHEN COUNT(*)=0 THEN 1 ELSE 0 END FROM pragma_foreign_key_check`,
    `DROP TABLE _nova_migration_guard`,
    `DROP TABLE _nova_product_map`,
    `CREATE INDEX idx_productos_cuenta_usuario ON productos_cuenta(usuario_id,nombre)`,
    `CREATE INDEX idx_ventas_cuenta_usuario ON ventas_cuenta(usuario_id,fecha DESC)`,
    `CREATE INDEX idx_detalle_cuenta_usuario ON detalle_cuenta(usuario_id,venta_id)`,
    `CREATE TABLE intentos_registro(identificador TEXT PRIMARY KEY NOT NULL, ventana INTEGER NOT NULL, intentos INTEGER NOT NULL)`,
    {
      sql: "INSERT INTO schema_migrations(version,applied_at) VALUES (?,?)",
      args: [3, new Date().toISOString()],
    },
  ]);
}

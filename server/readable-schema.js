import { inTransaction } from "./db.js";

// Capa de consulta para el operador de Turso. La API conserva sus tablas y
// filtros por cuenta; estas vistas no conceden acceso a los usuarios de la app.
const views = [
  `CREATE VIEW consulta_inventario AS
    SELECT u.usuario AS cuenta, p.codigo, p.nombre AS medicamento,
      p.categoria, p.presentacion,
      p.precio_centimos / 100.0 AS precio_soles,
      p.stock AS unidades_disponibles, p.stock_minimo AS minimo_recomendado,
      CASE WHEN p.stock = 0 THEN 'Agotado'
        WHEN p.stock <= p.stock_minimo THEN 'Stock bajo'
        ELSE 'Disponible' END AS estado_stock,
      CASE p.es_demo WHEN 1 THEN 'Demostración' ELSE 'Registrado' END AS origen,
      datetime(p.actualizado_en, '-5 hours') AS actualizado_hora_peru,
      p.id AS producto_id, p.usuario_id
    FROM productos_cuenta p JOIN usuarios u ON u.id = p.usuario_id`,
  `CREATE VIEW consulta_ventas AS
    SELECT u.usuario AS cuenta, v.id AS venta_id,
      datetime(v.fecha, '-5 hours') AS fecha_hora_peru,
      v.medio_pago, v.total_centimos / 100.0 AS total_soles,
      (SELECT COUNT(*) FROM detalle_cuenta d
        WHERE d.venta_id = v.id AND d.usuario_id = v.usuario_id) AS productos_distintos,
      COALESCE((SELECT SUM(d.cantidad) FROM detalle_cuenta d
        WHERE d.venta_id = v.id AND d.usuario_id = v.usuario_id), 0) AS unidades_vendidas,
      CASE v.es_demo WHEN 1 THEN 'Demostración' ELSE 'Registrado' END AS origen,
      v.usuario_id
    FROM ventas_cuenta v JOIN usuarios u ON u.id = v.usuario_id`,
  `CREATE VIEW consulta_detalle_ventas AS
    SELECT u.usuario AS cuenta, d.venta_id,
      datetime(v.fecha, '-5 hours') AS fecha_hora_peru,
      d.codigo_historico AS codigo_vendido,
      d.nombre_historico AS medicamento_vendido, d.cantidad,
      d.precio_unitario_centimos / 100.0 AS precio_unitario_soles,
      d.subtotal_centimos / 100.0 AS subtotal_soles,
      d.producto_id, d.usuario_id
    FROM detalle_cuenta d
    JOIN ventas_cuenta v ON v.id = d.venta_id AND v.usuario_id = d.usuario_id
    JOIN usuarios u ON u.id = d.usuario_id`,
  `CREATE VIEW consulta_resumen_cuentas AS
    WITH inventario AS (
      SELECT usuario_id, COUNT(*) AS productos, SUM(stock) AS unidades,
        SUM(CASE WHEN stock = 0 THEN 1 ELSE 0 END) AS agotados,
        SUM(CASE WHEN stock > 0 AND stock <= stock_minimo THEN 1 ELSE 0 END) AS stock_bajo
      FROM productos_cuenta GROUP BY usuario_id
    ), ventas AS (
      SELECT usuario_id, COUNT(*) AS operaciones, SUM(total_centimos) AS importe
      FROM ventas_cuenta GROUP BY usuario_id
    )
    SELECT u.usuario AS cuenta, u.rol,
      COALESCE(i.productos, 0) AS productos_registrados,
      COALESCE(i.unidades, 0) AS unidades_disponibles,
      COALESCE(i.agotados, 0) AS productos_agotados,
      COALESCE(i.stock_bajo, 0) AS productos_stock_bajo,
      COALESCE(v.operaciones, 0) AS ventas_registradas,
      COALESCE(v.importe, 0) / 100.0 AS total_vendido_soles,
      datetime(u.creado_en, '-5 hours') AS registro_hora_peru, u.id AS usuario_id
    FROM usuarios u
    LEFT JOIN inventario i ON i.usuario_id = u.id
    LEFT JOIN ventas v ON v.usuario_id = u.id`,
  `CREATE VIEW guia_base_datos AS
    SELECT 'consulta_inventario' AS objeto, 'Consulta' AS tipo,
      'Medicamentos por cuenta, precios en soles y alertas de existencias.' AS descripcion
    UNION ALL SELECT 'consulta_ventas', 'Consulta', 'Una fila por venta: cuenta, fecha de Perú, pago e importe en soles.'
    UNION ALL SELECT 'consulta_detalle_ventas', 'Consulta', 'Una fila por medicamento vendido; conserva el nombre y precio de esa venta.'
    UNION ALL SELECT 'consulta_resumen_cuentas', 'Consulta', 'Totales de inventario y ventas por usuario; incluye demostraciones.'
    UNION ALL SELECT 'usuarios', 'Operación', 'Cuentas y credenciales protegidas. Para consultar cuentas, usar consulta_resumen_cuentas.'
    UNION ALL SELECT 'productos_cuenta', 'Operación', 'Inventario privado por usuario. Precios guardados en céntimos enteros.'
    UNION ALL SELECT 'ventas_cuenta', 'Operación', 'Cabecera de cada venta. Total en céntimos y control de reintentos.'
    UNION ALL SELECT 'detalle_cuenta', 'Operación', 'Medicamentos y cantidades de cada venta, relacionados con la misma cuenta.'
    UNION ALL SELECT 'sesiones', 'Técnica', 'Sesiones de acceso y vencimientos. Gestionada por el servidor.'
    UNION ALL SELECT 'intentos_login', 'Técnica', 'Control de intentos de inicio de sesión.'
    UNION ALL SELECT 'intentos_registro', 'Técnica', 'Control de frecuencia de creación de cuentas.'
    UNION ALL SELECT 'schema_migrations', 'Técnica', 'Versiones de las migraciones aplicadas y fecha UTC.'
    UNION ALL SELECT '_nova_backup_v2_*', 'Respaldo', 'Copias históricas anteriores a la separación por cuentas; no son el inventario actual.'`,
];

export async function migrateReadableViews(db) {
  await inTransaction(db, async (tx) => {
    const applied = await tx.execute(
      "SELECT version FROM schema_migrations WHERE version = 4",
    );
    if (applied.rows.length) return;
    for (const sql of views) await tx.execute(sql);
    await tx.execute({
      sql: "INSERT INTO schema_migrations(version, applied_at) VALUES (?, ?)",
      args: [4, new Date().toISOString()],
    });
  });
}

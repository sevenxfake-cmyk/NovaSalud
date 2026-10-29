# Consultar Turso con facilidad

En el editor SQL de Turso, empieza por esta guía:

```sql
SELECT * FROM guia_base_datos ORDER BY tipo, objeto;
```

Las vistas `consulta_*` muestran los registros actuales con nombres explicativos.
Se actualizan automáticamente al registrar productos o ventas; no son copias.

| Vista | Qué muestra |
| --- | --- |
| `consulta_inventario` | Cuenta, medicamento, precio en soles, unidades y estado del stock. |
| `consulta_ventas` | Una fila por venta, con cuenta, fecha, pago, importe y unidades vendidas. |
| `consulta_detalle_ventas` | Cada medicamento vendido, cantidad, precio y subtotal históricos. |
| `consulta_resumen_cuentas` | Inventario, alertas y ventas acumuladas de cada cuenta, incluso las vacías. |
| `guia_base_datos` | Descripción de las vistas, tablas operativas, tablas técnicas y respaldos. |

## Consultas listas para usar

```sql
-- Inventario agrupado por cuenta y medicamento.
SELECT * FROM consulta_inventario ORDER BY cuenta, medicamento;

-- Productos que necesitan atención.
SELECT cuenta, codigo, medicamento, unidades_disponibles,
       minimo_recomendado, estado_stock
FROM consulta_inventario
WHERE estado_stock IN ('Agotado', 'Stock bajo')
ORDER BY cuenta, unidades_disponibles, medicamento;

-- Ventas más recientes, con importes en soles.
SELECT * FROM consulta_ventas ORDER BY fecha_hora_peru DESC, venta_id DESC LIMIT 50;

-- Medicamentos incluidos en una venta: reemplaza el identificador.
SELECT * FROM consulta_detalle_ventas
WHERE venta_id = 'ID_DE_LA_VENTA';

-- Resumen general.
SELECT * FROM consulta_resumen_cuentas ORDER BY cuenta;

-- Solo una cuenta: reemplaza el nombre de ejemplo.
SELECT * FROM consulta_inventario WHERE cuenta = 'mi-usuario' COLLATE NOCASE;
```

## Cómo interpretar los datos

- Los campos terminados en `_soles` son importes numéricos en PEN: `15.5` significa S/ 15.50. Las tablas originales conservan céntimos enteros para los cálculos.
- Las fechas terminadas en `_hora_peru` están en UTC−5, formato `AAAA-MM-DD HH:MM:SS`. Los registros originales conservan la fecha UTC.
- **Agotado:** cero unidades. **Stock bajo:** más de cero y hasta el mínimo recomendado inclusive. **Disponible:** por encima del mínimo.
- **Demostración** identifica registros de ejemplo. **Registrado** identifica los demás. Los totales del resumen incluyen ambos.
- `productos_registrados` cuenta medicamentos distintos; `unidades_disponibles` suma sus existencias. `total_vendido_soles` suma ventas, no ganancias ni cobros procesados.
- El detalle conserva el nombre y precio de cuando se hizo la venta, aunque después se edite el medicamento.
- Los identificadores completos se conservan para relacionar registros sin confundir cuentas o ventas.

## Tablas y relaciones

```text
usuarios ──< productos_cuenta
usuarios ──< ventas_cuenta ──< detalle_cuenta >── productos_cuenta
usuarios ──< sesiones
```

Cada producto pertenece a una cuenta. Cada detalle se relaciona con una venta y
un producto de esa misma cuenta mediante claves foráneas compuestas.

Las vistas son de solo lectura. Para registrar o editar productos y ventas,
utiliza la aplicación, que valida los cambios y actualiza el stock en transacciones.
El operador con acceso SQL a Turso puede ver todas las cuentas; estas vistas no
son un mecanismo de autorización. La API sigue filtrando por la sesión del usuario.
Las vistas no muestran hashes de contraseñas, tokens ni claves de reintentos.

Las tablas `_nova_backup_v2_*` son respaldos históricos de la migración anterior.
No representan el inventario actual. `sesiones`, `intentos_login`,
`intentos_registro` y `schema_migrations` son tablas técnicas gestionadas por el servidor.

## Aplicar la mejora

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
```

La migración V4 agrega cinco vistas y registra su versión. No renombra ni elimina
tablas, no modifica productos ni ventas y se puede ejecutar varias veces.

# Verificación · Fases 1 y 2

## Comandos

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run dev -- --host 127.0.0.1
```

## Reglas verificadas automáticamente

- Cálculo de subtotales y total a partir del catálogo, usando céntimos enteros.
- Descuento de stock y conservación del nombre/precio histórico.
- Rechazo de stock insuficiente sin modificación parcial de productos.
- Venta de las últimas unidades y rechazo de otra venta sobre el resultado actualizado.
- Rechazo de carrito vacío, productos inexistentes, agotados y duplicados.
- Rechazo de cantidades negativas, cero, fracciones, valores no finitos y medios de pago inválidos.
- Normalización y unicidad del código de producto.
- Límites y validación de precio, stock, categoría y presentación.
- Alertas cuando el stock es cero o igual al mínimo.
- Búsqueda por categoría, código y nombre sin distinguir tildes o mayúsculas.
- Fechas agrupadas por el día de Lima en el cambio de día UTC.

Estas pruebas usan objetos en memoria: **no prueban transacciones ni concurrencia de Turso**.

## Recorridos de interfaz verificados automáticamente

Cuatro pruebas adicionales montan la aplicación React con jsdom y la transformación JSX de Vite:

- Navegación por las cinco pantallas y búsqueda por categoría sin tildes.
- Alta de un producto, rechazo de código duplicado, cierre con Escape y retorno del foco.
- Producto agotado deshabilitado, rechazo de cantidad superior al stock, confirmación de venta, descuento de inventario y consulta del detalle.
- Reposición de un producto agotado y actualización de alertas e indicadores del resumen.

**Resultado: 14 pruebas aprobadas (10 de reglas y 4 de interfaz).** Las pruebas se ejecutan de forma secuencial, con límite de 256 MB de heap por proceso y tiempo máximo de 20 segundos por prueba. El entorno DOM usa `FormData` de jsdom para representar formularios del navegador. No se inspeccionan objetos DOM completos en las aserciones, ya que sus referencias circulares pueden consumir mucha memoria al informar un fallo.

Estas pruebas no miden el aspecto visual, el tamaño real de los controles ni la adaptación gráfica en un navegador.

## Comprobaciones de ejecución

La compilación de producción y ESLint deben terminar sin errores. Vite debe iniciar y servir el punto de entrada de React con HTTP 200 en `/`, `/inventario`, `/alertas`, `/ventas` y `/historial`. Una respuesta HTTP 200 no demuestra por sí sola que una pantalla se renderice correctamente.

## Revisión visual pendiente

Se intentó abrir la aplicación en Chrome mediante control del equipo. La herramienta detuvo la operación porque no pudo determinar con suficiente confianza la URL del navegador para aplicar sus reglas. No se completó una inspección visual ni se capturaron pantallas. La revisión visual de escritorio y móvil sigue pendiente.

## Recorrido manual de aceptación

1. Abrir el resumen y comprobar que la franja identifica los datos como demostración.
2. Ir al inventario, buscar `analgesicos` y comprobar la coincidencia con la categoría acentuada.
3. Crear un producto con código nuevo y verificar que aparece en la tabla.
4. Intentar reutilizar ese código y comprobar el mensaje de error.
5. Cambiar el stock a cero y verificar que el producto aparece como agotado en alertas.
6. Reponerlo por encima del mínimo y verificar que desaparece de alertas.
7. Preparar una venta con dos productos, modificar cantidades y comprobar el total.
8. Intentar superar el stock disponible y comprobar que no se acepta la cantidad.
9. Confirmar la venta; comprobar que se vacía el carrito, baja el stock y aparece en el historial.
10. Abrir el detalle y verificar nombres, cantidades, precios, subtotales y total.
11. Cambiar el precio del producto y verificar que el detalle de la venta anterior conserva su precio.
12. Probar búsqueda, fechas y paginación en historial, incluido un rango de fechas invertido.
13. Recargar una ruta y comprobar que carga React. Los datos volverán al ejemplo inicial en esta etapa.
14. Revisar a 390 px y 1440 px, abrir/cerrar el menú móvil y comprobar tablas desplazables horizontalmente.
15. Recorrer formularios con teclado; cerrar modales con Escape y verificar el retorno del foco.

## Pendiente con el backend

Persistencia tras recarga/cierre/despliegue, autenticación y roles, sesiones seguras, validaciones del servidor, consultas parametrizadas, rollback de ventas fallidas, venta concurrente de las últimas unidades, idempotencia ante reintentos, errores de red y configuración de Vercel. No se conectó una base de datos real en esta entrega.

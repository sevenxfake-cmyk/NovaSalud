# Historial de cambios · NOVA SALUD

## Entrega inicial · Fases 1 y 2 · 27 de octubre de 2026

### Funciones incorporadas

- Interfaz de gestión para botica con React, Vite, Bootstrap 5 y React Router.
- Resumen con indicadores de ventas e inventario, gráfico por período y accesos a los módulos.
- Inventario con búsqueda, filtros, registro y edición de productos.
- Alertas calculadas automáticamente para productos con stock bajo o agotado.
- Venta de demostración con carrito, cantidades, confirmación, cálculo en céntimos y descuento de existencias.
- Historial con búsqueda, fechas de Lima, paginación y detalle de cada venta.
- Formularios con validaciones, modales con manejo de foco, notificaciones y navegación adaptable.

### Documentación y configuración

- README con instalación en Windows, estructura, alcance y siguientes fases.
- Documentación SENATI con problema, objetivos, arquitectura y modelo relacional previsto.
- Registro de pruebas y limitaciones conocidas.
- Exclusión de dependencias instaladas, compilación y credenciales privadas mediante `.gitignore`.
- Plantilla `.env.example` sin credenciales, reservada para la futura API.

### Verificación realizada

- 14 pruebas aprobadas: 10 de reglas y 4 de interacción con React y jsdom.
- ESLint sin errores y compilación de producción correcta.
- Inicio de Vite y respuesta HTTP 200 en las cinco rutas principales.
- Pruebas secuenciales con límite de memoria y tiempo para reducir el consumo de recursos.

### Pendiente

- Inspección visual completa de escritorio y móvil: la herramienta de control del navegador bloqueó esa comprobación.
- API REST mediante Vercel Functions, esquema SQL y conexión real con Turso.
- Persistencia, autenticación, roles y sesiones seguras.
- Transacciones SQL y pruebas de ventas concurrentes.
- Despliegue en Vercel y respuestas a las preguntas guía cuando se disponga de su contenido literal.

Los datos son ficticios y se conservan únicamente en memoria durante la sesión. Esta entrega no debe usarse para registrar ventas reales.

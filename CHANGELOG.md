# Historial de cambios · NOVA SALUD

## Publicación en Vercel · 27 de octubre de 2026

- Aplicación publicada en https://novasalud.vercel.app con Vite y Node 24.
- Variables de Turso configuradas como secretos de Production y repositorio GitHub vinculado a `main`.
- Verificación HTTPS real de acceso, cookie segura, inventario persistente, ventas, historial, idempotencia, concurrencia y rutas.
- Comando `test:public` con registros temporales y limpieza limitada a esa ejecución.
- Documentación de la presentación desde otra PC, con enlace público y alta inicial del administrador desde el equipo local.

## Conexión real con Turso · 27 de octubre de 2026

- API Node compatible con Vercel Functions y ejecución local integrada en Vite.
- Cliente privado @libsql/client, migración repetible y relaciones SQL de productos, ventas, detalles, usuarios y sesiones.
- Inventario persistente con alta, edición y consultas; conflictos de edición protegidos mediante versiones.
- Ventas transaccionales con validación de stock/precios, rollback e idempotencia.
- Sesiones HttpOnly, hashes scrypt, roles y creación inicial del administrador solo localmente.
- Indicador Turso conectado basado en una consulta real, sin recurrir a datos ficticios.
- Diseño existente conservado; formularios preparados para esperar la respuesta del servidor.
- 28 pruebas locales aprobadas y prueba real de persistencia, rollback, stock insuficiente, concurrencia e idempotencia en Turso.
- Variables privadas excluidas de Git y comprobación del frontend compilado sin credenciales ni SDK.
- Configuración y documentación de Vercel preparadas; despliegue real pendiente.

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

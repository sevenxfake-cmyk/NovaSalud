# Verificación · Backend y Turso

## Comandos

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run check:private
npm.cmd run test:remote
npm.cmd run dev
```

## Pruebas automáticas locales: 28 aprobadas

Los archivos se ejecutan uno por uno, con 256 MB de heap y 20 segundos por prueba. Estas pruebas no conectan con la base remota.

- 12 pruebas de SQL/HTTP y seguridad: migraciones repetibles, restricciones y relaciones, edición por versión, transacciones, rollback después de descontar stock, idempotencia, concurrencia, sesiones, roles, alta inicial solo local, bloqueo temporal y mensajes sin datos privados.
- 6 pruebas de interfaz: navegación y búsqueda, registro/duplicados y foco, venta e historial, reposición, formulario conservado ante error del servidor y ausencia de Turso conectado si falla la consulta.
- 10 pruebas de reglas y formatos: validación de precios/cantidades/códigos, importes, alertas y fechas de Lima.

Las pruebas de interfaz utilizan medicamentos ficticios en SQL en memoria y una sesión simulada. La aplicación real no carga esos datos.

## Comprobación real en Turso

`npm run db:check` completó una consulta SELECT real y verificó el esquema.

`npm run test:remote` completó:

1. Alta de un producto temporal identificado como PRUEBA AUTOMATIZADA.
2. Fallo intencional de una venta después de descontar stock, al referenciar un usuario inexistente; rollback comprobado.
3. Edición del medicamento y lectura persistente desde otro cliente.
4. Rechazo de una venta superior al stock.
5. Dos ventas simultáneas desde clientes independientes sobre la última unidad: solo una se guardó.
6. Reintento de la solicitud ganadora: mismo ID de venta y un solo descuento.
7. Retirada de los registros técnicos de esa ejecución mediante claves exactas.

El script no imprime URL, tokens, hashes de sesión ni contraseñas. La limpieza está limitada al usuario UUID y al producto/código de la ejecución. Si falla, informa que se revisen los registros temporales antes de repetir la prueba.

La ejecución final pasó íntegramente. Esto no implica que la red nunca pueda fallar: los reintentos usan una clave idempotente y los errores se muestran sin simular un guardado.

## Prueba manual de persistencia

Crear un medicamento en Inventario, esperar la confirmación, recargar y comprobar que sigue presente. Editarlo, guardar, reiniciar Vite e iniciar sesión: la edición debe conservarse.

La primera vez se crea el administrador desde el acceso local. El usuario queda en Turso; no se generan credenciales predeterminadas.

## Credenciales

- `git check-ignore .env.local` devuelve la ruta ignorada.
- `git ls-files -- .env.local` no devuelve archivos.
- `npm run check:private` analiza el build para confirmar que el token, la URL privada y el SDK no están en el frontend.
- Los errores internos del SDK se traducen a mensajes públicos sin imprimir el error original.
- La migración no inserta medicamentos, ventas ni administradores ficticios.

## Limitaciones

La inspección visual completa de Chrome y móvil sigue pendiente: la herramienta de control del navegador bloqueó la revisión anterior al no poder verificar la URL. Los recorridos DOM no sustituyen esa comprobación.

La ejecución local y los manejadores están verificados; la configuración de Vercel está preparada, pero no se ha publicado ni comprobado un despliegue real. No se procesan pagos ni se emiten comprobantes fiscales.

Quedan como ampliaciones la administración visual de cuentas adicionales, recuperación de acceso, auditoría detallada de reposiciones y copias de seguridad operativas.

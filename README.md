# NOVA SALUD

Sistema de gestión de botica · Trabajo final SENATI, PIAD-527.

Inventario, alertas y ventas conectados a **Turso Cloud** mediante una API Node compatible con Vercel Functions. Se conserva el diseño existente con React, Vite, Bootstrap 5 y React Router.

Repositorio: [sevenxfake-cmyk/NovaSalud](https://github.com/sevenxfake-cmyk/NovaSalud).

## Ejecutar localmente

Usar Node 22.19 o posterior compatible con Vite; se verificó con Node 26.12.1. Desde la carpeta NOVA_SALUD:

```powershell
npm.cmd ci
npm.cmd run db:migrate
npm.cmd run db:check
npm.cmd run dev
```

Abrir la URL indicada por Vite, normalmente [http://127.0.0.1:5173](http://127.0.0.1:5173).

Si otro servidor ocupa el puerto 5173, ejecutar `npm.cmd run dev -- --port 5174` y abrir la dirección nueva. Reiniciar el proceso de desarrollo después de cambiar las variables privadas; una instancia iniciada anteriormente puede conservar la configuración antigua.

`npm.cmd run dev` inicia **frontend y funciones API en un solo proceso**, mediante middleware de Vite que reutiliza los manejadores del backend. No hace falta una segunda terminal, Express, Vercel CLI ni un archivo SQLite local.

Se utiliza `npm.cmd` para evitar el bloqueo de `npm.ps1` en la política actual de PowerShell. Los comandos de servidor utilizan `--use-system-ca` para validar TLS con los certificados del sistema; no se desactiva la validación.

### Configuración privada

El archivo `.env.local` debe contener:

```dotenv
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

Completar los valores reales en el equipo, tomando como plantilla `.env.example`. No pegarlos en el chat, no publicarlos en GitHub y no utilizar el prefijo `VITE_`. La aplicación solo acepta una conexión remota segura `libsql://` o `https://`. Las credenciales se leen únicamente en el servidor.

`.env.local` ya está ignorado por Git. Comprobarlo con `git check-ignore .env.local`. `git ls-files -- .env.local` debe devolver una salida vacía.

### Primer acceso

La primera vez, la aplicación muestra **Configura tu administrador**. Crear un usuario y una contraseña de 12 a 128 caracteres. No hay cuentas ni contraseñas predeterminadas.

Este alta inicial solo se permite desde el servidor local, con conexión de bucle local y mientras la tabla de usuarios esté vacía. En Vercel está desactivada. El administrador creado localmente queda guardado en la misma base de Turso y podrá iniciar sesión después del despliegue.

Las contraseñas se guardan con scrypt y sal aleatoria. Las sesiones duran 8 horas, utilizan una cookie HttpOnly y SameSite=Strict, y guardan en SQL únicamente el hash del token. En producción la cookie también usa Secure. No se necesita `SESSION_SECRET` para este esquema de sesiones opacas.

## Probar que los medicamentos persisten

1. Ejecutar los comandos anteriores y acceder a la aplicación.
2. Crear el administrador si aún no existe.
3. Ir a **Inventario → Nuevo producto** y registrar un medicamento con código único, nombre, presentación, precio y existencias.
4. Esperar la confirmación **Producto guardado permanentemente en Turso**.
5. Recargar la página: el medicamento debe seguir en la tabla.
6. Editar el stock o precio, guardar y recargar otra vez.
7. Detener Vite con Ctrl+C, ejecutar de nuevo `npm.cmd run dev` e iniciar sesión si fuera necesario: el registro debe conservarse.

La base de datos empieza vacía: las migraciones **no insertan medicamentos ni ventas de demostración**. El frontend tampoco recurre a datos ficticios si falla la API; muestra el error.

**Turso conectado** se muestra únicamente después de que `/api/health` complete una consulta real a la base de datos. Tener variables de entorno configuradas no basta para mostrar ese estado.

## Probar una venta

1. Registrar un producto con una unidad de stock.
2. Ir a **Nueva venta**, añadir esa presentación y confirmar el total.
3. El servidor consulta sus precios actuales, valida cantidades y guarda la cabecera, el detalle y el descuento de stock en una transacción.
4. Consultar historial e inventario: debe existir una venta y quedar stock cero.
5. El producto agotado no se puede añadir de nuevo. Si otro usuario agotó el stock antes, el servidor rechaza la operación con HTTP 409.
6. Una venta fallida no deja cabecera, detalles ni descuentos parciales.

Los importes se almacenan en céntimos enteros. La unidad de stock corresponde a la presentación completa indicada en el producto. El medio de pago es informativo: no se procesa un pago ni se emite un comprobante fiscal.

## Seguridad y consistencia

- Consultas parametrizadas y restricciones SQL de unicidad, tipos, importes y existencias.
- Roles: administrador para registrar/editar inventario; administrador o vendedor para consultar y vender.
- Validación de origen y contenido JSON para modificar datos.
- Protección temporal tras cinco intentos fallidos de contraseña.
- Descuento condicionado a `stock >= cantidad` en una transacción de escritura.
- Rollback completo si falla cualquier paso, incluso después del descuento.
- Clave idempotente para que el reintento de una venta no duplique registros.
- Verificación del total confirmado para detectar precios cambiados por otro usuario.
- Versión del producto para evitar que una edición antigua sobrescriba existencias descontadas por una venta.
- Errores públicos sin SQL, tokens, URL privada ni detalles internos.
- Datos persistentes en Turso; no se utiliza localStorage como base de datos.

## Rutas y API

| Pantalla              | Ruta          |
| --------------------- | ------------- |
| Resumen general       | `/`           |
| Inventario            | `/inventario` |
| Alertas de reposición | `/alertas`    |
| Nueva venta           | `/ventas`     |
| Historial y detalle   | `/historial`  |

| Endpoint        | Métodos           | Acceso                                                                  |
| --------------- | ----------------- | ----------------------------------------------------------------------- |
| `/api/health`   | GET               | Verificación pública sin datos privados.                                |
| `/api/auth`     | GET, POST, DELETE | Sesión, alta inicial local, acceso y salida.                            |
| `/api/state`    | GET               | Inventario e historial coherentes, con sesión.                          |
| `/api/products` | GET, POST, PATCH  | Lectura autenticada; escritura de administrador. Edición con `?id=...`. |
| `/api/sales`    | GET, POST         | Consulta y registro transaccional autenticados.                         |

## Estructura

```text
api/             Entradas de Vercel Functions
server/          Cliente privado, esquema, sesiones, HTTP y servicios SQL
scripts/         Migraciones y comprobaciones sin revelar credenciales
src/components/  Componentes y formularios existentes; acceso y conexión
src/context/     Carga y operaciones asíncronas mediante API
src/lib/         Cliente HTTP público, formatos y validaciones
src/pages/       Cinco pantallas existentes
src/data/        Fixtures para pruebas; no se cargan en la aplicación real
tests/           Pruebas SQL, HTTP, interfaz y reglas
docs/            Documentación SENATI y verificaciones
vercel.json      Build y rutas frontend sin interceptar /api
```

`@libsql/client` se importa en el servidor y en pruebas, nunca en componentes React ni en el cliente HTTP público.

## Verificaciones

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run check:private
npm.cmd run test:remote
```

`npm test` ejecuta **28 pruebas** secuenciales con límite de memoria: SQL en memoria, HTTP, formularios y reglas. No utiliza la base remota ni sus credenciales.

`test:remote` es una comprobación **explícita contra Turso**. Crea un medicamento y un usuario técnicos temporales, verifica alta/edición, lectura con otro cliente, rollback, stock insuficiente, dos ventas simultáneas e idempotencia. Al finalizar retira exclusivamente los registros de esa ejecución. No borra medicamentos del usuario.

La prueba remota pasó contra la base configurada. Las operaciones de red pueden fallar: la interfaz conserva el error y permite reintentar una venta con su clave idempotente.

`check:private` comprueba la exclusión de entornos privados y busca las credenciales reales y el SDK en el frontend compilado, sin mostrar esos valores.

## Publicación en Vercel

Para usar la CLI sin instalarla globalmente: `npm.cmd run vercel -- login`. Completar el inicio de sesión personalmente en el navegador. Después se pueden ejecutar comandos con `npm.cmd run vercel -- <comando>`. Este asistente conserva la validación TLS con certificados del sistema y obtiene la CLI desde npm.

1. Importar el repositorio en Vercel usando la configuración Vite.
2. Configurar `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN` como variables privadas del proyecto.
3. Ejecutar las migraciones y crear el primer administrador localmente contra esa misma base antes de usar el despliegue.
4. Build: `npm run build`; salida: `dist`. Las funciones están en `api/`.
5. Confirmar la conexión en `/api/health`, la recarga de rutas y los flujos de acceso, inventario y ventas.

No se almacena SQLite modificable en Vercel. Esta entrega prepara el despliegue, pero no publica ni verifica una instancia real.

Consultar [la guía de presentación desde otra PC](docs/PRESENTACION.md) para preparar el enlace y demostrar la persistencia.

## Documentación y GitHub

- [Documentación SENATI](docs/SENATI.md)
- [Pruebas y límites](docs/PRUEBAS.md)
- [Historial de cambios](CHANGELOG.md)

Para subir cambios posteriores, revisar `git status`, seleccionar archivos, crear un commit descriptivo y ejecutar `git push origin main`. Los entornos privados y archivos generados permanecen excluidos.

Falta el contenido literal de las cinco preguntas guía PIAD-527 para responderlas sin inventarlas. El nombre del proyecto se mantiene como NOVA SALUD.

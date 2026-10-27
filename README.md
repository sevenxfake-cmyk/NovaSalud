# NOVA SALUD

Sistema web de gestión para la botica Nova Salud · Trabajo final SENATI, PIAD-527.

## Estado de esta entrega

**Fases 1 y 2 implementadas.** Interfaz React funcional con Bootstrap 5, navegación y operaciones de demostración en memoria. **Todavía no hay API, autenticación ni conexión con Turso. No usar para ventas reales.**

Una franja visible identifica el modo de demostración. Los productos y las ventas son ficticios. Los cambios se comparten entre pantallas mientras la aplicación está abierta, pero se reinician al recargar. No se utiliza localStorage ni sessionStorage como base de datos.

## Inspección inicial

La carpeta existente contenía la plantilla de React + Vite, con contador y logotipos: `src/App.jsx`, `src/App.css`, `src/index.css`, `src/main.jsx`, tres recursos en `src/assets/`, dos SVG en `public/`, `index.html`, configuración de Vite y ESLint, `package.json`, lockfile y README. No había módulos de negocio, API, configuración de Turso, variables de entorno ni directorio `.git`.

Dependencias encontradas: React/React DOM 19.3.1, Bootstrap 5.3.8, Vite 8.3.5 y ESLint 10.13.0, además de las dependencias de la plantilla. Se conservaron sus versiones. Se incorporaron React Router, Bootstrap Icons y jsdom para verificar la interfaz. Las versiones exactas están en `package-lock.json`.

Se reemplazaron las pantallas y estilos de bienvenida de la plantilla para implementar la aplicación. Los recursos originales se conservaron.

## Ejecutar en Windows

Requisito: una versión de Node compatible con el Vite instalado. En este equipo se verificó con Node 26.12.1 y npm 11.20.0.

Desde la carpeta `NOVA_SALUD`:

```powershell
npm.cmd ci
npm.cmd run dev
```

Abrir la dirección que indique Vite, normalmente [http://localhost:5173](http://localhost:5173).

Se utiliza `npm.cmd` porque la política actual de PowerShell bloquea `npm.ps1`. No es necesario cambiar la política de seguridad. En CMD u otra terminal compatible también puede usarse `npm run dev`.

Si npm presenta `UNABLE_TO_VERIFY_LEAF_SIGNATURE` y el certificado está instalado en Windows, ejecutar npm con `node --use-system-ca` usando la ruta local de `npm-cli.js`. En este equipo:

```powershell
node --use-system-ca 'D:\Nodejs\node_modules\npm\bin\npm-cli.js' ci
```

Esto mantiene la validación TLS y utiliza el almacén de certificados del sistema.

## Pantallas y funciones disponibles

| Ruta          | Funciones de demostración                                                                                                             |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `/`           | Indicadores calculados desde el estado actual, gráfico de ventas de 7/14 días, distribución del inventario, últimas ventas y alertas. |
| `/inventario` | Búsqueda por código, nombre o categoría; filtros; alta y edición en modal; stock mínimo y validaciones.                               |
| `/alertas`    | Productos agotados o con stock menor o igual al mínimo; filtros; acceso a reposición mediante edición.                                |
| `/ventas`     | Catálogo, carrito, cantidades, subtotales, medio de pago informativo, confirmación y descuento de stock.                              |
| `/historial`  | Búsqueda por número/producto, fechas inclusivas de Lima, paginación y detalle histórico de cada venta.                                |

También se implementaron navegación móvil, estados vacíos, notificaciones de éxito/error, etiquetas accesibles, enlace para saltar al contenido, manejo de foco y cierre de modales con Escape. La revisión visual en navegador sigue pendiente; no se afirma validación visual completa.

El precio corresponde a la **presentación completa** de cada producto, y el stock se expresa en esas presentaciones. No se calculan impuestos adicionales ni se emiten comprobantes fiscales. Seleccionar un medio de pago no procesa un pago.

Las ventas iniciales sirven para mostrar el historial y no reconstruyen el stock de apertura. Las ventas nuevas sí lo descuentan. Todas son de demostración.

## Verificación

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run preview
```

Las pruebas verifican reglas de inventario y venta, búsquedas y fechas, además de los recorridos automatizados de interfaz indicados en [PRUEBAS.md](docs/PRUEBAS.md). La transacción de Turso, la concurrencia entre usuarios y la persistencia **no están implementadas ni verificadas**.

El comando de pruebas ejecuta los archivos uno por uno y limita la memoria del heap a 256 MB y cada prueba a 20 segundos.

## Archivos modificados y añadidos

| Archivos | Cambio |
| --- | --- |
| `package.json`, `package-lock.json` | React Router, Bootstrap Icons, jsdom y comando de pruebas. |
| `index.html`, `src/main.jsx` | Idioma español, título, favicon e importación de Bootstrap e iconos. |
| `src/App.jsx`, `src/App.css`, `src/index.css` | Rutas, estructura visual y estilos adaptables de NOVA SALUD. |
| `src/components/Layout.jsx`, `UI.jsx`, `ProductForm.jsx` | Menú, cabecera, avisos, componentes, modales y formulario de productos. |
| `src/pages/Dashboard.jsx`, `Inventory.jsx`, `Alerts.jsx`, `Sales.jsx`, `History.jsx`, `NotFound.jsx` | Cinco pantallas y página de ruta inexistente. |
| `src/context/PharmacyProvider.jsx`, `pharmacy.js` | Estado compartido de demostración y operaciones. |
| `src/data/demo.js`, `src/lib/format.js`, `operations.js` | Datos ficticios, formatos, búsquedas y reglas de inventario/ventas. |
| `public/nova-salud.svg` | Marca y favicon propios. |
| `tests/operations.test.js`, `tests/interface.test.js` | Pruebas de reglas y recorridos de interfaz. |
| `.gitignore`, `.env.example` | Exclusión de credenciales y plantilla vacía para la futura API. |
| `README.md`, `docs/SENATI.md`, `docs/PRUEBAS.md` | Instalación, inspección inicial, alcance y documentación. |

## Estructura

```text
src/
  components/     Navegación, componentes visuales y formulario de producto
  context/        Estado de demostración compartido y operaciones
  data/           Productos y ventas ficticios identificados como demostración
  lib/            Formatos, búsquedas y validaciones reutilizables
  pages/          Resumen, inventario, alertas, ventas, historial y página 404
tests/            Pruebas con el ejecutor integrado de Node
docs/             Documentación técnica, alcance y verificaciones
public/           Marca NOVA SALUD y recursos originales conservados
```

## Siguientes fases

1. **Fase 3:** implementar esquema SQL, migraciones y API en Vercel Functions.
2. **Fase 4:** conectar el cliente oficial de Turso; reemplazar el estado de demostración por consultas persistentes.
3. **Fase 5:** trasladar las alertas a los datos reales.
4. **Fase 6:** registrar ventas y detalles en una transacción de escritura; descontar stock con validación atómica en el servidor.
5. **Fase 7:** autenticación real, hashes seguros, sesiones HttpOnly y autorización por rol. La validación del navegador debe repetirse en el servidor.
6. **Fase 8:** probar persistencia y concurrencia contra Turso, verificar visualmente escritorio y móvil, configurar rutas de Vercel y publicar con las cuentas del propietario.

Para esas fases, copiar `.env.example` a `.env.local` y configurar **solo en el servidor** `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` y un `SESSION_SECRET` aleatorio y robusto. Esta entrega no consume esas variables. No pegarlas en el chat, no usar prefijo `VITE_` y no subirlas al repositorio. `.gitignore` excluye archivos de entorno privados.

Repositorio del proyecto: [sevenxfake-cmyk/NovaSalud](https://github.com/sevenxfake-cmyk/NovaSalud). Esta entrega corresponde a las fases 1 y 2. Los cambios y verificaciones están descritos en [CHANGELOG.md](CHANGELOG.md).

Todavía no se desplegó el proyecto. La configuración de Vercel se hará junto con las funciones API para que las rutas del frontend no intercepten las peticiones `/api`.

## Trabajar con GitHub

Para descargar el proyecto en otro equipo:

```powershell
git clone https://github.com/sevenxfake-cmyk/NovaSalud.git
cd NovaSalud
npm.cmd ci
npm.cmd run dev
```

Para subir cambios posteriores desde esta carpeta:

```powershell
git status
git add src docs README.md
git diff --cached --stat
git commit -m "feat: describir el cambio realizado"
git push origin main
```

Seleccionar en `git add` los archivos que correspondan a cada cambio. `node_modules`, `dist`, `.vercel` y los archivos de entorno privados están excluidos. `.env.example` contiene únicamente nombres de variables vacíos y sí forma parte del repositorio. El push publica el código en GitHub; el despliegue de la aplicación en Vercel es una etapa independiente.

## Documentación SENATI

- [Problema, propuesta y diseño técnico](docs/SENATI.md)
- [Pruebas y limitaciones de esta entrega](docs/PRUEBAS.md)

El texto recibido menciona cinco preguntas guía del documento PIAD-527, pero no incluye su redacción. **Sus respuestas quedan pendientes de disponer del documento original; no se han inventado preguntas.** El proyecto mantiene el nombre NOVA SALUD aunque el documento mencione FarmaPlus.

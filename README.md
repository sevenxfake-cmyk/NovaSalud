# 💊 NOVA SALUD

**Tu botica organizada, desde cualquier lugar.**

Una aplicación web para gestionar medicamentos, controlar existencias y registrar ventas. Cada usuario tiene su propio inventario y puede continuar trabajando desde otra computadora: sus datos permanecen guardados en Turso.

🌐 **[Abrir NOVA SALUD](https://novasalud.vercel.app)** · [Guía para presentar el proyecto](docs/PRESENTACION.md) · [Documentación SENATI](docs/SENATI.md)

Desarrollado como trabajo final del curso **Fullstack Developer Software de SENATI · PIAD-527**.

## ✨ ¿Qué puedes hacer?

- **Crear tu cuenta** con usuario y contraseña.
- **Gestionar tu inventario:** registrar, buscar y editar medicamentos, precios y cantidades.
- **Detectar faltantes:** alertas de productos con stock bajo o agotado.
- **Registrar ventas:** seleccionar productos, ajustar cantidades y confirmar el total.
- **Consultar el historial** y abrir o imprimir los comprobantes internos.
- **Elegir modo claro o nocturno** con el botón de luna/sol de la barra superior.

Cada cuenta nueva recibe **10 productos de demostración propios** y comienza sin ventas. Los cambios de una cuenta no afectan a las demás.

> Las boletas de demostración son ejemplos académicos **sin validez fiscal**. El sistema no procesa pagos ni emite comprobantes electrónicos.

## 🚀 Empieza a usarlo

1. Entra a **[novasalud.vercel.app](https://novasalud.vercel.app)**.
2. Selecciona **Crear cuenta**.
3. Elige un usuario y una contraseña de entre **12 y 128 caracteres**. Repite la contraseña para confirmar.
4. ¡Listo! Ya puedes explorar tu inventario y registrar tu primera venta.

¿Ya tienes una cuenta? Selecciona **Iniciar sesión** y usa tus mismas credenciales.

**Desde otra PC funciona igual:** abre el enlace e inicia sesión. Para utilizar la aplicación no necesitas entrar a GitHub, Turso ni Vercel, ni instalar Node.js en esa computadora.

## 💾 Tus datos se conservan

Los productos, las existencias y las ventas se guardan en **Turso Cloud**, no en la memoria del navegador.

Puedes comprobarlo así:

1. Registra un medicamento en **Inventario → Nuevo producto**.
2. Espera el mensaje de guardado.
3. Recarga la página: el medicamento seguirá allí.
4. Registra una venta y consulta **Historial de ventas**.
5. Cierra sesión y vuelve a entrar: recuperarás tus productos y movimientos.

Si entras con la misma cuenta desde otro equipo, encontrarás el mismo inventario. Tu computadora de desarrollo puede estar apagada: Vercel ejecuta la aplicación y Turso conserva los registros.

La etiqueta **Turso conectado** aparece después de completar una consulta real a la base de datos.

## 🛠️ Tecnologías

| Parte del sistema | Tecnologías                                        |
| ----------------- | -------------------------------------------------- |
| Interfaz          | React, JavaScript, JSX y Vite                      |
| Diseño            | Bootstrap 5, Bootstrap Icons y CSS personalizado   |
| Navegación        | React Router                                       |
| Backend           | Node.js y API REST compatible con Vercel Functions |
| Base de datos     | Turso Cloud y cliente oficial `@libsql/client`     |
| Publicación       | GitHub y Vercel                                    |
| Pruebas           | `node:test` y jsdom                                |

## 💻 Ejecutarlo en tu equipo

Necesitas **Node.js 22.19 o posterior compatible con Vite**. El proyecto se verificó con Node 26.12.1.

### 1. Descarga e instala

```powershell
git clone https://github.com/sevenxfake-cmyk/NovaSalud.git
cd NovaSalud
npm.cmd ci
```

Si ya tienes la carpeta `NOVA_SALUD`, abre una terminal dentro de ella.

### 2. Configura la conexión

Copia `.env.example` a `.env.local` y completa estos valores con las credenciales de tu base de Turso:

```dotenv
TURSO_DATABASE_URL=
TURSO_AUTH_TOKEN=
```

🔒 **Guarda estas credenciales solo en el servidor.** No las publiques en GitHub, no las compartas por el chat y no uses el prefijo `VITE_`. `.env.local` está excluido de Git.

### 3. Prepara la base e inicia la aplicación

```powershell
npm.cmd run db:migrate
npm.cmd run db:check
npm.cmd run dev
```

Abre la dirección que indique Vite, normalmente **[http://127.0.0.1:5173](http://127.0.0.1:5173)**.

Si el puerto está ocupado:

```powershell
npm.cmd run dev -- --port 5174
```

El comando de desarrollo inicia **la interfaz y la API en un solo proceso**. Reinicia ese proceso cuando cambies las variables privadas.

> En Windows usamos `npm.cmd` para evitar el bloqueo de `npm.ps1` en PowerShell. Los comandos del servidor utilizan los certificados del sistema mediante `--use-system-ca`, manteniendo la validación TLS.

## 🧪 Verificar el proyecto

Las comprobaciones locales no utilizan tu base remota:

```powershell
npm.cmd test
npm.cmd run lint
npm.cmd run build
npm.cmd run check:private
```

La suite incluye **42 pruebas** de registro, separación de cuentas, inventario, ventas, migraciones, formularios, boletas y modo nocturno. Se ejecutan de forma secuencial y con límites de memoria y tiempo.

<details>
<summary>Ver pruebas contra Turso y el sitio publicado</summary>

Estas comprobaciones sí acceden a servicios reales y crean registros técnicos temporales. Al terminar, retiran únicamente los registros de su propia ejecución.

```powershell
npm.cmd run test:remote
npm.cmd run test:public -- https://novasalud.vercel.app
npm.cmd run test:accounts -- https://novasalud.vercel.app
```

La prueba de cuentas registra dos usuarios temporales y verifica que no puedan editar ni vender productos ajenos. También comprueba que cada uno recupere su inventario al volver a iniciar sesión.

Consulta los resultados, alcances y límites en [PRUEBAS.md](docs/PRUEBAS.md).

</details>

## 📁 Estructura del proyecto

```text
api/              Funciones API para Vercel
server/           Conexión privada, sesiones, validaciones y servicios SQL
scripts/          Migraciones, carga de ejemplos y verificaciones
src/components/   Formularios, navegación y componentes reutilizables
src/context/      Estado de la aplicación y comunicación con la API
src/lib/          Formatos, validaciones y cliente HTTP
src/pages/        Resumen, inventario, alertas, ventas e historial
src/data/         Datos académicos para pruebas y catálogos iniciales
tests/            Pruebas automatizadas
docs/             Documentación técnica y guía de presentación
vercel.json       Configuración de publicación y rutas
```

<details>
<summary>Seguridad, API y funcionamiento de las ventas</summary>

### Protección de las cuentas

- Contraseñas con hash **scrypt** y sal aleatoria.
- Sesiones de 8 horas con cookies **HttpOnly**, **SameSite=Strict** y **Secure** en producción.
- Inventario e historial filtrados por el usuario de la sesión.
- Roles limitados al inventario de su propia cuenta.
- Validación del servidor, consultas parametrizadas y restricciones SQL.
- Claves foráneas compuestas para impedir referencias entre cuentas.
- Límites temporales de registros e intentos de acceso.
- Errores públicos sin credenciales ni detalles internos.

El cliente SQL se utiliza únicamente en el backend. El navegador guarda en localStorage solo la preferencia visual del tema.

### Ventas consistentes

El servidor consulta los precios actuales, valida las cantidades y registra la venta, sus detalles y el descuento de stock **en una misma transacción**. Si algo falla, revierte la operación completa.

Una clave idempotente evita duplicar la venta al reintentar. El control de versiones impide que una edición antigua sobrescriba existencias ya modificadas.

Los importes se almacenan en céntimos enteros. Cada unidad de stock corresponde a la presentación indicada en el producto; el medio de pago es informativo.

### Endpoints

| Endpoint        | Métodos           | Función                                            |
| --------------- | ----------------- | -------------------------------------------------- |
| `/api/health`   | GET               | Comprobar la conexión y el esquema                 |
| `/api/auth`     | GET, POST, DELETE | Registro, inicio y cierre de sesión                |
| `/api/state`    | GET               | Recuperar los datos de la cuenta                   |
| `/api/products` | GET, POST, PATCH  | Consultar, registrar y editar medicamentos propios |
| `/api/sales`    | GET, POST         | Consultar y registrar ventas propias               |

</details>

<details>
<summary>Despliegue, migraciones y datos de demostración</summary>

### Publicación en Vercel

El proyecto está conectado a la rama `main` de este repositorio. La configuración utiliza:

- Framework: **Vite**.
- Build: `npm run build`.
- Carpeta de salida: `dist`.
- Funciones: `api/`.
- Variables privadas de Production: `TURSO_DATABASE_URL` y `TURSO_AUTH_TOKEN`.

Para autenticar la CLI:

```powershell
npm.cmd run vercel -- login
```

Completa la autorización personalmente en el navegador. Después puedes usar `npm.cmd run vercel -- <comando>`.

### Migraciones

`npm.cmd run db:migrate` prepara o actualiza el esquema. La migración de inventarios individuales conserva respaldos SQL en `_nova_backup_v2_*`, verifica las relaciones y traslada los registros a las tablas privadas por cuenta. Esos respaldos no están expuestos por la API.

Los usuarios anteriores conservan sus credenciales y registros. No se almacena un archivo SQLite modificable dentro de Vercel Functions.

### Ejemplos académicos

El registro de una cuenta crea automáticamente sus diez productos de ejemplo. La carga histórica de boletas del propietario original puede reproducirse con:

```powershell
npm.cmd run db:seed-demo
```

Este comando está pensado para el operador del proyecto: carga los ejemplos del administrador original, no los de la cuenta abierta en el navegador. No duplica las boletas ni restablece el stock al repetirlo.

Consulta el catálogo y sus importes en [DATOS_DEMO.md](docs/DATOS_DEMO.md).

</details>

## 📚 Documentación SENATI

- [Problema, objetivos, arquitectura y modelo de datos](docs/SENATI.md)
- [Guía para presentar desde otra computadora](docs/PRESENTACION.md)
- [Pruebas y limitaciones](docs/PRUEBAS.md)
- [Productos y boletas de demostración](docs/DATOS_DEMO.md)
- [Historial de cambios](CHANGELOG.md)

Las cinco preguntas guía del documento PIAD-527 siguen pendientes de su contenido literal para responderlas fielmente. El proyecto conserva el nombre **NOVA SALUD**.

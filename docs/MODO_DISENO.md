# Modo diseño de NOVA SALUD (sin Turso)

Esta guía está dirigida a Jeremy y a quienes trabajan en la apariencia de la aplicación.

## Iniciar una vista previa sin credenciales

Necesitas Node.js compatible con Vite y Git. En PowerShell de Windows:

```powershell
git clone https://github.com/sevenxfake-cmyk/NovaSalud.git
cd NovaSalud
git switch feature/jeremy-interfaz
npm.cmd ci
npm.cmd run dev:ui
```

Abre la dirección local que anuncie Vite (normalmente http://127.0.0.1:5173).

No hace falta crear `.env.local`, copiar tokens ni conectarse a Turso.

## Qué funciona

- Acceso directo a las pantallas de resumen, inventario, alertas, ventas e historial.
- Edición de JSX, CSS, Bootstrap, estilos y modo nocturno con recarga en caliente.
- Datos académicos iniciales para ver tarjetas, tablas y estadísticas.
- Alta/edición de productos y ventas **simuladas en memoria** para probar la interfaz.
- Desde el menú de cierre de sesión puedes ver la pantalla de acceso; iniciar sesión es simulado y no requiere contraseña real.

## Límites y seguridad

- Este modo NO se conecta a Turso, NO crea usuarios ni modifica registros reales.
- Al recargar el navegador se restablecen los datos ficticios.
- La pantalla identifica expresamente el modo diseño; no confundirlo con la conexión real.
- **No compartas ni subas tokens a GitHub.** `.env.local` debe continuar fuera del control de versiones.
- El modo normal (`npm.cmd run dev`) mantiene la API real y necesita su propia conexión privada a Turso.
- El modo de diseño se activa únicamente con `npm run dev:ui` en el servidor de desarrollo Vite. La compilación normal de Vercel continúa con el proveedor real.

## Guardar tus cambios de interfaz

```powershell
git add .
git commit -m "style: mejorar interfaz de NovaSalud"
git push -u origin feature/jeremy-interfaz
```

Para enviar commits a la rama del repositorio original, Jeremy debe aceptar antes la invitación de colaborador con acceso de escritura. También puede trabajar en un fork y abrir un Pull Request.

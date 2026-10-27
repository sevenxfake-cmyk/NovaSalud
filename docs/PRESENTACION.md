# Presentar NOVA SALUD desde otra computadora

El profesor podrá abrir la URL pública del proyecto publicado en Vercel e iniciar sesión en NOVA SALUD. Su computadora solo necesita navegador e internet. El inventario y las ventas se guardan en Turso Cloud, independientemente del equipo desde el que se acceda.

**Enlace publicado y verificado: [https://novasalud.vercel.app](https://novasalud.vercel.app).**

## Preparación antes de la presentación

1. Crear el primer administrador desde la ejecución local de NOVA SALUD. Usar credenciales elegidas por el propietario; no existen claves predeterminadas.
2. Subir a GitHub la versión que incluye API y Turso. La primera entrega de interfaz de demostración no tiene persistencia remota.
3. Iniciar sesión en Vercel y conectar el proyecto con el repositorio sevenxfake-cmyk/NovaSalud.
4. Configurar TURSO_DATABASE_URL y TURSO_AUTH_TOKEN como variables privadas del entorno Production, con los mismos valores de la base ya migrada. No subir .env.local.
5. Desplegar el proyecto con Vite, build npm run build y salida dist. Las funciones están en api/.
6. Abrir la URL pública, verificar Turso conectado, iniciar sesión y realizar el recorrido de prueba.

Para iniciar sesión en la CLI desde esta carpeta:

```powershell
npm.cmd run vercel -- login
```

El inicio de sesión y la autorización de la cuenta se completan personalmente en el navegador. El comando no requiere añadir tokens a los archivos del proyecto.

## Demostración sugerida

1. Abrir el enlace público de Vercel desde la PC del profesor.
2. Iniciar sesión con el usuario de NOVA SALUD.
3. Registrar un medicamento con código único y stock de tres presentaciones.
4. Recargar la página y mostrar que el medicamento sigue presente.
5. Editar el precio o el mínimo, guardar y volver a recargar.
6. Registrar una venta de dos presentaciones y consultar su detalle en el historial.
7. Recargar inventario e historial: el stock debe ser uno y la venta debe seguir registrada.
8. Intentar vender dos presentaciones cuando queda una y mostrar el rechazo por stock insuficiente.
9. Cerrar sesión, volver a entrar y mostrar que los registros siguen disponibles.

El mismo inventario se verá al abrir la aplicación desde otro equipo. La computadora donde se desarrolló el proyecto puede estar apagada: Vercel ejecuta la aplicación y Turso conserva la base de datos.

## Qué demuestra la recarga

React vuelve a consultar la API con una sesión válida. La API lee Turso y devuelve los registros guardados. La persistencia no depende de la memoria del navegador ni de localStorage. Un nuevo despliegue conserva la información mientras utilice la misma base de Turso.

El panel de Vercel se utiliza para administrar el despliegue; la demostración al profesor se realiza en la URL pública de NOVA SALUD. No es necesario instalar Node, Git ni el proyecto en su PC.

## Estado

El despliegue está publicado y se verificaron sus flujos reales de API: acceso con cookie segura, alta/edición y lectura persistente, ventas, historial, idempotencia, concurrencia y recarga de rutas. La cuenta y los medicamentos técnicos utilizados se retiraron al terminar. El propietario debe crear su administrador definitivo desde la aplicación local; esa cuenta se guarda en la misma base y permite entrar al enlace público sin volver a desplegar.

import { loadServerEnv, newDatabaseClient } from "../server/db.js";
import { health, migrate } from "../server/schema.js";
import { publicError } from "../server/errors.js";

let db;
try {
  loadServerEnv();
  db = newDatabaseClient();
  if (process.argv[2] === "migrate") {
    await migrate(db);
    console.log(
      "Esquema NOVA SALUD preparado. No se insertaron datos de demostración.",
    );
  }
  const result = await health(db);
  console.log(
    result.connected
      ? "Turso conectado: consulta real verificada."
      : "Turso sin conexión.",
  );
  console.log(
    result.schemaReady
      ? "Esquema de base de datos actualizado."
      : "Ejecuta npm run db:migrate para crear las tablas.",
  );
  if (!result.schemaReady) process.exitCode = 1;
} catch (error) {
  console.error(publicError(error).message);
  process.exitCode = 1;
} finally {
  db?.close();
}

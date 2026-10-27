import { loadServerEnv, newDatabaseClient } from "../server/db.js";
import { migrate } from "../server/schema.js";
import { seedPresentation } from "../server/demo-seed.js";
import { publicError } from "../server/errors.js";

let db;
try {
  loadServerEnv();
  db = newDatabaseClient();
  await migrate(db);
  const result = await seedPresentation(db);
  console.log(`Productos de demostración añadidos: ${result.createdProducts}.`);
  console.log(
    `Boletas de demostración añadidas: ${result.createdSales}. Ya existentes: ${result.skippedSales}.`,
  );
  console.log(
    "Los registros permanecen en Turso. Los ejemplos no tienen validez fiscal.",
  );
} catch (error) {
  console.error(publicError(error).message);
  process.exitCode = 1;
} finally {
  db?.close();
}

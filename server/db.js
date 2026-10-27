import { createClient } from "@libsql/client";
import { existsSync } from "node:fs";
import { AppError } from "./errors.js";

let client;

export function loadServerEnv() {
  try {
    if (!process.env.VERCEL && existsSync(".env.local"))
      process.loadEnvFile(".env.local");
  } catch {
    throw new AppError(
      503,
      "No se pudo cargar la configuración privada del servidor.",
    );
  }
}

export function newDatabaseClient() {
  const url = process.env.TURSO_DATABASE_URL?.trim();
  const authToken = process.env.TURSO_AUTH_TOKEN?.trim();
  if (!url || !authToken)
    throw new AppError(
      503,
      "Faltan variables privadas de Turso en el servidor.",
    );
  try {
    const parsed = new URL(url);
    if (
      !["libsql:", "https:"].includes(parsed.protocol) ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    )
      throw new Error();
  } catch {
    throw new AppError(
      503,
      "La configuración de la conexión de Turso no es válida.",
    );
  }
  return createClient({ url, authToken, intMode: "number", concurrency: 4 });
}

export function getDatabase() {
  client ??= newDatabaseClient();
  return client;
}

export async function inTransaction(db, work, mode = "write") {
  const tx = await db.transaction(mode);
  try {
    const pragma = await tx.execute("PRAGMA foreign_keys");
    if (Number(pragma.rows[0]?.foreign_keys) !== 1)
      throw new AppError(
        503,
        "La base de datos debe tener habilitadas las claves foráneas.",
      );
    const result = await work(tx);
    await tx.commit();
    return result;
  } catch (error) {
    try {
      await tx.rollback();
    } catch {
      /* No ocultar el error original. */
    }
    throw error;
  } finally {
    tx.close();
  }
}

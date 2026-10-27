import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { loadServerEnv } from "../server/db.js";

function files(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory()
      ? files(join(directory, entry.name))
      : [join(directory, entry.name)],
  );
}

try {
  loadServerEnv();
  const ignored = spawnSync("git", ["check-ignore", ".env.local"], {
    encoding: "utf8",
    windowsHide: true,
  });
  const tracked = spawnSync("git", ["ls-files", "--", ".env", ".env.*"], {
    encoding: "utf8",
    windowsHide: true,
  });
  if (
    ignored.status !== 0 ||
    tracked.stdout
      .split(/\r?\n/)
      .some((name) => name && name !== ".env.example")
  )
    throw new Error();
  const secrets = [
    process.env.TURSO_DATABASE_URL,
    process.env.TURSO_AUTH_TOKEN,
  ].map((value) => value?.trim()).filter(Boolean);
  if (secrets.length !== 2) throw new Error();
  const sourceFiles = spawnSync('git', ['ls-files', '-z'], { encoding: 'utf8', windowsHide: true });
  if (sourceFiles.status !== 0) throw new Error();
  for (const file of sourceFiles.stdout.split('\0').filter(Boolean)) {
    const contents = readFileSync(file);
    if (secrets.some((secret) => contents.includes(Buffer.from(secret)))) throw new Error();
  }
  for (const file of files("dist")) {
    if (!/\.(js|css|html|map)$/.test(file)) continue;
    const contents = readFileSync(file, "utf8");
    if (
      secrets.some((secret) => contents.includes(secret)) ||
      /@libsql\/client|TURSO_AUTH_TOKEN|TURSO_DATABASE_URL/.test(contents)
    )
      throw new Error();
  }
  console.log(
    "Verificación aprobada: entorno privado excluido de Git y credenciales/SDK ausentes del frontend compilado.",
  );
} catch {
  console.error(
    "No se pudo validar la separación de credenciales. Revisa Git y genera dist con npm run build. No publiques hasta completar esta comprobación.",
  );
  process.exitCode = 1;
}

import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { AppError } from "./errors.js";
import { inTransaction } from "./db.js";

const derive = promisify(scrypt);
export const hashToken = (value) =>
  createHash("sha256").update(value).digest("hex");
export const COOKIE = "nova_session";
const LIFETIME = 8 * 60 * 60;

function credentials(input) {
  if (
    typeof input?.username !== "string" ||
    !/^[A-Za-z0-9_.-]{3,40}$/.test(input.username.trim())
  )
    throw new AppError(
      400,
      "El usuario debe tener de 3 a 40 letras, números, puntos, guiones o guiones bajos.",
    );
  if (
    typeof input.password !== "string" ||
    input.password.length < 12 ||
    input.password.length > 128
  )
    throw new AppError(
      400,
      "La contraseña debe tener entre 12 y 128 caracteres.",
    );
  return {
    username: input.username.trim().toLowerCase(),
    password: input.password,
  };
}

export async function passwordHash(
  password,
  salt = randomBytes(32).toString("hex"),
) {
  const key = await derive(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 33554432,
  });
  return `scrypt:${salt}:${key.toString("hex")}`;
}

async function verifyPassword(password, stored) {
  const [, salt, expected] = stored.split(":");
  if (!salt || !expected || expected.length !== 128) return false;
  const actual = (await passwordHash(password, salt)).split(":")[2];
  return timingSafeEqual(
    Buffer.from(actual, "hex"),
    Buffer.from(expected, "hex"),
  );
}

export function sessionCookie(token, production = false, maxAge = LIFETIME) {
  return `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${maxAge}${production ? "; Secure" : ""}`;
}

export function requestToken(req) {
  const value = req.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1);
  return value && /^[a-f0-9]{64}$/.test(value) ? value : null;
}

export async function currentUser(db, req) {
  const token = requestToken(req);
  if (!token) return null;
  const result = await db.execute({
    sql: "SELECT u.id, u.usuario, u.rol FROM sesiones s JOIN usuarios u ON u.id=s.usuario_id WHERE s.token_hash=? AND s.expira_en>?",
    args: [hashToken(token), Date.now()],
  });
  const row = result.rows[0];
  return row ? { id: row.id, username: row.usuario, role: row.rol } : null;
}

export async function requireUser(db, req, role) {
  const user = await currentUser(db, req);
  if (!user) throw new AppError(401, "Inicia sesión para acceder a la botica.");
  if (role && user.role !== role)
    throw new AppError(403, "Esta operación requiere un administrador.");
  return user;
}

export function canSetup(req, enabled) {
  // El primer administrador solo se crea desde el servidor local, nunca en Vercel.
  const address = req.socket?.remoteAddress;
  const host = (req.headers.host ?? "").split(":")[0];
  return (
    !!enabled &&
    ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(address) &&
    ["localhost", "127.0.0.1"].includes(host)
  );
}

export async function authenticationState(db, req, setupAllowed) {
  const user = await currentUser(db, req);
  const count = await db.execute("SELECT COUNT(*) AS total FROM usuarios");
  const needsSetup = Number(count.rows[0].total) === 0;
  return { user, needsSetup, canSetup: needsSetup && setupAllowed };
}

export async function authenticate(db, req, input, setupAllowed) {
  const { username, password } = credentials(input);
  const token = randomBytes(32).toString("hex");
  let user;
  if (input.action === "setup") {
    if (!setupAllowed)
      throw new AppError(
        403,
        "Crea el administrador desde la ejecución local antes de desplegar.",
      );
    const hashed = await passwordHash(password);
    user = await inTransaction(db, async (tx) => {
      const count = await tx.execute("SELECT COUNT(*) AS total FROM usuarios");
      if (Number(count.rows[0].total) !== 0)
        throw new AppError(
          409,
          "El administrador ya está configurado. Inicia sesión.",
        );
      const id = randomUUID();
      await tx.execute({
        sql: "INSERT INTO usuarios(id,usuario,password_hash,rol,creado_en) VALUES (?,?,?,?,?)",
        args: [id, username, hashed, "admin", new Date().toISOString()],
      });
      return { id, username, role: "admin" };
    });
  } else if (input.action === "login") {
    const identifier = hashToken(username);
    const attempts = await db.execute({
      sql: "SELECT bloqueado_hasta FROM intentos_login WHERE identificador=?",
      args: [identifier],
    });
    if (Number(attempts.rows[0]?.bloqueado_hasta ?? 0) > Date.now())
      throw new AppError(
        429,
        "Demasiados intentos. Espera 5 minutos antes de volver a intentar.",
      );
    const result = await db.execute({
      sql: "SELECT * FROM usuarios WHERE usuario=?",
      args: [username],
    });
    const row = result.rows[0];
    const dummy = `scrypt:${"0".repeat(64)}:${"0".repeat(128)}`;
    const valid = await verifyPassword(password, row?.password_hash ?? dummy);
    if (!row || !valid) {
      await db.execute({
        sql: "INSERT INTO intentos_login(identificador,fallos,bloqueado_hasta) VALUES (?,1,0) ON CONFLICT(identificador) DO UPDATE SET fallos=CASE WHEN bloqueado_hasta>0 AND bloqueado_hasta<=? THEN 1 ELSE fallos+1 END, bloqueado_hasta=CASE WHEN bloqueado_hasta>0 AND bloqueado_hasta<=? THEN 0 WHEN fallos>=4 THEN ? ELSE 0 END",
        args: [identifier, Date.now(), Date.now(), Date.now() + 300000],
      });
      throw new AppError(401, "Usuario o contraseña incorrectos.");
    }
    await db.execute({
      sql: "DELETE FROM intentos_login WHERE identificador=?",
      args: [identifier],
    });
    user = { id: row.id, username: row.usuario, role: row.rol };
  } else throw new AppError(400, "La operación de acceso no es válida.");
  await db.execute({
    sql: "INSERT INTO sesiones(token_hash,usuario_id,expira_en) VALUES (?,?,?)",
    args: [hashToken(token), user.id, Date.now() + LIFETIME * 1000],
  });
  // Limpieza acotada de sesiones vencidas; no se guardan contraseñas ni tokens sin hash.
  await db.execute({
    sql: "DELETE FROM sesiones WHERE expira_en<=?",
    args: [Date.now()],
  });
  return { user, token };
}

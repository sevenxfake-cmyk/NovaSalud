import { AppError, publicError } from "./errors.js";

export function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.end(JSON.stringify(body));
}

export async function readJson(req) {
  if (
    !req.headers["content-type"]?.toLowerCase().startsWith("application/json")
  )
    throw new AppError(415, "Envía los datos como JSON.");
  if (req.body !== undefined) {
    const length = Buffer.byteLength(
      typeof req.body === "string" ? req.body : JSON.stringify(req.body),
    );
    if (length > 65536)
      throw new AppError(413, "La solicitud es demasiado grande.");
    if (typeof req.body === "object" && req.body !== null) return req.body;
    try {
      return JSON.parse(req.body);
    } catch {
      throw new AppError(400, "El contenido JSON no es válido.");
    }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += Buffer.byteLength(chunk);
    if (size > 65536)
      throw new AppError(413, "La solicitud es demasiado grande.");
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new AppError(400, "El contenido JSON no es válido.");
  }
}

export function checkOrigin(req) {
  if (["GET", "HEAD"].includes(req.method)) return;
  if (req.headers["sec-fetch-site"] === "cross-site")
    throw new AppError(403, "Origen de solicitud no permitido.");
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host)
        throw new Error();
    } catch {
      throw new AppError(403, "Origen de solicitud no permitido.");
    }
  }
}

export function endpoint(methods, handler) {
  return async (req, res) => {
    try {
      if (!methods.includes(req.method)) {
        res.setHeader("Allow", methods.join(", "));
        throw new AppError(405, "Método no permitido.");
      }
      checkOrigin(req);
      await handler(req, res);
    } catch (error) {
      const safe = publicError(error);
      if (!res.headersSent) json(res, safe.status, { error: safe.message });
      else res.end();
    }
  };
}

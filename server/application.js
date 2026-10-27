import { getDatabase } from "./db.js";
import { health } from "./schema.js";
import {
  authenticationState,
  authenticate,
  canSetup,
  hashToken,
  requestToken,
  requireUser,
  sessionCookie,
} from "./auth.js";
import { getSnapshot, registerSale, saveProduct } from "./store.js";
import { endpoint, json, readJson } from "./http.js";
import { AppError } from "./errors.js";

export function createApplication({
  database = getDatabase,
  allowSetup = false,
  production = false,
} = {}) {
  return {
    health: endpoint(["GET"], async (req, res) => {
      json(res, 200, await health(database()));
    }),
    auth: endpoint(["GET", "POST", "DELETE"], async (req, res) => {
      const db = database();
      const setup = canSetup(req, allowSetup);
      if (req.method === "GET")
        return json(res, 200, await authenticationState(db, req, setup));
      if (req.method === "DELETE") {
        const token = requestToken(req);
        if (token)
          await db.execute({
            sql: "DELETE FROM sesiones WHERE token_hash=?",
            args: [hashToken(token)],
          });
        res.setHeader("Set-Cookie", sessionCookie("", production, 0));
        return json(res, 200, { user: null });
      }
      const result = await authenticate(
        db,
        req,
        await readJson(req),
        setup,
        production,
      );
      res.setHeader("Set-Cookie", sessionCookie(result.token, production));
      json(res, 200, { user: result.user });
    }),
    state: endpoint(["GET"], async (req, res) => {
      const db = database();
      const user = await requireUser(db, req);
      json(res, 200, await getSnapshot(db, user.id));
    }),
    products: endpoint(["GET", "POST", "PATCH"], async (req, res) => {
      const db = database();
      const user = await requireUser(
        db,
        req,
        req.method === "GET" ? undefined : "admin",
      );
      if (req.method === "GET")
        return json(res, 200, {
          products: (await getSnapshot(db, user.id)).products,
        });
      const id = new URL(req.url, "http://localhost").searchParams.get("id");
      if (req.method === "PATCH" && (!id || id.length > 64))
        throw new AppError(400, "Selecciona un producto válido.");
      const product = await saveProduct(
        db,
        await readJson(req),
        req.method === "PATCH" ? id : null,
        user.id,
      );
      json(res, req.method === "POST" ? 201 : 200, { product });
    }),
    sales: endpoint(["GET", "POST"], async (req, res) => {
      const db = database();
      const user = await requireUser(db, req);
      if (req.method === "GET")
        return json(res, 200, {
          sales: (await getSnapshot(db, user.id)).sales,
        });
      const sale = await registerSale(db, await readJson(req), user.id);
      json(res, 201, { sale });
    }),
  };
}

export const application = createApplication({
  production: !!process.env.VERCEL || process.env.NODE_ENV === "production",
});

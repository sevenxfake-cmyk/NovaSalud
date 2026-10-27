import { loadServerEnv } from "./db.js";
import { createApplication } from "./application.js";
import { json } from "./http.js";

export function localApi() {
  return {
    name: "nova-salud-local-api",
    apply: (_, environment) =>
      environment.command === "serve" && environment.mode !== "test",
    configureServer(server) {
      loadServerEnv();
      const handlers = createApplication({ allowSetup: true });
      server.middlewares.use((req, res, next) => {
        const path = new URL(req.url, "http://localhost").pathname;
        if (!path.startsWith("/api/")) return next();
        const route = path.slice(5).replace(/\/$/, "");
        const handler = handlers[route];
        if (!Object.hasOwn(handlers, route))
          return json(res, 404, { error: "Ruta API no encontrada." });
        return handler(req, res);
      });
    },
  };
}

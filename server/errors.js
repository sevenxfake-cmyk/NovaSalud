export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function publicError(error) {
  if (error instanceof AppError)
    return { status: error.status, message: error.message };
  const code = String(error?.code ?? "");
  if (code.includes("CONSTRAINT_UNIQUE"))
    return { status: 409, message: "Ya existe un registro con ese código." };
  if (code.includes("CONSTRAINT"))
    return {
      status: 400,
      message: "Los datos no cumplen las restricciones de la base de datos.",
    };
  if (code.includes("BUSY") || code.includes("LOCKED"))
    return {
      status: 409,
      message:
        "Otra operación está actualizando el inventario. Actualiza los datos e inténtalo nuevamente.",
    };
  // Nunca devolver mensajes del SDK, SQL, URL, tokens ni stack traces.
  return {
    status: 503,
    message:
      "No se pudo completar la operación con la base de datos. Revisa la conexión y las migraciones del servidor.",
  };
}

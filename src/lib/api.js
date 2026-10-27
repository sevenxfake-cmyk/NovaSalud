export async function apiRequest(path, options = {}) {
  const { body, ...rest } = options;
  const signal = options.signal ?? AbortSignal.timeout(15000);
  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...rest,
      signal,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", ...options.headers },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error(
      "No se pudo contactar con el servidor. Comprueba la conexión y vuelve a intentarlo.",
      { cause: error },
    );
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) {
    const error = new Error(
      data?.error ?? "El servidor no devolvió una respuesta válida.",
    );
    error.status = response.status;
    throw error;
  }
  return data;
}

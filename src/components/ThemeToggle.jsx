import { useEffect, useState } from "react";
import { Icon } from "./UI";

const STORAGE_KEY = "nova-salud-theme";

function initialTheme() {
  const applied = document.documentElement.getAttribute("data-bs-theme");
  if (applied === "dark" || applied === "light") return applied;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved === "dark" || saved === "light") return saved;
  } catch {
    /* La preferencia puede usarse aunque el almacenamiento esté bloqueado. */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState(initialTheme);
  const dark = theme === "dark";
  useEffect(() => {
    document.documentElement.setAttribute("data-bs-theme", theme);
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", theme === "dark" ? "#111b2c" : "#1763dc");
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* No afecta el funcionamiento del botón. */
    }
  }, [theme]);

  return (
    <button
      type="button"
      className="btn btn-outline-secondary btn-sm theme-toggle"
      aria-label={dark ? "Activar modo claro" : "Activar modo nocturno"}
      aria-pressed={dark}
      title={dark ? "Activar modo claro" : "Activar modo nocturno"}
      onClick={() => setTheme(dark ? "light" : "dark")}
    >
      <Icon name={dark ? "sun" : "moon-stars"} />
      <span className="d-none d-lg-inline">
        {dark ? "Modo claro" : "Modo nocturno"}
      </span>
    </button>
  );
}

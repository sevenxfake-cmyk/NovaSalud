import { createContext, useContext } from "react";

export const PharmacyContext = createContext(null);
export function usePharmacy() {
  const context = useContext(PharmacyContext);
  if (!context) throw new Error("No se encontró el proveedor de la botica.");
  return context;
}

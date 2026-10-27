import { BrowserRouter, Route, Routes } from "react-router-dom";
import { PharmacyProvider } from "./context/PharmacyProvider";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Inventory from "./pages/Inventory";
import Alerts from "./pages/Alerts";
import Sales from "./pages/Sales";
import History from "./pages/History";
import NotFound from "./pages/NotFound";
import "./App.css";

export default function App() {
  return (
    <BrowserRouter>
      <PharmacyProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventario" element={<Inventory />} />
            <Route path="alertas" element={<Alerts />} />
            <Route path="ventas" element={<Sales />} />
            <Route path="historial" element={<History />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </PharmacyProvider>
    </BrowserRouter>
  );
}

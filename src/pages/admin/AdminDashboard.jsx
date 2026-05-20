import { Routes, Route, Navigate } from "react-router-dom";
import AdminSidebar from "../../components/AdminSidebar";
import Panel from "./Panel";
import Pacientes from "./Pacientes";
import Agenda from "./Agenda";
import Documentos from "./Documentos";
import Pagos from "./Pagos";
import FirmasPendientes from "./FirmasPendientes";
import Equipo from "./Equipo";
import PacienteDetalle from "./PacienteDetalle";

export default function AdminDashboard() {
  return (
    <div className="flex min-h-screen" style={{ background: "#f0ede8" }}>
      <AdminSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="panel" element={<Panel />} />
          <Route path="pacientes" element={<Pacientes />} />
          <Route path="pacientes/:id" element={<PacienteDetalle />} />
          <Route path="agenda" element={<Agenda />} />
          <Route path="documentos" element={<Documentos />} />
          <Route path="pagos" element={<Pagos />} />
          <Route path="firmas" element={<FirmasPendientes />} />
          <Route path="equipo" element={<Equipo />} />
          <Route path="*" element={<Navigate to="panel" />} />
        </Routes>
      </main>
    </div>
  );
}

import { Routes, Route, Navigate } from "react-router-dom";
import PatientSidebar from "../../components/PatientSidebar";
import Inicio from "./Inicio";
import MisCitas from "./MisCitas";
import MisDocumentos from "./MisDocumentos";
import MisPagos from "./MisPagos";
import FirmarDocumentos from "./FirmarDocumentos";
import MiPerfil from "./MiPerfil";

export default function PatientDashboard() {
  return (
    <div className="flex min-h-screen" style={{ background: "#f0ede8" }}>
      <PatientSidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="inicio" element={<Inicio />} />
          <Route path="citas" element={<MisCitas />} />
          <Route path="documentos" element={<MisDocumentos />} />
          <Route path="pagos" element={<MisPagos />} />
          <Route path="firmar" element={<FirmarDocumentos />} />
          <Route path="perfil" element={<MiPerfil />} />
          <Route path="*" element={<Navigate to="inicio" />} />
        </Routes>
      </main>
    </div>
  );
}

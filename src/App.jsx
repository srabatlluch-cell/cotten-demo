import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, RequirePatient, RequireStaff } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import PatientLogin from "./pages/PatientLogin";
import StaffLogin from "./pages/StaffLogin";
import PatientDashboard from "./pages/patient/PatientDashboard";
import AdminDashboard from "./pages/admin/AdminDashboard";
import TreatmentPage from "./pages/treatments/TreatmentPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/tratamientos/:slug" element={<TreatmentPage />} />
          <Route path="/acceso-paciente" element={<PatientLogin />} />
          <Route path="/acceso-personal" element={<StaffLogin />} />
          <Route path="/paciente/*" element={<RequirePatient><PatientDashboard /></RequirePatient>} />
          <Route path="/admin/*" element={<RequireStaff><AdminDashboard /></RequireStaff>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

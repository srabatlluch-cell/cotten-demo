import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, FileText, CreditCard, Calendar } from "lucide-react";
import { patients, appointments, documents, payments } from "../../data/mockData";
import { useState } from "react";

export default function PacienteDetalle() {
  const { id } = useParams();
  const patient = patients.find(p => p.id === parseInt(id));
  const [notes, setNotes] = useState(patient?.notes || "");
  const [tab, setTab] = useState("info");

  if (!patient) return (
    <div className="p-8">
      <Link to="/admin/pacientes" className="text-sm flex items-center gap-2 mb-4" style={{ color: "#c9a96e" }}>
        <ArrowLeft size={14} /> Volver a pacientes
      </Link>
      <p>Paciente no encontrado.</p>
    </div>
  );

  const patAppts = appointments.filter(a => a.patientId === patient.id);
  const patDocs = documents.filter(d => d.patientId === patient.id);
  const patPayments = payments.filter(p => p.patientId === patient.id);

  const tabs = [
    { id: "info", label: "Información", icon: User },
    { id: "citas", label: `Citas (${patAppts.length})`, icon: Calendar },
    { id: "docs", label: `Documentos (${patDocs.length})`, icon: FileText },
    { id: "pagos", label: `Pagos (${patPayments.length})`, icon: CreditCard },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <Link to="/admin/pacientes" className="inline-flex items-center gap-2 text-sm mb-6 hover:underline" style={{ color: "#c9a96e" }}>
        <ArrowLeft size={14} /> Volver a pacientes
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 mb-6 flex items-start gap-5" style={{ border: "1px solid #e5e0d8" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-lg font-bold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
          {patient.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold" style={{ color: "#1a2744" }}>{patient.name}</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9ca3af" }}>DNI: {patient.dni} · {patient.email} · {patient.phone}</p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#e8f4fd", color: "#1565c0" }}>{patient.status}</span>
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#f3e8ff", color: "#7c3aed" }}>{patient.treatment}</span>
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>{patient.doctor}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-white p-1.5 rounded-xl w-fit" style={{ border: "1px solid #e5e0d8" }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-all"
            style={tab === t.id ? { background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" } : { color: "#6b7280" }}
          >
            <t.icon size={14} />
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
            <h3 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#c9a96e" }}>Datos personales</h3>
            <div className="space-y-4">
              {[
                ["Nombre completo", patient.name],
                ["DNI/NIE", patient.dni],
                ["Fecha de nacimiento", new Date(patient.birthdate + "T12:00").toLocaleDateString("es-ES")],
                ["Teléfono", patient.phone],
                ["Email", patient.email],
                ["Dirección", patient.address],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{label}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: "#1a2744" }}>{val}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
              <h3 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#c9a96e" }}>Datos médicos</h3>
              <div className="space-y-4">
                {[
                  ["Grupo sanguíneo", patient.bloodType],
                  ["Alergias", patient.allergies],
                  ["Médico", patient.doctor],
                  ["Contacto emergencia", patient.emergencyContact],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>{label}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: "#1a2744" }}>{val}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
              <h3 className="text-xs uppercase tracking-wider font-semibold mb-3" style={{ color: "#c9a96e" }}>Notas clínicas</h3>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-sm rounded-xl p-3 outline-none resize-none"
                style={{ border: "1px solid #e5e0d8", color: "#374151", minHeight: "80px" }}
                placeholder="Añadir notas..."
              />
            </div>
          </div>
        </div>
      )}

      {tab === "citas" && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {patAppts.map(a => (
              <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: "#1a274412" }}>
                  <span className="text-xs font-bold" style={{ color: "#1a2744" }}>{new Date(a.date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit" })}</span>
                  <span className="text-xs uppercase" style={{ color: "#c9a96e" }}>{new Date(a.date + "T12:00").toLocaleDateString("es-ES", { month: "short" })}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{a.treatment}</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{a.time}h · {a.doctor} · {a.room}</p>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{
                  background: a.status === "Confirmada" ? "#e8f5e9" : a.status === "Completada" ? "#f3f4f6" : "#fff8e1",
                  color: a.status === "Confirmada" ? "#2e7d32" : a.status === "Completada" ? "#6b7280" : "#f57f17",
                }}>
                  {a.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "docs" && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {patDocs.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay documentos</p>
            ) : patDocs.map(d => (
              <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                <FileText size={16} style={{ color: d.type === "PDF" ? "#f97316" : "#3b82f6" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{d.name}</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{d.category} · {d.size} · {new Date(d.date).toLocaleDateString("es-ES")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "pagos" && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {patPayments.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{p.concept}</p>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{new Date(p.date).toLocaleDateString("es-ES")}</p>
                </div>
                <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{p.amount.toLocaleString("es-ES")} €</p>
                <span className="text-xs px-2.5 py-1 rounded-full" style={{
                  background: p.status === "Pagado" ? "#e8f5e9" : "#fff8e1",
                  color: p.status === "Pagado" ? "#2e7d32" : "#f57f17",
                }}>
                  {p.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { Calendar, FileText, CreditCard, PenLine, ChevronRight, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { appointments, documents, payments, pendingSignatures } from "../../data/mockData";

export default function Inicio() {
  const nextAppt = appointments.find(a => a.patientId === 1 && a.status === "Confirmada" && a.date >= "2026-05-20");
  const recentDocs = documents.filter(d => d.patientId === 1).slice(0, 3);
  const pendingPayments = payments.filter(p => p.patientId === 1 && p.status === "Pendiente");
  const hasPendingSignature = pendingSignatures.some(s => s.patientId === 1);

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Bienvenida, María</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Aquí tiene el resumen de su portal de paciente</p>
      </div>

      {/* Alert banners */}
      {nextAppt && (
        <div className="mb-4 p-4 rounded-xl flex items-start gap-3" style={{ background: "linear-gradient(135deg, #1a274408, #c9a96e10)", border: "1px solid #c9a96e30" }}>
          <Calendar size={18} style={{ color: "#c9a96e" }} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "#1a2744" }}>Próxima cita: {new Date(nextAppt.date + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las {nextAppt.time}</p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{nextAppt.treatment} · {nextAppt.room} · {nextAppt.doctor}</p>
          </div>
          <Link to="/paciente/citas" className="text-xs flex-shrink-0 flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
            Ver citas <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {hasPendingSignature && (
        <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: "#fff5f5", border: "1px solid #fca5a520" }}>
          <AlertCircle size={18} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700">Tiene documentos pendientes de firma</p>
            <p className="text-xs mt-0.5 text-red-500">Por favor, revise y firme los consentimientos pendientes</p>
          </div>
          <Link to="/paciente/firmar" className="text-xs flex-shrink-0 flex items-center gap-1 text-red-500 hover:underline">
            Firmar <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Próxima cita", value: nextAppt ? new Date(nextAppt.date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—", icon: Calendar, to: "/paciente/citas" },
          { label: "Documentos", value: documents.filter(d => d.patientId === 1).length, icon: FileText, to: "/paciente/documentos" },
          { label: "Pagos pendientes", value: `${pendingPayments.reduce((s, p) => s + p.amount, 0).toLocaleString("es-ES")} €`, icon: CreditCard, to: "/paciente/pagos" },
          { label: "Firmas pendientes", value: hasPendingSignature ? "1" : "0", icon: PenLine, to: "/paciente/firmar" },
        ].map(({ label, value, icon: Icon, to }) => (
          <Link key={label} to={to} className="p-5 rounded-2xl bg-white hover:shadow-md transition-all group" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, #1a274410, #1a274420)" }}>
                <Icon size={16} style={{ color: "#1a2744" }} />
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-xl font-semibold" style={{ color: "#1a2744" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent documents */}
      <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base" style={{ color: "#1a2744" }}>Documentos recientes</h2>
          <Link to="/paciente/documentos" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
            Ver todos <ChevronRight size={12} />
          </Link>
        </div>
        <div className="space-y-3">
          {recentDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 py-3 border-b last:border-0" style={{ borderColor: "#f3f0ea" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: doc.type === "PDF" ? "#fff1e6" : "#e8f4fd" }}>
                <FileText size={14} style={{ color: doc.type === "PDF" ? "#f97316" : "#3b82f6" }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{doc.name}</p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>{doc.size} · {new Date(doc.date).toLocaleDateString("es-ES")}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: doc.type === "PDF" ? "#fff1e6" : "#e8f4fd", color: doc.type === "PDF" ? "#f97316" : "#3b82f6" }}>
                {doc.type}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

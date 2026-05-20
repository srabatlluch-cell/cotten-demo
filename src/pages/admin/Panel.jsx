import { Users, Calendar, CreditCard, PenLine, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { patients, appointments, payments, pendingSignatures, todayAppointments } from "../../data/mockData";

export default function Panel() {
  const totalPending = payments.filter(p => p.status === "Pendiente").reduce((s, p) => s + p.amount, 0);

  const stats = [
    { label: "Total pacientes", value: patients.length, icon: Users, color: "#1a2744", bg: "#1a274412", link: "/admin/pacientes" },
    { label: "Citas hoy", value: todayAppointments.length, icon: Calendar, color: "#2563eb", bg: "#2563eb12", link: "/admin/agenda" },
    { label: "Pagos pendientes", value: `${totalPending.toLocaleString("es-ES")} €`, icon: CreditCard, color: "#d97706", bg: "#d9770612", link: "/admin/pagos" },
    { label: "Firmas pendientes", value: pendingSignatures.length, icon: PenLine, color: "#dc2626", bg: "#dc262612", link: "/admin/firmas" },
  ];

  const getPatient = (id) => patients.find(p => p.id === id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Panel de Control</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Resumen del día — {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Link key={label} to={link} className="bg-white p-5 rounded-2xl hover:shadow-md transition-all group" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{label}</p>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's agenda */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: "#f3f0ea" }}>
            <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Agenda de hoy</h2>
            <Link to="/admin/agenda" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
              Ver agenda <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {todayAppointments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay citas programadas hoy</p>
            ) : (
              todayAppointments.map(a => {
                const pt = getPatient(a.patientId);
                return (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-12 text-right flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>{a.time}</p>
                    </div>
                    <div className="w-px h-8 flex-shrink-0" style={{ background: "#c9a96e40" }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{pt?.name}</p>
                      <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{a.treatment}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs" style={{ color: "#6b7280" }}>{a.doctor.split(" ").slice(-1)[0]}</p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>{a.room}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Recent patients */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: "#f3f0ea" }}>
            <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Pacientes recientes</h2>
            <Link to="/admin/pacientes" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {patients.slice(0, 5).map(p => (
              <Link key={p.id} to={`/admin/pacientes/${p.id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                  {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{p.name}</p>
                  <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{p.treatment}</p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={{
                  background: p.status === "En tratamiento" ? "#e8f4fd" : p.status === "Post-operatorio" ? "#fff8e1" : "#f3f4f6",
                  color: p.status === "En tratamiento" ? "#1565c0" : p.status === "Post-operatorio" ? "#e65100" : "#6b7280",
                }}>
                  {p.status}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

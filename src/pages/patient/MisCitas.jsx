import { Calendar, Clock, User, MapPin } from "lucide-react";
import { appointments } from "../../data/mockData";

const statusStyle = {
  Confirmada: { bg: "#e8f5e9", color: "#2e7d32", label: "Confirmada" },
  Pendiente: { bg: "#fff8e1", color: "#f57f17", label: "Pendiente" },
  Completada: { bg: "#f3f4f6", color: "#6b7280", label: "Completada" },
};

export default function MisCitas() {
  const myAppts = appointments.filter(a => a.patientId === 1).sort((a, b) => new Date(b.date) - new Date(a.date));
  const upcoming = myAppts.filter(a => a.status !== "Completada");
  const past = myAppts.filter(a => a.status === "Completada");

  const AppointmentCard = ({ appt }) => {
    const s = statusStyle[appt.status];
    return (
      <div className="bg-white rounded-2xl p-5" style={{ border: "1px solid #e5e0d8" }}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1a274412, #1a274420)" }}>
              <span className="text-xs font-bold" style={{ color: "#1a2744" }}>
                {new Date(appt.date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit" })}
              </span>
              <span className="text-xs uppercase" style={{ color: "#c9a96e" }}>
                {new Date(appt.date + "T12:00").toLocaleDateString("es-ES", { month: "short" })}
              </span>
            </div>
            <div>
              <p className="font-medium text-sm" style={{ color: "#1a2744" }}>{appt.treatment}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                  <Clock size={12} />
                  {appt.time}h
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                  <User size={12} />
                  {appt.doctor}
                </span>
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                  <MapPin size={12} />
                  {appt.room}
                </span>
              </div>
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full flex-shrink-0 font-medium" style={{ background: s.bg, color: s.color }}>
            {s.label}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mis Citas</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Historial y próximas citas en Clínica Cotten</p>
      </div>

      {upcoming.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#c9a96e" }}>Próximas citas</h2>
          <div className="space-y-3">
            {upcoming.map(a => <AppointmentCard key={a.id} appt={a} />)}
          </div>
        </div>
      )}

      {past.length > 0 && (
        <div>
          <h2 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#9ca3af" }}>Citas anteriores</h2>
          <div className="space-y-3">
            {past.map(a => <AppointmentCard key={a.id} appt={a} />)}
          </div>
        </div>
      )}
    </div>
  );
}

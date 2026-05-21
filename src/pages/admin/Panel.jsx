import { useState, useEffect } from "react";
import { Users, Calendar, CreditCard, PenLine, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

function getStatusStyle(status) {
  switch (status) {
    case "confirmed":
      return { badgeClass: "bg-green-100 text-green-700",   dot: "🟢", icon: "✓",  label: "Confirmada",    borderColor: "#22c55e" };
    case "scheduled":
      return { badgeClass: "bg-amber-100 text-amber-700",   dot: "🟡", icon: "⏰", label: "Programada",    borderColor: "#f59e0b" };
    case "completed":
      return { badgeClass: "bg-gray-100 text-gray-500",     dot: "⚪", icon: "✓",  label: "Completada",    borderColor: "#9ca3af" };
    case "cancelled":
      return { badgeClass: "bg-red-100 text-red-700",       dot: "🔴", icon: "❌", label: "Cancelada",     borderColor: "#ef4444" };
    case "no_show":
      return { badgeClass: "bg-orange-100 text-orange-700", dot: "🟠", icon: "⚠️", label: "No presentado", borderColor: "#f97316" };
    default:
      return { badgeClass: "bg-amber-100 text-amber-700",   dot: "🟡", icon: "⏰", label: "Programada",    borderColor: "#f59e0b" };
  }
}

const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", discharged: "Alta" };
const STATUS_STYLE = {
  active:    { background: "#e8f4fd", color: "#1565c0" },
  inactive:  { background: "#f3f4f6", color: "#6b7280" },
  discharged:{ background: "#e8f5e9", color: "#2e7d32" },
};

async function loadPanel() {
  const [statsRes, todayRes, recentRes] = await Promise.all([
    supabase.rpc("get_panel_stats"),
    supabase.rpc("get_today_appointments"),
    supabase.rpc("get_recent_patients"),
  ]);
  if (statsRes.error)  throw statsRes.error;
  if (todayRes.error)  throw todayRes.error;
  if (recentRes.error) throw recentRes.error;
  return {
    stats:   statsRes.data  ?? {},
    today:   todayRes.data  ?? [],
    recent:  recentRes.data ?? [],
  };
}

export default function Panel() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await loadPanel();
        if (!cancelled) setData(d);
      } catch (err) {
        console.error("[Panel] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const stats = data?.stats ?? {};
  const today  = data?.today  ?? [];
  const recent = data?.recent ?? [];

  const statCards = [
    { label: "Total pacientes",   value: loading ? "…" : stats.patient_count      ?? 0,                                   icon: Users,      color: "#1a2744", bg: "#1a274412", link: "/admin/pacientes" },
    { label: "Citas hoy",         value: loading ? "…" : stats.today_appt_count   ?? 0,                                   icon: Calendar,   color: "#2563eb", bg: "#2563eb12", link: "/admin/agenda" },
    { label: "Pagos pendientes",  value: loading ? "…" : `${Number(stats.pending_amount ?? 0).toLocaleString("es-ES")} €`, icon: CreditCard, color: "#d97706", bg: "#d9770612", link: "/admin/pagos" },
    { label: "Firmas pendientes", value: loading ? "…" : stats.pending_signatures ?? 0,                                   icon: PenLine,    color: "#dc2626", bg: "#dc262612", link: "/admin/firmas" },
  ];

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Panel de Control</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          Resumen del día — {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, icon: Icon, color, bg, link }) => (
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
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: "#9ca3af" }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Cargando…</span>
              </div>
            ) : today.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay citas programadas hoy</p>
            ) : (
              today.map(a => {
                const sc = getStatusStyle(a.appt_status);
                return (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                    {/* Time */}
                    <div className="w-12 text-right flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>
                        {String(a.appointment_time).slice(0, 5)}
                      </p>
                    </div>
                    {/* Status-colored divider */}
                    <div className="w-px h-8 flex-shrink-0 rounded-full" style={{ background: sc.borderColor }} />
                    {/* Patient + treatment */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{a.patient_name}</p>
                      <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{a.treatment}</p>
                    </div>
                    {/* Doctor / room */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      {a.doctor_name && <p className="text-xs" style={{ color: "#6b7280" }}>{a.doctor_name.split(" ").slice(-1)[0]}</p>}
                      {a.room        && <p className="text-xs" style={{ color: "#9ca3af" }}>{a.room}</p>}
                    </div>
                    {/* Status badge */}
                    <span className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium flex-shrink-0 ${sc.badgeClass}`}>
                      <span style={{ fontSize: 9 }}>{sc.dot}</span>
                      {sc.label}
                    </span>
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
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: "#9ca3af" }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Cargando…</span>
              </div>
            ) : recent.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay pacientes registrados</p>
            ) : (
              recent.map(p => {
                const initials = (p.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const sc = STATUS_STYLE[p.patient_status] ?? STATUS_STYLE.inactive;
                return (
                  <Link key={p.patient_id} to={`/admin/pacientes/${p.patient_id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{p.full_name}</p>
                      <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{p.treatment || "Sin tratamiento"}</p>
                    </div>
                    <span className="text-xs px-2 py-1 rounded-full flex-shrink-0" style={sc}>
                      {STATUS_LABEL[p.patient_status] ?? p.patient_status}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
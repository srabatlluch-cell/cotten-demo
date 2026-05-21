import { useState, useEffect } from "react";
import { Calendar, FileText, CreditCard, PenLine, ChevronRight, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

async function fetchDashboard() {
  const { data, error } = await supabase.rpc("get_my_dashboard");
  if (error) throw error;
  return data ?? {};
}

export default function Inicio() {
  const { user, profile } = useAuth();
  const [dash,    setDash]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await fetchDashboard();
        if (!cancelled) setDash(d);
      } catch (err) {
        console.error("[Inicio] dashboard error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const firstName   = (profile?.full_name ?? user?.email ?? "").split(" ")[0] || "Paciente";
  const hasNextAppt = dash?.next_date;
  const hasSigs     = dash?.pending_sigs > 0;

  const stats = [
    {
      label: "Próxima cita",
      value: hasNextAppt
        ? new Date(dash.next_date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
        : "—",
      icon: Calendar, to: "/paciente/citas",
    },
    { label: "Documentos",     value: loading ? "…" : (dash?.doc_count ?? 0),        icon: FileText,  to: "/paciente/documentos" },
    { label: "Pagos pendientes", value: loading ? "…" : `${Number(dash?.pending_amount ?? 0).toLocaleString("es-ES")} €`, icon: CreditCard, to: "/paciente/pagos" },
    { label: "Firmas pendientes", value: loading ? "…" : (dash?.pending_sigs ?? 0),  icon: PenLine,   to: "/paciente/firmar" },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>
          {loading ? "Bienvenido" : `Bienvenido/a, ${firstName}`}
        </h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Aquí tiene el resumen de su portal de paciente</p>
      </div>

      {/* Alert banners */}
      {!loading && hasNextAppt && (
        <div className="mb-4 p-4 rounded-xl flex items-start gap-3" style={{ background: "linear-gradient(135deg, #1a274408, #c9a96e10)", border: "1px solid #c9a96e30" }}>
          <Calendar size={18} style={{ color: "#c9a96e" }} className="mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium" style={{ color: "#1a2744" }}>
              Próxima cita: {new Date(dash.next_date + "T12:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "long" })} a las {String(dash.next_time).slice(0, 5)}
            </p>
            <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
              {[dash.next_treatment, dash.next_room, dash.next_doctor].filter(Boolean).join(" · ")}
            </p>
          </div>
          <Link to="/paciente/citas" className="text-xs flex-shrink-0 flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
            Ver citas <ChevronRight size={12} />
          </Link>
        </div>
      )}

      {!loading && hasSigs && (
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
        {stats.map(({ label, value, icon: Icon, to }) => (
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

      {/* Recent documents placeholder — links to docs page */}
      <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-base" style={{ color: "#1a2744" }}>Documentos recientes</h2>
          <Link to="/paciente/documentos" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
            Ver todos <ChevronRight size={12} />
          </Link>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-4" style={{ color: "#9ca3af" }}>
            <Loader2 size={16} className="animate-spin" />
            <span className="text-sm">Cargando…</span>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "#9ca3af" }}>
            {dash?.doc_count > 0
              ? `Tiene ${dash.doc_count} documento${dash.doc_count !== 1 ? "s" : ""} en su expediente.`
              : "No tiene documentos todavía."}
          </p>
        )}
      </div>
    </div>
  );
}
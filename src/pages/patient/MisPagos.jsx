import { useState, useEffect } from "react";
import { CreditCard, TrendingUp, Clock, CheckCircle, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { paymentStatus } from "../../lib/statusStyles";

// ─── helpers ──────────────────────────────────────────────────────────────────

const todayStr = new Date().toISOString().split("T")[0];

function effectiveStatus(pay_status, due_date) {
  if (pay_status === "pending" && due_date && due_date < todayStr) return "overdue";
  return pay_status;
}

async function fetchPayments() {
  const { data, error } = await supabase.rpc("get_my_payments");
  if (error) throw error;
  return data ?? [];
}

// ─── component ────────────────────────────────────────────────────────────────

export default function MisPagos() {
  const { user } = useAuth();

  const [payments, setPayments] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchPayments();
        if (!cancelled) setPayments(rows);
      } catch (err) {
        console.error("[MisPagos] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── computed summaries ───────────────────────────────────────────────────────
  const totalPaid    = payments.filter(p => p.pay_status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending = payments.filter(p => ["pending", "overdue"].includes(effectiveStatus(p.pay_status, p.due_date))).reduce((s, p) => s + Number(p.amount), 0);

  const nextDue = payments
    .filter(p => ["pending", "overdue"].includes(effectiveStatus(p.pay_status, p.due_date)) && p.due_date)
    .sort((a, b) => (a.due_date > b.due_date ? 1 : -1))[0];

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mis Pagos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gestión de pagos y facturación de su tratamiento</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#dcfce7" }}>
              <CheckCircle size={16} style={{ color: "#15803d" }} />
            </div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#9ca3af" }}>Total pagado</p>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#1a2744" }}>
            {loading ? "…" : `${totalPaid.toLocaleString("es-ES")} €`}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#fef3c7" }}>
              <Clock size={16} style={{ color: "#b45309" }} />
            </div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#9ca3af" }}>Pendiente</p>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#1a2744" }}>
            {loading ? "…" : `${totalPending.toLocaleString("es-ES")} €`}
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#dbeafe" }}>
              <TrendingUp size={16} style={{ color: "#1d4ed8" }} />
            </div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#9ca3af" }}>Próx. vencimiento</p>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#1a2744" }}>
            {loading ? "…" : nextDue
              ? new Date(nextDue.due_date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
              : "—"}
          </p>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "#f3f0ea" }}>
          <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Historial de pagos</h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: "#9ca3af" }}>
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando pagos…</span>
          </div>
        ) : payments.length === 0 ? (
          <p className="px-6 py-12 text-center text-sm" style={{ color: "#9ca3af" }}>No tiene pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f0ea" }}>
                  {["Concepto", "Vencimiento", "Importe", "Estado"].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#f3f0ea" }}>
                {payments.map(p => {
                  const es = effectiveStatus(p.pay_status, p.due_date);
                  const ps = paymentStatus(es);
                  const isOverdue = es === "overdue";
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50 transition-colors"
                      style={isOverdue ? { background: "#fef2f208" } : {}}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: isOverdue ? "#fee2e2" : "linear-gradient(135deg, #1a274410, #1a274420)" }}>
                            <CreditCard size={14} style={{ color: isOverdue ? "#dc2626" : "#1a2744" }} />
                          </div>
                          <p className="text-sm" style={{ color: "#1a2744" }}>{p.concept}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: isOverdue ? "#dc2626" : "#6b7280", fontWeight: isOverdue ? 600 : 400 }}>
                        {p.due_date
                          ? new Date(p.due_date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                          : p.paid_at
                            ? new Date(p.paid_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                            : new Date(p.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold" style={{ color: "#1a2744" }}>
                        {Number(p.amount).toLocaleString("es-ES")} €
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold" style={ps.badge}>
                          {ps.icon} {ps.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
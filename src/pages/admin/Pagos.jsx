import { useState, useEffect } from "react";
import { Search, CheckCircle, Clock, TrendingUp, Plus, X, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { paymentStatus } from "../../lib/statusStyles";

// ─── helpers ──────────────────────────────────────────────────────────────────

const today = new Date().toISOString().split("T")[0];
const thisMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"

function effectiveStatus(pay_status, due_date) {
  if (pay_status === "pending" && due_date && due_date < today) return "overdue";
  return pay_status;
}

async function loadData() {
  const [payRes, patRes] = await Promise.all([
    supabase.rpc("get_all_payments"),
    supabase.rpc("get_all_patients"),
  ]);
  if (payRes.error) throw payRes.error;
  if (patRes.error) throw patRes.error;
  return {
    payments: payRes.data ?? [],
    patients: patRes.data ?? [],
  };
}

const EMPTY_FORM = { patient_id: "", concept: "", amount: "", due_date: "" };

// ─── component ────────────────────────────────────────────────────────────────

export default function Pagos() {
  const { user } = useAuth();

  const [payments,      setPayments]      = useState([]);
  const [patients,      setPatients]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filterPatient, setFilterPatient] = useState("");
  const [filterStatus,  setFilterStatus]  = useState("");

  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState("");

  const [markingId,   setMarkingId]   = useState(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await loadData();
        if (!cancelled) { setPayments(d.payments); setPatients(d.patients); }
      } catch (err) {
        console.error("[Pagos] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── computed summaries ───────────────────────────────────────────────────────
  const totalPaid     = payments.filter(p => p.pay_status === "paid").reduce((s, p) => s + Number(p.amount), 0);
  const totalPending  = payments.filter(p => ["pending", "overdue"].includes(effectiveStatus(p.pay_status, p.due_date))).reduce((s, p) => s + Number(p.amount), 0);
  const paidThisMonth = payments.filter(p => p.pay_status === "paid" && p.paid_at?.startsWith(thisMonth)).reduce((s, p) => s + Number(p.amount), 0);

  // ── filtered list ────────────────────────────────────────────────────────────
  const filtered = payments.filter(p => {
    const es = effectiveStatus(p.pay_status, p.due_date);
    const matchName   = !filterPatient || (p.patient_name ?? "").toLowerCase().includes(filterPatient.toLowerCase());
    const matchStatus = !filterStatus  || es === filterStatus;
    return matchName && matchStatus;
  });

  // ── create payment ───────────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");
    if (!form.patient_id) { setCreateError("Seleccione un paciente."); return; }
    if (!form.concept.trim()) { setCreateError("Indique el concepto."); return; }
    if (!form.amount || Number(form.amount) <= 0) { setCreateError("Importe inválido."); return; }

    setCreating(true);
    try {
      const { data: newId, error } = await supabase.rpc("admin_create_payment", {
        p_patient_id: form.patient_id,
        p_concept:    form.concept.trim(),
        p_amount:     Number(form.amount),
        p_due_date:   form.due_date || null,
      });
      if (error) throw error;

      const pat = patients.find(p => p.patient_id === form.patient_id);
      setPayments(prev => [{
        id:           newId,
        patient_id:   form.patient_id,
        patient_name: pat?.full_name ?? "—",
        concept:      form.concept.trim(),
        amount:       Number(form.amount),
        pay_status:   "pending",
        due_date:     form.due_date || null,
        paid_at:      null,
        created_at:   new Date().toISOString(),
      }, ...prev]);

      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("[Pagos] create error:", err);
      setCreateError(err.message ?? "Error al crear el pago.");
    } finally {
      setCreating(false);
    }
  }

  // ── mark as paid ─────────────────────────────────────────────────────────────
  async function handleMarkPaid(paymentId) {
    setMarkingId(paymentId);
    try {
      const { error } = await supabase.rpc("admin_mark_payment_paid", { p_payment_id: paymentId });
      if (error) throw error;
      const paidAt = new Date().toISOString();
      setPayments(prev => prev.map(p =>
        p.id === paymentId ? { ...p, pay_status: "paid", paid_at: paidAt } : p
      ));
    } catch (err) {
      console.error("[Pagos] mark paid error:", err);
    } finally {
      setMarkingId(null);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Pagos</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gestión financiera completa de la clínica</p>
        </div>
        <button
          onClick={() => { setShowModal(true); setCreateError(""); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" }}
        >
          <Plus size={15} /> Nuevo pago
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total cobrado",      value: loading ? "…" : `${totalPaid.toLocaleString("es-ES")} €`,      icon: CheckCircle, color: "#15803d", bg: "#dcfce7" },
          { label: "Pendiente de cobro", value: loading ? "…" : `${totalPending.toLocaleString("es-ES")} €`,   icon: Clock,       color: "#b45309", bg: "#fef3c7" },
          { label: "Cobrado este mes",   value: loading ? "…" : `${paidThisMonth.toLocaleString("es-ES")} €`,  icon: TrendingUp,  color: "#1d4ed8", bg: "#dbeafe" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white p-5 rounded-2xl" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{label}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={filterPatient}
            onChange={e => setFilterPatient(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8" }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
          style={{ border: "1px solid #e5e0d8", color: "#374151" }}
        >
          <option value="">Todos los estados</option>
          <option value="paid">Pagado</option>
          <option value="pending">Pendiente</option>
          <option value="overdue">Vencido</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: "#9ca3af" }}>
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando pagos…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f0ea", background: "#faf9f7" }}>
                  {["Paciente", "Concepto", "Vencimiento", "Importe", "Estado", ""].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#f3f0ea" }}>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
                      {filterPatient || filterStatus ? "Sin resultados para ese filtro." : "No hay pagos registrados."}
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const es = effectiveStatus(p.pay_status, p.due_date);
                  const ps = paymentStatus(es);
                  const isActionable = es === "pending" || es === "overdue";
                  const isMarking    = markingId === p.id;
                  const initials     = (p.patient_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  return (
                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                            {initials}
                          </div>
                          <p className="text-sm" style={{ color: "#1a2744" }}>{p.patient_name}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "#374151" }}>{p.concept}</td>
                      <td className="px-6 py-4 text-sm" style={{ color: es === "overdue" ? "#dc2626" : "#6b7280" }}>
                        {p.due_date
                          ? new Date(p.due_date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                          : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold" style={{ color: "#1a2744" }}>
                        {Number(p.amount).toLocaleString("es-ES")} €
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-semibold" style={ps.badge}>
                          {ps.icon} {ps.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {isActionable && (
                          <button
                            onClick={() => handleMarkPaid(p.id)}
                            disabled={isMarking}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl font-medium transition-all hover:opacity-90 disabled:opacity-50"
                            style={{ background: "#dcfce7", color: "#15803d" }}
                          >
                            {isMarking
                              ? <Loader2 size={11} className="animate-spin" />
                              : <CheckCircle size={11} />}
                            Marcar como pagado
                          </button>
                        )}
                        {p.pay_status === "paid" && p.paid_at && (
                          <p className="text-xs" style={{ color: "#9ca3af" }}>
                            {new Date(p.paid_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create payment modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#f3f0ea" }}>
              <h2 className="font-semibold" style={{ color: "#1a2744" }}>Nuevo pago</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Paciente *</label>
                <select
                  required
                  value={form.patient_id}
                  onChange={e => setForm(f => ({ ...f, patient_id: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
                  style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                >
                  <option value="">Seleccionar paciente…</option>
                  {patients.map(p => (
                    <option key={p.patient_id} value={p.patient_id}>{p.full_name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Concepto *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Implante basal, Ortodoncia mes 3…"
                  value={form.concept}
                  onChange={e => setForm(f => ({ ...f, concept: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Importe (€) *</label>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="0.01"
                    placeholder="0.00"
                    value={form.amount}
                    onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={form.due_date}
                    onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                  />
                </div>
              </div>

              {createError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#dc2626" }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                  style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}>
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? "Creando…" : "Crear pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
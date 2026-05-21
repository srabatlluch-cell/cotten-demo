import { useState, useEffect } from "react";
import { Clock, User, MapPin, Plus, X, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { apptStatus } from "../../lib/statusStyles";

const TREATMENT_OPTIONS = [
  "Consulta inicial",
  "Revisión / control",
  "Implantes Basales",
  "Ortodoncia",
  "Periodoncia",
  "Higiene dental",
  "Blanqueamiento",
  "TAC dental",
  "Extracción",
  "Endodoncia",
  "Otro",
];

const TIME_SLOTS = [];
for (let h = 8; h < 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

const PAST_STATUSES = new Set(["completed", "cancelled", "no_show"]);

// ─── data helpers ─────────────────────────────────────────────────────────────

async function fetchAppointments() {
  const { data, error } = await supabase.rpc("get_my_appointments");
  if (error) throw error;
  return data ?? [];
}

// ─── sub-components ───────────────────────────────────────────────────────────

function AppointmentCard({ appt, onUpdateStatus }) {
  const s = apptStatus(appt.appt_status);
  const [acting, setActing] = useState(null); // 'confirmed' | 'cancelled' | null

  // Parse date in local time — avoids UTC midnight shift
  const [y, mo, d] = (appt.date ?? "").split("-").map(Number);
  const dateObj = new Date(y, mo - 1, d);

  async function handleAction(newStatus) {
    setActing(newStatus);
    try {
      await onUpdateStatus(appt.id, newStatus);
    } finally {
      setActing(null);
    }
  }

  const showActions = appt.appt_status === "scheduled" || appt.appt_status === "confirmed";

  return (
    <div
      className="rounded-2xl relative overflow-hidden bg-white"
      style={{ ...s.card, border: `1px solid ${s.strike ? "#fecaca" : "#e5e0d8"}` }}
    >
      {/* Cancelled diagonal stamp */}
      {s.strike && (
        <div
          aria-hidden
          style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to bottom right, transparent calc(50% - 0.5px), rgba(220,38,38,0.18) calc(50% - 0.5px), rgba(220,38,38,0.18) calc(50% + 0.5px), transparent calc(50% + 0.5px))",
            pointerEvents: "none",
          }}
        />
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4 relative">
          <div className="flex items-start gap-4">
            {/* Date chip */}
            <div
              className="w-12 h-12 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
              style={{ background: s.strike ? "#fee2e210" : "linear-gradient(135deg, #1a274412, #1a274420)", borderLeft: `3px solid ${s.borderColor}` }}
            >
              <span className="text-xs font-bold" style={{ color: s.strike ? "#dc2626" : "#1a2744" }}>
                {dateObj.toLocaleDateString("es-ES", { day: "2-digit" })}
              </span>
              <span className="text-xs uppercase" style={{ color: s.strike ? "#f87171" : "#c9a96e" }}>
                {dateObj.toLocaleDateString("es-ES", { month: "short" })}
              </span>
            </div>

            {/* Info */}
            <div>
              <p
                className="font-medium text-sm"
                style={{ color: s.dim ? "#9ca3af" : "#1a2744", textDecoration: s.strike ? "line-through" : "none" }}
              >
                {appt.treatment ?? "—"}
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2">
                <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                  <Clock size={12} />
                  {appt.appointment_time?.slice(0, 5) ?? "—"}h
                </span>
                {appt.doctor_name && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                    <User size={12} />
                    {appt.doctor_name}
                  </span>
                )}
                {appt.room && (
                  <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                    <MapPin size={12} />
                    {appt.room}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status badge */}
          <span className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-full flex-shrink-0 font-semibold" style={s.badge}>
            {s.icon} {s.label}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      {showActions && (
        <div
          className="px-5 pb-4 flex items-center gap-2 flex-wrap relative"
          style={{ borderTop: "1px solid #f3f0ea", paddingTop: "12px" }}
        >
          {appt.appt_status === "scheduled" && (
            <button
              onClick={() => handleAction("confirmed")}
              disabled={!!acting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "#dcfce7", color: "#15803d" }}
            >
              {acting === "confirmed"
                ? <Loader2 size={12} className="animate-spin" />
                : <CheckCircle size={12} />}
              Confirmar cita
            </button>
          )}

          {appt.appt_status === "confirmed" && (
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "#15803d" }}>
              <CheckCircle size={13} />
              Ya confirmada
            </span>
          )}

          <button
            onClick={() => handleAction("cancelled")}
            disabled={!!acting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all hover:bg-red-50 disabled:opacity-50"
            style={{ border: "1px solid #fecaca", color: "#dc2626" }}
          >
            {acting === "cancelled"
              ? <Loader2 size={12} className="animate-spin" />
              : <X size={12} />}
            {appt.appt_status === "confirmed" ? "Cancelar cita" : "Cancelar"}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── component ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { date: "", time: "09:00", treatment: "Consulta inicial" };

export default function MisCitas() {
  const { user } = useAuth();

  const [appts,       setAppts]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showForm,    setShowForm]    = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [submitting,  setSubmitting]  = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted,   setSubmitted]   = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchAppointments();
        if (!cancelled) setAppts(rows);
      } catch (err) {
        console.error("[MisCitas] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const upcoming = appts.filter(a => !PAST_STATUSES.has(a.appt_status));
  const past     = appts.filter(a =>  PAST_STATUSES.has(a.appt_status));

  // ── request appointment ──────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitError("");

    if (!form.date) { setSubmitError("Seleccione una fecha."); return; }
    if (!form.treatment) { setSubmitError("Indique el tipo de consulta."); return; }

    const today = new Date().toISOString().split("T")[0];
    if (form.date < today) { setSubmitError("La fecha no puede ser en el pasado."); return; }

    setSubmitting(true);
    try {
      const { data: apptId, error } = await supabase.rpc("request_appointment", {
        p_date:      form.date,
        p_time:      form.time,
        p_treatment: form.treatment,
      });
      if (error) throw error;

      // Optimistically add to upcoming list
      setAppts(prev => [{
        id:               apptId,
        date:             form.date,
        appointment_time: form.time + ":00",
        treatment:        form.treatment,
        room:             null,
        appt_status:      "scheduled",
        doctor_name:      null,
      }, ...prev]);

      setSubmitted(true);
      setForm(EMPTY_FORM);
      setTimeout(() => { setSubmitted(false); setShowForm(false); }, 3000);
    } catch (err) {
      console.error("[MisCitas] request error:", err);
      setSubmitError(err.message ?? "Error al enviar la solicitud.");
    } finally {
      setSubmitting(false);
    }
  }

  async function updateAppointmentStatus(id, newStatus) {
    const { error } = await supabase.rpc("update_my_appointment_status", {
      p_appointment_id: id,
      p_status:         newStatus,
    });
    if (error) throw error;
    setAppts(prev => prev.map(a => a.id === id ? { ...a, appt_status: newStatus } : a));
  }

  function closeForm() {
    setShowForm(false);
    setSubmitError("");
    setSubmitted(false);
    setForm(EMPTY_FORM);
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mis Citas</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Historial y próximas citas en Clínica Cotten</p>
        </div>
        <button
          onClick={() => setShowForm(s => !s)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "white" }}
        >
          <Plus size={15} />
          Solicitar cita
        </button>
      </div>

      {/* Request form */}
      {showForm && (
        <div className="bg-white rounded-2xl p-6 mb-6" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Solicitar nueva cita</h2>
            <button onClick={closeForm} className="p-1 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={16} style={{ color: "#9ca3af" }} />
            </button>
          </div>

          {submitted ? (
            <div className="flex items-center gap-3 py-4 px-4 rounded-xl" style={{ background: "#e8f5e9" }}>
              <CheckCircle size={18} style={{ color: "#2e7d32" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#2e7d32" }}>¡Solicitud enviada!</p>
                <p className="text-xs mt-0.5" style={{ color: "#4caf50" }}>
                  El equipo de la clínica la confirmará en breve.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
                    Fecha preferida *
                  </label>
                  <input
                    type="date"
                    value={form.date}
                    min={new Date().toISOString().split("T")[0]}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
                    Hora preferida
                  </label>
                  <select
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                  >
                    {TIME_SLOTS.map(t => <option key={t} value={t}>{t}h</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
                  Tipo de consulta *
                </label>
                <select
                  value={form.treatment}
                  onChange={e => setForm(f => ({ ...f, treatment: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
                  style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                >
                  {TREATMENT_OPTIONS.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>

              {submitError && (
                <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
                  <AlertCircle size={14} className="flex-shrink-0" />
                  {submitError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "white" }}
                >
                  {submitting && <Loader2 size={14} className="animate-spin" />}
                  Enviar solicitud
                </button>
                <button
                  type="button"
                  onClick={closeForm}
                  className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white transition-all"
                  style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Appointment lists */}
      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "#9ca3af" }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Cargando citas…</span>
        </div>
      ) : (
        <>
          {upcoming.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#c9a96e" }}>
                Próximas citas
              </h2>
              <div className="space-y-3">
                {upcoming.map(a => <AppointmentCard key={a.id} appt={a} onUpdateStatus={updateAppointmentStatus} />)}
              </div>
            </div>
          )}

          {upcoming.length === 0 && !showForm && (
            <div className="bg-white rounded-2xl p-8 text-center mb-8" style={{ border: "1px solid #e5e0d8" }}>
              <p className="text-sm font-medium mb-1" style={{ color: "#1a2744" }}>No tiene citas programadas</p>
              <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>
                Use el botón "Solicitar cita" para pedir una nueva cita.
              </p>
            </div>
          )}

          {past.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#9ca3af" }}>
                Citas anteriores
              </h2>
              <div className="space-y-3">
                {past.map(a => <AppointmentCard key={a.id} appt={a} onUpdateStatus={updateAppointmentStatus} />)}
              </div>
            </div>
          )}

          {appts.length === 0 && (
            <div className="py-8 text-center text-sm" style={{ color: "#9ca3af" }}>
              Aún no tiene citas registradas.
            </div>
          )}
        </>
      )}
    </div>
  );
}
import { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Plus, X, Loader2, AlertCircle, Save, EyeOff, Eye, Bell, CheckCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { apptStatus } from "../../lib/statusStyles";
import {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendAppointmentReminder,
  sendAppointmentRequest,
  sendVisitThankYou,
} from "../../lib/email";

// ─── constants ────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: "scheduled",  label: "Programada" },
  { value: "confirmed",  label: "Confirmada" },
  { value: "completed",  label: "Completada" },
  { value: "cancelled",  label: "Cancelada" },
  { value: "no_show",    label: "No presentado" },
];


const TIME_SLOTS = [];
for (let h = 8; h < 20; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:00`);
  TIME_SLOTS.push(`${String(h).padStart(2, "0")}:30`);
}

// Deterministic color from a UUID string
const PALETTE = [
  { bg: "#1a2744", light: "#1a274418" },
  { bg: "#6366f1", light: "#6366f118" },
  { bg: "#059669", light: "#05966918" },
  { bg: "#d97706", light: "#d9770618" },
  { bg: "#be185d", light: "#be185d18" },
];

function doctorColor(doctorId) {
  if (!doctorId) return { bg: "#9ca3af", light: "#9ca3af20" };
  const hash = [...doctorId].reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

function getWeekDays(startDate) {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    return d;
  });
}

// Use local year/month/day — toISOString() converts to UTC and shifts dates
// in timezones east of UTC (e.g. UTC+2 midnight = previous day in UTC).
function toDateStr(d) {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function todayStr() {
  return toDateStr(new Date());
}

// ─── data helpers ─────────────────────────────────────────────────────────────

async function fetchAll() {
  const [apptRes, patRes, docRes] = await Promise.all([
    supabase.rpc("get_all_appointments"),
    supabase.rpc("get_all_patients"),
    supabase.rpc("get_doctors"),
  ]);
  if (apptRes.error) throw apptRes.error;
  if (patRes.error)  throw patRes.error;
  if (docRes.error)  throw docRes.error;
  return {
    appointments: apptRes.data ?? [],
    patients:     patRes.data  ?? [],
    doctors:      docRes.data  ?? [],
  };
}

// ─── email helper ────────────────────────────────────────────────────────────

function dispatchApptEmail({ email, patientName, newStatus, date, time, doctor, treatment }) {
  if (!email) return;
  const [y, mo, d] = (date ?? "").split("-").map(Number);
  const dateStr = new Date(y, mo - 1, d).toLocaleDateString("es-ES", {
    weekday: "long", day: "2-digit", month: "long", year: "numeric",
  });
  const timeStr = (time ?? "").slice(0, 5) + "h";

  const base = { to: email, patientName, date: dateStr, time: timeStr, treatment: treatment ?? "—" };

  if (newStatus === "confirmed") {
    sendAppointmentConfirmation({ ...base, doctor: doctor ?? "Por asignar" })
      .then(() => console.log("[Agenda] confirmation email sent to", email))
      .catch(err => console.error("[Agenda] confirmation email error:", err));
  } else if (newStatus === "cancelled") {
    sendAppointmentCancellation(base)
      .then(() => console.log("[Agenda] cancellation email sent to", email))
      .catch(err => console.error("[Agenda] cancellation email error:", err));
  } else if (newStatus === "completed") {
    sendVisitThankYou({ to: email, patientName, treatment: treatment ?? "—", doctor })
      .then(() => console.log("[Agenda] thank-you email sent to", email))
      .catch(err => console.error("[Agenda] thank-you email error:", err));
  }
}

// ─── empty forms ─────────────────────────────────────────────────────────────

const EMPTY_CREATE = {
  patient_id: "",
  doctor_id:  "",
  date:       "",
  time:       "09:00",
  treatment:  "",
  room:       "",
  status:     "confirmed",
  notes:      "",
};

// ─── Modal ────────────────────────────────────────────────────────────────────

function Modal({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl" style={{ border: "1px solid #e5e0d8" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f3f0ea" }}>
          <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: "#9ca3af" }} />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

// ─── AppointmentForm (shared by create + edit) ────────────────────────────────

function AppointmentForm({ form, onChange, patients, doctors, showPatient = true, error, saving, onSubmit, onCancel, submitLabel = "Guardar" }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {showPatient && (
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Paciente *</label>
          <select
            required
            value={form.patient_id}
            onChange={e => onChange("patient_id", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          >
            <option value="">Seleccionar paciente…</option>
            {patients.map(p => (
              <option key={p.patient_id} value={p.patient_id}>
                {p.full_name ?? p.email ?? p.patient_id}
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Doctor</label>
        <select
          value={form.doctor_id}
          onChange={e => onChange("doctor_id", e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
          style={{ border: "1px solid #e5e0d8", color: "#374151" }}
        >
          <option value="">Sin asignar</option>
          {doctors.map(d => (
            <option key={d.id} value={d.id}>{d.full_name}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Fecha *</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={e => onChange("date", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Hora *</label>
          <select
            value={form.time}
            onChange={e => onChange("time", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          >
            {TIME_SLOTS.map(t => <option key={t} value={t}>{t}h</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Tratamiento *</label>
        <input
          type="text"
          required
          placeholder="Ej: Revisión implantes, Control ortodoncia…"
          value={form.treatment}
          onChange={e => onChange("treatment", e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
          style={{ border: "1px solid #e5e0d8", color: "#374151" }}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Sala / Cabina</label>
          <input
            type="text"
            placeholder="Ej: Sala 1, Quirófano…"
            value={form.room}
            onChange={e => onChange("room", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Estado</label>
          <select
            value={form.status}
            onChange={e => onChange("status", e.target.value)}
            className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Observaciones — staff only */}
      <div style={{ borderTop: "1px solid #f3f0ea", paddingTop: 16, marginTop: 4 }}>
        <label className="flex items-center gap-1.5 text-xs font-medium mb-1.5" style={{ color: "#374151" }}>
          <EyeOff size={12} style={{ color: "#9ca3af" }} />
          Observaciones internas
          <span className="ml-1 px-2 py-0.5 rounded-full text-xs" style={{ background: "#f3f0ea", color: "#9ca3af", fontSize: "0.65rem" }}>
            Solo personal
          </span>
        </label>
        <textarea
          rows={3}
          placeholder="Motivo de cancelación, notas del tratamiento, indicaciones para el doctor…"
          value={form.notes ?? ""}
          onChange={e => onChange("notes", e.target.value)}
          className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none bg-white"
          style={{ border: "1px solid #e5e0d8", color: "#374151" }}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
          <AlertCircle size={14} className="flex-shrink-0" />
          {error}
        </div>
      )}

      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
          style={{ background: "linear-gradient(135deg, #1a2744, #2a3a5c)", color: "white" }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {submitLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
          style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Agenda() {
  const { user } = useAuth();

  const [appts,       setAppts]       = useState([]);
  const [patients,    setPatients]    = useState([]);
  const [doctors,     setDoctors]     = useState([]);
  const [loading,     setLoading]     = useState(true);

  const [weekStart,   setWeekStart]   = useState(() => {
    const d = new Date();
    // Snap to Monday
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Create modal
  const [showCreate,    setShowCreate]    = useState(false);
  const [createForm,    setCreateForm]    = useState(EMPTY_CREATE);
  const [createError,   setCreateError]   = useState("");
  const [creating,      setCreating]      = useState(false);

  // Edit modal
  const [editAppt,      setEditAppt]      = useState(null);  // full appt object
  const [editForm,      setEditForm]      = useState(null);
  const [editError,     setEditError]     = useState("");
  const [saving,        setSaving]        = useState(false);
  const [reminderState, setReminderState] = useState("idle"); // idle | sending | sent | error

  // Cancelled visibility toggle
  const [hideCancelled, setHideCancelled] = useState(false);

  // ── load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await fetchAll();
        if (!cancelled) {
          setAppts(d.appointments);
          setPatients(d.patients);
          setDoctors(d.doctors);
        }
      } catch (err) {
        console.error("[Agenda] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── week navigation ──────────────────────────────────────────────────────────
  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };
  const goToday = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    d.setHours(0, 0, 0, 0);
    setWeekStart(d);
  };

  const days = getWeekDays(weekStart);
  const today = todayStr();

  function apptsByDay(dateStr) {
    return appts
      .filter(a => a.date === dateStr && !(hideCancelled && a.appt_status === "cancelled"))
      .sort((a, b) => (a.appointment_time ?? "").localeCompare(b.appointment_time ?? ""));
  }

  // ── create appointment ───────────────────────────────────────────────────────
  function openCreate(dateStr = "") {
    setCreateForm({ ...EMPTY_CREATE, date: dateStr });
    setCreateError("");
    setShowCreate(true);
  }

  function setCreateField(k, v) {
    setCreateForm(f => ({ ...f, [k]: v }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");
    if (!createForm.patient_id) { setCreateError("Seleccione un paciente."); return; }
    if (!createForm.date)        { setCreateError("Seleccione una fecha."); return; }
    if (!createForm.treatment)   { setCreateError("Indique el tratamiento."); return; }

    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("admin_create_appointment", {
        p_patient_id: createForm.patient_id,
        p_doctor_id:  createForm.doctor_id || null,
        p_date:       createForm.date,
        p_time:       createForm.time,
        p_treatment:  createForm.treatment,
        p_room:       createForm.room || null,
        p_status:     createForm.status,
        p_notes:      createForm.notes || null,
      });
      if (error) throw error;

      const newId = data?.id ?? data;
      const token = data?.token ?? null;

      const pt  = patients.find(p => p.patient_id === createForm.patient_id);
      const doc = doctors.find(d => d.id === createForm.doctor_id);

      setAppts(prev => [{
        id:               newId,
        date:             createForm.date,
        appointment_time: createForm.time + ":00",
        treatment:        createForm.treatment,
        room:             createForm.room || null,
        appt_status:      createForm.status,
        patient_name:     pt?.full_name ?? "—",
        patient_id:       createForm.patient_id,
        doctor_name:      doc?.full_name ?? null,
        doctor_id:        createForm.doctor_id || null,
        notes:            createForm.notes || null,
      }, ...prev]);

      // Send confirm/cancel request email to patient (best-effort)
      if (token && pt?.email) {
        const [y, mo, d] = (createForm.date ?? "").split("-").map(Number);
        const dateStr = new Date(y, mo - 1, d).toLocaleDateString("es-ES", {
          weekday: "long", day: "2-digit", month: "long", year: "numeric",
        });
        sendAppointmentRequest({
          to:          pt.email,
          patientName: pt.full_name ?? "Paciente",
          date:        dateStr,
          time:        createForm.time + "h",
          doctor:      doc?.full_name ?? "Por asignar",
          treatment:   createForm.treatment ?? "—",
          room:        createForm.room || undefined,
          token,
        }).catch(err => console.warn("[Agenda] request email error:", err.message));
      }

      setShowCreate(false);
      setCreateForm(EMPTY_CREATE);
    } catch (err) {
      console.error("[Agenda] create error:", err);
      setCreateError(err.message ?? "Error al crear la cita.");
    } finally {
      setCreating(false);
    }
  }

  // ── edit appointment ────────────────────────────────────────────────────────
  function openEdit(appt) {
    setEditAppt(appt);
    setEditForm({
      doctor_id: appt.doctor_id  ?? "",
      date:      appt.date,
      time:      (appt.appointment_time ?? "09:00:00").slice(0, 5),
      treatment: appt.treatment  ?? "",
      room:      appt.room       ?? "",
      status:    appt.appt_status ?? "scheduled",
      notes:     appt.notes      ?? "",
    });
    setEditError("");
    setReminderState("idle");
  }

  async function handleSendReminder() {
    const pat = patients.find(p => p.patient_id === editAppt.patient_id);
    if (!pat?.email) {
      setReminderState("error");
      return;
    }
    setReminderState("sending");
    try {
      const [y, mo, d] = (editForm.date ?? "").split("-").map(Number);
      const dateStr = new Date(y, mo - 1, d).toLocaleDateString("es-ES", {
        weekday: "long", day: "2-digit", month: "long", year: "numeric",
      });
      const doc = doctors.find(dr => dr.id === editForm.doctor_id);
      await sendAppointmentReminder({
        to:          pat.email,
        patientName: editAppt.patient_name ?? pat.full_name ?? "",
        date:        dateStr,
        time:        editForm.time + "h",
        doctor:      doc?.full_name ?? editAppt.doctor_name ?? "Por asignar",
        treatment:   editForm.treatment ?? "—",
        room:        editForm.room || undefined,
        token:       editAppt.confirmation_token ?? undefined,
      });
      setReminderState("sent");
      setTimeout(() => setReminderState("idle"), 3000);
    } catch (err) {
      console.error("[Agenda] reminder error:", err);
      setReminderState("error");
      setTimeout(() => setReminderState("idle"), 4000);
    }
  }

  function setEditField(k, v) {
    setEditForm(f => ({ ...f, [k]: v }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setEditError("");
    if (!editForm.date)      { setEditError("Seleccione una fecha."); return; }
    if (!editForm.treatment) { setEditError("Indique el tratamiento."); return; }

    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_appointment", {
        p_appointment_id: editAppt.id,
        p_date:           editForm.date,
        p_time:           editForm.time,
        p_treatment:      editForm.treatment,
        p_room:           editForm.room || "",
        p_status:         editForm.status,
        p_doctor_id:      editForm.doctor_id || null,
        p_notes:          editForm.notes || null,
      });
      if (error) throw error;

      const doc = doctors.find(d => d.id === editForm.doctor_id);
      setAppts(prev => prev.map(a =>
        a.id === editAppt.id
          ? {
              ...a,
              date:             editForm.date,
              appointment_time: editForm.time + ":00",
              treatment:        editForm.treatment,
              room:             editForm.room || null,
              appt_status:      editForm.status,
              doctor_id:        editForm.doctor_id || null,
              doctor_name:      doc?.full_name ?? a.doctor_name,
              notes:            editForm.notes || null,
            }
          : a
      ));
      setEditAppt(null);
      setEditForm(null);

      // Send email if status changed
      if (editAppt.appt_status !== editForm.status) {
        const pat = patients.find(p => p.patient_id === editAppt.patient_id);
        dispatchApptEmail({
          email:       pat?.email,
          patientName: editAppt.patient_name ?? pat?.full_name ?? "",
          newStatus:   editForm.status,
          date:        editForm.date,
          time:        editForm.time,
          doctor:      doc?.full_name ?? editAppt.doctor_name ?? null,
          treatment:   editForm.treatment,
        });
      }
    } catch (err) {
      console.error("[Agenda] save error:", err);
      setEditError(err.message ?? "Error al guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancel() {
    setEditError("");
    setSaving(true);
    try {
      const { error } = await supabase.rpc("admin_update_appointment", {
        p_appointment_id: editAppt.id,
        p_date:           editForm.date,
        p_time:           editForm.time,
        p_treatment:      editForm.treatment,
        p_room:           editForm.room || "",
        p_status:         "cancelled",
        p_doctor_id:      editForm.doctor_id || null,
      });
      if (error) throw error;

      setAppts(prev => prev.map(a =>
        a.id === editAppt.id ? { ...a, appt_status: "cancelled" } : a
      ));

      // Send cancellation email
      const pat = patients.find(p => p.patient_id === editAppt.patient_id);
      dispatchApptEmail({
        email:       pat?.email,
        patientName: editAppt.patient_name ?? pat?.full_name ?? "",
        newStatus:   "cancelled",
        date:        editAppt.date,
        time:        (editAppt.appointment_time ?? "09:00:00").slice(0, 5),
        doctor:      editAppt.doctor_name ?? null,
        treatment:   editAppt.treatment,
      });

      setEditAppt(null);
      setEditForm(null);
    } catch (err) {
      setEditError(err.message ?? "Error al cancelar la cita.");
    } finally {
      setSaving(false);
    }
  }

  // ── unique doctors in current data for legend ────────────────────────────────
  const legendDoctors = [...new Map(
    appts
      .filter(a => a.doctor_id && a.doctor_name)
      .map(a => [a.doctor_id, { id: a.doctor_id, name: a.doctor_name }])
  ).values()].slice(0, 5);

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Agenda</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Vista semanal de citas</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {legendDoctors.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {legendDoctors.map(doc => {
                const c = doctorColor(doc.id);
                return (
                  <span key={doc.id} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs" style={{ background: c.light, color: c.bg }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: c.bg }} />
                    {doc.name.split(" ").slice(0, 2).join(" ")}
                  </span>
                );
              })}
            </div>
          )}
          <button
            onClick={() => setHideCancelled(h => !h)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-all"
            style={hideCancelled
              ? { background: "#fee2e2", color: "#dc2626", border: "1px solid #fecaca" }
              : { border: "1px solid #e5e0d8", color: "#6b7280" }}
          >
            {hideCancelled ? <Eye size={13} /> : <EyeOff size={13} />}
            {hideCancelled ? "Mostrar canceladas" : "Ocultar canceladas"}
          </button>
          <button
            onClick={() => openCreate()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "white" }}
          >
            <Plus size={15} />
            Nueva cita
          </button>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-white transition-colors" style={{ border: "1px solid #e5e0d8" }}>
          <ChevronLeft size={16} style={{ color: "#6b7280" }} />
        </button>
        <span className="text-sm font-medium" style={{ color: "#1a2744" }}>
          {days[0].toLocaleDateString("es-ES", { day: "2-digit", month: "long" })}
          {" – "}
          {days[6].toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
        </span>
        <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-white transition-colors" style={{ border: "1px solid #e5e0d8" }}>
          <ChevronRight size={16} style={{ color: "#6b7280" }} />
        </button>
        <button
          onClick={goToday}
          className="px-3 py-1.5 rounded-xl text-xs font-medium hover:bg-white transition-colors"
          style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
        >
          Hoy
        </button>
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2" style={{ color: "#9ca3af" }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Cargando agenda…</span>
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-3">
          {days.map(day => {
            const dateStr  = toDateStr(day);
            const isToday  = dateStr === today;
            const dayAppts = apptsByDay(dateStr);
            const dayName  = day.toLocaleDateString("es-ES", { weekday: "short" });

            return (
              <div key={dateStr} className="min-h-40">
                {/* Day header */}
                <div
                  className={`text-center py-2.5 px-1 rounded-xl mb-2 cursor-pointer select-none`}
                  style={isToday
                    ? { background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }
                    : { background: "transparent" }
                  }
                  onClick={() => openCreate(dateStr)}
                  title="Añadir cita en este día"
                >
                  <p className="text-xs uppercase font-medium" style={{ color: isToday ? "rgba(255,255,255,0.8)" : "#9ca3af" }}>
                    {dayName}
                  </p>
                  <p className="text-lg font-bold leading-tight" style={{ color: isToday ? "white" : "#1a2744" }}>
                    {day.getDate()}
                  </p>
                </div>

                {/* Appointment cards */}
                <div className="space-y-1.5">
                  {dayAppts.map(appt => {
                    const c  = doctorColor(appt.doctor_id);
                    const sc = apptStatus(appt.appt_status);
                    return (
                      <div
                        key={appt.id}
                        onClick={() => openEdit(appt)}
                        className="rounded-lg p-2 text-xs cursor-pointer transition-opacity hover:opacity-70"
                        style={{
                          ...sc.card,
                          background: sc.dim ? "#f9fafb" : c.light,
                          borderLeft: `3px solid ${sc.borderColor}`,
                        }}
                      >
                        {/* Time + status badge */}
                        <div className="flex items-center justify-between gap-1">
                          <p className="font-semibold leading-none" style={{ color: sc.borderColor }}>
                            {appt.appointment_time?.slice(0, 5)}
                          </p>
                          <span
                            className="px-1 rounded text-white font-bold"
                            style={{ fontSize: 8, lineHeight: "14px", background: sc.borderColor }}
                            title={sc.label}
                          >
                            {sc.icon}
                          </span>
                        </div>
                        {/* Patient name */}
                        <p
                          className="truncate mt-1 font-medium"
                          style={{ color: "#374151", textDecoration: sc.strike ? "line-through" : "none" }}
                        >
                          {appt.patient_name?.split(" ")[0] ?? "—"}
                        </p>
                        {/* Treatment */}
                        <p className="truncate" style={{ color: "#9ca3af" }}>
                          {(appt.treatment ?? "").split(" ").slice(0, 3).join(" ")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Create modal ─────────────────────────────────────────────────────── */}
      {showCreate && (
        <Modal title="Nueva cita" onClose={() => setShowCreate(false)}>
          <AppointmentForm
            form={createForm}
            onChange={setCreateField}
            patients={patients}
            doctors={doctors}
            showPatient
            error={createError}
            saving={creating}
            onSubmit={handleCreate}
            onCancel={() => setShowCreate(false)}
            submitLabel="Crear cita"
          />
        </Modal>
      )}

      {/* ── Edit modal ───────────────────────────────────────────────────────── */}
      {editAppt && editForm && (
        <Modal
          title={`Editar cita — ${editAppt.patient_name ?? "Paciente"}`}
          onClose={() => { setEditAppt(null); setEditForm(null); }}
        >
          <AppointmentForm
            form={editForm}
            onChange={setEditField}
            patients={patients}
            doctors={doctors}
            showPatient={false}
            error={editError}
            saving={saving}
            onSubmit={handleSave}
            onCancel={() => { setEditAppt(null); setEditForm(null); }}
            submitLabel="Guardar cambios"
          />
          {/* Footer actions */}
          <div className="mt-4 pt-4 border-t" style={{ borderColor: "#f3f0ea" }}>
            <div className="flex items-center gap-3 flex-wrap">
              {/* Reminder button — hidden only for cancelled/completed/no_show */}
              {editForm.status !== "cancelled" && editForm.status !== "completed" && editForm.status !== "no_show" && (
                <button
                  type="button"
                  onClick={handleSendReminder}
                  disabled={saving || reminderState === "sending" || reminderState === "sent"}
                  className="text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-1.5"
                  style={
                    reminderState === "sent"
                      ? { color: "#059669", border: "1px solid #6ee7b7", background: "#f0fdf4" }
                      : reminderState === "error"
                      ? { color: "#dc2626", border: "1px solid #fecaca", background: "#fff1f2" }
                      : { color: "#1a2744", border: "1px solid #c7c0ae" }
                  }
                >
                  {reminderState === "sending" && <Loader2 size={13} className="animate-spin" />}
                  {reminderState === "sent"    && <CheckCircle size={13} />}
                  {reminderState === "idle"    && <Bell size={13} />}
                  {reminderState === "sending" ? "Enviando…"
                   : reminderState === "sent"  ? "Recordatorio enviado"
                   : reminderState === "error" ? "Error al enviar"
                   : "Enviar recordatorio"}
                </button>
              )}
              {/* Cancel appointment — hidden only if already cancelled */}
              {editForm.status !== "cancelled" && (
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={saving}
                  className="text-xs px-3 py-2 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  style={{ color: "#dc2626", border: "1px solid #fecaca" }}
                >
                  Cancelar esta cita
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
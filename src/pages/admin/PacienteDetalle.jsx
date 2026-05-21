import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, FileText, CreditCard, Calendar, Loader2, Eye, Download } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getDocumentUrl, logAccess, formatFileSize, mimeToType } from "../../lib/storage";

// ─── helpers ──────────────────────────────────────────────────────────────────

const APPT_LABEL = { scheduled: "Programada", confirmed: "Confirmada", completed: "Completada", cancelled: "Cancelada", no_show: "No asistió" };
const APPT_STYLE = {
  confirmed:  { background: "#e8f5e9", color: "#2e7d32" },
  completed:  { background: "#f3f4f6", color: "#6b7280" },
  scheduled:  { background: "#fff8e1", color: "#f57f17" },
  cancelled:  { background: "#fef2f2", color: "#dc2626" },
  no_show:    { background: "#fef2f2", color: "#dc2626" },
};
const PAY_LABEL = { pending: "Pendiente", paid: "Pagado", overdue: "Vencido", cancelled: "Cancelado" };
const PAY_STYLE = {
  paid:      { background: "#e8f5e9", color: "#2e7d32" },
  pending:   { background: "#fff8e1", color: "#f57f17" },
  overdue:   { background: "#fef2f2", color: "#dc2626" },
  cancelled: { background: "#f3f4f6", color: "#6b7280" },
};
const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", discharged: "Alta" };
const STATUS_STYLE = {
  active:     { background: "#e8f4fd", color: "#1565c0" },
  inactive:   { background: "#f3f4f6", color: "#6b7280" },
  discharged: { background: "#e8f5e9", color: "#2e7d32" },
};

// ─── data fetching ─────────────────────────────────────────────────────────────

async function loadDetail(patientId) {
  const [detailRes, apptsRes, docsRes, paymentsRes] = await Promise.all([
    supabase.rpc("get_patient_detail",       { p_patient_id: patientId }),
    supabase.rpc("get_patient_appointments", { p_patient_id: patientId }),
    supabase.rpc("get_patient_documents",    { p_patient_id: patientId }),
    supabase.rpc("get_patient_payments",     { p_patient_id: patientId }),
  ]);
  if (detailRes.error)   throw detailRes.error;
  if (apptsRes.error)    throw apptsRes.error;
  if (docsRes.error)     throw docsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  return {
    patient:  Array.isArray(detailRes.data)   ? detailRes.data[0]   : null,
    appts:    apptsRes.data   ?? [],
    docs:     docsRes.data    ?? [],
    payments: paymentsRes.data ?? [],
  };
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PacienteDetalle() {
  const { id } = useParams();
  const [data,         setData]         = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [notFound,     setNotFound]     = useState(false);
  const [tab,          setTab]          = useState("info");
  const [notes,        setNotes]        = useState("");
  const [savingNotes,  setSavingNotes]  = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await loadDetail(id);
        if (cancelled) return;
        if (!d.patient) { setNotFound(true); return; }
        setData(d);
        setNotes(d.patient.notes ?? "");
      } catch (err) {
        console.error("[PacienteDetalle] load error:", err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  const saveNotes = useCallback(async () => {
    if (!data?.patient) return;
    setSavingNotes(true);
    try {
      const { error } = await supabase.rpc("admin_update_patient", {
        p_patient_id: id,
        p_treatment:  data.patient.treatment ?? "",
        p_status:     data.patient.patient_status ?? "active",
        p_notes:      notes,
      });
      if (error) throw error;
      setData(prev => ({ ...prev, patient: { ...prev.patient, notes } }));
    } catch (err) {
      console.error("[PacienteDetalle] save notes error:", err);
    } finally {
      setSavingNotes(false);
    }
  }, [id, data, notes]);

  async function openDoc(doc, download = false) {
    setActionLoading(doc.id);
    try {
      const [url] = await Promise.all([
        getDocumentUrl(doc.file_path),
        logAccess(doc.id, download ? "download" : "view"),
      ]);
      if (download) {
        const a = document.createElement("a"); a.href = url; a.download = doc.name; a.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("[PacienteDetalle] open doc error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-3" style={{ color: "#9ca3af" }}>
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Cargando expediente…</span>
      </div>
    );
  }

  if (notFound || !data?.patient) {
    return (
      <div className="p-8">
        <Link to="/admin/pacientes" className="text-sm flex items-center gap-2 mb-4 hover:underline" style={{ color: "#c9a96e" }}>
          <ArrowLeft size={14} /> Volver a pacientes
        </Link>
        <p className="text-sm" style={{ color: "#6b7280" }}>Paciente no encontrado.</p>
      </div>
    );
  }

  const { patient, appts, docs, payments } = data;
  const initials = (patient.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const sc = STATUS_STYLE[patient.patient_status] ?? STATUS_STYLE.inactive;

  const tabs = [
    { id: "info",  label: "Información",         icon: User },
    { id: "citas", label: `Citas (${appts.length})`,    icon: Calendar },
    { id: "docs",  label: `Documentos (${docs.length})`, icon: FileText },
    { id: "pagos", label: `Pagos (${payments.length})`,  icon: CreditCard },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-5xl">
      <Link to="/admin/pacientes" className="inline-flex items-center gap-2 text-sm mb-6 hover:underline" style={{ color: "#c9a96e" }}>
        <ArrowLeft size={14} /> Volver a pacientes
      </Link>

      {/* Header */}
      <div className="bg-white rounded-2xl p-6 mb-6 flex items-start gap-5" style={{ border: "1px solid #e5e0d8" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-white text-lg font-bold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-semibold" style={{ color: "#1a2744" }}>{patient.full_name}</h1>
          <p className="text-sm mt-0.5" style={{ color: "#9ca3af" }}>
            {[patient.dni && `DNI: ${patient.dni}`, patient.email, patient.phone].filter(Boolean).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs px-3 py-1 rounded-full font-medium" style={sc}>
              {STATUS_LABEL[patient.patient_status] ?? patient.patient_status}
            </span>
            {patient.treatment && (
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#f3e8ff", color: "#7c3aed" }}>
                {patient.treatment}
              </span>
            )}
            {patient.doctor_name && (
              <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: "#f3f4f6", color: "#6b7280" }}>
                {patient.doctor_name}
              </span>
            )}
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

      {/* ── Info tab ─────────────────────────────────────────────────────── */}
      {tab === "info" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
            <h3 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#c9a96e" }}>Datos personales</h3>
            <div className="space-y-4">
              {[
                ["Nombre completo",    patient.full_name],
                ["DNI/NIE",           patient.dni],
                ["Fecha de nacimiento", patient.birth_date ? new Date(patient.birth_date + "T12:00").toLocaleDateString("es-ES") : null],
                ["Teléfono",          patient.phone],
                ["Email",             patient.email],
                ["Dirección",         patient.address],
              ].map(([label, val]) => (
                <div key={label}>
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{label}</p>
                  <p className="text-sm font-medium mt-0.5" style={{ color: "#1a2744" }}>{val || "—"}</p>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-4">
            <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
              <h3 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#c9a96e" }}>Datos médicos</h3>
              <div className="space-y-4">
                {[
                  ["Grupo sanguíneo",    patient.blood_type],
                  ["Alergias",          patient.allergies],
                  ["Médico",            patient.doctor_name],
                  ["Contacto emergencia", patient.emergency_contact],
                ].map(([label, val]) => (
                  <div key={label}>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>{label}</p>
                    <p className="text-sm font-medium mt-0.5" style={{ color: "#1a2744" }}>{val || "—"}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#c9a96e" }}>Notas clínicas</h3>
                {notes !== (patient.notes ?? "") && (
                  <button
                    onClick={saveNotes}
                    disabled={savingNotes}
                    className="text-xs px-3 py-1 rounded-lg font-medium transition-all hover:opacity-90 disabled:opacity-60 flex items-center gap-1"
                    style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
                  >
                    {savingNotes && <Loader2 size={12} className="animate-spin" />}
                    Guardar
                  </button>
                )}
              </div>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full text-sm rounded-xl p-3 outline-none resize-none"
                style={{ border: "1px solid #e5e0d8", color: "#374151", minHeight: "80px" }}
                placeholder="Añadir notas…"
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Citas tab ─────────────────────────────────────────────────────── */}
      {tab === "citas" && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {appts.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay citas registradas</p>
            ) : appts.map(a => {
              const as = APPT_STYLE[a.appt_status] ?? APPT_STYLE.scheduled;
              return (
                <div key={a.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0" style={{ background: "#1a274412" }}>
                    <span className="text-xs font-bold" style={{ color: "#1a2744" }}>
                      {new Date(a.date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit" })}
                    </span>
                    <span className="text-xs uppercase" style={{ color: "#c9a96e" }}>
                      {new Date(a.date + "T12:00").toLocaleDateString("es-ES", { month: "short" })}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{a.treatment || "Consulta"}</p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>
                      {[String(a.appointment_time).slice(0, 5) + "h", a.doctor_name, a.room].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full" style={as}>
                    {APPT_LABEL[a.appt_status] ?? a.appt_status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Docs tab ──────────────────────────────────────────────────────── */}
      {tab === "docs" && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {docs.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay documentos</p>
            ) : docs.map(d => {
              const type    = mimeToType(d.file_type);
              const isPDF   = type === "PDF";
              const isLoading = actionLoading === d.id;
              return (
                <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isPDF ? "#fff1e6" : "#e8f4fd" }}>
                    <FileText size={14} style={{ color: isPDF ? "#f97316" : "#3b82f6" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{d.name}</p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>
                      {[d.category, formatFileSize(d.file_size), new Date(d.created_at).toLocaleDateString("es-ES")].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openDoc(d, false)} disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Ver">
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                    </button>
                    <button onClick={() => openDoc(d, true)} disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Descargar">
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Pagos tab ─────────────────────────────────────────────────────── */}
      {tab === "pagos" && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {payments.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay pagos registrados</p>
            ) : payments.map(p => {
              const ps = PAY_STYLE[p.pay_status] ?? PAY_STYLE.pending;
              return (
                <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{p.concept}</p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>
                      {p.due_date ? new Date(p.due_date + "T12:00").toLocaleDateString("es-ES") : new Date(p.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>
                    {Number(p.amount).toLocaleString("es-ES")} €
                  </p>
                  <span className="text-xs px-2.5 py-1 rounded-full" style={ps}>
                    {PAY_LABEL[p.pay_status] ?? p.pay_status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
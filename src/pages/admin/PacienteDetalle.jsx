import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, FileText, CreditCard, Calendar, Loader2, Eye, Download, CheckCircle, PenLine, Trash2 } from "lucide-react";
import { supabase } from "../../lib/supabase";
import { getDocumentUrl, logAccess, formatFileSize, mimeToType, deleteDocument } from "../../lib/storage";
import { viewSignedPDF, downloadSignedPDF, printConsentForm } from "../../lib/pdfSigning";
import { apptStatus, patientStatus, paymentStatus } from "../../lib/statusStyles";
import {
  sendAppointmentConfirmation,
  sendAppointmentCancellation,
  sendVisitThankYou,
} from "../../lib/email";

const APPT_STATUS_OPTIONS = [
  { value: "scheduled",  label: "Programada" },
  { value: "confirmed",  label: "Confirmada" },
  { value: "completed",  label: "Completada" },
  { value: "cancelled",  label: "Cancelada" },
  { value: "no_show",    label: "No presentado" },
];

// ─── data fetching ─────────────────────────────────────────────────────────────

async function loadDetail(patientId) {
  const [detailRes, apptsRes, docsRes, paymentsRes, signedRes] = await Promise.all([
    supabase.rpc("get_patient_detail",         { p_patient_id: patientId }),
    supabase.rpc("get_patient_appointments",   { p_patient_id: patientId }),
    supabase.rpc("get_patient_documents",      { p_patient_id: patientId }),
    supabase.rpc("get_patient_payments",       { p_patient_id: patientId }),
    supabase.rpc("get_patient_signed_forms",   { p_patient_id: patientId }),
  ]);
  if (detailRes.error)   throw detailRes.error;
  if (apptsRes.error)    throw apptsRes.error;
  if (docsRes.error)     throw docsRes.error;
  if (paymentsRes.error) throw paymentsRes.error;
  return {
    patient:      Array.isArray(detailRes.data) ? detailRes.data[0] : null,
    appts:        apptsRes.data   ?? [],
    docs:         docsRes.data    ?? [],
    payments:     paymentsRes.data ?? [],
    signedForms:  signedRes.data   ?? [],
  };
}

// ─── component ────────────────────────────────────────────────────────────────

export default function PacienteDetalle() {
  const { id } = useParams();
  const [data,           setData]           = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [notFound,       setNotFound]       = useState(false);
  const [tab,            setTab]            = useState("info");
  const [notes,          setNotes]          = useState("");
  const [savingNotes,    setSavingNotes]    = useState(false);
  const [actionLoading,  setActionLoading]  = useState(null);
  const [statusChanging, setStatusChanging] = useState(null); // appointment id being updated
  const [pdfWorking,     setPdfWorking]     = useState(null); // { id, action }
  const [deleteTarget,   setDeleteTarget]   = useState(null); // doc pending deletion
  const [deleting,       setDeleting]       = useState(false);

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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDocument(deleteTarget.file_path, deleteTarget.id);
      setData(prev => ({ ...prev, docs: prev.docs.filter(d => d.id !== deleteTarget.id) }));
      setDeleteTarget(null);
    } catch (err) {
      console.error("[PacienteDetalle] delete error:", err);
    } finally {
      setDeleting(false);
    }
  }

  async function changeApptStatus(appt, newStatus) {
    if (appt.appt_status === newStatus) return;
    setStatusChanging(appt.id);
    try {
      const { error } = await supabase.rpc("admin_update_appointment", {
        p_appointment_id: appt.id,
        p_date:           appt.date,
        p_time:           String(appt.appointment_time).slice(0, 5),
        p_treatment:      appt.treatment ?? "",
        p_room:           appt.room ?? "",
        p_status:         newStatus,
        p_doctor_id:      appt.doctor_id ?? null,
      });
      if (error) throw error;

      setData(prev => ({
        ...prev,
        appts: prev.appts.map(a => a.id === appt.id ? { ...a, appt_status: newStatus } : a),
      }));

      // Send email — patient.email is already loaded in data.patient
      const email = data?.patient?.email;
      if (email) {
        const patientName = data.patient.full_name ?? email;
        const [y, mo, d] = (appt.date ?? "").split("-").map(Number);
        const dateStr = new Date(y, mo - 1, d).toLocaleDateString("es-ES", {
          weekday: "long", day: "2-digit", month: "long", year: "numeric",
        });
        const timeStr = String(appt.appointment_time).slice(0, 5) + "h";
        const base = { to: email, patientName, date: dateStr, time: timeStr, treatment: appt.treatment ?? "—" };

        if (newStatus === "confirmed") {
          sendAppointmentConfirmation({ ...base, doctor: appt.doctor_name ?? "Por asignar" })
            .then(() => console.log("[PacienteDetalle] confirmation email sent"))
            .catch(err => console.error("[PacienteDetalle] confirmation email error:", err));
        } else if (newStatus === "cancelled") {
          sendAppointmentCancellation(base)
            .then(() => console.log("[PacienteDetalle] cancellation email sent"))
            .catch(err => console.error("[PacienteDetalle] cancellation email error:", err));
        } else if (newStatus === "completed") {
          sendVisitThankYou({ to: email, patientName, treatment: appt.treatment ?? "—", doctor: appt.doctor_name ?? null })
            .then(() => console.log("[PacienteDetalle] thank-you email sent"))
            .catch(err => console.error("[PacienteDetalle] thank-you email error:", err));
        }
      }
    } catch (err) {
      console.error("[PacienteDetalle] status change error:", err);
    } finally {
      setStatusChanging(null);
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

  const { patient, appts, docs, payments, signedForms } = data;
  const initials = (patient.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const sc = patientStatus(patient.patient_status);

  async function handleSignedForm(form, action) {
    setPdfWorking({ id: form.id, action });
    try {
      let pdfUrl = null;
      if (form.document_path) {
        const { data: urlData, error: urlErr } = await supabase.storage
          .from("consent-forms")
          .createSignedUrl(form.document_path, 300);
        if (urlErr) throw urlErr;
        pdfUrl = urlData.signedUrl;
      }
      const patientName = patient.full_name ?? "";
      const signedAt = form.signed_at ? new Date(form.signed_at) : null;
      if (action === "view") {
        if (pdfUrl) {
          await viewSignedPDF(pdfUrl, form.signature_data, form, signedAt, patientName, () => {});
        } else {
          printConsentForm(form, signedAt, patientName);
        }
      } else {
        if (pdfUrl) {
          await downloadSignedPDF(pdfUrl, form.signature_data, form, signedAt, patientName, () => {});
        } else {
          printConsentForm(form, signedAt, patientName);
        }
      }
    } catch (err) {
      console.error("[PacienteDetalle] signed form error:", err);
    } finally {
      setPdfWorking(null);
    }
  }

  const tabs = [
    { id: "info",  label: "Información",         icon: User },
    { id: "citas", label: `Citas (${appts.length})`,    icon: Calendar },
    { id: "docs",  label: `Documentos (${docs.length + signedForms.length})`, icon: FileText },
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
            <span className="flex items-center gap-1 text-xs px-3 py-1 rounded-full font-semibold" style={sc.badge}>
              {sc.icon} {sc.label}
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
              const as = apptStatus(a.appt_status);
              const isChanging = statusChanging === a.id;
              return (
                <div key={a.id} className="flex items-center gap-4 px-6 py-4" style={as.card}>
                  {/* Date chip */}
                  <div className="w-10 h-10 rounded-xl flex flex-col items-center justify-center flex-shrink-0"
                    style={{ background: as.dim ? "#f3f4f6" : "#1a274412", borderLeft: `3px solid ${as.borderColor}` }}>
                    <span className="text-xs font-bold" style={{ color: "#1a2744" }}>
                      {new Date(a.date + "T12:00").toLocaleDateString("es-ES", { day: "2-digit" })}
                    </span>
                    <span className="text-xs uppercase" style={{ color: "#c9a96e" }}>
                      {new Date(a.date + "T12:00").toLocaleDateString("es-ES", { month: "short" })}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: "#1a2744", textDecoration: as.strike ? "line-through" : "none" }}>{a.treatment || "Consulta"}</p>
                    <p className="text-xs" style={{ color: "#9ca3af" }}>
                      {[String(a.appointment_time).slice(0, 5) + "h", a.doctor_name, a.room].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {/* Status selector */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isChanging ? (
                      <Loader2 size={14} className="animate-spin" style={{ color: "#9ca3af" }} />
                    ) : (
                      <select
                        value={a.appt_status}
                        onChange={e => changeApptStatus(a, e.target.value)}
                        className="text-xs rounded-lg px-2 py-1.5 outline-none bg-white cursor-pointer"
                        style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                      >
                        {APPT_STATUS_OPTIONS.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    )}
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold" style={as.badge}>
                      {as.icon} {as.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Docs tab ──────────────────────────────────────────────────────── */}
      {tab === "docs" && (
        <div className="space-y-6">

          {/* Regular files */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#f3f0ea" }}>
              <FileText size={14} style={{ color: "#c9a96e" }} />
              <h3 className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#c9a96e" }}>
                Archivos ({docs.length})
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
              {docs.length === 0 ? (
                <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay archivos subidos</p>
              ) : docs.map(d => {
                const type      = mimeToType(d.file_type);
                const isPDF     = type === "PDF";
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
                      <button onClick={() => setDeleteTarget(d)} disabled={isLoading}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-500 disabled:opacity-50"
                        title="Eliminar">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Signed consent forms */}
          <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
            <div className="px-6 py-4 border-b flex items-center gap-2" style={{ borderColor: "#f3f0ea" }}>
              <PenLine size={14} style={{ color: "#10b981" }} />
              <h3 className="text-xs uppercase tracking-wider font-semibold" style={{ color: "#10b981" }}>
                Documentos firmados ({signedForms.length})
              </h3>
            </div>
            <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
              {signedForms.length === 0 ? (
                <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay documentos firmados</p>
              ) : signedForms.map(f => {
                const isWorkingView = pdfWorking?.id === f.id && pdfWorking?.action === "view";
                const isWorkingDown = pdfWorking?.id === f.id && pdfWorking?.action === "download";
                const isWorking     = pdfWorking?.id === f.id;
                return (
                  <div key={f.id} className="flex items-center gap-4 px-6 py-4">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "#d1fae5" }}>
                      <CheckCircle size={14} style={{ color: "#10b981" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{f.title}</p>
                      <p className="text-xs" style={{ color: "#9ca3af" }}>
                        Firmado el {f.signed_at ? new Date(f.signed_at).toLocaleDateString("es-ES") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleSignedForm(f, "view")}
                        disabled={isWorking}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        title="Ver">
                        {isWorkingView ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                      </button>
                      <button
                        onClick={() => handleSignedForm(f, "download")}
                        disabled={isWorking}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                        title="Descargar">
                        {isWorkingDown ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
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
              const ps = paymentStatus(p.pay_status);
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
                  <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold" style={ps.badge}>
                    {ps.icon} {ps.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Delete confirmation modal ──────────────────────────────────────────── */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={e => { if (e.target === e.currentTarget) setDeleteTarget(null); }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl"
            style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "#fef2f2" }}>
                <Trash2 size={18} style={{ color: "#dc2626" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>Eliminar documento</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Esta acción no se puede deshacer</p>
              </div>
            </div>
            <p className="text-sm mb-1" style={{ color: "#374151" }}>Vas a eliminar permanentemente:</p>
            <p className="text-sm font-semibold mb-5 truncate" style={{ color: "#1a2744" }}>{deleteTarget.name}</p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all hover:opacity-90 disabled:opacity-60"
                style={{ background: "#dc2626", color: "white" }}>
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? "Eliminando…" : "Sí, eliminar"}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all"
                style={{ background: "white", border: "1px solid #e5e0d8", color: "#6b7280" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
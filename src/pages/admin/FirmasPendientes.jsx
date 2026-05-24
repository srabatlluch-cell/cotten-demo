import { useState, useEffect, useRef } from "react";
import { PenLine, Send, CheckCircle, Clock, Plus, X, Loader2, AlertCircle, Eye, EyeOff, Paperclip, FileText, Pencil, Download } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { sendSignatureReminder } from "../../lib/email";
import { consentWaitStyle } from "../../lib/statusStyles";

const CONSENT_BUCKET = "consent-forms";
const MAX_PDF_MB     = 20;

// ─── storage helpers ──────────────────────────────────────────────────────────

async function uploadConsentPDF(patientId, file) {
  const safeName = file.name.replace(/[^\w.\-]/g, "_");
  const path     = `${patientId}/${Date.now()}_${safeName}`;
  const { error } = await supabase.storage.from(CONSENT_BUCKET).upload(path, file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (error) throw error;
  return path;
}

async function deleteConsentPDF(path) {
  await supabase.storage.from(CONSENT_BUCKET).remove([path]);
}

async function fetchSignedUrl(path) {
  const { data } = await supabase.storage.from(CONSENT_BUCKET).createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

// ─── data helpers ─────────────────────────────────────────────────────────────

async function loadData() {
  const [formsRes, patsRes] = await Promise.all([
    supabase.rpc("get_all_consent_forms"),
    supabase.rpc("get_all_patients"),
  ]);
  if (formsRes.error) throw formsRes.error;
  if (patsRes.error)  throw patsRes.error;

  const forms = formsRes.data ?? [];
  console.log("[FirmasPendientes] loaded", forms.length, "forms");
  forms.forEach(f => console.log(`  form ${f.id} "${f.title}" document_path=${f.document_path ?? "null"}`));

  return { forms, patients: patsRes.data ?? [] };
}

function validatePdf(file, setError) {
  if (file.type !== "application/pdf") {
    setError("Solo se admiten archivos PDF.");
    return false;
  }
  if (file.size > MAX_PDF_MB * 1024 * 1024) {
    setError(`El PDF no puede superar los ${MAX_PDF_MB} MB.`);
    return false;
  }
  return true;
}

const EMPTY_FORM = { patient_id: "", title: "", content: "" };

// ─── PreviewModal ─────────────────────────────────────────────────────────────

function PreviewModal({ form, pdfUrl, pdfLoading, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.55)" }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col" style={{ border: "1px solid #e5e0d8", maxHeight: "90vh" }}>

        {/* Header */}
        <div className="flex items-start justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: "#f3f0ea" }}>
          <div>
            <p className="font-semibold" style={{ color: "#1a2744" }}>{form.title}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
              {form.patient_name} · Creado {new Date(form.created_at).toLocaleDateString("es-ES")}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 flex-shrink-0 ml-4">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {pdfLoading && (
            <div className="flex items-center justify-center gap-2 py-10" style={{ color: "#9ca3af" }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Cargando PDF…</span>
            </div>
          )}
          {!pdfLoading && pdfUrl && (
            <div>
              <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>Documento PDF</p>
              <iframe
                src={pdfUrl}
                title={form.title}
                className="w-full rounded-xl"
                style={{ height: 420, border: "1px solid #e5e0d8" }}
              />
              <a href={pdfUrl} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs mt-2 hover:underline" style={{ color: "#3b82f6" }}>
                <Download size={12} /> Abrir en nueva pestaña
              </a>
            </div>
          )}
          {form.content && (
            <div>
              {pdfUrl && <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>Texto del consentimiento</p>}
              <div className="rounded-xl p-4 max-h-64 overflow-y-auto" style={{ background: "#fafaf9", border: "1px solid #f3f0ea" }}>
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "#374151" }}>{form.content}</pre>
              </div>
            </div>
          )}
          {!pdfLoading && !pdfUrl && !form.content && (
            <p className="text-sm text-center py-8" style={{ color: "#9ca3af" }}>Sin contenido</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t flex-shrink-0" style={{ borderColor: "#f3f0ea" }}>
          <button onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm transition-all hover:bg-gray-50"
            style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}>
            Cerrar
          </button>
          {form.form_status === "pending" && onEdit && (
            <button
              onClick={() => { onClose(); onEdit(form); }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90"
              style={{ background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" }}
            >
              <Pencil size={13} /> Editar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── SignatureModal ────────────────────────────────────────────────────────────

function SignatureModal({ form, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" style={{ border: "1px solid #e5e0d8" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f3f0ea" }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{form.title}</p>
            <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{form.patient_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <p className="text-xs uppercase tracking-wider mb-2" style={{ color: "#9ca3af" }}>Firma del paciente</p>
            {form.signature_data
              ? <img src={form.signature_data} alt="Firma" className="w-full rounded-xl" style={{ border: "1px solid #e5e0d8", background: "#fafaf9" }} />
              : <p className="text-sm" style={{ color: "#9ca3af" }}>Sin imagen de firma</p>
            }
          </div>
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <p style={{ color: "#9ca3af" }}>Fecha y hora</p>
              <p className="font-medium mt-0.5" style={{ color: "#1a2744" }}>
                {form.signed_at
                  ? new Date(form.signed_at).toLocaleString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" })
                  : "—"}
              </p>
            </div>
            <div>
              <p style={{ color: "#9ca3af" }}>Dirección IP</p>
              <p className="font-medium mt-0.5 font-mono" style={{ color: "#1a2744" }}>{form.ip_address ?? "—"}</p>
            </div>
            <div className="col-span-2">
              <p style={{ color: "#9ca3af" }}>Navegador</p>
              <p className="font-medium mt-0.5 break-all" style={{ color: "#1a2744", fontSize: 10 }}>{form.user_agent ?? "—"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FirmasPendientes() {
  const { user } = useAuth();

  const [forms,       setForms]       = useState([]);
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [showSigned,  setShowSigned]  = useState(false);
  const [sigModal,    setSigModal]    = useState(null);
  const [sent,        setSent]        = useState(new Set());
  const [sending,     setSending]     = useState(new Set());

  // Cache of formId → signedUrl so we never re-fetch within the same session
  const [pdfUrlMap,   setPdfUrlMap]   = useState({});

  // Preview modal (post-create + "Ver" on pending rows)
  const [viewForm,       setViewForm]       = useState(null);
  const [viewPdfUrl,     setViewPdfUrl]     = useState(null);
  const [viewPdfLoading, setViewPdfLoading] = useState(false);

  // Create modal
  const [showCreate,  setShowCreate]  = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [pdfFile,     setPdfFile]     = useState(null);
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState("");
  const fileInputRef = useRef(null);

  // Edit modal
  const [editTarget,     setEditTarget]     = useState(null);
  const [editData,       setEditData]       = useState({ title: "", content: "" });
  const [editPdfFile,    setEditPdfFile]    = useState(null);
  const [editPdfUrl,     setEditPdfUrl]     = useState(null);
  const [editPdfLoading, setEditPdfLoading] = useState(false);
  const [editSaving,     setEditSaving]     = useState(false);
  const [editError,      setEditError]      = useState("");
  const editFileInputRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await loadData();
        if (cancelled) return;
        setForms(d.forms);
        setPatients(d.patients);

        // Pre-fetch signed URLs for all forms that have a PDF
        const withPdf = d.forms.filter(f => f.document_path);
        console.log("[FirmasPendientes]", withPdf.length, "forms have a document_path — pre-fetching signed URLs");
        if (withPdf.length > 0) {
          const entries = await Promise.all(
            withPdf.map(async f => {
              const url = await fetchSignedUrl(f.document_path);
              console.log(`  signed URL for form "${f.title}":`, url ? "ok" : "failed");
              return [f.id, url];
            })
          );
          if (!cancelled) {
            setPdfUrlMap(Object.fromEntries(entries.filter(([, url]) => url)));
          }
        }
      } catch (err) {
        console.error("[FirmasPendientes] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const pending = forms.filter(f => f.form_status === "pending");
  const signed  = forms.filter(f => f.form_status === "signed");

  // ── open preview modal ───────────────────────────────────────────────────────
  async function openView(target) {
    setViewForm(target);
    // Use cached URL if available
    if (pdfUrlMap[target.id]) {
      setViewPdfUrl(pdfUrlMap[target.id]);
      setViewPdfLoading(false);
      return;
    }
    setViewPdfUrl(null);
    if (target.document_path) {
      setViewPdfLoading(true);
      try {
        const url = await fetchSignedUrl(target.document_path);
        if (url) {
          setViewPdfUrl(url);
          setPdfUrlMap(prev => ({ ...prev, [target.id]: url }));
        }
      } catch (err) {
        console.error("[FirmasPendientes] preview URL error:", err);
      } finally {
        setViewPdfLoading(false);
      }
    }
  }

  // ── open edit modal ──────────────────────────────────────────────────────────
  async function openEdit(target) {
    setEditTarget(target);
    setEditData({ title: target.title, content: target.content ?? "" });
    setEditPdfFile(null);
    setEditError("");
    setEditPdfUrl(null);
    if (editFileInputRef.current) editFileInputRef.current.value = "";
    // Use cached URL if available
    if (pdfUrlMap[target.id]) {
      setEditPdfUrl(pdfUrlMap[target.id]);
      return;
    }
    if (target.document_path) {
      setEditPdfLoading(true);
      try {
        const url = await fetchSignedUrl(target.document_path);
        if (url) {
          setEditPdfUrl(url);
          setPdfUrlMap(prev => ({ ...prev, [target.id]: url }));
        }
      } catch (err) {
        console.error("[FirmasPendientes] edit URL error:", err);
      } finally {
        setEditPdfLoading(false);
      }
    }
  }

  // ── create form file input ────────────────────────────────────────────────────
  function handleFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    if (!file) { setPdfFile(null); return; }
    if (!validatePdf(file, setCreateError)) { e.target.value = ""; return; }
    setCreateError("");
    setPdfFile(file);
  }

  // ── edit form file input ──────────────────────────────────────────────────────
  function handleEditFileChange(e) {
    const file = e.target.files?.[0] ?? null;
    if (!file) { setEditPdfFile(null); return; }
    if (!validatePdf(file, setEditError)) { e.target.value = ""; return; }
    setEditError("");
    setEditPdfFile(file);
  }

  // ── create consent form ──────────────────────────────────────────────────────
  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");
    if (!form.patient_id) { setCreateError("Seleccione un paciente."); return; }
    if (!form.title.trim()) { setCreateError("Indique el título del consentimiento."); return; }
    if (!form.content.trim() && !pdfFile) {
      setCreateError("Añada el texto del consentimiento o adjunte un PDF (o ambos).");
      return;
    }

    setCreating(true);
    let uploadedPath = null;
    try {
      if (pdfFile) {
        uploadedPath = await uploadConsentPDF(form.patient_id, pdfFile);
      }
      console.log("[FirmasPendientes] calling admin_create_consent_form with document_path:", uploadedPath ?? "null");
      const { data: newId, error } = await supabase.rpc("admin_create_consent_form", {
        p_patient_id:    form.patient_id,
        p_title:         form.title.trim(),
        p_content:       form.content.trim() || null,
        p_document_path: uploadedPath,
      });
      if (error) throw error;
      console.log("[FirmasPendientes] form created, id:", newId, "document_path saved:", uploadedPath ?? "null");

      const pat = patients.find(p => p.patient_id === form.patient_id);
      const newFormObj = {
        id:             newId,
        patient_id:     form.patient_id,
        patient_name:   pat?.full_name ?? "—",
        title:          form.title.trim(),
        content:        form.content.trim() || null,
        document_path:  uploadedPath,
        form_status:    "pending",
        created_at:     new Date().toISOString(),
        signed_at:      null,
        signature_data: null,
        ip_address:     null,
        user_agent:     null,
        days_waiting:   0,
      };
      setForms(prev => [newFormObj, ...prev]);
      setShowCreate(false);
      setForm(EMPTY_FORM);
      setPdfFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Pre-populate URL cache for the new form so preview opens instantly
      if (uploadedPath) {
        const freshUrl = await fetchSignedUrl(uploadedPath);
        if (freshUrl) setPdfUrlMap(prev => ({ ...prev, [newId]: freshUrl }));
      }

      // Open preview immediately after creation
      await openView(newFormObj);
    } catch (err) {
      console.error("[FirmasPendientes] create error:", err);
      if (uploadedPath) await deleteConsentPDF(uploadedPath);
      setCreateError(err.message ?? "Error al crear el consentimiento.");
    } finally {
      setCreating(false);
    }
  }

  // ── save edit ────────────────────────────────────────────────────────────────
  async function handleSaveEdit(e) {
    e.preventDefault();
    setEditError("");
    if (!editData.title.trim()) { setEditError("El título es obligatorio."); return; }

    setEditSaving(true);
    let newPath = editTarget.document_path;
    try {
      if (editPdfFile) {
        newPath = await uploadConsentPDF(editTarget.patient_id, editPdfFile);
      }
      const { error } = await supabase.rpc("admin_update_consent_form", {
        p_form_id:       editTarget.id,
        p_title:         editData.title.trim(),
        p_content:       editData.content.trim() || null,
        p_document_path: newPath,
      });
      if (error) {
        if (editPdfFile && newPath !== editTarget.document_path) await deleteConsentPDF(newPath);
        throw error;
      }
      // Delete replaced PDF from storage
      if (editPdfFile && editTarget.document_path && newPath !== editTarget.document_path) {
        await deleteConsentPDF(editTarget.document_path);
      }
      setForms(prev => prev.map(f =>
        f.id === editTarget.id
          ? { ...f, title: editData.title.trim(), content: editData.content.trim() || null, document_path: newPath }
          : f
      ));
      setEditTarget(null);
    } catch (err) {
      console.error("[FirmasPendientes] edit error:", err);
      setEditError(err.message ?? "Error al guardar los cambios.");
    } finally {
      setEditSaving(false);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Firmas Pendientes</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Consentimientos informados pendientes de firma por los pacientes</p>
        </div>
        <button
          onClick={() => { setShowCreate(true); setCreateError(""); setForm(EMPTY_FORM); setPdfFile(null); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" }}
        >
          <Plus size={15} /> Nuevo consentimiento
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 gap-2" style={{ color: "#9ca3af" }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Cargando consentimientos…</span>
        </div>
      ) : (
        <>
          {/* Summary banner */}
          {pending.length > 0 ? (
            <div className="p-5 rounded-2xl mb-6 flex items-center gap-4" style={{ background: "#fff8e1", border: "1px solid #ffc10730" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff3cd" }}>
                <PenLine size={18} style={{ color: "#f57f17" }} />
              </div>
              <div>
                <p className="font-semibold text-sm" style={{ color: "#e65100" }}>
                  {pending.length} consentimiento{pending.length !== 1 ? "s" : ""} pendiente{pending.length !== 1 ? "s" : ""} de firma
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#f57f17" }}>Envíe recordatorios a los pacientes para agilizar el proceso</p>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl mb-6 flex items-center gap-4" style={{ background: "#dcfce7", border: "1px solid #15803d20" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#bbf7d0" }}>
                <CheckCircle size={18} style={{ color: "#15803d" }} />
              </div>
              <p className="font-semibold text-sm" style={{ color: "#15803d" }}>Todos los consentimientos están al día</p>
            </div>
          )}

          {/* Pending list */}
          {pending.length > 0 && (
            <div className="space-y-4 mb-8">
              {pending.map(sig => {
                const isSent = sent.has(sig.id);
                return (
                  <div key={sig.id} className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
                          style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                          {(sig.patient_name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{sig.patient_name}</p>
                          <p className="text-sm mt-0.5" style={{ color: "#374151" }}>{sig.title}</p>
                          <div className="flex items-center gap-3 mt-2 flex-wrap">
                            <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                              <Clock size={12} />
                              Añadido: {new Date(sig.created_at).toLocaleDateString("es-ES")}
                            </span>
                            <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={consentWaitStyle(sig.days_waiting)}>
                              ⏳ {sig.days_waiting} día{sig.days_waiting !== 1 ? "s" : ""} sin firmar
                            </span>
                            {sig.document_path && (
                              <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                                <Paperclip size={10} /> PDF adjunto
                              </span>
                            )}
                          </div>
                          {/* Action links */}
                          <div className="flex items-center gap-3 mt-2.5">
                            <button
                              onClick={() => openView(sig)}
                              className="flex items-center gap-1 text-xs hover:underline"
                              style={{ color: "#c9a96e" }}
                            >
                              <Eye size={11} /> Ver contenido
                            </button>
                            <span style={{ color: "#e5e0d8" }}>·</span>
                            <button
                              onClick={() => openEdit(sig)}
                              className="flex items-center gap-1 text-xs hover:underline"
                              style={{ color: "#6b7280" }}
                            >
                              <Pencil size={11} /> Editar
                            </button>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSent ? (
                          <span className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl" style={{ background: "#dcfce7", color: "#15803d" }}>
                            <CheckCircle size={14} />
                            Recordatorio enviado
                          </span>
                        ) : (
                          <button
                            disabled={sending.has(sig.id)}
                            onClick={async () => {
                              const pat = patients.find(p => p.patient_id === sig.patient_id);
                              if (!pat?.email) return;
                              setSending(prev => new Set([...prev, sig.id]));
                              try {
                                await sendSignatureReminder({
                                  to: pat.email,
                                  patientName: sig.patient_name,
                                  documentTitle: sig.title,
                                });
                                setSent(prev => new Set([...prev, sig.id]));
                              } catch (err) {
                                console.error("[FirmasPendientes] reminder error:", err);
                              } finally {
                                setSending(prev => { const s = new Set(prev); s.delete(sig.id); return s; });
                              }
                            }}
                            className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl font-medium transition-all hover:opacity-90 hover:scale-105 disabled:opacity-60"
                            style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
                          >
                            {sending.has(sig.id) ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                            {sending.has(sig.id) ? "Enviando…" : "Enviar recordatorio"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Signed forms section */}
          {signed.length > 0 && (
            <div>
              <button
                onClick={() => setShowSigned(s => !s)}
                className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold mb-4 hover:opacity-70 transition-opacity"
                style={{ color: "#9ca3af" }}
              >
                {showSigned ? <EyeOff size={13} /> : <Eye size={13} />}
                {showSigned ? "Ocultar" : "Ver"} formularios firmados ({signed.length})
              </button>

              {showSigned && (
                <div className="space-y-3">
                  {signed.map(sig => (
                    <div key={sig.id} className="bg-white rounded-2xl p-5 flex items-start gap-4" style={{ border: "1px solid #e5e0d8" }}>
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold"
                        style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                        {(sig.patient_name ?? "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{sig.patient_name}</p>
                        <p className="text-sm mt-0.5" style={{ color: "#374151" }}>{sig.title}</p>
                        <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                          Firmado el {sig.signed_at
                            ? new Date(sig.signed_at).toLocaleString("es-ES", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
                            : "—"}
                        </p>
                        <div className="flex items-center gap-3 mt-2 flex-wrap">
                          {sig.document_path && (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                              <Paperclip size={10} /> PDF adjunto
                            </span>
                          )}
                          <button onClick={() => openView(sig)} className="flex items-center gap-1 text-xs hover:underline" style={{ color: "#c9a96e" }}>
                            <Eye size={11} /> Ver contenido
                          </button>
                        </div>
                      </div>
                      {sig.signature_data && (
                        <div className="flex-shrink-0 hidden sm:block">
                          <img
                            src={sig.signature_data}
                            alt="Firma"
                            className="h-10 rounded-lg cursor-pointer hover:opacity-80 transition-opacity"
                            style={{ border: "1px solid #e5e0d8", background: "#fafaf9", maxWidth: 120 }}
                            onClick={() => setSigModal(sig)}
                            title="Ver firma completa"
                          />
                        </div>
                      )}
                      <button
                        onClick={() => setSigModal(sig)}
                        className="flex-shrink-0 flex items-center gap-1 text-xs px-3 py-1.5 rounded-xl transition-all hover:bg-gray-50"
                        style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
                      >
                        <CheckCircle size={12} style={{ color: "#15803d" }} />
                        Firmado
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Signature detail modal ─────────────────────────────────────────────── */}
      {sigModal && (
        <SignatureModal form={sigModal} onClose={() => setSigModal(null)} />
      )}

      {/* ── Preview / view modal ───────────────────────────────────────────────── */}
      {viewForm && (
        <PreviewModal
          form={viewForm}
          pdfUrl={viewPdfUrl}
          pdfLoading={viewPdfLoading}
          onClose={() => setViewForm(null)}
          onEdit={openEdit}
        />
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────────────── */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ border: "1px solid #e5e0d8", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: "#f3f0ea" }}>
              <div>
                <h2 className="font-semibold" style={{ color: "#1a2744" }}>Editar consentimiento</h2>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{editTarget.patient_name}</p>
              </div>
              <button onClick={() => setEditTarget(null)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Título *</label>
                <input
                  type="text"
                  required
                  value={editData.title}
                  onChange={e => setEditData(d => ({ ...d, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Contenido del consentimiento</label>
                <textarea
                  rows={6}
                  value={editData.content}
                  onChange={e => setEditData(d => ({ ...d, content: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-y"
                  style={{ border: "1px solid #e5e0d8", color: "#374151", minHeight: 120 }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Documento PDF</label>

                {/* Current PDF preview */}
                {!editPdfFile && editTarget.document_path && (
                  <div className="mb-2">
                    {editPdfLoading ? (
                      <div className="flex items-center gap-2 text-xs py-2" style={{ color: "#9ca3af" }}>
                        <Loader2 size={13} className="animate-spin" /> Cargando PDF actual…
                      </div>
                    ) : editPdfUrl ? (
                      <div className="rounded-xl overflow-hidden mb-2" style={{ border: "1px solid #e5e0d8" }}>
                        <iframe src={editPdfUrl} title="PDF actual" className="w-full" style={{ height: 220 }} />
                      </div>
                    ) : null}
                    <p className="text-xs" style={{ color: "#6b7280" }}>PDF actual adjunto. Seleccione un nuevo archivo para reemplazarlo.</p>
                  </div>
                )}

                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleEditFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => editFileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:bg-gray-50 flex-1 text-left"
                    style={{ border: "1px dashed #c9a96e", color: editPdfFile ? "#1a2744" : "#9ca3af" }}
                  >
                    <Paperclip size={14} style={{ color: "#c9a96e", flexShrink: 0 }} />
                    <span className="truncate">
                      {editPdfFile ? editPdfFile.name : editTarget.document_path ? "Reemplazar PDF…" : "Adjuntar PDF (máx. 20 MB)…"}
                    </span>
                  </button>
                  {editPdfFile && (
                    <button
                      type="button"
                      onClick={() => { setEditPdfFile(null); if (editFileInputRef.current) editFileInputRef.current.value = ""; }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: "#dc2626" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {editError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#dc2626" }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {editError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                  style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={editSaving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}>
                  {editSaving && <Loader2 size={14} className="animate-spin" />}
                  {editSaving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Create consent form modal ──────────────────────────────────────────── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col" style={{ border: "1px solid #e5e0d8", maxHeight: "90vh" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b flex-shrink-0" style={{ borderColor: "#f3f0ea" }}>
              <h2 className="font-semibold" style={{ color: "#1a2744" }}>Nuevo consentimiento</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
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
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Título *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Consentimiento implante basal, Sedación consciente…"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                  style={{ border: "1px solid #e5e0d8", color: "#374151" }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Contenido del consentimiento</label>
                <textarea
                  rows={6}
                  placeholder="Escriba el texto completo del consentimiento informado que el paciente deberá leer y firmar…"
                  value={form.content}
                  onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                  className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-y"
                  style={{ border: "1px solid #e5e0d8", color: "#374151", minHeight: 120 }}
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Documento PDF adjunto</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition-all hover:bg-gray-50 flex-1 text-left"
                    style={{ border: "1px dashed #c9a96e", color: pdfFile ? "#1a2744" : "#9ca3af" }}
                  >
                    <Paperclip size={14} style={{ color: "#c9a96e", flexShrink: 0 }} />
                    <span className="truncate">{pdfFile ? pdfFile.name : "Adjuntar PDF (máx. 20 MB)…"}</span>
                  </button>
                  {pdfFile && (
                    <button
                      type="button"
                      onClick={() => { setPdfFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                      style={{ color: "#dc2626" }}
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <p className="text-xs mt-1.5" style={{ color: "#9ca3af" }}>
                  Puede adjuntar un PDF además del texto, o en su lugar. El paciente lo verá antes de firmar.
                </p>
              </div>

              {createError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#dc2626" }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {createError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                  style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}>
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? "Creando…" : "Crear consentimiento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
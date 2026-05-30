import { useState, useRef, useEffect, useCallback } from "react";
import {
  FileText, Image, Download, Eye, Search, CloudUpload,
  Loader2, AlertCircle, CheckCircle, PenLine, FolderOpen,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { viewSignedPDF, downloadSignedPDF, printConsentForm } from "../../lib/pdfSigning";
import {
  validateFile, staffUploadDocument, getDocumentUrl,
  logAccess, formatFileSize, mimeToType,
} from "../../lib/storage";

const CATEGORIES = [
  "Radiografías", "TAC dental", "Historial clínico",
  "Presupuestos", "Consentimientos firmados", "Otros",
];

async function fetchAllDocuments() {
  const { data, error } = await supabase.rpc("get_all_documents");
  if (error) throw error;
  return data ?? [];
}

async function fetchAllSignedForms() {
  const { data, error } = await supabase.rpc("get_all_signed_forms");
  if (error) throw error;
  return data ?? [];
}

async function fetchPatientList() {
  const { data, error } = await supabase.rpc("get_all_patients");
  if (error) throw error;
  return data ?? [];
}

// ─── Shared row components ────────────────────────────────────────────────────

function DocRow({ doc, actionLoading, onOpen }) {
  const type      = mimeToType(doc.file_type);
  const isPDF     = type === "PDF";
  const isLoading = actionLoading === doc.id;

  return (
    <div className="grid items-center px-6 py-3.5 hover:bg-gray-50 transition-colors"
      style={{ gridTemplateColumns: "2fr 1.4fr 1.1fr 80px 72px 80px 72px" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: isPDF ? "#fff1e6" : "#e8f4fd" }}>
          {isPDF
            ? <FileText size={13} style={{ color: "#f97316" }} />
            : <Image    size={13} style={{ color: "#3b82f6" }} />}
        </div>
        <p className="text-sm truncate font-medium" style={{ color: "#1a2744" }}>{doc.name}</p>
      </div>
      <p className="text-sm truncate" style={{ color: "#374151" }}>{doc.patient_name ?? "—"}</p>
      <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{doc.category || "—"}</p>
      <span className="text-xs px-2 py-0.5 rounded-full w-fit"
        style={{ background: isPDF ? "#fff1e6" : "#e8f4fd", color: isPDF ? "#f97316" : "#3b82f6" }}>
        {type}
      </span>
      <p className="text-xs" style={{ color: "#9ca3af" }}>{formatFileSize(doc.file_size)}</p>
      <p className="text-xs" style={{ color: "#9ca3af" }}>
        {new Date(doc.created_at).toLocaleDateString("es-ES")}
      </p>
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => onOpen(doc, false)} disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Ver">
          {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Eye size={13} />}
        </button>
        <button onClick={() => onOpen(doc, true)} disabled={isLoading}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Descargar">
          <Download size={13} />
        </button>
      </div>
    </div>
  );
}

function SignedFormRow({ form, pdfWorking, onAction }) {
  const isWorking = pdfWorking?.id === form.id;

  return (
    <div className="grid items-center px-6 py-3.5 hover:bg-gray-50 transition-colors"
      style={{ gridTemplateColumns: "2fr 1.4fr 1.6fr 88px 72px" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ background: "#dcfce7" }}>
          <CheckCircle size={13} style={{ color: "#15803d" }} />
        </div>
        <div className="min-w-0">
          <p className="text-sm truncate font-medium" style={{ color: "#1a2744" }}>{form.title}</p>
          {form.document_path && (
            <span className="text-xs" style={{ color: "#3b82f6" }}>PDF adjunto</span>
          )}
        </div>
      </div>
      <p className="text-sm truncate" style={{ color: "#374151" }}>{form.patient_name ?? "—"}</p>
      <p className="text-xs" style={{ color: "#9ca3af" }}>
        {form.signed_at
          ? new Date(form.signed_at).toLocaleString("es-ES", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit",
            })
          : "—"}
      </p>
      <span className="text-xs px-2 py-0.5 rounded-full w-fit font-medium"
        style={{ background: "#dcfce7", color: "#15803d" }}>
        Firmado
      </span>
      <div className="flex items-center gap-1 justify-end">
        <button onClick={() => onAction(form, "view")} disabled={isWorking}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Ver con firma">
          {isWorking && pdfWorking.action === "view"
            ? <Loader2 size={13} className="animate-spin" />
            : <Eye size={13} />}
        </button>
        <button onClick={() => onAction(form, "download")} disabled={isWorking}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
          title="Descargar con firma">
          {isWorking && pdfWorking.action === "download"
            ? <Loader2 size={13} className="animate-spin" />
            : <Download size={13} />}
        </button>
      </div>
    </div>
  );
}

// ─── Table header ─────────────────────────────────────────────────────────────

function TableHeader({ cols }) {
  return (
    <div className="grid px-6 py-2.5 border-b text-xs uppercase tracking-wider"
      style={{ gridTemplateColumns: cols, borderColor: "#f3f0ea", background: "#faf9f7", color: "#9ca3af" }}>
      <span>Documento</span>
      <span>Paciente</span>
      <span>Categoría / Fecha firma</span>
      <span>Tipo / Estado</span>
      <span>Tamaño / Fecha</span>
      {cols.includes("72px 80px 72px") && <><span>Fecha</span><span></span></>}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function Documentos() {
  const { user } = useAuth();

  const [tab,           setTab]           = useState("docs");   // "docs" | "signed"
  const [docs,          setDocs]          = useState([]);
  const [signedForms,   setSignedForms]   = useState([]);
  const [patients,      setPatients]      = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [patientError,  setPatientError]  = useState("");
  const [search,        setSearch]        = useState("");
  const [filterType,    setFilterType]    = useState("");
  const [dragOver,      setDragOver]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [uploadError,   setUploadError]   = useState("");
  const [category,      setCategory]      = useState("Otros");
  const [targetPatient, setTargetPatient] = useState("");
  const [actionLoading, setActionLoading] = useState(null);
  const [pdfWorking,    setPdfWorking]    = useState(null);

  const fileRef  = useRef();
  const timerRef = useRef();

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [docsRes, formsRes, patientsRes] = await Promise.allSettled([
          fetchAllDocuments(),
          fetchAllSignedForms(),
          fetchPatientList(),
        ]);
        if (cancelled) return;
        if (docsRes.status    === "fulfilled") setDocs(docsRes.value);
        if (formsRes.status   === "fulfilled") setSignedForms(formsRes.value);
        if (patientsRes.status === "fulfilled") {
          setPatients(patientsRes.value);
          if (patientsRes.value.length > 0) setTargetPatient(patientsRes.value[0].patient_id);
        } else {
          setPatientError(patientsRes.reason?.message ?? "Error cargando pacientes");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filteredDocs = docs.filter(doc => {
    const matchName = !search || (doc.patient_name ?? "").toLowerCase().includes(search.toLowerCase())
      || (doc.name ?? "").toLowerCase().includes(search.toLowerCase());
    const matchType = !filterType || mimeToType(doc.file_type) === filterType;
    return matchName && matchType;
  });

  const filteredForms = signedForms.filter(f =>
    !search
    || (f.patient_name ?? "").toLowerCase().includes(search.toLowerCase())
    || (f.title ?? "").toLowerCase().includes(search.toLowerCase())
  );

  // ── Upload ──────────────────────────────────────────────────────────────────
  function startProgress() {
    setUploadPct(0);
    let pct = 0;
    timerRef.current = setInterval(() => {
      pct = Math.min(pct + Math.random() * 12, 88);
      setUploadPct(Math.round(pct));
    }, 200);
  }
  function finishProgress() { clearInterval(timerRef.current); setUploadPct(100); }

  const handleFiles = useCallback(async (files) => {
    setUploadError("");
    if (!targetPatient) { setUploadError("Seleccione un paciente antes de subir el documento."); return; }
    for (const file of files) {
      const err = validateFile(file);
      if (err) { setUploadError(err); return; }
    }
    setUploading(true);
    startProgress();
    try {
      const inserted = [];
      for (const file of files) {
        const row = await staffUploadDocument(file, targetPatient, category);
        const pt  = patients.find(p => p.patient_id === targetPatient);
        inserted.push({ ...row, patient_name: pt?.full_name ?? pt?.email ?? "—", patient_email: pt?.email ?? "" });
      }
      finishProgress();
      await new Promise(r => setTimeout(r, 400));
      setDocs(prev => [...inserted, ...prev]);
    } catch (err) {
      setUploadError(err.message ?? "Error al subir el archivo.");
      finishProgress();
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [targetPatient, patients, category]);

  // ── Open regular doc ────────────────────────────────────────────────────────
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
      console.error("[AdminDocumentos] open error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  // ── Open signed form ────────────────────────────────────────────────────────
  async function handleSignedForm(form, action) {
    if (!form.signature_data) return;
    const signedAtDate = form.signed_at ? new Date(form.signed_at) : new Date();
    const setWorking   = (val) => setPdfWorking(val ? { id: form.id, action } : null);
    const fn           = action === "view" ? viewSignedPDF : downloadSignedPDF;
    const patientName  = form.patient_name ?? "";

    if (form.document_path) {
      try {
        const { data, error } = await supabase.storage
          .from("consent-forms")
          .createSignedUrl(form.document_path, 3600);
        if (error) throw error;
        if (data?.signedUrl) {
          await fn(data.signedUrl, form.signature_data, form, signedAtDate, patientName, setWorking);
          return;
        }
      } catch (err) {
        console.error("[AdminDocumentos] signed url error:", err);
      }
    }
    // Text-only fallback
    const timestamp = signedAtDate.toLocaleString("es-ES", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    printConsentForm(form, form.signature_data, timestamp, patientName, null);
  }

  // ── Stats ────────────────────────────────────────────────────────────────────
  const totalDocs   = docs.length;
  const totalSigned = signedForms.length;

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Documentos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gestión centralizada de archivos y consentimientos de todos los pacientes</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-6 max-w-md">
        <button
          onClick={() => setTab("docs")}
          className="p-4 rounded-2xl text-left transition-all"
          style={{
            background: tab === "docs" ? "linear-gradient(135deg, #1a2744, #243256)" : "white",
            border: "1px solid #e5e0d8",
          }}
        >
          <FolderOpen size={18} style={{ color: tab === "docs" ? "#c9a96e" : "#9ca3af" }} className="mb-2" />
          <p className="text-2xl font-semibold" style={{ color: tab === "docs" ? "white" : "#1a2744" }}>
            {loading ? "—" : totalDocs}
          </p>
          <p className="text-xs mt-0.5" style={{ color: tab === "docs" ? "rgba(255,255,255,0.55)" : "#9ca3af" }}>
            Archivos subidos
          </p>
        </button>
        <button
          onClick={() => setTab("signed")}
          className="p-4 rounded-2xl text-left transition-all"
          style={{
            background: tab === "signed" ? "linear-gradient(135deg, #1a2744, #243256)" : "white",
            border: "1px solid #e5e0d8",
          }}
        >
          <PenLine size={18} style={{ color: tab === "signed" ? "#c9a96e" : "#9ca3af" }} className="mb-2" />
          <p className="text-2xl font-semibold" style={{ color: tab === "signed" ? "white" : "#1a2744" }}>
            {loading ? "—" : totalSigned}
          </p>
          <p className="text-xs mt-0.5" style={{ color: tab === "signed" ? "rgba(255,255,255,0.55)" : "#9ca3af" }}>
            Consentimientos firmados
          </p>
        </button>
      </div>

      {/* Search + filter bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder={tab === "docs" ? "Buscar por paciente o nombre de archivo…" : "Buscar por paciente o título…"}
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8" }}
          />
        </div>
        {tab === "docs" && (
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          >
            <option value="">Todos los tipos</option>
            <option value="PDF">PDF</option>
            <option value="Imagen">Imagen</option>
          </select>
        )}
      </div>

      {/* ── Tab: Archivos subidos ──────────────────────────────────────────────── */}
      {tab === "docs" && (
        <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #e5e0d8" }}>
          {/* Table header */}
          <div className="grid px-6 py-2.5 border-b text-xs uppercase tracking-wider"
            style={{
              gridTemplateColumns: "2fr 1.4fr 1.1fr 80px 72px 80px 72px",
              borderColor: "#f3f0ea", background: "#faf9f7", color: "#9ca3af",
            }}>
            <span>Documento</span>
            <span>Paciente</span>
            <span>Categoría</span>
            <span>Tipo</span>
            <span>Tamaño</span>
            <span>Fecha</span>
            <span></span>
          </div>

          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2" style={{ color: "#9ca3af" }}>
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Cargando documentos…</span>
              </div>
            ) : filteredDocs.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
                {search || filterType ? "No hay documentos con los filtros aplicados." : "No hay archivos subidos todavía."}
              </div>
            ) : (
              filteredDocs.map(doc => (
                <DocRow key={doc.id} doc={doc} actionLoading={actionLoading} onOpen={openDoc} />
              ))
            )}
          </div>

          {!loading && filteredDocs.length > 0 && (
            <div className="px-6 py-3 border-t text-xs" style={{ borderColor: "#f3f0ea", color: "#9ca3af", background: "#faf9f7" }}>
              {filteredDocs.length} documento{filteredDocs.length !== 1 ? "s" : ""}
              {(search || filterType) && ` · filtrado${filteredDocs.length !== 1 ? "s" : ""} de ${docs.length}`}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Consentimientos firmados ──────────────────────────────────────── */}
      {tab === "signed" && (
        <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #e5e0d8" }}>
          {/* Table header */}
          <div className="grid px-6 py-2.5 border-b text-xs uppercase tracking-wider"
            style={{
              gridTemplateColumns: "2fr 1.4fr 1.6fr 88px 72px",
              borderColor: "#f3f0ea", background: "#faf9f7", color: "#9ca3af",
            }}>
            <span>Consentimiento</span>
            <span>Paciente</span>
            <span>Fecha de firma</span>
            <span>Estado</span>
            <span></span>
          </div>

          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {loading ? (
              <div className="flex items-center justify-center py-12 gap-2" style={{ color: "#9ca3af" }}>
                <Loader2 size={18} className="animate-spin" />
                <span className="text-sm">Cargando consentimientos…</span>
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
                {search ? "No hay consentimientos con esa búsqueda." : "No hay consentimientos firmados todavía."}
              </div>
            ) : (
              filteredForms.map(form => (
                <SignedFormRow key={form.id} form={form} pdfWorking={pdfWorking} onAction={handleSignedForm} />
              ))
            )}
          </div>

          {!loading && filteredForms.length > 0 && (
            <div className="px-6 py-3 border-t text-xs" style={{ borderColor: "#f3f0ea", color: "#9ca3af", background: "#faf9f7" }}>
              {filteredForms.length} consentimiento{filteredForms.length !== 1 ? "s" : ""}
              {search && ` · filtrado${filteredForms.length !== 1 ? "s" : ""} de ${signedForms.length}`}
            </div>
          )}
        </div>
      )}

      {/* ── Upload section (only in docs tab) ─────────────────────────────────── */}
      {tab === "docs" && (
        <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
          <h2 className="font-semibold text-sm mb-4" style={{ color: "#1a2744" }}>Subir documento</h2>

          {patientError && (
            <div className="mb-3 flex items-start gap-2 text-xs px-3 py-2.5 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
              <AlertCircle size={13} className="flex-shrink-0 mt-0.5" />
              <span><strong>Error al cargar pacientes:</strong> {patientError}</span>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={targetPatient}
              onChange={e => setTargetPatient(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
              style={{ border: "1px solid #e5e0d8", color: "#374151" }}
            >
              {patients.length === 0
                ? <option value="">Sin pacientes registrados</option>
                : patients.map(pt => (
                    <option key={pt.patient_id} value={pt.patient_id}>
                      {pt.full_name ?? pt.email ?? pt.patient_id}
                    </option>
                  ))}
            </select>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
              style={{ border: "1px solid #e5e0d8", color: "#374151" }}
            >
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>

          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles([...e.dataTransfer.files]); }}
            onClick={() => !uploading && fileRef.current.click()}
            className="rounded-2xl p-8 text-center transition-all duration-200"
            style={{
              border:     `2px dashed ${dragOver ? "#c9a96e" : "#d1cbbf"}`,
              background: dragOver ? "#c9a96e08" : "#faf9f7",
              cursor:     uploading ? "default" : "pointer",
            }}
          >
            <input ref={fileRef} type="file" multiple accept=".pdf,.jpg,.jpeg,.png"
              className="hidden" onChange={e => handleFiles([...e.target.files])} />

            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "linear-gradient(135deg, #c9a96e18, #c9a96e25)" }}>
              {uploading
                ? <Loader2 size={20} style={{ color: "#c9a96e" }} className="animate-spin" />
                : <CloudUpload size={20} style={{ color: "#c9a96e" }} />}
            </div>

            {uploading ? (
              <>
                <p className="font-medium text-sm mb-3" style={{ color: "#1a2744" }}>Subiendo archivo…</p>
                <div className="w-full max-w-xs mx-auto rounded-full overflow-hidden" style={{ height: 5, background: "#e5e0d8" }}>
                  <div className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadPct}%`, background: "linear-gradient(90deg, #c9a96e, #d9bc8a)" }} />
                </div>
                <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>{uploadPct}%</p>
              </>
            ) : (
              <>
                <p className="font-medium text-sm mb-1" style={{ color: "#1a2744" }}>
                  {dragOver ? "Suelte aquí para subir" : "Arrastre archivos o haga clic"}
                </p>
                <p className="text-xs" style={{ color: "#9ca3af" }}>PDF, JPG, PNG hasta 50 MB</p>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mt-3 flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
              <AlertCircle size={15} className="flex-shrink-0" />
              {uploadError}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
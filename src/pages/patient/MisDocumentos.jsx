import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Image, Download, Eye, CloudUpload, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import {
  validateFile,
  uploadDocument,
  getDocumentUrl,
  logAccess,
  formatFileSize,
  mimeToType,
} from "../../lib/storage";

// ─── helpers ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Radiografías", "TAC dental", "Historial clínico",
  "Presupuestos", "Consentimientos firmados", "Otros",
];

async function fetchPatientRecord() {
  const { data, error } = await supabase.rpc("get_my_patient_record");
  if (error) throw new Error(error.message);
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function fetchDocuments() {
  const { data, error } = await supabase.rpc("get_my_documents");
  if (error) throw error;
  return data ?? [];
}

// ─── component ───────────────────────────────────────────────────────────────

export default function MisDocumentos() {
  const { user } = useAuth();

  const [patient,       setPatient]       = useState(null);   // patients row
  const [docs,          setDocs]          = useState([]);
  const [loadingDocs,   setLoadingDocs]   = useState(true);
  const [dragOver,      setDragOver]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [uploadError,   setUploadError]   = useState("");
  const [category,      setCategory]      = useState("Otros");
  const [actionLoading, setActionLoading] = useState(null);   // doc id being opened

  const fileRef   = useRef();
  const timerRef  = useRef();

  // Load patient record + documents once we have the auth user
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    (async () => {
      setLoadingDocs(true);
      try {
        const pt = await fetchPatientRecord();
        if (cancelled) return;
        setPatient(pt);
        if (pt) {
          const rows = await fetchDocuments();
          if (!cancelled) setDocs(rows);
        }
      } catch (err) {
        console.error("[MisDocumentos] load error:", err);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    })();

    return () => { cancelled = true; };
  }, [user?.id]);

  // ── Simulated progress bar ─────────────────────────────────────────────────
  function startProgress() {
    setUploadPct(0);
    let pct = 0;
    timerRef.current = setInterval(() => {
      pct = Math.min(pct + Math.random() * 12, 88);
      setUploadPct(Math.round(pct));
    }, 200);
  }
  function finishProgress() {
    clearInterval(timerRef.current);
    setUploadPct(100);
  }

  // ── Core upload handler ────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files) => {
    setUploadError("");
    if (!patient) {
      setUploadError("No se encontró su registro de paciente. Contacte con la clínica.");
      return;
    }

    for (const file of files) {
      const err = validateFile(file);
      if (err) { setUploadError(err); return; }
    }

    setUploading(true);
    startProgress();

    try {
      const inserted = [];
      for (const file of files) {
        const row = await uploadDocument(file, user.id, category);
        inserted.push(row);
      }
      finishProgress();
      await new Promise(r => setTimeout(r, 400)); // let 100% render briefly
      setDocs(prev => [...inserted, ...prev]);
    } catch (err) {
      console.error("[MisDocumentos] upload error:", err);
      setUploadError(err.message ?? "Error al subir el archivo. Inténtelo de nuevo.");
      finishProgress();
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [patient, user, category]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles([...e.dataTransfer.files]);
  };

  const handleFileInput = (e) => {
    handleFiles([...e.target.files]);
  };

  // ── Open document (view / download) ───────────────────────────────────────
  async function openDoc(doc, download = false) {
    setActionLoading(doc.id);
    try {
      const [url] = await Promise.all([
        getDocumentUrl(doc.file_path),
        logAccess(doc.id, download ? "download" : "view"),
      ]);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = doc.name;
        a.click();
      } else {
        window.open(url, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error("[MisDocumentos] open error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  // ─── render ──────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mis Documentos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Radiografías, historiales, presupuestos y consentimientos</p>
      </div>

      {/* Documents table */}
      <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #e5e0d8" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "#f3f0ea" }}>
          <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>
            Todos los documentos ({loadingDocs ? "…" : docs.length})
          </h2>
        </div>

        <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
          {loadingDocs ? (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: "#9ca3af" }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Cargando documentos…</span>
            </div>
          ) : docs.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
              {patient ? "No tiene documentos todavía." : "No se encontró su registro de paciente. Contacte con la clínica."}
            </div>
          ) : (
            docs.map(doc => {
              const type      = mimeToType(doc.file_type);
              const isPDF     = type === "PDF";
              const isLoading = actionLoading === doc.id;
              return (
                <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: isPDF ? "#fff1e6" : "#e8f4fd" }}
                  >
                    {isPDF
                      ? <FileText size={16} style={{ color: "#f97316" }} />
                      : <Image    size={16} style={{ color: "#3b82f6" }} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>
                      {doc.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                      {doc.category || "Sin categoría"} · {formatFileSize(doc.file_size)} · {new Date(doc.created_at).toLocaleDateString("es-ES")}
                    </p>
                  </div>
                  <span
                    className="text-xs px-2.5 py-1 rounded-full flex-shrink-0"
                    style={{
                      background: isPDF ? "#fff1e6" : "#e8f4fd",
                      color:      isPDF ? "#f97316" : "#3b82f6",
                    }}
                  >
                    {type}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => openDoc(doc, false)}
                      disabled={isLoading}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Ver documento"
                    >
                      {isLoading ? <Loader2 size={15} className="animate-spin" /> : <Eye size={15} />}
                    </button>
                    <button
                      onClick={() => openDoc(doc, true)}
                      disabled={isLoading}
                      className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Descargar"
                    >
                      <Download size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Category selector */}
      <div className="flex items-center gap-3 mb-3">
        <label className="text-xs uppercase tracking-wider" style={{ color: "#6b7280" }}>Categoría</label>
        <select
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="text-sm px-3 py-1.5 rounded-lg outline-none bg-white"
          style={{ border: "1px solid #e5e0d8", color: "#374151" }}
        >
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !uploading && fileRef.current.click()}
        className="rounded-2xl p-10 text-center transition-all duration-200"
        style={{
          border:     `2px dashed ${dragOver ? "#c9a96e" : "#d1cbbf"}`,
          background: dragOver ? "#c9a96e08" : "white",
          cursor:     uploading ? "default" : "pointer",
        }}
      >
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={handleFileInput}
        />

        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "linear-gradient(135deg, #c9a96e18, #c9a96e25)" }}
        >
          {uploading
            ? <Loader2 size={24} style={{ color: "#c9a96e" }} className="animate-spin" />
            : <CloudUpload size={24} style={{ color: "#c9a96e" }} />
          }
        </div>

        {uploading ? (
          <>
            <p className="font-medium text-sm mb-3" style={{ color: "#1a2744" }}>Subiendo archivo…</p>
            {/* Progress bar */}
            <div className="w-full max-w-xs mx-auto rounded-full overflow-hidden" style={{ height: 6, background: "#f3f0ea" }}>
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{ width: `${uploadPct}%`, background: "linear-gradient(90deg, #c9a96e, #d9bc8a)" }}
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "#9ca3af" }}>{uploadPct}%</p>
          </>
        ) : (
          <>
            <p className="font-medium text-sm mb-1" style={{ color: "#1a2744" }}>
              {dragOver ? "Suelte aquí para subir" : "Arrastre archivos aquí o haga clic"}
            </p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>PDF, JPG, PNG hasta 50 MB</p>
          </>
        )}
      </div>

      {/* Upload error */}
      {uploadError && (
        <div className="mt-3 flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
          <AlertCircle size={15} className="flex-shrink-0" />
          {uploadError}
        </div>
      )}
    </div>
  );
}
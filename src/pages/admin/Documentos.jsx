import { useState, useRef, useEffect, useCallback } from "react";
import { FileText, Image, Download, Eye, Search, CloudUpload, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase"; // used for fetchPatientList join
import {
  validateFile,
  staffUploadDocument,
  getDocumentUrl,
  logAccess,
  formatFileSize,
  mimeToType,
} from "../../lib/storage";

const CATEGORIES = [
  "Radiografías", "TAC dental", "Historial clínico",
  "Presupuestos", "Consentimientos firmados", "Otros",
];

// ─── data fetching ────────────────────────────────────────────────────────────

async function fetchAllDocuments() {
  const { data, error } = await supabase.rpc("get_all_documents");
  if (error) throw error;
  return data ?? [];
}

async function fetchPatientList() {
  const { data, error } = await supabase
    .from("patients")
    .select("id, profile:profiles ( full_name, email )")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ─── component ────────────────────────────────────────────────────────────────

export default function Documentos() {
  const { user } = useAuth();

  const [docs,          setDocs]          = useState([]);
  const [patients,      setPatients]      = useState([]);
  const [loadingDocs,   setLoadingDocs]   = useState(true);
  const [filterPatient, setFilterPatient] = useState("");
  const [filterType,    setFilterType]    = useState("");
  const [dragOver,      setDragOver]      = useState(false);
  const [uploading,     setUploading]     = useState(false);
  const [uploadPct,     setUploadPct]     = useState(0);
  const [uploadError,   setUploadError]   = useState("");
  const [category,      setCategory]      = useState("Otros");
  const [targetPatient, setTargetPatient] = useState("");   // patient UUID for upload
  const [actionLoading, setActionLoading] = useState(null);

  const fileRef  = useRef();
  const timerRef = useRef();

  // Load documents and patient list on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingDocs(true);
      try {
        const [rows, ptList] = await Promise.all([fetchAllDocuments(), fetchPatientList()]);
        if (cancelled) return;
        setDocs(rows);
        setPatients(ptList);
        if (ptList.length > 0) setTargetPatient(ptList[0].id);
      } catch (err) {
        console.error("[AdminDocumentos] load error:", err);
      } finally {
        if (!cancelled) setLoadingDocs(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Filtering ────────────────────────────────────────────────────────────
  const filtered = docs.filter(doc => {
    const fullName  = doc.patient_name ?? "";
    const matchName = !filterPatient || fullName.toLowerCase().includes(filterPatient.toLowerCase());
    const type      = mimeToType(doc.file_type);
    const matchType = !filterType || type === filterType;
    return matchName && matchType;
  });

  // ── Progress bar simulation ───────────────────────────────────────────────
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

  // ── Upload handler ────────────────────────────────────────────────────────
  const handleFiles = useCallback(async (files) => {
    setUploadError("");
    if (!targetPatient) {
      setUploadError("Seleccione un paciente antes de subir el documento.");
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
        const row = await staffUploadDocument(file, targetPatient, category);
        // Enrich with patient_name from local patients list
        const pt = patients.find(p => p.id === targetPatient);
        inserted.push({
          ...row,
          patient_name:  pt?.profile?.full_name ?? pt?.profile?.email ?? "—",
          patient_email: pt?.profile?.email ?? "",
        });
      }
      finishProgress();
      await new Promise(r => setTimeout(r, 400));
      setDocs(prev => [...inserted, ...prev]);
    } catch (err) {
      console.error("[AdminDocumentos] upload error:", err);
      setUploadError(err.message ?? "Error al subir el archivo. Inténtelo de nuevo.");
      finishProgress();
    } finally {
      setUploading(false);
      setUploadPct(0);
      if (fileRef.current) fileRef.current.value = "";
    }
  }, [targetPatient, user, category]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles([...e.dataTransfer.files]);
  };

  // ── Open document ────────────────────────────────────────────────────────
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
      console.error("[AdminDocumentos] open error:", err);
    } finally {
      setActionLoading(null);
    }
  }

  // ── render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Documentos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gestión centralizada de documentos de todos los pacientes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={filterPatient}
            onChange={e => setFilterPatient(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8" }}
          />
        </div>
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
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #e5e0d8" }}>
        <div className="px-6 py-3 border-b text-xs uppercase tracking-wider" style={{ borderColor: "#f3f0ea", background: "#faf9f7" }}>
          <div className="grid grid-cols-12 gap-4" style={{ color: "#9ca3af" }}>
            <span className="col-span-4">Documento</span>
            <span className="col-span-3">Paciente</span>
            <span className="col-span-2">Categoría</span>
            <span className="col-span-1">Tipo</span>
            <span className="col-span-1">Tamaño</span>
            <span className="col-span-1"></span>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
          {loadingDocs ? (
            <div className="flex items-center justify-center py-12 gap-2" style={{ color: "#9ca3af" }}>
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Cargando documentos…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
              No hay documentos{filterPatient || filterType ? " con los filtros aplicados." : " todavía."}
            </div>
          ) : (
            filtered.map(doc => {
              const type      = mimeToType(doc.file_type);
              const isPDF     = type === "PDF";
              const ptName    = doc.patient_name ?? "—";
              const isLoading = actionLoading === doc.id;
              return (
                <div key={doc.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="col-span-4 flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: isPDF ? "#fff1e6" : "#e8f4fd" }}
                    >
                      {isPDF
                        ? <FileText size={14} style={{ color: "#f97316" }} />
                        : <Image    size={14} style={{ color: "#3b82f6" }} />
                      }
                    </div>
                    <p className="text-sm truncate" style={{ color: "#1a2744" }}>{doc.name}</p>
                  </div>
                  <div className="col-span-3">
                    <p className="text-sm" style={{ color: "#374151" }}>{ptName}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs" style={{ color: "#9ca3af" }}>{doc.category || "—"}</p>
                  </div>
                  <div className="col-span-1">
                    <span
                      className="text-xs px-2 py-1 rounded-full"
                      style={{
                        background: isPDF ? "#fff1e6" : "#e8f4fd",
                        color:      isPDF ? "#f97316" : "#3b82f6",
                      }}
                    >
                      {type}
                    </span>
                  </div>
                  <div className="col-span-1">
                    <p className="text-xs" style={{ color: "#9ca3af" }}>{formatFileSize(doc.file_size)}</p>
                  </div>
                  <div className="col-span-1 flex items-center gap-1 justify-end">
                    <button
                      onClick={() => openDoc(doc, false)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Ver documento"
                    >
                      {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                    </button>
                    <button
                      onClick={() => openDoc(doc, true)}
                      disabled={isLoading}
                      className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 disabled:opacity-50"
                      title="Descargar"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Staff upload section */}
      <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
        <h2 className="font-semibold text-sm mb-4" style={{ color: "#1a2744" }}>Subir documento</h2>

        <div className="flex flex-wrap gap-3 mb-4">
          {/* Patient selector */}
          <select
            value={targetPatient}
            onChange={e => setTargetPatient(e.target.value)}
            className="flex-1 min-w-[200px] px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          >
            {patients.length === 0
              ? <option value="">Sin pacientes registrados</option>
              : patients.map(pt => (
                  <option key={pt.id} value={pt.id}>
                    {pt.profile?.full_name ?? pt.profile?.email ?? pt.id}
                  </option>
                ))
            }
          </select>

          {/* Category selector */}
          <select
            value={category}
            onChange={e => setCategory(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8", color: "#374151" }}
          >
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && fileRef.current.click()}
          className="rounded-2xl p-8 text-center transition-all duration-200"
          style={{
            border:     `2px dashed ${dragOver ? "#c9a96e" : "#d1cbbf"}`,
            background: dragOver ? "#c9a96e08" : "#faf9f7",
            cursor:     uploading ? "default" : "pointer",
          }}
        >
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={e => handleFiles([...e.target.files])}
          />
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "linear-gradient(135deg, #c9a96e18, #c9a96e25)" }}
          >
            {uploading
              ? <Loader2 size={20} style={{ color: "#c9a96e" }} className="animate-spin" />
              : <CloudUpload size={20} style={{ color: "#c9a96e" }} />
            }
          </div>

          {uploading ? (
            <>
              <p className="font-medium text-sm mb-3" style={{ color: "#1a2744" }}>Subiendo archivo…</p>
              <div className="w-full max-w-xs mx-auto rounded-full overflow-hidden" style={{ height: 5, background: "#e5e0d8" }}>
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
    </div>
  );
}
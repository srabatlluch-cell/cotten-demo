import { useState, useEffect, useRef, useCallback } from "react";
import { PenLine, CheckCircle, AlertCircle, FileText, ArrowLeft, Download, Loader2, Clock, Paperclip } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";
import { downloadSignedPDF, printConsentForm } from "../../lib/pdfSigning";

// ─── helpers ──────────────────────────────────────────────────────────────────

async function fetchForms() {
  const { data, error } = await supabase.rpc("get_my_consent_forms");
  if (error) throw error;
  return data ?? [];
}

async function getClientIP() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    const json = await res.json();
    return json.ip ?? null;
  } catch {
    return null;
  }
}

// ─── Canvas helpers ────────────────────────────────────────────────────────────

function getCanvasPos(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width  / rect.width;
  const scaleY = canvas.height / rect.height;
  const src = e.touches ? e.touches[0] : e;
  return {
    x: (src.clientX - rect.left) * scaleX,
    y: (src.clientY - rect.top)  * scaleY,
  };
}

// ─── SignatureCanvas sub-component ────────────────────────────────────────────

function SignatureCanvas({ canvasRef, onHasSignatureChange }) {
  const drawing = useRef(false);
  const lastPos = useRef(null);

  const startDraw = useCallback((e) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getCanvasPos(e, canvasRef.current);
  }, [canvasRef]);

  const draw = useCallback((e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    const pos    = getCanvasPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a2744";
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = "round";
    ctx.lineJoin    = "round";
    ctx.stroke();
    lastPos.current = pos;
    onHasSignatureChange(true);
  }, [canvasRef, onHasSignatureChange]);

  const stopDraw = useCallback(() => { drawing.current = false; }, []);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "2px dashed #d1cbbf" }}>
      <canvas
        ref={canvasRef}
        width={700}
        height={160}
        className="w-full touch-none cursor-crosshair"
        style={{ background: "#fafaf9" }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />
    </div>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function FirmarDocumentos() {
  const { user } = useAuth();

  const [forms,        setForms]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [activeForm,   setActiveForm]   = useState(null);   // form being signed
  const [signingStep,  setSigningStep]  = useState("read"); // "read" | "success"
  const [signedAt,     setSignedAt]     = useState(null);
  const [lastSigUrl,   setLastSigUrl]   = useState(null);
  const [hasSignature, setHasSignature] = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState("");
  const [pdfUrl,         setPdfUrl]         = useState(null);
  const [pdfLoading,     setPdfLoading]     = useState(false);
  const [pdfError,       setPdfError]       = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [patientName,    setPatientName]    = useState("");
  const [signedAtDate,   setSignedAtDate]   = useState(null);

  const canvasRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [rows, profileRes] = await Promise.all([
          fetchForms(),
          supabase.from("profiles").select("full_name").eq("id", user.id).single(),
        ]);
        if (!cancelled) {
          setForms(rows);
          const name = profileRes.data?.full_name
            || user.user_metadata?.full_name
            || user.email
            || "";
          setPatientName(name);
        }
      } catch (err) {
        console.error("[FirmarDocumentos] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  function clearSignature() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext("2d").clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  }

  async function openForm(form) {
    setActiveForm(form);
    setSigningStep("read");
    setHasSignature(false);
    setSubmitError("");
    setSignedAt(null);
    setLastSigUrl(null);
    setPdfUrl(null);
    setPdfError(false);

    if (form.document_path) {
      setPdfLoading(true);
      try {
        const { data, error } = await supabase.storage
          .from("consent-forms")
          .createSignedUrl(form.document_path, 3600);
        if (error) throw error;
        if (data?.signedUrl) {
          setPdfUrl(data.signedUrl);
        } else {
          setPdfError(true);
        }
      } catch (err) {
        console.error("[FirmarDocumentos] signed URL error:", err);
        setPdfError(true);
      } finally {
        setPdfLoading(false);
      }
    }
  }

  function closeForm() {
    setActiveForm(null);
    setSigningStep("read");
    setHasSignature(false);
    setSubmitError("");
    setPdfUrl(null);
    setPdfError(false);
    setSignedAtDate(null);
  }

  async function handleSign() {
    if (!hasSignature || !activeForm) return;
    setSubmitting(true);
    setSubmitError("");
    try {
      const canvas   = canvasRef.current;
      const sigData  = canvas.toDataURL("image/png");
      const ip       = await getClientIP();
      const ua       = navigator.userAgent;
      const now      = new Date();

      const { error } = await supabase.rpc("sign_consent_form", {
        p_form_id:        activeForm.id,
        p_signature_data: sigData,
        p_ip_address:     ip,
        p_user_agent:     ua,
      });
      if (error) throw error;

      const timestamp = now.toLocaleString("es-ES", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      });
      setSignedAt(timestamp);
      setSignedAtDate(now);
      setLastSigUrl(sigData);

      // Update local state
      setForms(prev => prev.map(f =>
        f.id === activeForm.id
          ? { ...f, form_status: "signed", signed_at: now.toISOString() }
          : f
      ));

      setSigningStep("success");
    } catch (err) {
      console.error("[FirmarDocumentos] sign error:", err);
      setSubmitError(err.message ?? "Error al firmar el documento.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Signing view ─────────────────────────────────────────────────────────────
  if (activeForm) {
    if (signingStep === "success") {
      return (
        <div className="p-6 lg:p-8 max-w-3xl">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "#dcfce7" }}>
              <CheckCircle size={40} style={{ color: "#15803d" }} />
            </div>
            <h2 className="text-2xl font-semibold mb-2" style={{ color: "#1a2744" }}>Documento firmado</h2>
            <p className="text-sm mb-1" style={{ color: "#6b7280" }}>{activeForm.title}</p>
            <p className="text-xs mb-8" style={{ color: "#9ca3af" }}>
              Firmado el {signedAt}
            </p>

            {lastSigUrl && (
              <div className="bg-white rounded-2xl p-4 mb-6 w-full max-w-sm" style={{ border: "1px solid #e5e0d8" }}>
                <p className="text-xs uppercase tracking-wider mb-3 text-center" style={{ color: "#9ca3af" }}>Su firma registrada</p>
                <img src={lastSigUrl} alt="Firma" className="w-full rounded-lg" style={{ border: "1px solid #f3f0ea" }} />
              </div>
            )}

            <div className="flex flex-wrap gap-3 justify-center">
              {/* PDF with signature overlay — primary action when PDF exists */}
              {pdfUrl && (
                <button
                  onClick={() => downloadSignedPDF(pdfUrl, lastSigUrl, activeForm, signedAtDate, patientName, setPdfDownloading)}
                  disabled={pdfDownloading}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
                >
                  {pdfDownloading
                    ? <><Loader2 size={14} className="animate-spin" /> Generando PDF…</>
                    : <><Download size={14} /> Descargar PDF firmado</>}
                </button>
              )}
              {/* HTML print — for text-only forms, or as secondary option */}
              <button
                onClick={() => printConsentForm(activeForm, lastSigUrl, signedAt, patientName, pdfUrl)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" }}
              >
                <Download size={14} />
                {pdfUrl ? "Imprimir resumen" : "Descargar / Imprimir PDF"}
              </button>
              <button
                onClick={closeForm}
                className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-white transition-all"
                style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
              >
                Volver a mis documentos
              </button>
            </div>
          </div>
        </div>
      );
    }

    // Reading + signing view
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <button
          onClick={closeForm}
          className="inline-flex items-center gap-2 text-sm mb-6 hover:underline"
          style={{ color: "#c9a96e" }}
        >
          <ArrowLeft size={14} /> Volver a documentos
        </button>

        {/* Document card */}
        <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #e5e0d8" }}>
          <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #1a274408, #1a274412)", borderBottom: "1px solid #e5e0d8" }}>
            <FileText size={18} style={{ color: "#c9a96e" }} />
            <div>
              <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{activeForm.title}</p>
              <p className="text-xs" style={{ color: "#9ca3af" }}>
                Añadido: {new Date(activeForm.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })} · Clínica Cotten
              </p>
            </div>
          </div>

          {/* PDF viewer */}
          {activeForm.document_path && (
            <div style={{ borderBottom: activeForm.content ? "1px solid #f3f0ea" : undefined }}>
              {pdfLoading && (
                <div className="flex items-center justify-center gap-2 py-10" style={{ color: "#9ca3af" }}>
                  <Loader2 size={18} className="animate-spin" />
                  <span className="text-sm">Cargando documento PDF…</span>
                </div>
              )}

              {!pdfLoading && pdfError && (
                <div className="m-4 p-4 rounded-xl" style={{ background: "#fef2f2", border: "1px solid #fecaca" }}>
                  <div className="flex items-start gap-3 mb-3">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" style={{ color: "#dc2626" }} />
                    <div>
                      <p className="text-sm font-medium" style={{ color: "#dc2626" }}>No se puede mostrar el documento</p>
                      <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>
                        El visor no pudo cargar el archivo. Puede abrirlo en una nueva pestaña o contactar con la clínica.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {!pdfLoading && pdfUrl && (
                <div className="p-4 space-y-3">
                  {/* Primary action — always works regardless of iframe support */}
                  <a
                    href={pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
                    style={{ background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" }}
                  >
                    <Download size={14} /> Abrir documento PDF
                  </a>

                  {/* Inline viewer — bonus for desktop browsers */}
                  <iframe
                    src={pdfUrl}
                    title={activeForm.title}
                    width="100%"
                    height="500px"
                    className="rounded-xl"
                    style={{ border: "1px solid #e5e0d8", display: "block" }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Text content */}
          {activeForm.content && (
            <div className="p-6" style={{ borderTop: (!pdfLoading && pdfUrl) ? "1px solid #f3f0ea" : undefined }}>
              {pdfUrl && (
                <p className="text-xs uppercase tracking-wider mb-3" style={{ color: "#9ca3af" }}>Texto del consentimiento</p>
              )}
              <div className="max-h-80 overflow-y-auto rounded-xl p-4" style={{ background: "#fafaf9", border: "1px solid #f3f0ea" }}>
                <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "#374151" }}>
                  {activeForm.content}
                </pre>
              </div>
            </div>
          )}

          {/* Fallback if neither loaded */}
          {!pdfLoading && !pdfUrl && !activeForm.content && (
            <div className="p-6">
              <p className="text-sm text-center" style={{ color: "#9ca3af" }}>Sin contenido</p>
            </div>
          )}
        </div>

        {/* Signature area */}
        <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <PenLine size={16} style={{ color: "#c9a96e" }} />
              <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>Firma electrónica</p>
            </div>
            <button
              onClick={clearSignature}
              className="text-xs hover:underline transition-colors"
              style={{ color: "#9ca3af" }}
            >
              Borrar firma
            </button>
          </div>
          <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>Firme con el ratón o el dedo dentro del recuadro</p>

          <SignatureCanvas canvasRef={canvasRef} onHasSignatureChange={setHasSignature} />

          {submitError && (
            <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl mt-4" style={{ background: "#fef2f2", color: "#dc2626" }}>
              <AlertCircle size={14} className="flex-shrink-0" />
              {submitError}
            </div>
          )}

          <div className="mt-4 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs" style={{ color: "#9ca3af" }}>
              Al firmar confirma que ha leído y acepta el consentimiento informado
            </p>
            <button
              onClick={handleSign}
              disabled={!hasSignature || submitting}
              className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Firmar documento
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────────
  const pending = forms.filter(f => f.form_status === "pending");
  const signed  = forms.filter(f => f.form_status === "signed");

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Firmar Documentos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Revise y firme los consentimientos pendientes</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 gap-2" style={{ color: "#9ca3af" }}>
          <Loader2 size={18} className="animate-spin" />
          <span className="text-sm">Cargando documentos…</span>
        </div>
      ) : (
        <>
          {/* Pending alert */}
          {pending.length > 0 && (
            <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: "#fff8e1", border: "1px solid #ffc10740" }}>
              <AlertCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#f57f17" }} />
              <div>
                <p className="text-sm font-medium" style={{ color: "#e65100" }}>
                  Tiene {pending.length} documento{pending.length !== 1 ? "s" : ""} pendiente{pending.length !== 1 ? "s" : ""} de firma
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#f57f17" }}>Por favor, lea cada documento completo antes de firmar</p>
              </div>
            </div>
          )}

          {/* Pending forms */}
          {pending.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#c9a96e" }}>
                Pendientes de firma
              </h2>
              <div className="space-y-3">
                {pending.map(f => (
                  <div key={f.id} className="bg-white rounded-2xl p-5 flex items-start gap-4" style={{ border: "1px solid #fbbf2440" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff8e1" }}>
                      <FileText size={18} style={{ color: "#f59e0b" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{f.title}</p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-xs" style={{ color: "#9ca3af" }}>
                          <Clock size={11} />
                          Añadido: {new Date(f.created_at).toLocaleDateString("es-ES")}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: "#fef3c7", color: "#b45309" }}>
                          ⏳ {f.days_waiting} día{f.days_waiting !== 1 ? "s" : ""} sin firmar
                        </span>
                        {f.document_path && (
                          <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#3b82f6" }}>
                            <Paperclip size={10} /> PDF
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => openForm(f)}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:opacity-90 flex-shrink-0"
                      style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
                    >
                      <PenLine size={13} />
                      Firmar
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Signed forms */}
          {signed.length > 0 && (
            <div>
              <h2 className="text-xs uppercase tracking-wider font-semibold mb-4" style={{ color: "#9ca3af" }}>
                Documentos firmados
              </h2>
              <div className="space-y-3">
                {signed.map(f => (
                  <div key={f.id} className="bg-white rounded-2xl p-5 flex items-start gap-4" style={{ border: "1px solid #e5e0d8", opacity: 0.85 }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#dcfce7" }}>
                      <CheckCircle size={18} style={{ color: "#15803d" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{f.title}</p>
                      <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>
                        Firmado el {f.signed_at
                          ? new Date(f.signed_at).toLocaleString("es-ES", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })
                          : "—"}
                      </p>
                    </div>
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0" style={{ background: "#dcfce7", color: "#15803d" }}>
                      <CheckCircle size={11} /> Firmado
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {forms.length === 0 && (
            <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1px solid #e5e0d8" }}>
              <CheckCircle size={40} className="mx-auto mb-4" style={{ color: "#c9a96e" }} />
              <p className="font-medium text-sm" style={{ color: "#1a2744" }}>No hay documentos pendientes</p>
              <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>La clínica le enviará consentimientos cuando sea necesario</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
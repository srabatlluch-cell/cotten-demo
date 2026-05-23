import { useState, useEffect, useRef, useCallback } from "react";
import { PenLine, CheckCircle, AlertCircle, FileText, ArrowLeft, Download, Loader2, Clock, Paperclip } from "lucide-react";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

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

function printConsentForm(form, sigDataUrl, timestamp, patientName = "", pdfUrl = null) {
  const win = window.open("", "_blank");
  if (!win) return;
  const escapedContent = (form.content ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const createdDate    = new Date(form.created_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

  win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${form.title} — firmado</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; color: #1a2744; font-size: 13px; }
    h1  { font-size: 20px; margin-bottom: 4px; }
    .meta { color: #6b7280; font-size: 11px; margin-bottom: 20px; }

    .signer-box {
      display: flex; align-items: center; gap: 12px;
      background: #f0ede8; border: 1px solid #e5e0d8; border-radius: 8px;
      padding: 12px 16px; margin-bottom: 20px;
    }
    .signer-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; }
    .signer-name  { font-size: 14px; font-weight: 700; color: #1a2744; margin-top: 2px; }

    .content { font-size: 12px; line-height: 1.7; white-space: pre-wrap; border: 1px solid #e5e0d8;
               padding: 20px; border-radius: 6px; margin-bottom: 24px; background: #fafaf9; }

    .pdf-section { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 8px;
                   padding: 14px 16px; margin-bottom: 24px; }
    .pdf-section p { margin: 0 0 8px; font-size: 12px; color: #1e40af; font-weight: 600; }
    .pdf-btn {
      display: inline-block; background: #1a2744; color: white !important; text-decoration: none;
      padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600;
    }
    .pdf-note { font-size: 10px; color: #6b7280; margin-top: 6px !important; font-weight: normal !important; }

    .sig-section { border-top: 2px solid #1a2744; padding-top: 20px; margin-top: 8px; }
    .sig-section h2 { font-size: 13px; margin-bottom: 12px; }
    .sig-img { border: 1px solid #e5e0d8; padding: 6px; max-width: 380px; display: block; background: #fafaf9; }
    .sig-meta { font-size: 11px; color: #6b7280; margin-top: 10px; line-height: 1.8; }
    .stamp { background: #dcfce7; border: 1px solid #15803d50; padding: 10px 16px;
             border-radius: 6px; margin-top: 14px; color: #15803d; font-size: 12px; font-weight: 700; }

    @media print {
      body { margin: 20px; }
      .pdf-btn { background: #1a2744 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <h1>${form.title}</h1>
  <p class="meta">Clínica Cotten &bull; Dr. Philippe Cotten &bull; Creado: ${createdDate}</p>

  <!-- Who signed -->
  <div class="signer-box">
    <div>
      <div class="signer-label">Firmado por</div>
      <div class="signer-name">${patientName || "—"}</div>
    </div>
    <div style="margin-left:auto; text-align:right">
      <div class="signer-label">Fecha de firma</div>
      <div class="signer-name" style="font-size:12px">${timestamp}</div>
    </div>
  </div>

  ${escapedContent ? `<div class="content">${escapedContent}</div>` : ""}

  ${pdfUrl ? `
  <div class="pdf-section">
    <p>&#128196; Documento PDF adjunto</p>
    <a class="pdf-btn" href="${pdfUrl}" target="_blank">Abrir / Descargar PDF original &rarr;</a>
    <p class="pdf-note">El enlace caduca 1 hora después de la firma. Para una copia permanente use "Descargar PDF firmado".</p>
  </div>` : ""}

  <div class="sig-section">
    <h2>Firma electrónica del paciente</h2>
    <img class="sig-img" src="${sigDataUrl}" alt="Firma de ${patientName || 'paciente'}" />
    <p class="sig-meta">
      Firmado por: <strong>${patientName || "—"}</strong><br>
      Documento: <strong>${form.title}</strong><br>
      Fecha y hora: <strong>${timestamp}</strong><br>
      Firmado digitalmente a través del portal de pacientes de Clínica Cotten.<br>
      Validez legal conforme al Reglamento (UE) 910/2014 (eIDAS).
    </p>
    <div class="stamp">&#10003; DOCUMENTO FIRMADO DIGITALMENTE &mdash; CL&Iacute;NICA COTTEN</div>
  </div>
</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

// ─── PDF signing ──────────────────────────────────────────────────────────────

async function downloadSignedPDF(pdfUrl, sigDataUrl, form, signedAtDate, patientName, setWorking) {
  setWorking(true);
  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const pdfBytes = await res.arrayBuffer();

    const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

    // Signature PNG: data URL → Uint8Array
    const sigBase64 = sigDataUrl.replace(/^data:image\/png;base64,/, "");
    const sigBytes  = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));
    const sigImage  = await pdfDoc.embedPng(sigBytes);

    const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Compact date — fits in the narrow stamp
    const d  = signedAtDate;
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const hh = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    const dateStr = `${dd}/${mm}/${d.getFullYear()}  ${hh}:${mi}`;

    // Truncate name so it fits in box
    const nameStr  = patientName.length > 24 ? patientName.slice(0, 22) + "..." : patientName;

    // Stamp dimensions
    const sigW = 115;
    const sigH = Math.round(sigW * (160 / 700)); // ≈ 26 pt canvas aspect ratio

    // Layout (all y values relative to boxY, measured from page bottom = 0):
    //   boxY + 2            → branding
    //   boxY + 9            → date
    //   boxY + 16           → divider below sig
    //   boxY + 18           → sig image BOTTOM  ─┐ sig image occupies
    //   boxY + 18 + sigH    → sig image TOP     ─┘ (≈ 26-52 when boxY=8)
    //   boxY + sigH + 20    → divider above sig   (clear of sig top)
    //   boxY + sigH + 24    → patient name text
    //   boxY + sigH + 32    → "Firmante:" label
    const boxH = sigH + 40; // tall enough for name + label above sig

    for (const page of pdfDoc.getPages()) {
      const { width } = page.getSize();
      const boxX = width - sigW - 14;
      const boxY = 8;

      // Semi-transparent background
      page.drawRectangle({
        x: boxX - 5,       y: boxY - 5,
        width:  sigW + 10, height: boxH + 10,
        color:       rgb(1, 1, 1),
        borderColor: rgb(0.788, 0.663, 0.431),
        borderWidth: 0.6,
        opacity: 0.88,
      });

      // ── BOTTOM SECTION: date + branding (drawn before sig, below it) ─────────

      // Branding
      page.drawText("Clinica Cotten | eIDAS UE 910/2014", {
        x: boxX,  y: boxY + 2,
        size: 4.5,  font: fontBold,
        color: rgb(0.788, 0.663, 0.431),
      });

      // Date
      page.drawText(dateStr, {
        x: boxX,  y: boxY + 9,
        size: 5,  font,
        color: rgb(0.102, 0.153, 0.267),
      });

      // Divider below sig
      page.drawLine({
        start: { x: boxX,        y: boxY + 16 },
        end:   { x: boxX + sigW, y: boxY + 16 },
        thickness: 0.3,
        color: rgb(0.788, 0.663, 0.431),
      });

      // ── SIGNATURE IMAGE ───────────────────────────────────────────────────────
      page.drawImage(sigImage, {
        x: boxX,  y: boxY + 18,
        width: sigW,  height: sigH,
      });

      // ── TOP SECTION: name (drawn AFTER sig so it renders on top) ─────────────

      // Divider above sig (clearly above sig image top edge)
      page.drawLine({
        start: { x: boxX,        y: boxY + sigH + 20 },
        end:   { x: boxX + sigW, y: boxY + sigH + 20 },
        thickness: 0.3,
        color: rgb(0.9, 0.88, 0.86),
      });

      // Patient name — drawn after sig image so it sits on top
      if (nameStr) {
        page.drawText(nameStr, {
          x: boxX,  y: boxY + sigH + 24,
          size: 5.5,  font: fontBold,
          color: rgb(0.102, 0.153, 0.267),
        });
      }

      // "Firmante:" label
      page.drawText("Firmante:", {
        x: boxX,  y: boxY + sigH + 32,
        size: 4.5,  font,
        color: rgb(0.5, 0.5, 0.5),
      });
    }

    const outBytes = await pdfDoc.save();
    const blob     = new Blob([outBytes], { type: "application/pdf" });
    const url      = URL.createObjectURL(blob);
    const a        = document.createElement("a");
    a.href         = url;
    a.download     = `${form.title.replace(/[^\w\s\-]/g, "").trim()}_firmado.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  } catch (err) {
    console.error("[downloadSignedPDF] error:", err);
    printConsentForm(form, sigDataUrl,
      signedAtDate.toLocaleString("es-ES", { day:"2-digit", month:"long", year:"numeric", hour:"2-digit", minute:"2-digit", second:"2-digit" }),
      patientName, pdfUrl);
  } finally {
    setWorking(false);
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
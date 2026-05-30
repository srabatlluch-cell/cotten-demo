import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export function printConsentForm(form, sigDataUrl, timestamp, patientName = "", pdfUrl = null) {
  const win = window.open("", "_blank");
  if (!win) return;
  const escapedContent = (form.content ?? "").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const createdDate    = new Date(form.created_at ?? form.signed_at).toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" });

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
    .signer-box { display: flex; align-items: center; gap: 12px; background: #f0ede8; border: 1px solid #e5e0d8; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px; }
    .signer-label { font-size: 10px; text-transform: uppercase; letter-spacing: .08em; color: #9ca3af; }
    .signer-name  { font-size: 14px; font-weight: 700; color: #1a2744; margin-top: 2px; }
    .content { font-size: 12px; line-height: 1.7; white-space: pre-wrap; border: 1px solid #e5e0d8; padding: 20px; border-radius: 6px; margin-bottom: 24px; background: #fafaf9; }
    .pdf-section { border: 1px solid #dbeafe; background: #eff6ff; border-radius: 8px; padding: 14px 16px; margin-bottom: 24px; }
    .pdf-section p { margin: 0 0 8px; font-size: 12px; color: #1e40af; font-weight: 600; }
    .pdf-btn { display: inline-block; background: #1a2744; color: white !important; text-decoration: none; padding: 8px 16px; border-radius: 6px; font-size: 12px; font-weight: 600; }
    .pdf-note { font-size: 10px; color: #6b7280; margin-top: 6px !important; font-weight: normal !important; }
    .sig-section { border-top: 2px solid #1a2744; padding-top: 20px; margin-top: 8px; }
    .sig-section h2 { font-size: 13px; margin-bottom: 12px; }
    .sig-img { border: 1px solid #e5e0d8; padding: 6px; max-width: 380px; display: block; background: #fafaf9; }
    .sig-meta { font-size: 11px; color: #6b7280; margin-top: 10px; line-height: 1.8; }
    .stamp { background: #dcfce7; border: 1px solid #15803d50; padding: 10px 16px; border-radius: 6px; margin-top: 14px; color: #15803d; font-size: 12px; font-weight: 700; }
    @media print { body { margin: 20px; } .pdf-btn { background: #1a2744 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
  <h1>${form.title}</h1>
  <p class="meta">Clínica Cotten &bull; Dr. Philippe Cotten &bull; Creado: ${createdDate}</p>
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
    <p class="pdf-note">El enlace caduca 1 hora. Para una copia permanente use "Descargar PDF firmado".</p>
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

// Builds the signed PDF and returns a blob URL. Caller is responsible for revoking it.
async function buildSignedPdfBlobUrl(pdfUrl, sigDataUrl, form, signedAtDate, patientName) {
  const res = await fetch(pdfUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const pdfBytes = await res.arrayBuffer();

  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  const sigBase64 = sigDataUrl.replace(/^data:image\/png;base64,/, "");
  const sigBytes  = Uint8Array.from(atob(sigBase64), c => c.charCodeAt(0));
  const sigImage  = await pdfDoc.embedPng(sigBytes);

  const font     = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const d  = signedAtDate;
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const dateStr = `${dd}/${mm}/${d.getFullYear()}  ${hh}:${mi}`;
  const nameStr = patientName.length > 24 ? patientName.slice(0, 22) + "..." : patientName;

  const sigW = 115;
  const sigH = Math.round(sigW * (160 / 700));
  const boxH = sigH + 40;

  for (const page of pdfDoc.getPages()) {
    const { width } = page.getSize();
    const boxX = width - sigW - 14;
    const boxY = 8;

    page.drawRectangle({
      x: boxX - 5, y: boxY - 5, width: sigW + 10, height: boxH + 10,
      color: rgb(1, 1, 1), borderColor: rgb(0.788, 0.663, 0.431),
      borderWidth: 0.6, opacity: 0.88,
    });
    page.drawText("Clinica Cotten | eIDAS UE 910/2014", {
      x: boxX, y: boxY + 2, size: 4.5, font: fontBold,
      color: rgb(0.788, 0.663, 0.431),
    });
    page.drawText(dateStr, {
      x: boxX, y: boxY + 9, size: 5, font,
      color: rgb(0.102, 0.153, 0.267),
    });
    page.drawLine({
      start: { x: boxX, y: boxY + 16 }, end: { x: boxX + sigW, y: boxY + 16 },
      thickness: 0.3, color: rgb(0.788, 0.663, 0.431),
    });
    page.drawImage(sigImage, { x: boxX, y: boxY + 18, width: sigW, height: sigH });
    page.drawLine({
      start: { x: boxX, y: boxY + sigH + 20 }, end: { x: boxX + sigW, y: boxY + sigH + 20 },
      thickness: 0.3, color: rgb(0.9, 0.88, 0.86),
    });
    if (nameStr) {
      page.drawText(nameStr, {
        x: boxX, y: boxY + sigH + 24, size: 5.5, font: fontBold,
        color: rgb(0.102, 0.153, 0.267),
      });
    }
    page.drawText("Firmante:", {
      x: boxX, y: boxY + sigH + 32, size: 4.5, font,
      color: rgb(0.5, 0.5, 0.5),
    });
  }

  const outBytes = await pdfDoc.save();
  return URL.createObjectURL(new Blob([outBytes], { type: "application/pdf" }));
}

export async function viewSignedPDF(pdfUrl, sigDataUrl, form, signedAtDate, patientName, setWorking) {
  setWorking(true);
  try {
    const blobUrl = await buildSignedPdfBlobUrl(pdfUrl, sigDataUrl, form, signedAtDate, patientName);
    window.open(blobUrl, "_blank", "noopener,noreferrer");
    // Revoke after a delay to allow the browser to load it
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60000);
  } catch (err) {
    console.error("[viewSignedPDF] error:", err);
    const timestamp = signedAtDate.toLocaleString("es-ES", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    printConsentForm(form, sigDataUrl, timestamp, patientName, pdfUrl);
  } finally {
    setWorking(false);
  }
}

export async function downloadSignedPDF(pdfUrl, sigDataUrl, form, signedAtDate, patientName, setWorking) {
  setWorking(true);
  try {
    const blobUrl = await buildSignedPdfBlobUrl(pdfUrl, sigDataUrl, form, signedAtDate, patientName);
    const a       = document.createElement("a");
    a.href        = blobUrl;
    a.download    = `${form.title.replace(/[^\w\s\-]/g, "").trim()}_firmado.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
  } catch (err) {
    console.error("[downloadSignedPDF] error:", err);
    const timestamp = signedAtDate.toLocaleString("es-ES", {
      day: "2-digit", month: "long", year: "numeric",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
    printConsentForm(form, sigDataUrl, timestamp, patientName, pdfUrl);
  } finally {
    setWorking(false);
  }
}
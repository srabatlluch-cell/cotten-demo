import { useState, useRef } from "react";
import { PenLine, CheckCircle, AlertCircle, FileText } from "lucide-react";

const consentText = `CONSENTIMIENTO INFORMADO PARA COLOCACIÓN DE PRÓTESIS DEFINITIVA SOBRE IMPLANTES BASALES

Clínica Cotten - Dr. Philippe Cotten
Calle de Sabino Arana 40, 1°, 2ª, 08028 Barcelona
Colegiado nº 08/123456 | Tel: +34 932 041 069

DATOS DEL PACIENTE
Nombre: María García López | DNI: 12345678A
Tratamiento: Implantología Basal – Prótesis definitiva sobre implantes

DESCRIPCIÓN DEL PROCEDIMIENTO
El procedimiento que se le va a realizar consiste en la colocación de una prótesis dental definitiva anclada sobre los implantes basales previamente osteointegrados. La prótesis será de porcelana sobre metal de alta resistencia, diseñada específicamente para su caso según las medidas tomadas en las consultas previas.

RIESGOS Y COMPLICACIONES
Como todo procedimiento quirúrgico o médico, la colocación de prótesis sobre implantes puede conllevar ciertos riesgos:
• Dolor e inflamación postoperatoria transitoria
• Posible necesidad de ajuste oclusal
• En casos excepcionales, fractura de la prótesis provisional durante el período de adaptación
• Reacción alérgica a los materiales (excepcional)
• Necesidad de repetir el procedimiento si la osteointegración no es óptima

ALTERNATIVAS TERAPÉUTICAS
Se han valorado alternativas como prótesis removible convencional, sobredentadura, o mantenimiento de la prótesis provisional, habiéndose considerado la prótesis fija definitiva como la opción más adecuada para su caso.

DECLARACIÓN DEL PACIENTE
He leído y comprendido la información que antecede. He tenido la oportunidad de preguntar todas mis dudas, las cuales han sido satisfactoriamente resueltas por el Dr. Philippe Cotten. Comprendo los riesgos y beneficios del procedimiento y doy mi consentimiento libremente.

De conformidad con el Reglamento General de Protección de Datos (RGPD) y la Ley Orgánica de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD), los datos personales recabados serán tratados con finalidad asistencial y administrativa, no siendo cedidos a terceros sin su consentimiento expreso.`;

export default function FirmarDocumentos() {
  const [signed, setSigned] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const canvasRef = useRef(null);
  const lastPos = useRef(null);

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true);
    const canvas = canvasRef.current;
    lastPos.current = getPos(e, canvas);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const pos = getPos(e, canvas);
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a2744";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  };

  const stopDraw = () => setDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const handleSign = () => {
    if (!hasSignature) return;
    setSigned(true);
  };

  if (signed) {
    return (
      <div className="p-6 lg:p-8 max-w-3xl">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: "#e8f5e9" }}>
            <CheckCircle size={40} style={{ color: "#2e7d32" }} />
          </div>
          <h2 className="text-2xl font-semibold mb-3" style={{ color: "#1a2744" }}>Documento firmado</h2>
          <p className="text-sm max-w-sm" style={{ color: "#6b7280" }}>
            Su consentimiento informado ha sido firmado digitalmente y registrado en el sistema de Clínica Cotten. Fecha y hora: {new Date().toLocaleString("es-ES")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Firmar Documentos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Revise y firme los consentimientos pendientes</p>
      </div>

      {/* Alert */}
      <div className="mb-6 p-4 rounded-xl flex items-start gap-3" style={{ background: "#fff8e1", border: "1px solid #ffc10740" }}>
        <AlertCircle size={18} className="mt-0.5 flex-shrink-0" style={{ color: "#f57f17" }} />
        <div>
          <p className="text-sm font-medium" style={{ color: "#e65100" }}>Tiene 1 documento pendiente de firma</p>
          <p className="text-xs mt-0.5" style={{ color: "#f57f17" }}>Por favor, lea el documento completo antes de firmar</p>
        </div>
      </div>

      {/* Document info */}
      <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #e5e0d8" }}>
        <div className="px-6 py-4 flex items-center gap-3" style={{ background: "linear-gradient(135deg, #1a274408, #1a274412)", borderBottom: "1px solid #e5e0d8" }}>
          <FileText size={18} style={{ color: "#c9a96e" }} />
          <div>
            <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>Consentimiento Prótesis Definitiva</p>
            <p className="text-xs" style={{ color: "#9ca3af" }}>Añadido: 15 de mayo de 2026 · Clínica Cotten</p>
          </div>
        </div>

        {/* Consent text */}
        <div className="p-6 max-h-80 overflow-y-auto scrollbar-thin">
          <pre className="text-xs whitespace-pre-wrap font-sans leading-relaxed" style={{ color: "#374151" }}>
            {consentText}
          </pre>
        </div>
      </div>

      {/* Signature area */}
      <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <PenLine size={16} style={{ color: "#c9a96e" }} />
            <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>Firma electrónica</p>
          </div>
          <button onClick={clearSignature} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
            Borrar firma
          </button>
        </div>
        <p className="text-xs mb-4" style={{ color: "#9ca3af" }}>Firme con el ratón o el dedo dentro del recuadro</p>

        <div className="rounded-xl overflow-hidden" style={{ border: "2px dashed #d1cbbf" }}>
          <canvas
            ref={canvasRef}
            width={600}
            height={140}
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

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs" style={{ color: "#9ca3af" }}>
            Al firmar confirma que ha leído y acepta el consentimiento informado
          </p>
          <button
            onClick={handleSign}
            disabled={!hasSignature}
            className="px-6 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
          >
            Firmar documento
          </button>
        </div>
      </div>
    </div>
  );
}

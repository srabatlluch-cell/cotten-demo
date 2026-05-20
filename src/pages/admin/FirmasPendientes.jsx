import { useState } from "react";
import { PenLine, Send, CheckCircle, Clock } from "lucide-react";
import { pendingSignatures } from "../../data/mockData";

export default function FirmasPendientes() {
  const [sent, setSent] = useState([]);
  const [sigs, setSigs] = useState(pendingSignatures);

  const handleSend = (id) => {
    setSent(prev => [...prev, id]);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Firmas Pendientes</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Consentimientos informados pendientes de firma por los pacientes</p>
      </div>

      {/* Summary */}
      <div className="p-5 rounded-2xl mb-6 flex items-center gap-4" style={{ background: "#fff8e1", border: "1px solid #ffc10730" }}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff3cd" }}>
          <PenLine size={18} style={{ color: "#f57f17" }} />
        </div>
        <div>
          <p className="font-semibold text-sm" style={{ color: "#e65100" }}>{sigs.length} consentimiento{sigs.length !== 1 ? "s" : ""} pendiente{sigs.length !== 1 ? "s" : ""} de firma</p>
          <p className="text-xs mt-0.5" style={{ color: "#f57f17" }}>Envíe recordatorios a los pacientes para agilizar el proceso</p>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {sigs.map(sig => {
          const isSent = sent.includes(sig.id);
          return (
            <div key={sig.id} className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                    {sig.patientName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm" style={{ color: "#1a2744" }}>{sig.patientName}</p>
                    <p className="text-sm mt-1" style={{ color: "#374151" }}>{sig.document}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="flex items-center gap-1.5 text-xs" style={{ color: "#9ca3af" }}>
                        <Clock size={12} />
                        Añadido: {new Date(sig.dateAdded).toLocaleDateString("es-ES")}
                      </span>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{
                        background: sig.daysWaiting > 3 ? "#fee2e2" : "#fff8e1",
                        color: sig.daysWaiting > 3 ? "#dc2626" : "#f57f17",
                      }}>
                        {sig.daysWaiting} día{sig.daysWaiting !== 1 ? "s" : ""} sin firmar
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  {isSent ? (
                    <span className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl" style={{ background: "#e8f5e9", color: "#2e7d32" }}>
                      <CheckCircle size={14} />
                      Recordatorio enviado
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSend(sig.id)}
                      className="flex items-center gap-2 text-xs px-4 py-2.5 rounded-xl font-medium transition-all hover:opacity-90 hover:scale-105"
                      style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
                    >
                      <Send size={13} />
                      Enviar recordatorio
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {sigs.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "#c9a96e" }} />
          <p className="font-medium" style={{ color: "#1a2744" }}>No hay firmas pendientes</p>
          <p className="text-sm mt-1" style={{ color: "#9ca3af" }}>Todos los consentimientos están al día</p>
        </div>
      )}
    </div>
  );
}

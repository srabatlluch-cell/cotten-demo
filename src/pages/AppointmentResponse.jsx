import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { CheckCircle, XCircle, Loader2, AlertCircle } from "lucide-react";

// ─── tiny brand card shell ────────────────────────────────────────────────────

function Shell({ children }) {
  return (
    <div style={{ minHeight: "100vh", background: "#f0ede8", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px 16px", fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12, marginBottom: 28 }}>
          <div style={{ width: 44, height: 44, background: "#1a2744", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <span style={{ color: "#c9a96e", fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>CC</span>
          </div>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#1a2744", letterSpacing: 0.3 }}>Clínica Cotten</div>
            <div style={{ fontSize: 12, color: "#9ca3af" }}>Barcelona · Odontología Avanzada</div>
          </div>
        </div>
        {/* Card */}
        <div style={{ background: "#fff", borderRadius: 16, border: "1px solid #e5e0d8", overflow: "hidden" }}>
          <div style={{ height: 4, background: "linear-gradient(90deg,#1a2744,#c9a96e)" }} />
          <div style={{ padding: "36px 32px" }}>
            {children}
          </div>
        </div>
        <p style={{ textAlign: "center", fontSize: 12, color: "#9ca3af", marginTop: 20 }}>
          Clínica Cotten · Passeig de Gràcia · Barcelona
        </p>
      </div>
    </div>
  );
}

// ─── states ───────────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ textAlign: "center", padding: "8px 0 16px" }}>
      <Loader2 size={40} style={{ color: "#1a2744", animation: "spin 1s linear infinite", margin: "0 auto 20px" }} />
      <p style={{ margin: 0, fontSize: 15, color: "#374151" }}>Procesando…</p>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function SuccessConfirm() {
  return (
    <div style={{ textAlign: "center" }}>
      <CheckCircle size={52} style={{ color: "#15803d", margin: "0 auto 20px" }} />
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#1a2744" }}>Cita confirmada</h2>
      <p style={{ margin: "0 0 24px", fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
        Gracias por confirmar su asistencia. Le esperamos en la clínica.
      </p>
      <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#15803d", textAlign: "left", lineHeight: 1.6 }}>
        Si necesita hacer algún cambio, llámenos al <strong>+34 932 041 069</strong>.
      </div>
    </div>
  );
}

function SuccessCancel() {
  return (
    <div style={{ textAlign: "center" }}>
      <XCircle size={52} style={{ color: "#6b7280", margin: "0 auto 20px" }} />
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#1a2744" }}>Cita cancelada</h2>
      <p style={{ margin: "0 0 24px", fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
        Hemos registrado su cancelación. Nuestro equipo se pondrá en contacto con usted para buscar una nueva fecha.
      </p>
      <div style={{ background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#6b7280", textAlign: "left", lineHeight: 1.6 }}>
        ¿Desea pedir una nueva cita? Llámenos al <strong style={{ color: "#1a2744" }}>+34 932 041 069</strong>.
      </div>
    </div>
  );
}

function ErrorState({ msg }) {
  return (
    <div style={{ textAlign: "center" }}>
      <AlertCircle size={52} style={{ color: "#dc2626", margin: "0 auto 20px" }} />
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#1a2744" }}>No se pudo procesar</h2>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
        {msg || "El enlace no es válido o ya ha sido utilizado."}
      </p>
      <div style={{ background: "#fff1f2", border: "1px solid #fecaca", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#dc2626", lineHeight: 1.6 }}>
        Si cree que es un error, llámenos al <strong>+34 932 041 069</strong> y le ayudamos.
      </div>
    </div>
  );
}

function AlreadyProcessed({ status }) {
  const label = status === "confirmed" ? "ya estaba confirmada" : status === "cancelled" ? "ya estaba cancelada" : "ya ha sido procesada";
  return (
    <div style={{ textAlign: "center" }}>
      <AlertCircle size={52} style={{ color: "#d97706", margin: "0 auto 20px" }} />
      <h2 style={{ margin: "0 0 12px", fontSize: 22, fontWeight: 700, color: "#1a2744" }}>Esta cita {label}</h2>
      <p style={{ margin: "0 0 20px", fontSize: 15, color: "#374151", lineHeight: 1.6 }}>
        No es necesaria ninguna acción adicional.
      </p>
      <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "14px 18px", fontSize: 13, color: "#92400e", lineHeight: 1.6 }}>
        Si necesita ayuda, llámenos al <strong>+34 932 041 069</strong>.
      </div>
    </div>
  );
}

// ─── cancel form ──────────────────────────────────────────────────────────────

function CancelForm({ onSubmit, submitting }) {
  const [reason, setReason] = useState("");

  return (
    <div>
      <XCircle size={44} style={{ color: "#dc2626", display: "block", margin: "0 auto 20px" }} />
      <h2 style={{ margin: "0 0 8px", fontSize: 22, fontWeight: 700, color: "#1a2744", textAlign: "center" }}>
        Cancelar cita
      </h2>
      <p style={{ margin: "0 0 24px", fontSize: 15, color: "#374151", lineHeight: 1.6, textAlign: "center" }}>
        Lamentamos que no pueda asistir. Si desea, indíquenos el motivo para que nuestro equipo pueda ayudarle mejor.
      </p>
      <form onSubmit={e => { e.preventDefault(); onSubmit(reason); }}>
        <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#1a2744", marginBottom: 8 }}>
          Motivo de cancelación <span style={{ fontWeight: 400, color: "#9ca3af" }}>(opcional)</span>
        </label>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Ej: Tengo un compromiso inesperado, prefiero otra fecha…"
          rows={4}
          style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px", border: "1px solid #e5e0d8", borderRadius: 10, fontSize: 14, color: "#1a2744", background: "#faf9f7", resize: "vertical", outline: "none", fontFamily: "inherit", lineHeight: 1.6 }}
        />
        <button
          type="submit"
          disabled={submitting}
          style={{ marginTop: 16, width: "100%", padding: "14px", background: submitting ? "#9ca3af" : "#dc2626", color: "#fff", border: "none", borderRadius: 10, fontSize: 15, fontWeight: 600, cursor: submitting ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
        >
          {submitting && <Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} />}
          {submitting ? "Cancelando…" : "Confirmar cancelación"}
          <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
        </button>
      </form>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function AppointmentResponse() {
  const [searchParams] = useSearchParams();
  const token  = searchParams.get("token");
  const action = searchParams.get("action");

  // phase: idle | loading | done-confirm | done-cancel | already | error | invalid
  const [phase,    setPhase]    = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [alreadyStatus, setAlreadyStatus] = useState("");
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    if (!token || (action !== "confirm" && action !== "cancel")) {
      setPhase("invalid");
      return;
    }
    if (action === "confirm") {
      callRpc("confirm", null);
    }
    // cancel: wait for form submission
  }, []);

  async function callRpc(act, reason) {
    setPhase("loading");
    try {
      const { data, error } = await supabase.rpc("patient_respond_appointment", {
        p_token:  token,
        p_action: act,
        p_reason: reason ?? null,
      });
      if (error) throw error;
      if (!data?.ok) {
        if (data?.status) {
          setAlreadyStatus(data.status);
          setPhase("already");
        } else {
          setErrorMsg(data?.error ?? "Error desconocido");
          setPhase("error");
        }
        return;
      }
      setPhase(act === "confirm" ? "done-confirm" : "done-cancel");
    } catch (err) {
      setErrorMsg(err.message ?? "Error de conexión");
      setPhase("error");
    }
  }

  function renderContent() {
    if (phase === "invalid")      return <ErrorState msg="El enlace no es válido. Por favor compruebe el email recibido." />;
    if (phase === "loading")      return <LoadingState />;
    if (phase === "done-confirm") return <SuccessConfirm />;
    if (phase === "done-cancel")  return <SuccessCancel />;
    if (phase === "already")      return <AlreadyProcessed status={alreadyStatus} />;
    if (phase === "error")        return <ErrorState msg={errorMsg} />;
    // phase === "idle" → cancel form
    if (action === "cancel")      return <CancelForm onSubmit={r => callRpc("cancel", r)} submitting={false} />;
    return <LoadingState />;
  }

  return <Shell>{renderContent()}</Shell>;
}
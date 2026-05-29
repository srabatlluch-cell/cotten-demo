import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, ShieldCheck, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function NuevaContrasena() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    // PASSWORD_RECOVERY fires for recovery links; SIGNED_IN fires for invite links
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });

    // Also handle page refresh with an existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error: updateErr } = await supabase.auth.updateUser({ password });
    if (updateErr) {
      setError(updateErr.message);
      setLoading(false);
      return;
    }
    await supabase.auth.signOut();
    setDone(true);
    setTimeout(() => navigate("/acceso-personal"), 3000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12" style={{ background: "linear-gradient(135deg, #111b33 0%, #1a2744 100%)" }}>
      <div className="w-full max-w-md">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }}>
            <span className="text-white font-bold text-xs">CC</span>
          </div>
          <div>
            <p className="text-white font-semibold text-sm">Clínica Cotten</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#c9a96e" }}>Acceso Personal</p>
          </div>
        </div>

        {done ? (
          <div className="text-center">
            <CheckCircle size={48} className="mx-auto mb-4" style={{ color: "#c9a96e" }} />
            <h2 className="text-2xl font-light text-white mb-2">Contraseña actualizada</h2>
            <p className="text-white/50 text-sm">Redirigiendo al acceso en unos segundos…</p>
          </div>
        ) : !ready ? (
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-white/50 text-sm">Verificando enlace…</p>
            <p className="text-white/30 text-xs mt-4">
              Si esto tarda demasiado, el enlace puede haber caducado.{" "}
              <Link to="/acceso-personal" style={{ color: "#c9a96e" }} className="hover:underline">
                Solicitar uno nuevo
              </Link>
            </p>
          </div>
        ) : (
          <>
            <div className="p-4 rounded-2xl mb-6" style={{ background: "rgba(201,169,110,0.07)", border: "1px solid rgba(201,169,110,0.15)" }}>
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} style={{ color: "#c9a96e" }} />
                <p className="text-white/70 text-sm">Enlace verificado. Establece tu nueva contraseña.</p>
              </div>
            </div>

            <h2 className="text-2xl font-light text-white mb-2">Nueva contraseña</h2>
            <p className="text-white/40 text-sm mb-8">Mínimo 8 caracteres</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                    required
                    minLength={8}
                  />
                  <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Confirmar contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && <p className="text-sm text-center" style={{ color: "#f87171" }}>{error}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-70"
                style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
              >
                {loading ? "Guardando…" : "Establecer contraseña"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, User, ArrowLeft, ShieldCheck } from "lucide-react";
import { signIn } from "../lib/auth";

export default function StaffLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { user } = await signIn(email, password);
      const isStaff = user.email?.endsWith("@clinica-cotten.com");
      navigate(isStaff ? "/admin/panel" : "/paciente/inicio");
    } catch (err) {
      console.error('[StaffLogin] signIn error:', err)
      setError("Credenciales incorrectas. Por favor, inténtelo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #111b33 0%, #1a2744 100%)" }}>
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-10 transition-colors">
            <ArrowLeft size={14} />
            Volver al inicio
          </Link>

          <div className="flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }}>
              <span className="text-white font-bold text-xs">CC</span>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">Clínica Cotten</p>
              <p className="text-xs tracking-widest uppercase" style={{ color: "#c9a96e" }}>Acceso Personal</p>
            </div>
          </div>

          <div className="p-6 rounded-2xl mb-8" style={{ background: "rgba(201,169,110,0.07)", border: "1px solid rgba(201,169,110,0.15)" }}>
            <div className="flex items-center gap-3">
              <ShieldCheck size={20} style={{ color: "#c9a96e" }} />
              <div>
                <p className="text-white text-sm font-medium">Área Restringida</p>
                <p className="text-white/40 text-xs">Solo personal autorizado de Clínica Cotten</p>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-light text-white mb-2">Acceso Personal</h2>
          <p className="text-white/40 text-sm mb-8">Introduzca su usuario y contraseña</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Usuario</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="correo@clinica.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  required
                />
              </div>
            </div>

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
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-sm text-center" style={{ color: "#f87171" }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 rounded-xl text-sm font-medium tracking-wide transition-all duration-200 hover:opacity-90 hover:scale-[1.02] disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
            >
              {loading ? "Verificando..." : "Acceder al Panel"}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-8">
            ¿Es paciente?{" "}
            <Link to="/acceso-paciente" style={{ color: "#c9a96e" }} className="hover:underline">
              Acceso Paciente
            </Link>
          </p>
        </div>
      </div>

      {/* Right side info */}
      <div className="hidden lg:flex lg:w-2/5 flex-col justify-between p-12" style={{ background: "rgba(0,0,0,0.2)", borderLeft: "1px solid rgba(201,169,110,0.1)" }}>
        <div />
        <div>
          <h3 className="text-white/60 text-xs uppercase tracking-widest mb-6">Panel de gestión</h3>
          <div className="space-y-4">
            {[
              { label: "Gestión de pacientes", desc: "Historial completo y seguimiento" },
              { label: "Agenda clínica", desc: "Vista semanal por profesional" },
              { label: "Documentos", desc: "Gestión centralizada de archivos" },
              { label: "Pagos y facturación", desc: "Control financiero completo" },
              { label: "Firmas pendientes", desc: "Consentimientos digitales" },
            ].map(item => (
              <div key={item.label} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full mt-2 flex-shrink-0" style={{ background: "#c9a96e" }} />
                <div>
                  <p className="text-white/70 text-sm">{item.label}</p>
                  <p className="text-white/30 text-xs">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/20 text-xs">Clínica Cotten · Sistema de Gestión v2.1</p>
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, ArrowLeft } from "lucide-react";
import { signIn } from "../lib/auth";

export default function PatientLogin() {
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
      console.error('[PatientLogin] signIn error:', err)
      setError("Credenciales incorrectas. Por favor, inténtelo de nuevo.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #1a2744 0%, #243256 100%)" }}>
      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12" style={{ background: "linear-gradient(160deg, #111b33 0%, #1a2744 100%)", borderRight: "1px solid rgba(201,169,110,0.1)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }}>
            <span className="text-white font-bold text-sm">CC</span>
          </div>
          <div>
            <p className="text-white font-semibold">Clínica Cotten</p>
            <p className="text-xs tracking-widest uppercase" style={{ color: "#c9a96e" }}>Implantología Basal</p>
          </div>
        </div>
        <div>
          <h2 className="text-4xl font-light text-white mb-4 leading-tight">
            Su salud,<br />
            <span style={{ color: "#c9a96e" }}>nuestra prioridad</span>
          </h2>
          <p className="text-white/50 text-sm leading-relaxed max-w-sm">
            Acceda a su historial, citas y documentos de forma segura. Dr. Philippe Cotten y su equipo cuidan de usted con 27 años de experiencia en implantología basal.
          </p>
          <div className="mt-8 grid grid-cols-2 gap-4">
            {["Citas en línea", "Documentos", "Pagos seguros", "Firma digital"].map(item => (
              <div key={item} className="flex items-center gap-2 text-white/60 text-sm">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#c9a96e" }} />
                {item}
              </div>
            ))}
          </div>
        </div>
        <p className="text-white/20 text-xs">© 2026 Clínica Cotten · Calle Sabino Arana 40 · Barcelona</p>
      </div>

      {/* Right login form */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-2 text-white/40 hover:text-white/70 text-sm mb-10 transition-colors">
            <ArrowLeft size={14} />
            Volver al inicio
          </Link>

          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }}>
              <span className="text-white font-bold text-xs">CC</span>
            </div>
            <p className="text-white font-semibold">Clínica Cotten</p>
          </div>

          <h2 className="text-2xl font-light text-white mb-2">Acceso Paciente</h2>
          <p className="text-white/40 text-sm mb-8">Introduzca sus credenciales para acceder a su portal</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-white/50 mb-2">Correo electrónico</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="su@email.com"
                  className="w-full pl-11 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-white/20 outline-none transition-all"
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

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-white/50 cursor-pointer">
                <input type="checkbox" className="rounded" />
                Recordarme
              </label>
              <a href="#" className="text-xs" style={{ color: "#c9a96e" }}>¿Olvidó su contraseña?</a>
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
              {loading ? "Accediendo..." : "Acceder al Portal"}
            </button>
          </form>

          <p className="text-center text-white/30 text-xs mt-8">
            ¿Es personal de la clínica?{" "}
            <Link to="/acceso-personal" style={{ color: "#c9a96e" }} className="hover:underline">
              Acceso Personal
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

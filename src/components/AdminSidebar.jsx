import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Users, Calendar, FileText, CreditCard, PenLine, UserCog, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/admin/panel", icon: LayoutDashboard, label: "Panel" },
  { to: "/admin/pacientes", icon: Users, label: "Pacientes" },
  { to: "/admin/agenda", icon: Calendar, label: "Agenda" },
  { to: "/admin/documentos", icon: FileText, label: "Documentos" },
  { to: "/admin/pagos", icon: CreditCard, label: "Pagos" },
  { to: "/admin/firmas", icon: PenLine, label: "Firmas Pendientes" },
  { to: "/admin/equipo", icon: UserCog, label: "Equipo" },
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <>
      <div className="p-6 border-b" style={{ borderColor: "rgba(201,169,110,0.15)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" }}>
            <span className="text-white font-bold text-xs">CC</span>
          </div>
          <div className="min-w-0">
            <p className="text-white font-semibold text-sm truncate">Clínica Cotten</p>
            <p className="text-xs truncate" style={{ color: "#c9a96e" }}>Panel de Gestión</p>
          </div>
        </div>
      </div>

      <div className="p-4 mx-4 mt-4 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center mb-2" style={{ background: "linear-gradient(135deg, #c9a96e22, #c9a96e44)" }}>
          <UserCog size={14} style={{ color: "#c9a96e" }} />
        </div>
        <p className="text-white text-sm font-medium">Sofía Navarro</p>
        <p className="text-white/40 text-xs">Recepción · Admin</p>
      </div>

      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl mb-1 text-sm transition-all duration-150 ${
                isActive
                  ? "text-white font-medium"
                  : "text-white/50 hover:text-white/80 hover:bg-white/5"
              }`
            }
            style={({ isActive }) => isActive ? { background: "linear-gradient(135deg, rgba(201,169,110,0.2), rgba(201,169,110,0.1))", borderLeft: "3px solid #c9a96e", paddingLeft: "13px" } : {}}
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm text-white/40 hover:text-white/70 hover:bg-white/5 transition-all w-full"
        >
          <LogOut size={16} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg text-white"
        style={{ background: "#1a2744" }}
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
      )}

      <aside
        className={`lg:hidden fixed top-0 left-0 h-full w-64 z-40 flex flex-col transition-transform duration-300 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "#1a2744" }}
      >
        <SidebarContent />
      </aside>

      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 h-screen sticky top-0" style={{ background: "#1a2744" }}>
        <SidebarContent />
      </aside>
    </>
  );
}

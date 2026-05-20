import { teamMembers } from "../../data/mockData";
import { Mail, Phone, Shield } from "lucide-react";

const accessBadge = {
  "Director Médico": { bg: "#1a274415", color: "#1a2744" },
  "Médico": { bg: "#6366f115", color: "#6366f1" },
  "Administrativo": { bg: "#c9a96e15", color: "#b08a4e" },
  "Auxiliar": { bg: "#d9770615", color: "#d97706" },
};

export default function Equipo() {
  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Equipo</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Personal de Clínica Cotten y niveles de acceso</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teamMembers.map(member => {
          const badge = accessBadge[member.access] || { bg: "#f3f4f6", color: "#6b7280" };
          return (
            <div key={member.id} className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm" style={{ background: member.color }}>
                  {member.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{member.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{member.role}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{member.specialty}</p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs hover:underline" style={{ color: "#6b7280" }}>
                  <Mail size={12} style={{ color: "#c9a96e" }} />
                  {member.email}
                </a>
                <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
                  <Phone size={12} style={{ color: "#c9a96e" }} />
                  {member.phone}
                </a>
              </div>

              <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid #f3f0ea" }}>
                <div className="flex items-center gap-1.5">
                  <Shield size={12} style={{ color: "#9ca3af" }} />
                  <span className="text-xs" style={{ color: "#9ca3af" }}>Acceso:</span>
                </div>
                <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: badge.bg, color: badge.color }}>
                  {member.access}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

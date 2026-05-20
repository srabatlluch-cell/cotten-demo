import { useState } from "react";
import { Search, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { patients } from "../../data/mockData";

export default function Pacientes() {
  const [query, setQuery] = useState("");
  const filtered = patients.filter(p =>
    p.name.toLowerCase().includes(query.toLowerCase()) ||
    p.treatment.toLowerCase().includes(query.toLowerCase()) ||
    p.doctor.toLowerCase().includes(query.toLowerCase())
  );

  const statusColors = {
    "En tratamiento": { bg: "#e8f4fd", color: "#1565c0" },
    "Post-operatorio": { bg: "#fff8e1", color: "#e65100" },
    "En revisión": { bg: "#f3e8ff", color: "#7c3aed" },
    "Planificación": { bg: "#e8f5e9", color: "#2e7d32" },
  };

  const paymentColors = {
    "Al día": { bg: "#e8f5e9", color: "#2e7d32" },
    "Pendiente": { bg: "#fff8e1", color: "#f57f17" },
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Pacientes</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>{patients.length} pacientes registrados</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
        <input
          type="text"
          placeholder="Buscar por nombre, tratamiento o médico..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full max-w-md pl-11 pr-4 py-3 rounded-xl text-sm outline-none bg-white"
          style={{ border: "1px solid #e5e0d8" }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f0ea", background: "#faf9f7" }}>
                {["Paciente", "Tratamiento", "Médico", "Estado", "Próx. cita", "Pago", ""].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#f3f0ea" }}>
              {filtered.map(p => {
                const sc = statusColors[p.status] || { bg: "#f3f4f6", color: "#6b7280" };
                const pc = paymentColors[p.paymentStatus] || { bg: "#f3f4f6", color: "#6b7280" };
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                          {p.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{p.name}</p>
                          <p className="text-xs" style={{ color: "#9ca3af" }}>{p.dni}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "#374151" }}>{p.treatment}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: "#6b7280" }}>{p.doctor}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: sc.bg, color: sc.color }}>{p.status}</span>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "#6b7280" }}>
                      {new Date(p.nextAppointment + "T12:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: pc.bg, color: pc.color }}>{p.paymentStatus}</span>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/admin/pacientes/${p.id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 inline-flex">
                        <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

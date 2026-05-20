import { useState } from "react";
import { Search, CheckCircle, Clock, TrendingUp } from "lucide-react";
import { payments, patients } from "../../data/mockData";

export default function Pagos() {
  const [filterPatient, setFilterPatient] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const getPatient = (id) => patients.find(p => p.id === id);

  const filtered = payments.filter(p => {
    const pt = getPatient(p.patientId);
    const matchPatient = !filterPatient || pt?.name.toLowerCase().includes(filterPatient.toLowerCase());
    const matchStatus = !filterStatus || p.status === filterStatus;
    return matchPatient && matchStatus;
  });

  const totalCollected = payments.filter(p => p.status === "Pagado").reduce((s, p) => s + p.amount, 0);
  const totalPending = payments.filter(p => p.status === "Pendiente").reduce((s, p) => s + p.amount, 0);
  const thisMonth = payments.filter(p => p.status === "Pagado" && p.date.startsWith("2026-05")).reduce((s, p) => s + p.amount, 0);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Pagos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gestión financiera completa de la clínica</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total cobrado", value: `${totalCollected.toLocaleString("es-ES")} €`, icon: CheckCircle, color: "#2e7d32", bg: "#e8f5e9" },
          { label: "Pendiente de cobro", value: `${totalPending.toLocaleString("es-ES")} €`, icon: Clock, color: "#f57f17", bg: "#fff8e1" },
          { label: "Cobrado este mes", value: `${thisMonth.toLocaleString("es-ES")} €`, icon: TrendingUp, color: "#1565c0", bg: "#e8f4fd" },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white p-5 rounded-2xl" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{label}</p>
            </div>
            <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Buscar paciente..."
            value={filterPatient}
            onChange={e => setFilterPatient(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8" }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
          style={{ border: "1px solid #e5e0d8", color: "#374151" }}
        >
          <option value="">Todos los estados</option>
          <option value="Pagado">Pagado</option>
          <option value="Pendiente">Pendiente</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f0ea", background: "#faf9f7" }}>
                {["Paciente", "Concepto", "Fecha", "Importe", "Estado"].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#f3f0ea" }}>
              {filtered.map(p => {
                const pt = getPatient(p.patientId);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                          {pt?.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                        </div>
                        <p className="text-sm" style={{ color: "#1a2744" }}>{pt?.name}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "#374151" }}>{p.concept}</td>
                    <td className="px-6 py-4 text-sm" style={{ color: "#6b7280" }}>{new Date(p.date).toLocaleDateString("es-ES")}</td>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: "#1a2744" }}>{p.amount.toLocaleString("es-ES")} €</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{
                          background: p.status === "Pagado" ? "#e8f5e9" : "#fff8e1",
                          color: p.status === "Pagado" ? "#2e7d32" : "#f57f17",
                        }}
                      >
                        {p.status === "Pagado" ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {p.status}
                      </span>
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

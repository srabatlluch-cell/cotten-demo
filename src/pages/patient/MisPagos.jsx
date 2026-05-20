import { CreditCard, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { payments } from "../../data/mockData";
import { useState } from "react";

export default function MisPagos() {
  const myPayments = payments.filter(p => p.patientId === 1);
  const paid = myPayments.filter(p => p.status === "Pagado");
  const pending = myPayments.filter(p => p.status === "Pendiente");
  const totalPaid = paid.reduce((s, p) => s + p.amount, 0);
  const totalPending = pending.reduce((s, p) => s + p.amount, 0);
  const [paidIds, setPaidIds] = useState([]);

  const handlePay = (id) => {
    setPaidIds(prev => [...prev, id]);
  };

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mis Pagos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gestión de pagos y facturación de su tratamiento</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-5 rounded-2xl bg-white" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#e8f5e9" }}>
              <CheckCircle size={16} style={{ color: "#2e7d32" }} />
            </div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#9ca3af" }}>Total pagado</p>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#1a2744" }}>{totalPaid.toLocaleString("es-ES")} €</p>
        </div>
        <div className="p-5 rounded-2xl bg-white" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#fff8e1" }}>
              <Clock size={16} style={{ color: "#f57f17" }} />
            </div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#9ca3af" }}>Pendiente</p>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#1a2744" }}>{totalPending.toLocaleString("es-ES")} €</p>
        </div>
        <div className="p-5 rounded-2xl bg-white" style={{ border: "1px solid #e5e0d8" }}>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "#e8f4fd" }}>
              <TrendingUp size={16} style={{ color: "#1976d2" }} />
            </div>
            <p className="text-xs uppercase tracking-wider font-medium" style={{ color: "#9ca3af" }}>Próx. vencimiento</p>
          </div>
          <p className="text-2xl font-semibold" style={{ color: "#1a2744" }}>
            {pending[0] ? new Date(pending[0].date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" }) : "—"}
          </p>
        </div>
      </div>

      {/* Payments table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "#f3f0ea" }}>
          <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Historial de pagos</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid #f3f0ea" }}>
                {["Concepto", "Fecha", "Importe", "Estado", ""].map(h => (
                  <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: "#f3f0ea" }}>
              {myPayments.map(p => {
                const isPaid = p.status === "Pagado" || paidIds.includes(p.id);
                return (
                  <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1a274410, #1a274420)" }}>
                          <CreditCard size={14} style={{ color: "#1a2744" }} />
                        </div>
                        <p className="text-sm" style={{ color: "#1a2744" }}>{p.concept}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm" style={{ color: "#6b7280" }}>{new Date(p.date).toLocaleDateString("es-ES")}</td>
                    <td className="px-6 py-4 text-sm font-semibold" style={{ color: "#1a2744" }}>{p.amount.toLocaleString("es-ES")} €</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-medium"
                        style={{
                          background: isPaid ? "#e8f5e9" : "#fff8e1",
                          color: isPaid ? "#2e7d32" : "#f57f17",
                        }}
                      >
                        {isPaid ? <CheckCircle size={11} /> : <Clock size={11} />}
                        {isPaid ? "Pagado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {!isPaid && (
                        <button
                          onClick={() => handlePay(p.id)}
                          className="text-xs px-4 py-2 rounded-lg font-medium transition-all hover:opacity-90"
                          style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
                        >
                          Pagar
                        </button>
                      )}
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

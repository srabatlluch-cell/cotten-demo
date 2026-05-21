import { useState, useEffect } from "react";
import { Search, ChevronRight, UserPlus, X, Loader2, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL = { active: "Activo", inactive: "Inactivo", discharged: "Alta" };
const STATUS_STYLE = {
  active:     { background: "#e8f4fd", color: "#1565c0" },
  inactive:   { background: "#f3f4f6", color: "#6b7280" },
  discharged: { background: "#e8f5e9", color: "#2e7d32" },
};

async function fetchPatients() {
  const { data, error } = await supabase.rpc("get_all_patients");
  if (error) throw error;
  return data ?? [];
}

// ─── component ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { full_name: "", email: "", phone: "", dni: "", birth_date: "", treatment: "" };

export default function Pacientes() {
  const [patients,    setPatients]    = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [query,       setQuery]       = useState("");
  const [showModal,   setShowModal]   = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [creating,    setCreating]    = useState(false);
  const [createError, setCreateError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const rows = await fetchPatients();
        if (!cancelled) setPatients(rows);
      } catch (err) {
        console.error("[Pacientes] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filtered = patients.filter(p => {
    const q = query.toLowerCase();
    return (
      (p.full_name   ?? "").toLowerCase().includes(q) ||
      (p.email       ?? "").toLowerCase().includes(q) ||
      (p.treatment   ?? "").toLowerCase().includes(q) ||
      (p.dni         ?? "").toLowerCase().includes(q)
    );
  });

  function handleFormChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setCreateError("");

    if (!form.email || !form.full_name) {
      setCreateError("Nombre y correo electrónico son obligatorios.");
      return;
    }

    setCreating(true);
    try {
      const { error } = await supabase.rpc("admin_create_patient", {
        p_email:      form.email,
        p_full_name:  form.full_name,
        p_phone:      form.phone      || null,
        p_dni:        form.dni        || null,
        p_birth_date: form.birth_date || null,
        p_treatment:  form.treatment  || null,
      });
      if (error) throw error;

      const rows = await fetchPatients();
      setPatients(rows);
      setShowModal(false);
      setForm(EMPTY_FORM);
    } catch (err) {
      console.error("[Pacientes] create error:", err);
      setCreateError(err.message ?? "Error al crear el paciente. Inténtelo de nuevo.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Pacientes</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
            {loading ? "Cargando…" : `${patients.length} paciente${patients.length !== 1 ? "s" : ""} registrado${patients.length !== 1 ? "s" : ""}`}
          </p>
        </div>
        <button
          onClick={() => { setShowModal(true); setCreateError(""); setForm(EMPTY_FORM); }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" }}
        >
          <UserPlus size={15} /> Nuevo paciente
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
        <input
          type="text"
          placeholder="Buscar por nombre, email, tratamiento o DNI..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full max-w-md pl-11 pr-4 py-3 rounded-xl text-sm outline-none bg-white"
          style={{ border: "1px solid #e5e0d8" }}
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
        {loading ? (
          <div className="flex items-center justify-center py-16 gap-2" style={{ color: "#9ca3af" }}>
            <Loader2 size={18} className="animate-spin" />
            <span className="text-sm">Cargando pacientes…</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f0ea", background: "#faf9f7" }}>
                  {["Paciente", "Tratamiento", "Estado", "Próx. cita", "Pago", ""].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "#f3f0ea" }}>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-sm" style={{ color: "#9ca3af" }}>
                      {query ? "Sin resultados para esa búsqueda." : "No hay pacientes registrados."}
                    </td>
                  </tr>
                ) : filtered.map(p => {
                  const initials = (p.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const sc = STATUS_STYLE[p.patient_status] ?? STATUS_STYLE.inactive;
                  const hasPending = Number(p.pending_amount) > 0;
                  return (
                    <tr key={p.patient_id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                            {initials}
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{p.full_name}</p>
                            <p className="text-xs" style={{ color: "#9ca3af" }}>{p.dni || p.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "#374151" }}>{p.treatment || "—"}</td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={sc}>
                          {STATUS_LABEL[p.patient_status] ?? p.patient_status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm" style={{ color: "#6b7280" }}>
                        {p.next_appointment
                          ? new Date(p.next_appointment + "T12:00").toLocaleDateString("es-ES", { day: "2-digit", month: "short" })
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs px-2.5 py-1 rounded-full font-medium"
                          style={hasPending
                            ? { background: "#fff8e1", color: "#f57f17" }
                            : { background: "#e8f5e9", color: "#2e7d32" }}>
                          {hasPending ? `${Number(p.pending_amount).toLocaleString("es-ES")} €` : "Al día"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Link to={`/admin/pacientes/${p.patient_id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 inline-flex">
                          <ChevronRight size={16} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New patient modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center justify-between px-6 py-5 border-b" style={{ borderColor: "#f3f0ea" }}>
              <h2 className="font-semibold" style={{ color: "#1a2744" }}>Nuevo paciente</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Nombre completo *</label>
                  <input name="full_name" value={form.full_name} onChange={handleFormChange} required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Correo electrónico *</label>
                  <input name="email" type="email" value={form.email} onChange={handleFormChange} required
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Teléfono</label>
                  <input name="phone" value={form.phone} onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>DNI/NIE</label>
                  <input name="dni" value={form.dni} onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Fecha de nacimiento</label>
                  <input name="birth_date" type="date" value={form.birth_date} onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }} />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: "#6b7280" }}>Tratamiento</label>
                  <input name="treatment" value={form.treatment} onChange={handleFormChange}
                    className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
                    style={{ border: "1px solid #e5e0d8", color: "#374151" }} />
                </div>
              </div>

              {createError && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#dc2626" }}>
                  <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
                  {createError}
                </div>
              )}

              <p className="text-xs" style={{ color: "#9ca3af" }}>
                El paciente recibirá un email de bienvenida y podrá establecer su contraseña mediante el enlace de acceso.
              </p>

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                  style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}>
                  Cancelar
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}>
                  {creating && <Loader2 size={14} className="animate-spin" />}
                  {creating ? "Creando…" : "Crear paciente"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
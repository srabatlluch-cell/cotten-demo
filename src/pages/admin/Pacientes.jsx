import { useState, useEffect } from "react";
import { Search, ChevronRight, UserPlus, X, Loader2, AlertCircle, Archive, ArchiveRestore, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { patientStatus } from "../../lib/statusStyles";
import { sendWelcomeEmail } from "../../lib/email";

async function fetchPatients() {
  const { data, error } = await supabase.rpc("get_all_patients");
  if (error) throw error;
  const rows = data ?? [];
  console.log("[Pacientes] get_all_patients returned", rows.length, "rows:", rows.map(p => ({ id: p.patient_id, name: p.full_name })));
  return rows;
}

async function fetchArchivedPatients() {
  const { data, error } = await supabase.rpc("get_archived_patients");
  if (error) throw error;
  return data ?? [];
}

// ─── component ────────────────────────────────────────────────────────────────

const EMPTY_FORM = { full_name: "", email: "", phone: "", dni: "", birth_date: "", treatment: "" };

export default function Pacientes() {
  const [patients,       setPatients]       = useState([]);
  const [archived,       setArchived]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [query,          setQuery]          = useState("");
  const [showArchived,   setShowArchived]   = useState(false);
  const [showModal,      setShowModal]      = useState(false);
  const [form,           setForm]           = useState(EMPTY_FORM);
  const [creating,       setCreating]       = useState(false);
  const [createError,    setCreateError]    = useState("");

  // Archive confirmation dialog state
  const [confirmArchive, setConfirmArchive] = useState(null); // patient object or null
  const [archiving,      setArchiving]      = useState(null); // patient id being processed

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

  // Load archived patients when section is first opened
  useEffect(() => {
    if (!showArchived || archived.length > 0) return;
    let cancelled = false;
    (async () => {
      setLoadingArchived(true);
      try {
        const rows = await fetchArchivedPatients();
        if (!cancelled) setArchived(rows);
      } catch (err) {
        console.error("[Pacientes] archived load error:", err);
      } finally {
        if (!cancelled) setLoadingArchived(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showArchived]);

  const filtered = patients.filter(p => {
    const q = query.toLowerCase();
    return (
      (p.full_name  ?? "").toLowerCase().includes(q) ||
      (p.email      ?? "").toLowerCase().includes(q) ||
      (p.treatment  ?? "").toLowerCase().includes(q) ||
      (p.dni        ?? "").toLowerCase().includes(q)
    );
  });

  const filteredArchived = archived.filter(p => {
    const q = query.toLowerCase();
    return (
      (p.full_name  ?? "").toLowerCase().includes(q) ||
      (p.email      ?? "").toLowerCase().includes(q) ||
      (p.treatment  ?? "").toLowerCase().includes(q)
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
      const { data: created, error } = await supabase.rpc("admin_create_patient", {
        p_email:      form.email,
        p_full_name:  form.full_name,
        p_phone:      form.phone      || null,
        p_dni:        form.dni        || null,
        p_birth_date: form.birth_date || null,
        p_treatment:  form.treatment  || null,
      });
      if (error) throw error;

      console.log("[Pacientes] patient created, sending welcome email to", form.email);
      sendWelcomeEmail({ to: form.email, patientName: form.full_name })
        .then(() => console.log("[Pacientes] welcome email sent"))
        .catch(err => console.error("[Pacientes] welcome email error:", err));

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

  async function handleArchive(patient) {
    setArchiving(patient.patient_id);
    setConfirmArchive(null);
    try {
      console.log("[Pacientes] archiving patient id:", patient.patient_id, "name:", patient.full_name);
      const { data, error } = await supabase.rpc("archive_patient", { p_patient_id: patient.patient_id });
      console.log("[Pacientes] archive_patient result — data:", data, "error:", error);
      if (error) throw error;
      console.log("[Pacientes] archive succeeded, removing from active list");
      // Remove from active list, add to archived list (if loaded)
      setPatients(prev => prev.filter(p => p.patient_id !== patient.patient_id));
      setArchived(prev => [{
        patient_id:     patient.patient_id,
        profile_id:     patient.profile_id,
        full_name:      patient.full_name,
        email:          patient.email,
        treatment:      patient.treatment,
        patient_status: patient.patient_status,
        archived_at:    new Date().toISOString(),
        created_at:     patient.created_at,
      }, ...prev]);
    } catch (err) {
      console.error("[Pacientes] archive error — RPC failed, patient NOT removed from DB:", err);
    } finally {
      setArchiving(null);
    }
  }

  async function handleUnarchive(patient) {
    setArchiving(patient.patient_id);
    try {
      const { error } = await supabase.rpc("unarchive_patient", { p_patient_id: patient.patient_id });
      if (error) throw error;
      // Remove from archived list, reload active list to get full data
      setArchived(prev => prev.filter(p => p.patient_id !== patient.patient_id));
      const rows = await fetchPatients();
      setPatients(rows);
    } catch (err) {
      console.error("[Pacientes] unarchive error:", err);
    } finally {
      setArchiving(null);
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

      {/* ── Active patients table ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl overflow-hidden mb-4" style={{ border: "1px solid #e5e0d8" }}>
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
                  const initials  = (p.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                  const sc        = patientStatus(p.patient_status);
                  const hasPending = Number(p.pending_amount) > 0;
                  const isArchiving = archiving === p.patient_id;
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
                        <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold w-fit" style={sc.badge}>
                          {sc.icon} {sc.label}
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
                        <div className="flex items-center gap-1 justify-end">
                          <button
                            onClick={() => setConfirmArchive(p)}
                            disabled={isArchiving}
                            title="Archivar paciente"
                            className="p-1.5 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                            style={{ color: "#d97706" }}
                          >
                            {isArchiving ? <Loader2 size={15} className="animate-spin" /> : <Archive size={15} />}
                          </button>
                          <Link to={`/admin/pacientes/${p.patient_id}`} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600 inline-flex">
                            <ChevronRight size={16} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Archived patients toggle ─────────────────────────────────────────── */}
      <button
        onClick={() => setShowArchived(s => !s)}
        className="flex items-center gap-2 text-xs uppercase tracking-wider font-semibold mb-4 hover:opacity-70 transition-opacity"
        style={{ color: "#9ca3af" }}
      >
        <Archive size={13} />
        {showArchived ? "Ocultar pacientes archivados" : "Ver pacientes archivados"}
        {archived.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-bold" style={{ background: "#f3f0ea", color: "#6b7280" }}>
            {archived.length}
          </span>
        )}
      </button>

      {showArchived && (
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8", opacity: 0.9 }}>
          {loadingArchived ? (
            <div className="flex items-center justify-center py-10 gap-2" style={{ color: "#9ca3af" }}>
              <Loader2 size={16} className="animate-spin" />
              <span className="text-sm">Cargando archivados…</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr style={{ borderBottom: "1px solid #f3f0ea", background: "#faf9f7" }}>
                    {["Paciente", "Tratamiento", "Archivado el", ""].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs uppercase tracking-wider" style={{ color: "#9ca3af" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "#f3f0ea" }}>
                  {filteredArchived.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-10 text-center text-sm" style={{ color: "#9ca3af" }}>
                        {query ? "Sin resultados para esa búsqueda." : "No hay pacientes archivados."}
                      </td>
                    </tr>
                  ) : filteredArchived.map(p => {
                    const initials = (p.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                    const isUnarchiving = archiving === p.patient_id;
                    return (
                      <tr key={p.patient_id} className="transition-colors" style={{ background: "#faf9f7" }}>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "#9ca3af" }}>
                              {initials}
                            </div>
                            <div>
                              <p className="text-sm font-medium" style={{ color: "#6b7280" }}>{p.full_name}</p>
                              <p className="text-xs" style={{ color: "#9ca3af" }}>{p.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm" style={{ color: "#9ca3af" }}>{p.treatment || "—"}</td>
                        <td className="px-6 py-4 text-sm" style={{ color: "#9ca3af" }}>
                          {p.archived_at
                            ? new Date(p.archived_at).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" })
                            : "—"}
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleUnarchive(p)}
                            disabled={isUnarchiving}
                            title="Restaurar paciente"
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all hover:bg-green-50 disabled:opacity-50"
                            style={{ border: "1px solid #d1fae5", color: "#059669" }}
                          >
                            {isUnarchiving
                              ? <Loader2 size={12} className="animate-spin" />
                              : <ArchiveRestore size={12} />}
                            Restaurar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Archive confirmation dialog ──────────────────────────────────────── */}
      {confirmArchive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" style={{ border: "1px solid #e5e0d8" }}>
            <div className="px-6 pt-6 pb-2 flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff8e1" }}>
                <AlertTriangle size={18} style={{ color: "#d97706" }} />
              </div>
              <div>
                <h2 className="font-semibold" style={{ color: "#1a2744" }}>Archivar paciente</h2>
                <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
                  ¿Archivar a <strong>{confirmArchive.full_name}</strong>?
                </p>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="rounded-xl px-4 py-3 text-sm" style={{ background: "#faf9f7", border: "1px solid #f3f0ea", color: "#6b7280", lineHeight: 1.6 }}>
                El paciente será ocultado de la lista principal pero <strong>todos sus datos, citas, documentos y pagos se conservarán</strong> íntegramente por cumplimiento legal. Puede restaurarlo en cualquier momento.
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setConfirmArchive(null)}
                className="flex-1 py-2.5 rounded-xl text-sm transition-all"
                style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => handleArchive(confirmArchive)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 flex items-center justify-center gap-2"
                style={{ background: "#d97706", color: "white" }}
              >
                <Archive size={14} /> Archivar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── New patient modal ────────────────────────────────────────────────── */}
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
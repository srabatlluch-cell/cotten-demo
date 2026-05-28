import { useState, useEffect } from "react";
import { Mail, Phone, Shield, Pencil, X, Save, Loader2, AlertCircle } from "lucide-react";
import { supabase } from "../../lib/supabase";

// ─── role config ──────────────────────────────────────────────────────────────

const ROLE_LABEL = {
  doctor:       "Médico",
  admin:        "Administrativo",
  receptionist: "Recepción",
  staff:        "Auxiliar",
};

const ROLE_BADGE = {
  doctor:       { bg: "#1a274415", color: "#1a2744" },
  admin:        { bg: "#c9a96e20", color: "#b08a4e" },
  receptionist: { bg: "#c9a96e20", color: "#b08a4e" },
  staff:        { bg: "#d9770615", color: "#d97706" },
};

const PALETTE = ["#1a2744", "#6366f1", "#059669", "#c9a96e", "#d97706", "#be185d"];

function avatarColor(id) {
  if (!id) return PALETTE[0];
  const hash = [...id].reduce((a, c) => a + c.charCodeAt(0), 0);
  return PALETTE[hash % PALETTE.length];
}

// ─── edit modal ───────────────────────────────────────────────────────────────

function EditModal({ member, onClose, onSaved }) {
  const [phone,     setPhone]     = useState(member.phone     ?? "");
  const [specialty, setSpecialty] = useState(member.specialty ?? "");
  const [saving,    setSaving]    = useState(false);
  const [error,     setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const { error: rpcErr } = await supabase.rpc("admin_update_staff_member", {
        p_id:        member.id,
        p_phone:     phone     || null,
        p_specialty: specialty || null,
      });
      if (rpcErr) throw rpcErr;
      onSaved({ ...member, phone: phone || null, specialty: specialty || null });
    } catch (err) {
      setError(err.message ?? "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl" style={{ border: "1px solid #e5e0d8" }}>
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: "#f3f0ea" }}>
          <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Editar — {member.full_name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X size={16} style={{ color: "#9ca3af" }} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Especialidad / Cargo</label>
            <input
              type="text"
              value={specialty}
              onChange={e => setSpecialty(e.target.value)}
              placeholder="Ej: Implantología Basal, Ortodoncista…"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
              style={{ border: "1px solid #e5e0d8", color: "#374151" }}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "#374151" }}>Teléfono</label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+34 932 041 069"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none bg-white"
              style={{ border: "1px solid #e5e0d8", color: "#374151" }}
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
              <AlertCircle size={14} className="flex-shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #1a2744, #2a3a5c)", color: "white" }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              Guardar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-medium hover:bg-gray-50 transition-all"
              style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Equipo() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    supabase.rpc("get_staff_members")
      .then(({ data, error }) => {
        if (error) throw error;
        setMembers(data ?? []);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function handleSaved(updated) {
    setMembers(prev => prev.map(m => m.id === updated.id ? updated : m));
    setEditing(null);
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center justify-center min-h-64">
        <Loader2 size={28} className="animate-spin" style={{ color: "#c9a96e" }} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-2 text-sm px-4 py-3 rounded-xl" style={{ background: "#fef2f2", color: "#dc2626" }}>
          <AlertCircle size={16} />
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Equipo</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          Personal de Clínica Cotten · {members.length} miembro{members.length !== 1 ? "s" : ""}
        </p>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#9ca3af" }}>
          <p className="text-sm">No hay miembros del equipo registrados.</p>
          <p className="text-xs mt-1">Los usuarios con rol doctor, admin, receptionist o staff aparecerán aquí.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {members.map(member => {
            const badge    = ROLE_BADGE[member.role]  ?? { bg: "#f3f4f6", color: "#6b7280" };
            const initials = (member.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
            const color    = avatarColor(member.id);

            return (
              <div key={member.id} className="bg-white rounded-2xl p-6 relative group" style={{ border: "1px solid #e5e0d8" }}>
                {/* Edit button */}
                <button
                  onClick={() => setEditing(member)}
                  className="absolute top-4 right-4 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
                  title="Editar"
                >
                  <Pencil size={13} style={{ color: "#9ca3af" }} />
                </button>

                <div className="flex items-start gap-4 mb-4">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                    style={{ background: color }}
                  >
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate" style={{ color: "#1a2744" }}>{member.full_name ?? "—"}</p>
                    <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>{ROLE_LABEL[member.role] ?? member.role}</p>
                    {member.specialty && (
                      <p className="text-xs mt-0.5" style={{ color: "#6b7280" }}>{member.specialty}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  {member.email && (
                    <a href={`mailto:${member.email}`} className="flex items-center gap-2 text-xs hover:underline" style={{ color: "#6b7280" }}>
                      <Mail size={12} style={{ color: "#c9a96e" }} />
                      <span className="truncate">{member.email}</span>
                    </a>
                  )}
                  {member.phone ? (
                    <a href={`tel:${member.phone}`} className="flex items-center gap-2 text-xs" style={{ color: "#6b7280" }}>
                      <Phone size={12} style={{ color: "#c9a96e" }} />
                      {member.phone}
                    </a>
                  ) : (
                    <button
                      onClick={() => setEditing(member)}
                      className="flex items-center gap-2 text-xs hover:underline"
                      style={{ color: "#c9a96e" }}
                    >
                      <Phone size={12} style={{ color: "#c9a96e" }} />
                      Añadir teléfono
                    </button>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4" style={{ borderTop: "1px solid #f3f0ea" }}>
                  <div className="flex items-center gap-1.5">
                    <Shield size={12} style={{ color: "#9ca3af" }} />
                    <span className="text-xs" style={{ color: "#9ca3af" }}>Rol:</span>
                  </div>
                  <span className="text-xs px-3 py-1 rounded-full font-medium" style={{ background: badge.bg, color: badge.color }}>
                    {ROLE_LABEL[member.role] ?? member.role}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <EditModal
          member={editing}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
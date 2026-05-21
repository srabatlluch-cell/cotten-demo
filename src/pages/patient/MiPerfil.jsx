import { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, Heart, AlertTriangle, Users, Edit2, Check, X, Loader2 } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { supabase } from "../../lib/supabase";

async function fetchMyProfile() {
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw error;
  return data ?? null;
}

const Field = ({ label, value, icon: Icon }) => (
  <div>
    <p className="text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
      {Icon && <Icon size={11} />}
      {label}
    </p>
    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{value || "—"}</p>
  </div>
);

const EditField = ({ label, name, value, type = "text", onChange }) => (
  <div>
    <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>{label}</label>
    <input
      type={type}
      name={name}
      value={value ?? ""}
      onChange={onChange}
      className="w-full text-sm px-3 py-2 rounded-xl outline-none"
      style={{ border: "1px solid #e5e0d8", color: "#374151" }}
    />
  </div>
);

export default function MiPerfil() {
  const { user } = useAuth();
  const [profile,  setProfile]  = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [editing,  setEditing]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [saveErr,  setSaveErr]  = useState("");
  const [form,     setForm]     = useState({});

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const p = await fetchMyProfile();
        if (!cancelled) { setProfile(p); setForm(toForm(p)); }
      } catch (err) {
        console.error("[MiPerfil] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  function toForm(p) {
    if (!p) return {};
    return {
      full_name:         p.full_name         ?? "",
      phone:             p.phone             ?? "",
      address:           p.address           ?? "",
      birth_date:        p.birth_date        ?? "",
      blood_type:        p.blood_type        ?? "",
      allergies:         p.allergies         ?? "",
      emergency_contact: p.emergency_contact ?? "",
    };
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSave() {
    setSaveErr("");
    setSaving(true);
    try {
      const { error } = await supabase.rpc("update_my_profile", {
        p_full_name:         form.full_name,
        p_phone:             form.phone,
        p_address:           form.address,
        p_birth_date:        form.birth_date || null,
        p_blood_type:        form.blood_type,
        p_allergies:         form.allergies,
        p_emergency_contact: form.emergency_contact,
      });
      if (error) throw error;
      setProfile(prev => ({ ...prev, ...form }));
      setEditing(false);
    } catch (err) {
      console.error("[MiPerfil] save error:", err);
      setSaveErr(err.message ?? "Error al guardar. Inténtelo de nuevo.");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setForm(toForm(profile));
    setSaveErr("");
    setEditing(false);
  }

  if (loading) {
    return (
      <div className="p-6 lg:p-8 flex items-center gap-3" style={{ color: "#9ca3af" }}>
        <Loader2 size={18} className="animate-spin" />
        <span className="text-sm">Cargando perfil…</span>
      </div>
    );
  }

  const p = profile;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mi Perfil</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Sus datos personales y médicos registrados en Clínica Cotten</p>
        </div>
        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, #1a2744, #243256)", color: "white" }}
          >
            <Edit2 size={14} /> Editar
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm transition-all"
              style={{ border: "1px solid #e5e0d8", color: "#6b7280" }}
            >
              <X size={14} /> Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all hover:opacity-90 disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #c9a96e, #d9bc8a)", color: "#1a2744" }}
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Guardar
            </button>
          </div>
        )}
      </div>

      {saveErr && (
        <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{ background: "#fef2f2", color: "#dc2626" }}>
          {saveErr}
        </div>
      )}

      {/* Avatar card */}
      <div className="bg-white rounded-2xl p-6 mb-4 flex items-center gap-5" style={{ border: "1px solid #e5e0d8" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
          <User size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#1a2744" }}>{p?.full_name || user?.email}</h2>
          {p?.dni && <p className="text-sm" style={{ color: "#9ca3af" }}>DNI: {p.dni}</p>}
          {p?.treatment && <p className="text-sm mt-1" style={{ color: "#c9a96e" }}>{p.treatment}</p>}
        </div>
      </div>

      {/* Personal data */}
      <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: "1px solid #e5e0d8" }}>
        <h3 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{ color: "#c9a96e" }}>Datos personales</h3>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <EditField label="Nombre completo" name="full_name"  value={form.full_name}  onChange={handleChange} />
            <div>
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Correo electrónico</label>
              <p className="text-sm py-2" style={{ color: "#9ca3af" }}>{p?.email || user?.email} <span className="text-xs">(no editable)</span></p>
            </div>
            <EditField label="Teléfono"    name="phone"      value={form.phone}      onChange={handleChange} />
            <EditField label="Fecha de nacimiento" name="birth_date" value={form.birth_date} type="date" onChange={handleChange} />
            <EditField label="Dirección"   name="address"    value={form.address}    onChange={handleChange} />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Nombre completo"     value={p?.full_name}  icon={User} />
            <Field label="Correo electrónico"  value={p?.email || user?.email} icon={Mail} />
            <Field label="Teléfono"            value={p?.phone}      icon={Phone} />
            <Field label="Fecha de nacimiento" value={p?.birth_date ? new Date(p.birth_date + "T12:00").toLocaleDateString("es-ES") : null} />
            <Field label="Dirección"           value={p?.address}    icon={MapPin} />
          </div>
        )}
      </div>

      {/* Medical data */}
      <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: "1px solid #e5e0d8" }}>
        <h3 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{ color: "#c9a96e" }}>Datos médicos</h3>
        {editing ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <EditField label="Grupo sanguíneo"    name="blood_type" value={form.blood_type} onChange={handleChange} />
            <EditField label="Alergias conocidas" name="allergies"  value={form.allergies}  onChange={handleChange} />
            <div>
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Médico responsable</label>
              <p className="text-sm py-2" style={{ color: "#9ca3af" }}>{p?.doctor_name || "—"} <span className="text-xs">(asignado por la clínica)</span></p>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider mb-1.5 block" style={{ color: "#9ca3af" }}>Tratamiento actual</label>
              <p className="text-sm py-2" style={{ color: "#9ca3af" }}>{p?.treatment || "—"} <span className="text-xs">(asignado por la clínica)</span></p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Field label="Grupo sanguíneo"    value={p?.blood_type}  icon={Heart} />
            <Field label="Alergias conocidas" value={p?.allergies}   icon={AlertTriangle} />
            <Field label="Médico responsable" value={p?.doctor_name} icon={User} />
            <Field label="Tratamiento actual" value={p?.treatment} />
          </div>
        )}
      </div>

      {/* Emergency contact */}
      <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
        <h3 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{ color: "#c9a96e" }}>Contacto de emergencia</h3>
        {editing ? (
          <EditField label="Persona de contacto" name="emergency_contact" value={form.emergency_contact} onChange={handleChange} />
        ) : (
          <Field label="Persona de contacto" value={p?.emergency_contact} icon={Users} />
        )}
      </div>
    </div>
  );
}
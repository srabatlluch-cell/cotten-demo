import { User, Phone, Mail, MapPin, Heart, AlertTriangle, Users } from "lucide-react";
import { loggedPatient } from "../../data/mockData";

const Field = ({ label, value, icon: Icon }) => (
  <div>
    <p className="text-xs uppercase tracking-wider mb-1.5 flex items-center gap-1.5" style={{ color: "#9ca3af" }}>
      {Icon && <Icon size={11} />}
      {label}
    </p>
    <p className="text-sm font-medium" style={{ color: "#1a2744" }}>{value || "—"}</p>
  </div>
);

export default function MiPerfil() {
  const p = loggedPatient;

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mi Perfil</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Sus datos personales y médicos registrados en Clínica Cotten</p>
      </div>

      {/* Avatar card */}
      <div className="bg-white rounded-2xl p-6 mb-4 flex items-center gap-5" style={{ border: "1px solid #e5e0d8" }}>
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
          <User size={28} className="text-white" />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: "#1a2744" }}>{p.name}</h2>
          <p className="text-sm" style={{ color: "#9ca3af" }}>DNI: {p.dni}</p>
          <p className="text-sm mt-1" style={{ color: "#c9a96e" }}>{p.treatment}</p>
        </div>
      </div>

      {/* Personal data */}
      <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: "1px solid #e5e0d8" }}>
        <h3 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{ color: "#c9a96e" }}>Datos personales</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Nombre completo" value={p.name} icon={User} />
          <Field label="DNI/NIE" value={p.dni} />
          <Field label="Correo electrónico" value={p.email} icon={Mail} />
          <Field label="Teléfono" value={p.phone} icon={Phone} />
          <Field label="Fecha de nacimiento" value={new Date(p.birthdate).toLocaleDateString("es-ES")} />
          <Field label="Dirección" value={p.address} icon={MapPin} />
        </div>
      </div>

      {/* Medical data */}
      <div className="bg-white rounded-2xl p-6 mb-4" style={{ border: "1px solid #e5e0d8" }}>
        <h3 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{ color: "#c9a96e" }}>Datos médicos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Field label="Grupo sanguíneo" value={p.bloodType} icon={Heart} />
          <Field label="Alergias conocidas" value={p.allergies} icon={AlertTriangle} />
          <Field label="Médico responsable" value={p.doctor} icon={User} />
          <Field label="Tratamiento actual" value={p.treatment} />
        </div>
      </div>

      {/* Emergency contact */}
      <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
        <h3 className="text-xs uppercase tracking-widest font-semibold mb-5" style={{ color: "#c9a96e" }}>Contacto de emergencia</h3>
        <Field label="Persona de contacto" value={p.emergencyContact} icon={Users} />
      </div>
    </div>
  );
}

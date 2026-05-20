import { useState } from "react";
import { FileText, Image, Download, Eye, Search } from "lucide-react";
import { documents, patients } from "../../data/mockData";

export default function Documentos() {
  const [filterPatient, setFilterPatient] = useState("");
  const [filterType, setFilterType] = useState("");

  const getPatient = (id) => patients.find(p => p.id === id);

  const filtered = documents.filter(d => {
    const pt = getPatient(d.patientId);
    const matchPatient = !filterPatient || pt?.name.toLowerCase().includes(filterPatient.toLowerCase());
    const matchType = !filterType || d.type === filterType;
    return matchPatient && matchType;
  });

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Documentos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Gestión centralizada de documentos de todos los pacientes</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "#9ca3af" }} />
          <input
            type="text"
            placeholder="Buscar por paciente..."
            value={filterPatient}
            onChange={e => setFilterPatient(e.target.value)}
            className="pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none bg-white"
            style={{ border: "1px solid #e5e0d8" }}
          />
        </div>
        <select
          value={filterType}
          onChange={e => setFilterType(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none bg-white"
          style={{ border: "1px solid #e5e0d8", color: "#374151" }}
        >
          <option value="">Todos los tipos</option>
          <option value="PDF">PDF</option>
          <option value="Imagen">Imagen</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
        <div className="px-6 py-3 border-b text-xs uppercase tracking-wider" style={{ borderColor: "#f3f0ea", background: "#faf9f7" }}>
          <div className="grid grid-cols-12 gap-4" style={{ color: "#9ca3af" }}>
            <span className="col-span-4">Documento</span>
            <span className="col-span-3">Paciente</span>
            <span className="col-span-2">Categoría</span>
            <span className="col-span-1">Tipo</span>
            <span className="col-span-1">Tamaño</span>
            <span className="col-span-1"></span>
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
          {filtered.map(doc => {
            const pt = getPatient(doc.patientId);
            return (
              <div key={doc.id} className="grid grid-cols-12 gap-4 items-center px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: doc.type === "PDF" ? "#fff1e6" : "#e8f4fd" }}>
                    {doc.type === "PDF" ? <FileText size={14} style={{ color: "#f97316" }} /> : <Image size={14} style={{ color: "#3b82f6" }} />}
                  </div>
                  <p className="text-sm truncate" style={{ color: "#1a2744" }}>{doc.name}</p>
                </div>
                <div className="col-span-3">
                  <p className="text-sm" style={{ color: "#374151" }}>{pt?.name}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{doc.category}</p>
                </div>
                <div className="col-span-1">
                  <span className="text-xs px-2 py-1 rounded-full" style={{ background: doc.type === "PDF" ? "#fff1e6" : "#e8f4fd", color: doc.type === "PDF" ? "#f97316" : "#3b82f6" }}>
                    {doc.type}
                  </span>
                </div>
                <div className="col-span-1">
                  <p className="text-xs" style={{ color: "#9ca3af" }}>{doc.size}</p>
                </div>
                <div className="col-span-1 flex items-center gap-1 justify-end">
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                    <Eye size={14} />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                    <Download size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

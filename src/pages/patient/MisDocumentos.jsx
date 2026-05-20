import { useState, useRef } from "react";
import { FileText, Image, Download, Eye, Upload, CloudUpload } from "lucide-react";
import { documents } from "../../data/mockData";

export default function MisDocumentos() {
  const myDocs = documents.filter(d => d.patientId === 1);
  const [dragOver, setDragOver] = useState(false);
  const [uploaded, setUploaded] = useState([]);
  const fileRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const files = [...e.dataTransfer.files];
    const newDocs = files.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      type: f.type.includes("pdf") ? "PDF" : "Imagen",
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      date: new Date().toISOString().split("T")[0],
      new: true,
    }));
    setUploaded(prev => [...prev, ...newDocs]);
  };

  const handleFileInput = (e) => {
    const files = [...e.target.files];
    const newDocs = files.map((f, i) => ({
      id: Date.now() + i,
      name: f.name,
      type: f.type.includes("pdf") ? "PDF" : "Imagen",
      size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      date: new Date().toISOString().split("T")[0],
      new: true,
    }));
    setUploaded(prev => [...prev, ...newDocs]);
  };

  const allDocs = [...myDocs, ...uploaded];

  return (
    <div className="p-6 lg:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Mis Documentos</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Radiografías, historiales, presupuestos y consentimientos</p>
      </div>

      {/* Documents table */}
      <div className="bg-white rounded-2xl overflow-hidden mb-6" style={{ border: "1px solid #e5e0d8" }}>
        <div className="px-6 py-4 border-b" style={{ borderColor: "#f3f0ea" }}>
          <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Todos los documentos ({allDocs.length})</h2>
        </div>
        <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
          {allDocs.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: doc.type === "PDF" ? "#fff1e6" : "#e8f4fd" }}>
                {doc.type === "PDF"
                  ? <FileText size={16} style={{ color: "#f97316" }} />
                  : <Image size={16} style={{ color: "#3b82f6" }} />
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>
                  {doc.name}
                  {doc.new && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "#e8f5e9", color: "#2e7d32" }}>Nuevo</span>}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>
                  {doc.category || "Subido"} · {doc.size} · {new Date(doc.date).toLocaleDateString("es-ES")}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full flex-shrink-0" style={{ background: doc.type === "PDF" ? "#fff1e6" : "#e8f4fd", color: doc.type === "PDF" ? "#f97316" : "#3b82f6" }}>
                {doc.type}
              </span>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                  <Eye size={15} />
                </button>
                <button className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                  <Download size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upload area */}
      <div
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current.click()}
        className="rounded-2xl p-10 text-center cursor-pointer transition-all duration-200"
        style={{
          border: `2px dashed ${dragOver ? "#c9a96e" : "#d1cbbf"}`,
          background: dragOver ? "#c9a96e08" : "white",
        }}
      >
        <input ref={fileRef} type="file" multiple className="hidden" onChange={handleFileInput} />
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #c9a96e18, #c9a96e25)" }}>
          <CloudUpload size={24} style={{ color: "#c9a96e" }} />
        </div>
        <p className="font-medium text-sm mb-1" style={{ color: "#1a2744" }}>
          {dragOver ? "Suelte aquí para subir" : "Arrastre archivos aquí o haga clic"}
        </p>
        <p className="text-xs" style={{ color: "#9ca3af" }}>PDF, JPG, PNG hasta 50 MB</p>
      </div>
    </div>
  );
}

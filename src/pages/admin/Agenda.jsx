import { appointments, patients } from "../../data/mockData";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";

const doctorColors = {
  "Dr. Philippe Cotten": { bg: "#1a2744", light: "#1a274415", text: "white" },
  "Dra. Martínez": { bg: "#6366f1", light: "#6366f115", text: "white" },
  "Dr. Ruiz": { bg: "#059669", light: "#05966915", text: "white" },
};

function getWeekDays(startDate) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function Agenda() {
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date("2026-05-18");
    return d;
  });

  const days = getWeekDays(weekStart);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const getApptForDay = (date) => {
    const dateStr = date.toISOString().split("T")[0];
    return appointments.filter(a => a.date === dateStr);
  };

  const getPatient = (id) => patients.find(p => p.id === id);

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Agenda</h1>
          <p className="text-sm mt-1" style={{ color: "#6b7280" }}>Vista semanal de citas</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs flex-wrap">
            {Object.entries(doctorColors).map(([name, c]) => (
              <span key={name} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full" style={{ background: c.light, color: c.bg }}>
                <span className="w-2 h-2 rounded-full" style={{ background: c.bg }} />
                {name.split(" ").slice(0, 2).join(" ")}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Week nav */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={prevWeek} className="p-2 rounded-xl hover:bg-white transition-colors" style={{ border: "1px solid #e5e0d8" }}>
          <ChevronLeft size={16} style={{ color: "#6b7280" }} />
        </button>
        <span className="text-sm font-medium" style={{ color: "#1a2744" }}>
          {days[0].toLocaleDateString("es-ES", { day: "2-digit", month: "long" })} – {days[6].toLocaleDateString("es-ES", { day: "2-digit", month: "long", year: "numeric" })}
        </span>
        <button onClick={nextWeek} className="p-2 rounded-xl hover:bg-white transition-colors" style={{ border: "1px solid #e5e0d8" }}>
          <ChevronRight size={16} style={{ color: "#6b7280" }} />
        </button>
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-3">
        {days.map(day => {
          const dayAppts = getApptForDay(day);
          const isToday = day.toISOString().split("T")[0] === "2026-05-20";
          const dayName = day.toLocaleDateString("es-ES", { weekday: "short" });
          const dayNum = day.getDate();

          return (
            <div key={day.toISOString()} className="min-h-40">
              <div className={`text-center py-2.5 px-1 rounded-xl mb-2 ${isToday ? "text-white" : ""}`} style={isToday ? { background: "linear-gradient(135deg, #c9a96e, #d9bc8a)" } : {}}>
                <p className="text-xs uppercase font-medium" style={{ color: isToday ? "rgba(255,255,255,0.8)" : "#9ca3af" }}>{dayName}</p>
                <p className="text-lg font-bold leading-tight" style={{ color: isToday ? "white" : "#1a2744" }}>{dayNum}</p>
              </div>
              <div className="space-y-1.5">
                {dayAppts.sort((a, b) => a.time.localeCompare(b.time)).map(appt => {
                  const dc = doctorColors[appt.doctor] || { bg: "#9ca3af", light: "#9ca3af20", text: "white" };
                  const pt = getPatient(appt.patientId);
                  return (
                    <div key={appt.id} className="rounded-lg p-2 text-xs" style={{ background: dc.light, borderLeft: `3px solid ${dc.bg}` }}>
                      <p className="font-semibold" style={{ color: dc.bg }}>{appt.time}</p>
                      <p className="truncate mt-0.5" style={{ color: "#374151" }}>{pt?.name.split(" ")[0]}</p>
                      <p className="truncate" style={{ color: "#9ca3af" }}>{appt.treatment.split(" ").slice(0, 3).join(" ")}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

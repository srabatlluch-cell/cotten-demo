import { useState, useEffect } from "react";
import { Users, Calendar, CreditCard, PenLine, ChevronRight, Loader2, AlertTriangle, AlertCircle, Check, X } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "../../lib/supabase";
import { apptStatus, patientStatus } from "../../lib/statusStyles";
import { sendAppointmentCancellation } from "../../lib/email";

async function loadPanel() {
  const [statsRes, todayRes, recentRes] = await Promise.all([
    supabase.rpc("get_dashboard_stats"),
    supabase.rpc("get_today_appointments"),
    supabase.rpc("get_recent_patients"),
  ]);
  if (statsRes.error)  throw statsRes.error;
  if (todayRes.error)  throw todayRes.error;
  if (recentRes.error) throw recentRes.error;
  // get_dashboard_stats returns one row as an array
  const statsRow = Array.isArray(statsRes.data) ? statsRes.data[0] : statsRes.data;
  return {
    stats:  statsRow    ?? {},
    today:  todayRes.data  ?? [],
    recent: recentRes.data ?? [],
  };
}

// ─── chart helpers ────────────────────────────────────────────────────────────

function ChartEmpty({ message = "Sin datos disponibles" }) {
  return (
    <div className="flex items-center justify-center py-10">
      <p className="text-xs" style={{ color: "#c4bdb0" }}>{message}</p>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="flex items-center justify-center py-10">
      <Loader2 size={16} className="animate-spin" style={{ color: "#d9d3ca" }} />
    </div>
  );
}

// SVG chart viewport constants — viewBox "0 0 380 160"
// inner drawing area: x[36..368] y[20..124]
const _W = 380, _H = 160, _PL = 36, _PR = 12, _PT = 20, _PB = 36;
const _IW = _W - _PL - _PR;   // 332
const _IH = _H - _PT - _PB;   // 104

// ─── Bar chart ───────────────────────────────────────────────────────────────

function BarChart({ data }) {
  if (!data?.length) return <ChartEmpty />;
  const max = Math.max(...data.map(d => d.value), 1);
  const slotW = _IW / data.length;
  const bw = Math.max(slotW * 0.52, 6);

  return (
    <svg viewBox={`0 0 ${_W} ${_H}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="__bcGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#c9a96e" />
          <stop offset="100%" stopColor="#c9a96e" stopOpacity="0.4" />
        </linearGradient>
      </defs>

      {/* horizontal guide lines + Y labels */}
      {[0, 0.5, 1].map(t => {
        const gy = _PT + _IH * (1 - t);
        return (
          <g key={t}>
            <line x1={_PL} y1={gy} x2={_W - _PR} y2={gy}
              stroke={t === 0 ? "#e5e0d8" : "#f3f0ea"} strokeWidth={1} />
            <text x={_PL - 5} y={gy + 3.5} textAnchor="end" fontSize={9} fill="#c4bdb0">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}

      {/* bars + X labels */}
      {data.map((d, i) => {
        const bh = Math.max((d.value / max) * _IH, d.value > 0 ? 4 : 0);
        const sx = _PL + i * slotW;
        const bx = sx + (slotW - bw) / 2;
        const by = _PT + _IH - bh;
        return (
          <g key={i}>
            <rect x={bx} y={bh > 0 ? by : _PT + _IH - 2} width={bw}
              height={bh > 0 ? bh : 2} rx={4}
              fill={bh > 0 ? "url(#__bcGrad)" : "#f3f0ea"} />
            {d.value > 0 && (
              <text x={bx + bw / 2} y={by - 5} textAnchor="middle"
                fontSize={9} fill="#c9a96e" fontWeight="700">{d.value}</text>
            )}
            <text x={sx + slotW / 2} y={_H - 4} textAnchor="middle"
              fontSize={9} fill="#b0a898">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Area / line chart ────────────────────────────────────────────────────────

function AreaChart({ data }) {
  if (!data?.length) return <ChartEmpty />;
  const color = "#1a2744";
  const max = Math.max(...data.map(d => d.value), 1);
  const n = data.length;

  const pts = data.map((d, i) => ({
    x: _PL + (n < 2 ? _IW / 2 : (i / (n - 1)) * _IW),
    y: _PT + _IH - (d.value / max) * _IH,
    v: d.value,
    l: d.label,
  }));

  // Smooth cubic bezier — control points at horizontal midpoints
  const lineSeg = pts.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    const prev = pts[i - 1];
    const mx = ((prev.x + p.x) / 2).toFixed(1);
    return `${acc} C ${mx} ${prev.y.toFixed(1)} ${mx} ${p.y.toFixed(1)} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, "");

  const base = _PT + _IH;
  const areaPath = n > 1
    ? `${lineSeg} L ${pts[n - 1].x.toFixed(1)} ${base} L ${pts[0].x.toFixed(1)} ${base} Z`
    : "";

  return (
    <svg viewBox={`0 0 ${_W} ${_H}`} className="w-full" style={{ overflow: "visible" }}>
      <defs>
        <linearGradient id="__acGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={color} stopOpacity="0.1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* guide lines + Y labels */}
      {[0, 0.5, 1].map(t => {
        const gy = _PT + _IH * (1 - t);
        return (
          <g key={t}>
            <line x1={_PL} y1={gy} x2={_W - _PR} y2={gy}
              stroke={t === 0 ? "#e5e0d8" : "#f3f0ea"} strokeWidth={1} />
            <text x={_PL - 5} y={gy + 3.5} textAnchor="end" fontSize={9} fill="#c4bdb0">
              {Math.round(max * t)}
            </text>
          </g>
        );
      })}

      {/* area fill + line */}
      {n > 1 && <path d={areaPath} fill="url(#__acGrad)" />}
      {n > 1 && (
        <path d={lineSeg} fill="none" stroke={color} strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round" />
      )}

      {/* data points + labels */}
      {pts.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={3.5} fill="white" stroke={color} strokeWidth={2} />
          {p.v > 0 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle"
              fontSize={9} fill={color} fontWeight="700">{p.v}</text>
          )}
          <text x={p.x} y={_H - 4} textAnchor="middle" fontSize={9} fill="#b0a898">{p.l}</text>
        </g>
      ))}
    </svg>
  );
}

// ─── Donut chart ──────────────────────────────────────────────────────────────

function DonutChart({ segments, totalAmount }) {
  const total = segments.reduce((s, d) => s + d.value, 0);
  if (total === 0) return <ChartEmpty message="Sin pagos registrados" />;

  const CX = 72, CY = 76, OR = 54, IR = 32;
  const GAP = 0.05;
  let angle = -Math.PI / 2;

  const arcs = segments.filter(s => s.value > 0).map(seg => {
    const sweep = (seg.value / total) * 2 * Math.PI - GAP;
    const sa = angle + GAP / 2;
    const ea = sa + Math.max(sweep, 0.001);
    const lg = sweep > Math.PI ? 1 : 0;
    const [c1, s1] = [Math.cos(sa), Math.sin(sa)];
    const [c2, s2] = [Math.cos(ea), Math.sin(ea)];
    const path = [
      `M ${(CX + OR * c1).toFixed(2)} ${(CY + OR * s1).toFixed(2)}`,
      `A ${OR} ${OR} 0 ${lg} 1 ${(CX + OR * c2).toFixed(2)} ${(CY + OR * s2).toFixed(2)}`,
      `L ${(CX + IR * c2).toFixed(2)} ${(CY + IR * s2).toFixed(2)}`,
      `A ${IR} ${IR} 0 ${lg} 0 ${(CX + IR * c1).toFixed(2)} ${(CY + IR * s1).toFixed(2)}`,
      "Z",
    ].join(" ");
    angle += (seg.value / total) * 2 * Math.PI;
    return { ...seg, path };
  });

  return (
    <div className="flex items-center gap-5">
      {/* donut */}
      <svg viewBox="0 0 148 152" style={{ width: 124, flexShrink: 0 }}>
        {arcs.map((a, i) => <path key={i} d={a.path} fill={a.color} />)}
        <text x={CX} y={CY - 5} textAnchor="middle" fontSize={20} fontWeight="800" fill="#1a2744">{total}</text>
        <text x={CX} y={CY + 11} textAnchor="middle" fontSize={8.5} fill="#9ca3af">pagos totales</text>
      </svg>

      {/* legend + progress bars */}
      <div className="flex flex-col gap-3.5 flex-1 min-w-0">
        {segments.map((s, i) => {
          const pct = Math.round((s.value / total) * 100);
          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
                  <span className="text-xs" style={{ color: "#374151" }}>{s.label}</span>
                </div>
                <span className="text-xs" style={{ color: "#1a2744" }}>
                  <strong>{s.value}</strong>
                  <span style={{ color: "#9ca3af", fontWeight: 400 }}> ({pct}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "#f3f0ea" }}>
                <div className="h-full rounded-full" style={{ width: `${pct}%`, background: s.color }} />
              </div>
            </div>
          );
        })}
        {totalAmount > 0 && (
          <div className="pt-2.5 border-t" style={{ borderColor: "#f3f0ea" }}>
            <div className="flex items-baseline justify-between">
              <span className="text-xs" style={{ color: "#9ca3af" }}>Total facturado</span>
              <span className="text-xs font-bold" style={{ color: "#1a2744" }}>
                {totalAmount.toLocaleString("es-ES")} €
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function Panel() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [confirming,    setConfirming]    = useState(null); // id being confirmed
  const [cancelPending, setCancelPending] = useState(null); // id waiting 2nd-click to cancel
  const [canceling,     setCanceling]     = useState(null); // id being cancelled

  async function handleConfirm(apptId) {
    setConfirming(apptId);
    try {
      const { error } = await supabase.rpc("admin_confirm_appointment", {
        p_appointment_id: apptId,
      });
      if (error) throw error;
      // Optimistic update — change status in local state without refetch
      setData(prev => ({
        ...prev,
        today: prev.today.map(a =>
          a.id === apptId ? { ...a, appt_status: "confirmed" } : a
        ),
        stats: {
          ...prev.stats,
          unconfirmed_appointments: Math.max(0, (prev.stats.unconfirmed_appointments ?? 1) - 1),
        },
      }));
    } catch (err) {
      console.error("[Panel] confirm appointment error:", err);
    } finally {
      setConfirming(null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const d = await loadPanel();
        if (!cancelled) setData(d);
      } catch (err) {
        console.error("[Panel] load error:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── chart data (loads independently so KPI cards are not blocked) ───────────
  const [chartData,     setChartData]     = useState(null);
  const [chartsLoading, setChartsLoading] = useState(true);

  useEffect(() => {
    let skip = false;
    (async () => {
      setChartsLoading(true);
      try {
        const [apptRes, patRes, payRes] = await Promise.all([
          supabase.rpc("get_monthly_appointments", { p_months: 6 }),
          supabase.rpc("get_monthly_new_patients",  { p_months: 6 }),
          supabase.rpc("get_payment_distribution"),
        ]);
        if (!skip) setChartData({
          appointments: apptRes.data ?? [],
          patients:     patRes.data  ?? [],
          payments:     payRes.data  ?? [],
        });
      } catch (err) {
        console.error("[Panel] charts error:", err);
      } finally {
        if (!skip) setChartsLoading(false);
      }
    })();
    return () => { skip = true; };
  }, []);

  async function handleCancelAppt(appt) {
    setCancelPending(null);
    setCanceling(appt.id);
    try {
      const { error } = await supabase.rpc("admin_cancel_appointment", {
        p_appointment_id: appt.id,
      });
      if (error) throw error;

      setData(prev => ({
        ...prev,
        today: prev.today.map(a =>
          a.id === appt.id ? { ...a, appt_status: "cancelled" } : a
        ),
        stats: {
          ...prev.stats,
          unconfirmed_appointments: appt.appt_status === "scheduled"
            ? Math.max(0, (prev.stats.unconfirmed_appointments ?? 1) - 1)
            : prev.stats.unconfirmed_appointments,
        },
      }));

      // Send cancellation email (best-effort)
      if (appt.patient_email) {
        const [y, mo, d] = (appt.date ?? "").split("-").map(Number);
        const dateStr = new Date(y, mo - 1, d).toLocaleDateString("es-ES", {
          weekday: "long", day: "2-digit", month: "long", year: "numeric",
        });
        sendAppointmentCancellation({
          to:          appt.patient_email,
          patientName: appt.patient_name ?? "",
          date:        dateStr,
          time:        (appt.appointment_time ?? "").slice(0, 5) + "h",
          treatment:   appt.treatment ?? "—",
        }).catch(err => console.warn("[Panel] cancellation email error:", err));
      }
    } catch (err) {
      console.error("[Panel] cancel appointment error:", err);
    } finally {
      setCanceling(null);
    }
  }

  // ── chart data transforms ────────────────────────────────────────────────────
  function monthLabel(ds) {
    if (!ds) return "";
    return new Date(ds + "T12:00")
      .toLocaleDateString("es-ES", { month: "short" })
      .replace(".", "")
      .toUpperCase()
      .slice(0, 3);
  }

  const monthlyAppts = (chartData?.appointments ?? []).map(r => ({
    label: monthLabel(r.month_date),
    value: Number(r.total),
  }));

  const monthlyPatients = (chartData?.patients ?? []).map(r => ({
    label: monthLabel(r.month_date),
    value: Number(r.total),
  }));

  const PAY_META = {
    paid:    { label: "Cobrado",   color: "#059669" },
    pending: { label: "Pendiente", color: "#d97706" },
    overdue: { label: "Vencido",   color: "#dc2626" },
  };
  const payDist = chartData?.payments ?? [];
  const paySegments = ["paid", "pending", "overdue"].map(st => ({
    label:  PAY_META[st].label,
    color:  PAY_META[st].color,
    value:  Number(payDist.find(r => r.pay_status === st)?.total_count  ?? 0),
    amount: Number(payDist.find(r => r.pay_status === st)?.total_amount ?? 0),
  }));
  const totalPayAmount = paySegments.reduce((s, seg) => s + seg.amount, 0);

  const stats  = data?.stats  ?? {};
  const today  = data?.today  ?? [];
  const recent = data?.recent ?? [];

  // ── stat cards ──────────────────────────────────────────────────────────────
  const statCards = [
    {
      label: "Total pacientes",
      value: loading ? "…" : stats.total_patients ?? 0,
      icon:  Users,
      color: "#1a2744", bg: "#1a274412",
      link:  "/admin/pacientes",
    },
    {
      label: "Citas hoy",
      value: loading ? "…" : stats.appointments_today ?? 0,
      icon:  Calendar,
      color: "#2563eb", bg: "#2563eb12",
      link:  "/admin/agenda",
    },
    {
      label: "Pagos pendientes",
      value: loading ? "…" : `${Number(stats.pending_payments ?? 0).toLocaleString("es-ES")} €`,
      icon:  CreditCard,
      color: "#d97706", bg: "#d9770612",
      link:  "/admin/pagos",
    },
    {
      label: "Firmas pendientes",
      value: loading ? "…" : stats.pending_signatures ?? 0,
      icon:  PenLine,
      color: "#dc2626", bg: "#dc262612",
      link:  "/admin/firmas",
    },
  ];

  // ── alert cards (only shown when data is loaded and condition is met) ───────
  const alerts = !loading && data ? [
    stats.overdue_payments > 0 && {
      id:      "overdue",
      level:   "red",
      icon:    AlertCircle,
      message: `${stats.overdue_payments} pago${stats.overdue_payments !== 1 ? "s" : ""} vencido${stats.overdue_payments !== 1 ? "s" : ""} sin abonar`,
      link:    "/admin/pagos",
      cta:     "Ver pagos",
    },
    stats.unconfirmed_appointments > 0 && {
      id:      "unconfirmed",
      level:   "amber",
      icon:    AlertTriangle,
      message: `${stats.unconfirmed_appointments} cita${stats.unconfirmed_appointments !== 1 ? "s" : ""} de hoy sin confirmar`,
      link:    "/admin/agenda",
      cta:     "Ver agenda",
    },
    stats.old_pending_signatures > 0 && {
      id:      "old-signatures",
      level:   "amber",
      icon:    AlertTriangle,
      message: `${stats.old_pending_signatures} consentimiento${stats.old_pending_signatures !== 1 ? "s" : ""} pendiente${stats.old_pending_signatures !== 1 ? "s" : ""} de firma desde hace más de 3 días`,
      link:    "/admin/firmas",
      cta:     "Ver firmas",
    },
  ].filter(Boolean) : [];

  const alertStyles = {
    red:   { wrap: { background: "#fef2f2", border: "1px solid #fecaca" }, icon: "#dc2626", text: "#991b1b", cta: { color: "#dc2626" } },
    amber: { wrap: { background: "#fffbeb", border: "1px solid #fde68a" }, icon: "#d97706", text: "#92400e", cta: { color: "#d97706" } },
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold" style={{ color: "#1a2744" }}>Panel de Control</h1>
        <p className="text-sm mt-1" style={{ color: "#6b7280" }}>
          Resumen del día — {new Date().toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, icon: Icon, color, bg, link }) => (
          <Link key={label} to={link} className="bg-white p-5 rounded-2xl hover:shadow-md transition-all group" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: bg }}>
                <Icon size={18} style={{ color }} />
              </div>
              <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-bold" style={{ color: "#1a2744" }}>{value}</p>
            <p className="text-xs mt-1" style={{ color: "#9ca3af" }}>{label}</p>
          </Link>
        ))}
      </div>

      {/* ── Alert cards ─────────────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <div className="space-y-3 mb-8">
          {alerts.map(({ id, level, icon: Icon, message, link, cta }) => {
            const s = alertStyles[level];
            return (
              <div key={id} className="flex items-center gap-4 px-5 py-3.5 rounded-2xl" style={s.wrap}>
                <Icon size={16} style={{ color: s.icon, flexShrink: 0 }} />
                <p className="flex-1 text-sm font-medium" style={{ color: s.text }}>{message}</p>
                <Link to={link} className="text-xs font-semibold hover:underline flex-shrink-0" style={s.cta}>
                  {cta} <ChevronRight size={11} className="inline" />
                </Link>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Today's agenda ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: "#f3f0ea" }}>
            <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Agenda de hoy</h2>
            <Link to="/admin/agenda" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
              Ver agenda <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: "#9ca3af" }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Cargando…</span>
              </div>
            ) : today.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay citas programadas hoy</p>
            ) : (
              today.map(a => {
                const sc = apptStatus(a.appt_status);
                return (
                  <div key={a.id} className="flex items-center gap-4 px-6 py-4" style={sc.card}>
                    {/* Time */}
                    <div className="w-12 text-right flex-shrink-0">
                      <p className="text-sm font-semibold" style={{ color: "#1a2744", textDecoration: sc.strike ? "line-through" : "none" }}>
                        {String(a.appointment_time).slice(0, 5)}
                      </p>
                    </div>
                    {/* Status-colored divider */}
                    <div className="w-px h-8 flex-shrink-0 rounded-full" style={{ background: sc.borderColor }} />
                    {/* Patient + treatment */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{a.patient_name}</p>
                      <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{a.treatment}</p>
                    </div>
                    {/* Doctor / room */}
                    <div className="text-right flex-shrink-0 hidden sm:block">
                      {a.doctor_name && <p className="text-xs" style={{ color: "#6b7280" }}>{a.doctor_name.split(" ").slice(-1)[0]}</p>}
                      {a.room        && <p className="text-xs" style={{ color: "#9ca3af" }}>{a.room}</p>}
                    </div>
                    {/* Action buttons — only for active appointments */}
                    {(a.appt_status === "scheduled" || a.appt_status === "confirmed") && (
                      <div className="flex items-center gap-1 flex-shrink-0">

                        {/* Confirm — only for scheduled */}
                        {a.appt_status === "scheduled" && (
                          <button
                            onClick={() => { setCancelPending(null); handleConfirm(a.id); }}
                            disabled={confirming === a.id || canceling === a.id}
                            title="Confirmar cita"
                            className="flex items-center justify-center rounded-lg transition-all"
                            style={{
                              width: 28, height: 28,
                              background: "#f0fdf4",
                              border: "1px solid #bbf7d0",
                              color: "#16a34a",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#dcfce7"}
                            onMouseLeave={e => e.currentTarget.style.background = "#f0fdf4"}
                          >
                            {confirming === a.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : <Check size={13} />}
                          </button>
                        )}

                        {/* Cancel — inline two-click confirmation */}
                        {cancelPending === a.id ? (
                          <div className="flex items-center gap-1">
                            <span style={{ fontSize: "0.68rem", color: "#dc2626", whiteSpace: "nowrap" }}>¿Cancelar?</span>
                            <button
                              onClick={() => handleCancelAppt(a)}
                              disabled={canceling === a.id}
                              className="flex items-center justify-center rounded-lg transition-all"
                              style={{ width: 28, height: 28, background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626" }}
                            >
                              {canceling === a.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                            </button>
                            <button
                              onClick={() => setCancelPending(null)}
                              className="flex items-center justify-center rounded-lg transition-all"
                              style={{ width: 28, height: 28, background: "#f9fafb", border: "1px solid #e5e0d8", color: "#9ca3af" }}
                            >
                              <X size={13} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setCancelPending(a.id)}
                            disabled={canceling === a.id || confirming === a.id}
                            title="Cancelar cita"
                            className="flex items-center justify-center rounded-lg transition-all"
                            style={{
                              width: 28, height: 28,
                              background: "#fff5f5",
                              border: "1px solid #fecaca",
                              color: "#dc2626",
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = "#fef2f2"}
                            onMouseLeave={e => e.currentTarget.style.background = "#fff5f5"}
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )}

                    {/* Status badge */}
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0" style={sc.badge}>
                      {sc.icon} {sc.label}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Recent patients ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1px solid #e5e0d8" }}>
          <div className="px-6 py-4 flex items-center justify-between border-b" style={{ borderColor: "#f3f0ea" }}>
            <h2 className="font-semibold text-sm" style={{ color: "#1a2744" }}>Pacientes recientes</h2>
            <Link to="/admin/pacientes" className="text-xs flex items-center gap-1 hover:underline" style={{ color: "#c9a96e" }}>
              Ver todos <ChevronRight size={12} />
            </Link>
          </div>
          <div className="divide-y" style={{ borderColor: "#f3f0ea" }}>
            {loading ? (
              <div className="flex items-center justify-center py-10 gap-2" style={{ color: "#9ca3af" }}>
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Cargando…</span>
              </div>
            ) : recent.length === 0 ? (
              <p className="px-6 py-8 text-sm text-center" style={{ color: "#9ca3af" }}>No hay pacientes registrados</p>
            ) : (
              recent.map(p => {
                const initials = (p.full_name || "?").split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
                const sc = patientStatus(p.patient_status);
                return (
                  <Link key={p.patient_id} to={`/admin/pacientes/${p.patient_id}`} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-semibold" style={{ background: "linear-gradient(135deg, #1a2744, #243256)" }}>
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: "#1a2744" }}>{p.full_name}</p>
                      <p className="text-xs truncate" style={{ color: "#9ca3af" }}>{p.treatment || "Sin tratamiento"}</p>
                    </div>
                    <span className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0" style={sc.badge}>
                      {sc.icon} {sc.label}
                    </span>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ── Statistics section ───────────────────────────────────────────────── */}
      <div className="mt-10">

        <div className="mb-6 pb-4 border-b" style={{ borderColor: "#e5e0d8" }}>
          <h2 className="text-base font-semibold" style={{ color: "#1a2744" }}>Estadísticas</h2>
          <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Actividad de los últimos 6 meses</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Citas completadas — bar chart */}
          <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>Citas completadas</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Excluye canceladas y no presentados</p>
              </div>
              {!chartsLoading && (
                <span className="text-xl font-bold tabular-nums" style={{ color: "#c9a96e" }}>
                  {monthlyAppts.reduce((s, d) => s + d.value, 0)}
                </span>
              )}
            </div>
            {chartsLoading ? <ChartSkeleton /> : <BarChart data={monthlyAppts} />}
          </div>

          {/* Nuevos pacientes — area chart */}
          <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
            <div className="flex items-start justify-between mb-5">
              <div>
                <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>Nuevos pacientes</p>
                <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Registros mensuales en la clínica</p>
              </div>
              {!chartsLoading && (
                <span className="text-xl font-bold tabular-nums" style={{ color: "#1a2744" }}>
                  {monthlyPatients.reduce((s, d) => s + d.value, 0)}
                </span>
              )}
            </div>
            {chartsLoading ? <ChartSkeleton /> : <AreaChart data={monthlyPatients} />}
          </div>

          {/* Estado de pagos — donut chart */}
          <div className="bg-white rounded-2xl p-6" style={{ border: "1px solid #e5e0d8" }}>
            <div className="mb-5">
              <p className="text-sm font-semibold" style={{ color: "#1a2744" }}>Estado de pagos</p>
              <p className="text-xs mt-0.5" style={{ color: "#9ca3af" }}>Distribución por estado actual</p>
            </div>
            {chartsLoading
              ? <ChartSkeleton />
              : <DonutChart segments={paySegments} totalAmount={totalPayAmount} />}
          </div>

        </div>
      </div>
    </div>
  );
}
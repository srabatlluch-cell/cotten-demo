// Shared status helpers — use inline style objects (purge-safe)

export function apptStatus(status) {
  switch (status) {
    case "confirmed":
      return {
        label: "Confirmada",    icon: "✓",
        badge:       { background: "#dcfce7", color: "#15803d" },
        borderColor: "#22c55e",
        card:        {},
        dim: false, strike: false,
      };
    case "scheduled":
      return {
        label: "Programada",   icon: "⏰",
        badge:       { background: "#fef3c7", color: "#b45309" },
        borderColor: "#f59e0b",
        card:        {},
        dim: false, strike: false,
      };
    case "completed":
      return {
        label: "Completada",   icon: "✓",
        badge:       { background: "#f3f4f6", color: "#6b7280" },
        borderColor: "#9ca3af",
        card:        { opacity: 0.55 },
        dim: true, strike: false,
      };
    case "cancelled":
      return {
        label: "Cancelada",    icon: "✕",
        badge:       { background: "#fee2e2", color: "#dc2626" },
        borderColor: "#ef4444",
        card:        { opacity: 0.6 },
        dim: true, strike: true,
      };
    case "no_show":
      return {
        label: "No presentado", icon: "⚠",
        badge:       { background: "#fff7ed", color: "#c2410c" },
        borderColor: "#f97316",
        card:        { opacity: 0.6 },
        dim: true, strike: false,
      };
    default:
      return {
        label: "Programada",   icon: "⏰",
        badge:       { background: "#fef3c7", color: "#b45309" },
        borderColor: "#f59e0b",
        card:        {},
        dim: false, strike: false,
      };
  }
}

export function patientStatus(status) {
  switch (status) {
    case "active":
      return {
        label: "En tratamiento", icon: "🏥",
        badge: { background: "#dbeafe", color: "#1d4ed8" },
      };
    case "inactive":
      return {
        label: "Pendiente",      icon: "⏳",
        badge: { background: "#f3f4f6", color: "#6b7280" },
      };
    case "discharged":
      return {
        label: "Alta médica",    icon: "✓",
        badge: { background: "#dcfce7", color: "#15803d" },
      };
    default:
      return {
        label: status ?? "—",   icon: "",
        badge: { background: "#f3f4f6", color: "#6b7280" },
      };
  }
}

export function paymentStatus(status) {
  switch (status) {
    case "paid":
      return {
        label: "Pagado",    icon: "✓",
        badge: { background: "#dcfce7", color: "#15803d" },
      };
    case "pending":
      return {
        label: "Pendiente", icon: "⏳",
        badge: { background: "#fef3c7", color: "#b45309" },
      };
    case "overdue":
      return {
        label: "Vencido",   icon: "⚠",
        badge: { background: "#fee2e2", color: "#dc2626" },
      };
    case "cancelled":
      return {
        label: "Cancelado", icon: "✕",
        badge: { background: "#f3f4f6", color: "#6b7280" },
      };
    default:
      return {
        label: status ?? "—", icon: "⏳",
        badge: { background: "#fef3c7", color: "#b45309" },
      };
  }
}

export function consentWaitStyle(daysWaiting) {
  if (daysWaiting > 7) return { background: "#fee2e2", color: "#dc2626" };
  if (daysWaiting > 3) return { background: "#fff7ed", color: "#c2410c" };
  return { background: "#fef3c7", color: "#b45309" };
}
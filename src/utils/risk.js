const LEVELS = ["critical", "high", "moderate", "low"];

export function getRiskColor(level) {
  return (
    {
      critical: { bg: "rgb(127, 29, 29)", pulse: "rgba(127, 29, 29, 0.4)" },
      high: { bg: "rgb(239, 68, 68)", pulse: "rgba(239, 68, 68, 0.4)" },
      moderate: { bg: "rgb(245, 158, 11)", pulse: "rgba(245, 158, 11, 0.4)" },
      low: { bg: "rgb(34, 197, 94)", pulse: "rgba(34, 197, 94, 0.4)" },
    }[level] || { bg: "rgb(34, 197, 94)", pulse: "rgba(34, 197, 94, 0.4)" }
  );
}

export function getRiskLabel(level) {
  return (
    {
      critical: "CRÍTICO",
      high: "ALTO RISCO",
      moderate: "MODERADO",
      low: "BAIXO RISCO",
    }[level] || level
  );
}

/** Sufixo de classe CSS alinhado ao fallback visual de `getRiskColor` */
export function riskLevelToCssSuffix(level) {
  return LEVELS.includes(level) ? level : "low";
}

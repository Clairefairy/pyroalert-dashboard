import { useState } from "react";

export function SensorCard({ label, value, unit, icon, rawValue, rawLabel, className = "" }) {
  const [showTooltip, setShowTooltip] = useState(false);

  return (
    <div
      className={`bg-slate-800/50 rounded-xl p-3 border border-white/5 relative cursor-pointer transition-all hover:bg-slate-700/50 ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
        {icon}
        {label}
      </div>
      <p className="text-xl font-bold text-white">
        {value}
        {unit}
      </p>

      {showTooltip && rawValue !== undefined && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-950 border border-white/20 rounded-lg shadow-xl z-10 whitespace-nowrap">
          <p className="text-xs text-slate-300">
            <span className="text-slate-500">{rawLabel || "Valor bruto"}:</span> {rawValue}
          </p>
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
        </div>
      )}
    </div>
  );
}

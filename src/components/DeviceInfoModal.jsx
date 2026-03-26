import { getRiskLabel, riskLevelToCssSuffix } from "../utils/risk.js";
import { SensorCard } from "./SensorCard.jsx";

export function DeviceInfoModal({ device, onClose }) {
  if (!device) return null;

  const riskSuffix = riskLevelToCssSuffix(device.riskLevel);
  const riskLabel = getRiskLabel(device.riskLevel);
  const raw = device.rawValues || {};
  const smokePercent = parseFloat(device.smokePercent) || 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 pt-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Ativo
          </span>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Risco de Incêndio</h3>
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold text-white risk-label-pill--${riskSuffix}`}
            >
              {riskLabel}
            </span>
          </div>

          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg
                key={star}
                xmlns="http://www.w3.org/2000/svg"
                className={`w-6 h-6 device-modal-star${star <= Math.ceil(device.riskPercent / 20) ? " device-modal-star--filled" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                />
              </svg>
            ))}
          </div>

          <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
            <div
              className={`risk-progress__fill risk-progress__fill--${riskSuffix}`}
              style={{ "--risk-fill-width": `${device.riskPercent}%` }}
            />
          </div>
          <p className="text-center text-sm text-slate-400">Probabilidade: {device.riskPercent}%</p>
        </div>

        <div className="px-6 pb-4 grid grid-cols-2 gap-3">
          <SensorCard
            label="Temperatura"
            value={device.temperature}
            unit="°C"
            rawValue={device.isRealData ? raw.temperature : undefined}
            rawLabel="API (umi22)"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            }
          />

          <SensorCard
            label="Sens. Térmica"
            value={device.heatIndex}
            unit="°C"
            rawValue={device.isRealData ? raw.heatIndex : undefined}
            rawLabel="API (sense22)"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            }
          />

          <SensorCard
            label="Umidade Ar"
            value={device.airHumidity}
            unit="%"
            rawValue={device.isRealData ? raw.airHumidity : undefined}
            rawLabel="API (temp22)"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            }
          />

          <SensorCard
            label="Umidade Solo"
            value={typeof device.soilHumidity === "number" ? device.soilHumidity.toFixed(1) : device.soilHumidity}
            unit="%"
            rawValue={device.isRealData ? raw.soilHumidityRaw : undefined}
            rawLabel="API (umisolo)"
            icon={
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            }
          />

          <div className="col-span-2 bg-slate-800/50 rounded-xl p-3 border border-white/5 relative cursor-pointer transition-all hover:bg-slate-700/50 group">
            <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
              Fumaça
            </div>
            <p
              className={`text-xl font-bold ${smokePercent > 10 ? "text-red-500" : smokePercent > 6 ? "text-orange-500" : smokePercent > 3 ? "text-yellow-500" : "text-emerald-400"}`}
            >
              {smokePercent.toFixed(1)}% {smokePercent > 10 ? "🔥" : smokePercent > 6 ? "⚠️" : "✓"}
            </p>

            {device.isRealData && raw.smoke !== undefined && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-950 border border-white/20 rounded-lg shadow-xl z-10 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                <p className="text-xs text-slate-300">
                  <span className="text-slate-500">API (fumo):</span> {raw.smoke}
                </p>
                <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-950" />
              </div>
            )}
          </div>
        </div>

        <div className="px-6 pb-4 space-y-2">
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-300">Localização:</span> {device.lat.toFixed(6)},{" "}
            {device.lng.toFixed(6)}
          </p>
          <p className="text-xs">
            {device.isRealData ? (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
                Dados obtidos do Adafruit IO
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-500/20 text-slate-400 rounded-full border border-slate-500/30">
                Dados simulados
              </span>
            )}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-4 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors font-medium border-t border-white/10"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

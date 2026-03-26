export function FireAlertModal({ device, onAcknowledge }) {
  if (!device) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-red-400/60 bg-slate-950/95 shadow-2xl shadow-red-900/50 animate-fire-alert-modal">
        <div className="border-b border-red-500/30 px-6 py-4">
          <h2 className="text-2xl font-black uppercase tracking-wide text-red-400 animate-fire-alert-text">
            Alerta de Incêndio!
          </h2>
        </div>

        <div className="px-6 py-5">
          <p className="text-lg text-slate-100">
            Fumaça detectada pelo dispositivo <span className="font-bold text-red-400">{device.id}</span>.
          </p>
          <p className="mt-2 text-sm text-slate-400">
            Nível atual de fumaça:{" "}
            <span className="font-semibold text-red-300">
              {(parseFloat(device.smokePercent) || 0).toFixed(1)}%
            </span>
          </p>
        </div>

        <div className="px-6 pb-6">
          <button
            type="button"
            onClick={onAcknowledge}
            className="w-full rounded-xl bg-red-600 py-3 text-lg font-bold uppercase text-white transition hover:bg-red-700"
          >
            ok
          </button>
        </div>
      </div>
    </div>
  );
}

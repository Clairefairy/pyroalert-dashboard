export function Input({ label, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
      />
    </div>
  );
}

export function DarkInput({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <input
        {...props}
        className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none"
      />
    </div>
  );
}

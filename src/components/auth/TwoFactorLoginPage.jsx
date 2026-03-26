import { Spinner } from "../Spinner.jsx";

export function TwoFactorLoginPage({ totpCode, setTotpCode, onSubmit, onCancel, isLoading, error }) {
  return (
    <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Autenticação de Dois Fatores</h1>
        <p className="text-slate-500 mt-2">Digite o código do seu aplicativo autenticador</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
      )}

      <form onSubmit={onSubmit} className="space-y-6">
        <div>
          <input
            type="text"
            value={totpCode}
            onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400"
            placeholder="000000"
            maxLength={6}
            required
            disabled={isLoading}
            autoFocus
          />
        </div>

        <button
          type="submit"
          disabled={isLoading || totpCode.length !== 6}
          className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <Spinner /> Verificando...
            </>
          ) : (
            "Verificar"
          )}
        </button>

        <button type="button" onClick={onCancel} className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium">
          Voltar ao login
        </button>
      </form>
    </div>
  );
}

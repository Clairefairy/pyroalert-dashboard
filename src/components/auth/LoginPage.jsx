import { Input } from "../Input.jsx";
import { Spinner } from "../Spinner.jsx";

export function LoginPage({
  activeTab,
  setActiveTab,
  error,
  setError,
  isLoading,
  loginForm,
  handleLoginChange,
  submitLogin,
  signup,
  handleSignupChange,
  submitSignup,
}) {
  return (
    <div className="w-full max-w-5xl bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/10">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-8 md:p-12 bg-white rounded-l-3xl">
          <div className="flex items-center gap-3 mb-8">
            <img src="/LogoPyro.svg" alt="Pyro Alert Logo" className="w-12 h-12" />
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Pyro Alert</h1>
              <p className="text-sm text-slate-500">Sistema de monitoramento</p>
            </div>
          </div>

          <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl">
            {["login", "signup"].map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => {
                  setActiveTab(tab);
                  setError("");
                }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>
          )}

          {activeTab === "login" ? (
            <form onSubmit={submitLogin} className="space-y-5">
              <Input
                label="E-mail"
                name="email"
                type="email"
                value={loginForm.email}
                onChange={handleLoginChange}
                placeholder="seu@email.com"
                required
                disabled={isLoading}
              />
              <Input
                label="Senha"
                name="password"
                type="password"
                value={loginForm.password}
                onChange={handleLoginChange}
                placeholder="••••••••"
                required
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Spinner /> Entrando...
                  </>
                ) : (
                  "Entrar"
                )}
              </button>
              <p className="text-center text-sm text-slate-500">
                Não tem conta?{" "}
                <button type="button" onClick={() => setActiveTab("signup")} className="text-orange-600 hover:text-orange-700 font-medium">
                  Cadastre-se
                </button>
              </p>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="space-y-4">
              <Input label="Nome completo" name="name" value={signup.name} onChange={handleSignupChange} placeholder="Maria Silva" required disabled={isLoading} />
              <Input label="E-mail" name="email" type="email" value={signup.email} onChange={handleSignupChange} placeholder="seu@email.com" required disabled={isLoading} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Documento</label>
                  <select
                    name="id_type"
                    value={signup.id_type}
                    onChange={handleSignupChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
                    disabled={isLoading}
                  >
                    <option value="CPF">CPF</option>
                    <option value="CNPJ">CNPJ</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Input
                    label="Número"
                    name="id_number"
                    value={signup.id_number}
                    onChange={handleSignupChange}
                    placeholder={signup.id_type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Senha" name="password" type="password" value={signup.password} onChange={handleSignupChange} placeholder="••••••••" required disabled={isLoading} />
                <Input
                  label="Confirmar senha"
                  name="confirmPassword"
                  type="password"
                  value={signup.confirmPassword}
                  onChange={handleSignupChange}
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Telefone" name="phone" value={signup.phone} onChange={handleSignupChange} placeholder="(11) 99999-9999" required disabled={isLoading} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Perfil</label>
                  <select name="role" value={signup.role} onChange={handleSignupChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800" disabled={isLoading}>
                    <option value="viewer">Visualizador</option>
                    <option value="operator">Operador</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Spinner /> Cadastrando...
                  </>
                ) : (
                  "Criar conta"
                )}
              </button>
              <p className="text-center text-sm text-slate-500">
                Já tem conta?{" "}
                <button type="button" onClick={() => setActiveTab("login")} className="text-orange-600 hover:text-orange-700 font-medium">
                  Faça login
                </button>
              </p>
            </form>
          )}
        </div>
        <div className="relative p-8 md:p-12 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white hidden lg:flex lg:flex-col lg:justify-between rounded-r-3xl overflow-hidden">
          <div className="relative z-10">
            <h2 className="text-3xl font-bold mb-3">Bem-vindo ao Pyro Alert</h2>
            <p className="text-white/80 text-lg">Monitore em tempo real as leituras dos sensores e receba alertas de incêndio.</p>
          </div>
          <div className="absolute -bottom-16 -right-16 w-96 h-96 opacity-25">
            <img src="/LogoPyro.svg" alt="" className="w-full h-full object-contain login-hero-logo" />
          </div>
        </div>
      </div>
    </div>
  );
}

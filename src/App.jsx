import { useState, useEffect, useCallback } from "react";

const API_BASE = "https://pyroalert-mongodb.onrender.com";

// Máscaras de formatação
function maskCPF(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCNPJ(value) {
  return value
    .replace(/\D/g, "")
    .slice(0, 14)
    .replace(/(\d{2})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1/$2")
    .replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, "($1) $2")
      .replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  }
  return digits
    .replace(/(\d{2})(\d)/, "($1) $2")
    .replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

// Token storage helpers
const TokenStorage = {
  save: (tokens) => {
    localStorage.setItem("pyroalert_access_token", tokens.access_token);
    localStorage.setItem("pyroalert_refresh_token", tokens.refresh_token);
    localStorage.setItem("pyroalert_token_expiry", String(Date.now() + tokens.expires_in * 1000));
  },
  get: () => ({
    access_token: localStorage.getItem("pyroalert_access_token"),
    refresh_token: localStorage.getItem("pyroalert_refresh_token"),
    expiry: Number(localStorage.getItem("pyroalert_token_expiry")) || 0,
  }),
  clear: () => {
    localStorage.removeItem("pyroalert_access_token");
    localStorage.removeItem("pyroalert_refresh_token");
    localStorage.removeItem("pyroalert_token_expiry");
  },
  isExpired: () => {
    const expiry = Number(localStorage.getItem("pyroalert_token_expiry")) || 0;
    return Date.now() > expiry - 60000; // 1 min buffer
  },
};

export default function App() {
  const [route, setRoute] = useState("login");
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [signup, setSignup] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    id_type: "CPF",
    id_number: "",
    role: "viewer",
  });

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  // Refresh token function
  const refreshAccessToken = useCallback(async () => {
    const { refresh_token } = TokenStorage.get();
    if (!refresh_token) return false;

    try {
      const response = await fetch(`${API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "refresh_token",
          refresh_token,
        }),
      });

      if (!response.ok) {
        TokenStorage.clear();
        return false;
      }

      const data = await response.json();
      TokenStorage.save(data);
      return true;
    } catch {
      TokenStorage.clear();
      return false;
    }
  }, []);

  // Introspect token to get user info
  const introspectToken = useCallback(async () => {
    const { access_token } = TokenStorage.get();
    if (!access_token) return null;

    try {
      const response = await fetch(`${API_BASE}/oauth/introspect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: access_token }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (!data.active) return null;

      return {
        id: data.sub,
        email: data.email,
        name: data.name || data.email,
        role: data.role || "viewer",
        scope: data.scope,
      };
    } catch {
      return null;
    }
  }, []);

  // Check existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      const { access_token } = TokenStorage.get();
      
      if (!access_token) {
        setIsInitializing(false);
        return;
      }

      // Check if token expired
      if (TokenStorage.isExpired()) {
        const refreshed = await refreshAccessToken();
        if (!refreshed) {
          setIsInitializing(false);
          return;
        }
      }

      // Get user info
      const userInfo = await introspectToken();
      if (userInfo) {
        setUser(userInfo);
        setRoute("dashboard");
      } else {
        TokenStorage.clear();
      }

      setIsInitializing(false);
    };

    checkSession();
  }, [refreshAccessToken, introspectToken]);

  // Auto refresh token before expiry
  useEffect(() => {
    if (route !== "dashboard") return;

    const { expiry } = TokenStorage.get();
    const timeUntilExpiry = expiry - Date.now() - 60000; // Refresh 1 min before

    if (timeUntilExpiry <= 0) return;

    const timeout = setTimeout(async () => {
      const refreshed = await refreshAccessToken();
      if (!refreshed) {
        logout();
      }
    }, timeUntilExpiry);

    return () => clearTimeout(timeout);
  }, [route, refreshAccessToken]);

  function handleSignupChange(e) {
    const { name, value } = e.target;
    
    let maskedValue = value;
    
    if (name === "id_number") {
      maskedValue = signup.id_type === "CPF" ? maskCPF(value) : maskCNPJ(value);
    } else if (name === "phone") {
      maskedValue = maskPhone(value);
    } else if (name === "id_type") {
      setSignup((s) => ({ ...s, [name]: value, id_number: "" }));
      setError("");
      return;
    }
    
    setSignup((s) => ({ ...s, [name]: maskedValue }));
    setError("");
  }

  function handleLoginChange(e) {
    const { name, value } = e.target;
    setLoginForm((l) => ({ ...l, [name]: value }));
    setError("");
  }

  async function submitSignup(e) {
    e.preventDefault();
    setError("");

    if (signup.password !== signup.confirmPassword) {
      setError("As senhas não coincidem!");
      return;
    }

    if (signup.password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres!");
      return;
    }

    setIsLoading(true);

    try {
      const cleanPhone = signup.phone.replace(/\D/g, "");
      const cleanIdNumber = signup.id_number.replace(/\D/g, "");

      const response = await fetch(`${API_BASE}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: signup.email,
          password: signup.password,
          name: signup.name,
          phone: cleanPhone,
          id_type: signup.id_type,
          id_number: cleanIdNumber,
          role: signup.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || "Erro ao cadastrar usuário");
      }

      setActiveTab("login");
      setLoginForm({ email: signup.email, password: "" });
      setSignup({
        name: "",
        email: "",
        password: "",
        confirmPassword: "",
        phone: "",
        id_type: "CPF",
        id_number: "",
        role: "viewer",
      });
      setError("");
      alert("Cadastro realizado com sucesso! Faça login para continuar.");
    } catch (err) {
      setError(err.message || "Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      // OAuth2 Password Grant
      const response = await fetch(`${API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "password",
          email: loginForm.email,
          password: loginForm.password,
          scope: "read write",
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error_description || data.error || "Credenciais inválidas");
      }

      // Save tokens
      TokenStorage.save(data);

      // Get user info via introspection
      const userInfo = await introspectToken();
      
      if (userInfo) {
        setUser(userInfo);
      } else {
        // Fallback if introspection fails
        setUser({ email: loginForm.email });
      }

      setRoute("dashboard");
      setError("");
      setLoginForm({ email: "", password: "" });
    } catch (err) {
      setError(err.message || "Erro ao conectar com o servidor");
    } finally {
      setIsLoading(false);
    }
  }

  async function logout() {
    const { access_token } = TokenStorage.get();
    
    // Revoke token (best effort)
    if (access_token) {
      try {
        await fetch(`${API_BASE}/oauth/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: access_token }),
        });
      } catch {
        // Ignore errors on revoke
      }
    }

    TokenStorage.clear();
    setRoute("login");
    setLoginForm({ email: "", password: "" });
    setUser(null);
  }

  // Show loading screen while checking session
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 md:p-6">
      {route === "login" ? (
        <div className="w-full max-w-5xl bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/10">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* Left Panel - Auth Forms */}
            <div className="p-8 md:p-12 bg-white">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-800">Pyro Alert</h1>
                  <p className="text-sm text-slate-500">Sistema de monitoramento</p>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl">
                <button
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeTab === "login"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => { setActiveTab("login"); setError(""); }}
                >
                  Entrar
                </button>
                <button
                  className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeTab === "signup"
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                  onClick={() => { setActiveTab("signup"); setError(""); }}
                >
                  Cadastrar
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
              )}

              {activeTab === "login" ? (
                <form onSubmit={submitLogin} className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      E-mail
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={loginForm.email}
                      onChange={handleLoginChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                      placeholder="seu@email.com"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Senha
                    </label>
                    <input
                      name="password"
                      type="password"
                      value={loginForm.password}
                      onChange={handleLoginChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                      placeholder="••••••••"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all duration-200 shadow-lg shadow-orange-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    Não tem conta?{" "}
                    <button 
                      type="button"
                      onClick={() => { setActiveTab("signup"); setError(""); }}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Cadastre-se
                    </button>
                  </p>
                </form>
              ) : (
                <form onSubmit={submitSignup} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Nome completo
                    </label>
                    <input
                      name="name"
                      value={signup.name}
                      onChange={handleSignupChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                      placeholder="Maria Silva"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      E-mail
                    </label>
                    <input
                      name="email"
                      type="email"
                      value={signup.email}
                      onChange={handleSignupChange}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                      placeholder="seu@email.com"
                      required
                      disabled={isLoading}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Documento
                      </label>
                      <select
                        name="id_type"
                        value={signup.id_type}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 transition-colors"
                        disabled={isLoading}
                      >
                        <option value="CPF">CPF</option>
                        <option value="CNPJ">CNPJ</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Número
                      </label>
                      <input
                        name="id_number"
                        value={signup.id_number}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                        placeholder={signup.id_type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Senha
                      </label>
                      <input
                        name="password"
                        type="password"
                        value={signup.password}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Confirmar senha
                      </label>
                      <input
                        name="confirmPassword"
                        type="password"
                        value={signup.confirmPassword}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                        placeholder="••••••••"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Telefone
                      </label>
                      <input
                        name="phone"
                        value={signup.phone}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors"
                        placeholder="(11) 99999-9999"
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Perfil
                      </label>
                      <select
                        name="role"
                        value={signup.role}
                        onChange={handleSignupChange}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 transition-colors"
                        disabled={isLoading}
                      >
                        <option value="viewer">Visualizador</option>
                        <option value="operator">Operador</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all duration-200 shadow-lg shadow-green-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Cadastrando...
                      </>
                    ) : (
                      "Criar conta"
                    )}
                  </button>

                  <p className="text-center text-sm text-slate-500">
                    Já tem conta?{" "}
                    <button 
                      type="button"
                      onClick={() => { setActiveTab("login"); setError(""); }}
                      className="text-orange-600 hover:text-orange-700 font-medium"
                    >
                      Faça login
                    </button>
                  </p>
                </form>
              )}
            </div>

            {/* Right Panel - Info */}
            <div className="p-8 md:p-12 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white hidden lg:block">
              <h2 className="text-2xl font-bold mb-3">Bem-vindo ao Pyro Alert</h2>
              <p className="text-white/80 mb-8">
                Monitore em tempo real as leituras dos sensores e receba alertas de incêndio instantaneamente.
              </p>

              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <span className="text-sm font-medium text-white/60 uppercase tracking-wide">Temperatura</span>
                  </div>
                  <div className="text-4xl font-bold">— °C</div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Umidade</span>
                    <div className="text-2xl font-bold mt-2">— %</div>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wide">Gás</span>
                    <div className="text-2xl font-bold mt-2">— ppm</div>
                  </div>
                </div>

                <p className="text-sm text-white/50 text-center mt-6">
                  Faça login para visualizar os dados em tempo real
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <Dashboard onLogout={logout} user={user} />
      )}
    </div>
  );
}

function Dashboard({ onLogout, user }) {
  const [isLoading, setIsLoading] = useState(false);

  const sensorData = {
    temperature: 28.4,
    humidity: 54,
    gas: 120,
    lastUpdate: new Date().toLocaleString("pt-BR"),
  };

  const handleRefresh = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 1000);
  };

  const getRoleName = (role) => {
    const roles = {
      admin: "Administrador",
      operator: "Operador",
      viewer: "Visualizador",
    };
    return roles[role] || role;
  };

  return (
    <div className="w-full max-w-6xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Pyro Alert</h1>
            <p className="text-slate-400">Monitoramento em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* User Info */}
          {user && (
            <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {user.name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
              </div>
              <div>
                <p className="text-sm font-medium text-white">{user.name || user.email}</p>
                <p className="text-xs text-slate-400">{getRoleName(user.role)}</p>
              </div>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-all border border-red-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </div>

      {/* Sensor Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* Temperature */}
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl p-6 rounded-2xl border border-orange-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-orange-300 uppercase tracking-wide">Temperatura</span>
            <div className="w-10 h-10 bg-orange-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="text-5xl font-bold text-white mb-2">{sensorData.temperature}°C</div>
          <p className="text-sm text-slate-400">Campo 1 - ThingSpeak</p>
        </div>

        {/* Humidity */}
        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl p-6 rounded-2xl border border-blue-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-blue-300 uppercase tracking-wide">Umidade</span>
            <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
          </div>
          <div className="text-5xl font-bold text-white mb-2">{sensorData.humidity}%</div>
          <p className="text-sm text-slate-400">Campo 2 - ThingSpeak</p>
        </div>

        {/* Gas */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-xl p-6 rounded-2xl border border-emerald-500/20">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-emerald-300 uppercase tracking-wide">Gás (MQ)</span>
            <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
          <div className="text-5xl font-bold text-white mb-2">{sensorData.gas} ppm</div>
          <p className="text-sm text-slate-400">Campo 3 - ThingSpeak</p>
        </div>
      </div>

      {/* Raw Data Card */}
      <div className="bg-white/5 backdrop-blur-xl p-6 rounded-2xl border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Última leitura bruta</h3>
          <span className="text-sm text-slate-400">{sensorData.lastUpdate}</span>
        </div>
        <pre className="bg-slate-900/50 text-slate-300 p-4 rounded-xl text-sm overflow-x-auto font-mono">
{`{
  "field1": "${sensorData.temperature}",
  "field2": "${sensorData.humidity}",
  "field3": "${sensorData.gas}",
  "created_at": "${new Date().toISOString()}"
}`}
        </pre>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-slate-500 mt-8">
        Pyro Alert © 2025 — Protótipo de monitoramento de sensores
      </p>
    </div>
  );
}

import { useState, useEffect, useCallback, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const API_BASE = "https://pyroalert-mongodb.onrender.com";

// Dados fictícios dos dispositivos
const MOCK_DEVICES = [
  {
    id: "001",
    name: "Dispositivo 001",
    lat: -23.5505,
    lng: -46.6333,
    status: "active",
    riskLevel: "moderate",
    riskPercent: 75,
    airHumidity: 15,
    soilHumidity: 8,
    temperature: 32,
    gasDetected: true,
  },
  {
    id: "002",
    name: "Dispositivo 002",
    lat: -23.5605,
    lng: -46.6133,
    status: "active",
    riskLevel: "moderate",
    riskPercent: 40,
    airHumidity: 45,
    soilHumidity: 22,
    temperature: 28,
    gasDetected: false,
  },
  {
    id: "003",
    name: "Dispositivo 003",
    lat: -23.5405,
    lng: -46.6533,
    status: "active",
    riskLevel: "high",
    riskPercent: 85,
    airHumidity: 10,
    soilHumidity: 5,
    temperature: 38,
    gasDetected: true,
  },
  {
    id: "004",
    name: "Dispositivo 004",
    lat: -23.5655,
    lng: -46.6033,
    status: "active",
    riskLevel: "low",
    riskPercent: 25,
    airHumidity: 65,
    soilHumidity: 40,
    temperature: 24,
    gasDetected: false,
  },
];

// Máscaras de formatação
function maskCPF(value) {
  return value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function maskCNPJ(value) {
  return value.replace(/\D/g, "").slice(0, 14).replace(/(\d{2})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1/$2").replace(/(\d{4})(\d{1,2})$/, "$1-$2");
}

function maskPhone(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 10) return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d{1,4})$/, "$1-$2");
  return digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d{1,4})$/, "$1-$2");
}

function formatDocument(type, number) {
  if (!number) return "";
  return type === "CPF" ? maskCPF(number) : maskCNPJ(number);
}

const getRoleName = (role) => ({ admin: "Administrador", operator: "Operador", viewer: "Visualizador" }[role] || role);

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
  isExpired: () => Date.now() > (Number(localStorage.getItem("pyroalert_token_expiry")) || 0) - 60000,
};

// API helper with auth
async function apiRequest(endpoint, options = {}) {
  const { access_token } = TokenStorage.get();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (access_token) headers["Authorization"] = `Bearer ${access_token}`;
  
  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));
  
  if (!response.ok) throw new Error(data.message || data.error || data.error_description || "Erro na requisição");
  return data;
}

export default function App() {
  const [route, setRoute] = useState("login");
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // 2FA login state
  const [requires2FA, setRequires2FA] = useState(false);
  const [tempLoginData, setTempLoginData] = useState(null);
  const [totpCode, setTotpCode] = useState("");

  const [signup, setSignup] = useState({
    name: "", email: "", password: "", confirmPassword: "", phone: "", id_type: "CPF", id_number: "", role: "viewer",
  });

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  
  // 2FA status (global to avoid flash)
  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await apiRequest("/api/v1/auth/me");
      // Handle different response formats
      return response.data || response.user || response;
    } catch {
      return null;
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const { refresh_token } = TokenStorage.get();
    if (!refresh_token) return false;
    try {
      const data = await fetch(`${API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "refresh_token", refresh_token }),
      }).then(r => r.json());
      if (data.access_token) { TokenStorage.save(data); return true; }
      TokenStorage.clear();
      return false;
    } catch {
      TokenStorage.clear();
      return false;
    }
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { access_token } = TokenStorage.get();
      if (!access_token) { setIsInitializing(false); return; }
      if (TokenStorage.isExpired() && !(await refreshAccessToken())) { setIsInitializing(false); return; }
      const userData = await fetchUserData();
      if (userData) { setUser(userData); setRoute("dashboard"); }
      else TokenStorage.clear();
      setIsInitializing(false);
    };
    checkSession();
  }, [refreshAccessToken, fetchUserData]);

  useEffect(() => {
    if (route === "login") return;
    const { expiry } = TokenStorage.get();
    const timeout = setTimeout(async () => {
      if (!(await refreshAccessToken())) logout();
    }, Math.max(0, expiry - Date.now() - 60000));
    return () => clearTimeout(timeout);
  }, [route, refreshAccessToken]);

  function handleSignupChange(e) {
    const { name, value } = e.target;
    if (name === "id_number") setSignup(s => ({ ...s, [name]: s.id_type === "CPF" ? maskCPF(value) : maskCNPJ(value) }));
    else if (name === "phone") setSignup(s => ({ ...s, [name]: maskPhone(value) }));
    else if (name === "id_type") setSignup(s => ({ ...s, [name]: value, id_number: "" }));
    else setSignup(s => ({ ...s, [name]: value }));
    setError("");
  }

  function handleLoginChange(e) {
    setLoginForm(l => ({ ...l, [e.target.name]: e.target.value }));
    setError("");
  }

  async function submitSignup(e) {
    e.preventDefault();
    setError("");
    if (signup.password !== signup.confirmPassword) return setError("As senhas não coincidem!");
    if (signup.password.length < 6) return setError("A senha deve ter pelo menos 6 caracteres!");
    setIsLoading(true);
    try {
      await apiRequest("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify({
          ...signup,
          phone: signup.phone.replace(/\D/g, ""),
          id_number: signup.id_number.replace(/\D/g, ""),
        }),
      });
      setActiveTab("login");
      setLoginForm({ email: signup.email, password: "" });
      setSignup({ name: "", email: "", password: "", confirmPassword: "", phone: "", id_type: "CPF", id_number: "", role: "viewer" });
      alert("Cadastro realizado com sucesso! Faça login para continuar.");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function submitLogin(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "password", email: loginForm.email, password: loginForm.password, scope: "read write" }),
      });
      const data = await response.json();
      
      // Check if 2FA is required
      if (data.requires_2fa || data.mfa_required || response.status === 403) {
        setRequires2FA(true);
        setTempLoginData({ email: loginForm.email, password: loginForm.password });
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) throw new Error(data.error_description || data.error || "Credenciais inválidas");
      
      TokenStorage.save(data);
      const userData = await fetchUserData();
      setUser(userData || { email: loginForm.email, name: loginForm.email });
      setRoute("dashboard");
      setLoginForm({ email: "", password: "" });
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function submit2FALogin(e) {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE}/oauth/token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grant_type: "password",
          email: tempLoginData.email,
          password: tempLoginData.password,
          totp_code: totpCode,
          scope: "read write",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error_description || data.error || "Código inválido");
      
      TokenStorage.save(data);
      const userData = await fetchUserData();
      setUser(userData || { email: tempLoginData.email });
      setRoute("dashboard");
      setLoginForm({ email: "", password: "" });
      setRequires2FA(false);
      setTempLoginData(null);
      setTotpCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function cancel2FA() {
    setRequires2FA(false);
    setTempLoginData(null);
    setTotpCode("");
    setError("");
  }

  async function logout() {
    const { access_token } = TokenStorage.get();
    if (access_token) {
      try { await fetch(`${API_BASE}/oauth/revoke`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: access_token }) }); } catch {}
    }
    TokenStorage.clear();
    setRoute("login");
    setLoginForm({ email: "", password: "" });
    setUser(null);
  }

  async function updateUser() {
    const userData = await fetchUserData();
    if (userData) setUser(userData);
  }

  async function fetch2FAStatus() {
    try {
      const response = await apiRequest("/api/v1/2fa/status");
      const data = response.data || response;
      return { enabled: data.enabled ?? data.mfa_enabled ?? data.twoFactorEnabled ?? data.is_enabled ?? false };
    } catch {
      return { enabled: false };
    }
  }

  async function openProfile() {
    setIsLoadingProfile(true);
    const status = await fetch2FAStatus();
    setTwoFAStatus(status);
    setRoute("profile");
    setIsLoadingProfile(false);
  }

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center animate-pulse">
            <FireIcon className="w-7 h-7 text-white" />
          </div>
          <p className="text-slate-400">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4 md:p-6">
      {route === "login" ? (
        requires2FA ? (
          <TwoFactorLoginPage
            totpCode={totpCode}
            setTotpCode={setTotpCode}
            onSubmit={submit2FALogin}
            onCancel={cancel2FA}
            isLoading={isLoading}
            error={error}
          />
        ) : (
          <LoginPage
            activeTab={activeTab} setActiveTab={setActiveTab} error={error} setError={setError}
            isLoading={isLoading} loginForm={loginForm} handleLoginChange={handleLoginChange}
            submitLogin={submitLogin} signup={signup} handleSignupChange={handleSignupChange} submitSignup={submitSignup}
          />
        )
      ) : route === "profile" ? (
        <ProfilePage user={user} onBack={() => setRoute("dashboard")} onLogout={logout} onUpdateUser={updateUser} twoFAStatus={twoFAStatus} setTwoFAStatus={setTwoFAStatus} />
      ) : (
        <Dashboard user={user} onLogout={logout} onOpenProfile={openProfile} isLoadingProfile={isLoadingProfile} />
      )}
    </div>
  );
}

// Icons
function FireIcon({ className }) {
  return <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>;
}

function Spinner({ className = "w-5 h-5" }) {
  return <svg className={`animate-spin ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>;
}

// Risk colors
const getRiskColor = (level) => ({
  high: { bg: "rgb(239, 68, 68)", pulse: "rgba(239, 68, 68, 0.4)" },
  moderate: { bg: "rgb(245, 158, 11)", pulse: "rgba(245, 158, 11, 0.4)" },
  low: { bg: "rgb(34, 197, 94)", pulse: "rgba(34, 197, 94, 0.4)" },
}[level] || { bg: "rgb(34, 197, 94)", pulse: "rgba(34, 197, 94, 0.4)" });

const getRiskLabel = (level) => ({ high: "ALTO RISCO", moderate: "MODERADO", low: "BAIXO RISCO" }[level] || level);

// Device Marker Component
function DeviceMarker({ device, onClick }) {
  const colors = getRiskColor(device.riskLevel);
  
  return (
    <div className="relative cursor-pointer group" onClick={() => onClick(device)}>
      {/* Pulsing circles */}
      <div 
        className="absolute rounded-full animate-ping-slow"
        style={{
          width: 80,
          height: 80,
          left: -40,
          top: -40,
          backgroundColor: colors.pulse,
        }}
      />
      <div 
        className="absolute rounded-full animate-ping-slower"
        style={{
          width: 100,
          height: 100,
          left: -50,
          top: -50,
          backgroundColor: colors.pulse,
          opacity: 0.5,
        }}
      />
      
      {/* Main marker */}
      <div 
        className="relative w-12 h-12 rounded-xl flex items-center justify-center shadow-lg transform -translate-x-1/2 -translate-y-1/2 border-2 transition-transform group-hover:scale-110"
        style={{ 
          backgroundColor: `${colors.bg}33`,
          borderColor: colors.bg,
        }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke={colors.bg} strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      </div>
      
      {/* Risk percentage badge */}
      <div 
        className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
        style={{ backgroundColor: colors.bg }}
      >
        {device.riskPercent}%
      </div>
      
      {/* Device name label */}
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-slate-900/90 px-3 py-1 rounded-lg text-sm font-medium text-white border border-white/10">
        {device.name}
      </div>
    </div>
  );
}

// Device Info Modal
function DeviceInfoModal({ device, onClose }) {
  if (!device) return null;
  
  const colors = getRiskColor(device.riskLevel);
  const riskLabel = getRiskLabel(device.riskLevel);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-slate-900 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10 animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status badge */}
        <div className="px-4 pt-4">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Ativo
          </span>
        </div>
        
        {/* Risk section */}
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Risco de Incêndio</h3>
            <span 
              className="px-3 py-1 rounded-full text-xs font-bold text-white"
              style={{ backgroundColor: colors.bg }}
            >
              {riskLabel}
            </span>
          </div>
          
          {/* Stars */}
          <div className="flex justify-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <svg 
                key={star} 
                xmlns="http://www.w3.org/2000/svg" 
                className="w-6 h-6" 
                fill={star <= Math.ceil(device.riskPercent / 20) ? "#f59e0b" : "none"} 
                viewBox="0 0 24 24" 
                stroke="#f59e0b" 
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            ))}
          </div>
          
          {/* Progress bar */}
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden mb-2">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${device.riskPercent}%`, backgroundColor: colors.bg }}
            />
          </div>
          <p className="text-center text-sm text-slate-400">Probabilidade: {device.riskPercent}%</p>
        </div>
        
        {/* Sensor data */}
        <div className="px-6 pb-6 grid grid-cols-2 gap-3">
          <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
              Umidade do Ar
            </div>
            <p className="text-2xl font-bold text-white">{device.airHumidity}%</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Umidade do Solo
            </div>
            <p className="text-2xl font-bold text-white">{device.soilHumidity}%</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Temperatura
            </div>
            <p className="text-2xl font-bold text-white">{device.temperature}°C</p>
          </div>
          
          <div className="bg-slate-800/50 rounded-xl p-4 border border-white/5">
            <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
              Gás Inflamável
            </div>
            <p className={`text-xl font-bold ${device.gasDetected ? "text-orange-500" : "text-emerald-400"}`}>
              {device.gasDetected ? "DETECTADO" : "NORMAL"}
            </p>
          </div>
        </div>
        
        {/* Location */}
        <div className="px-6 pb-6">
          <p className="text-sm text-slate-400">
            <span className="font-medium text-slate-300">Localização:</span> Latitude {device.lat}, Longitude {device.lng}
          </p>
        </div>
        
        {/* Close button */}
        <button 
          onClick={onClose}
          className="w-full py-4 bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors font-medium border-t border-white/10"
        >
          Fechar
        </button>
      </div>
    </div>
  );
}

// Create custom icon for device marker
// Create custom Leaflet icon for a device
function createDeviceIcon(device) {
  const colors = getRiskColor(device.riskLevel);
  
  return L.divIcon({
    className: 'custom-device-marker',
    html: `
      <div class="device-marker-wrapper">
        <div class="pulse-ring" style="background-color: ${colors.pulse}"></div>
        <div class="pulse-ring pulse-ring-delayed" style="background-color: ${colors.pulse}"></div>
        <div class="marker-icon" style="background-color: ${colors.bg}22; border-color: ${colors.bg}">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="${colors.bg}" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>
        <div class="marker-badge" style="background-color: ${colors.bg}">${device.riskPercent}%</div>
        <div class="marker-label">${device.name}</div>
      </div>
    `,
    iconSize: [120, 90],
    iconAnchor: [60, 45],
  });
}

// Device Map Component (Leaflet + OpenStreetMap)
function DeviceMap() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  // São Paulo center
  const center = useMemo(() => [-23.5550, -46.6333], []);
  
  // Create icons for each device (memoized to avoid recreation)
  const deviceIcons = useMemo(() => {
    const icons = {};
    MOCK_DEVICES.forEach(device => {
      icons[device.id] = createDeviceIcon(device);
    });
    return icons;
  }, []);
  
  return (
    <>
      <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="text-lg font-semibold text-white">Mapa de Dispositivos</h3>
          <p className="text-sm text-slate-400">Clique nos dispositivos para ver detalhes</p>
        </div>
        
        <div className="relative h-[450px]">
          <MapContainer
            center={center}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            zoomControl={true}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {MOCK_DEVICES.map((device) => (
              <Marker
                key={device.id}
                position={[device.lat, device.lng]}
                icon={deviceIcons[device.id]}
                eventHandlers={{
                  click: () => setSelectedDevice(device),
                }}
              />
            ))}
          </MapContainer>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm rounded-xl px-4 py-3 border border-white/10 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-sm text-slate-300">Alto risco</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span className="text-sm text-slate-300">Moderado</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-sm text-slate-300">Baixo risco</span>
            </div>
          </div>
        </div>
      </div>
      
      <DeviceInfoModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
    </>
  );
}

// 2FA Login Page
function TwoFactorLoginPage({ totpCode, setTotpCode, onSubmit, onCancel, isLoading, error }) {
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
          {isLoading ? <><Spinner /> Verificando...</> : "Verificar"}
        </button>

        <button type="button" onClick={onCancel} className="w-full py-3 text-slate-500 hover:text-slate-700 font-medium">
          Voltar ao login
        </button>
      </form>
    </div>
  );
}

// Login Page
function LoginPage({ activeTab, setActiveTab, error, setError, isLoading, loginForm, handleLoginChange, submitLogin, signup, handleSignupChange, submitSignup }) {
  return (
    <div className="w-full max-w-5xl bg-white/5 backdrop-blur-xl rounded-3xl overflow-hidden shadow-2xl shadow-black/20 border border-white/10">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        <div className="p-8 md:p-12 bg-white">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
              <FireIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Pyro Alert</h1>
              <p className="text-sm text-slate-500">Sistema de monitoramento</p>
            </div>
          </div>

          <div className="flex gap-1 mb-6 p-1 bg-slate-100 rounded-xl">
            {["login", "signup"].map(tab => (
              <button key={tab} onClick={() => { setActiveTab(tab); setError(""); }}
                className={`flex-1 py-3 px-4 rounded-lg font-medium text-sm transition-all ${activeTab === tab ? "bg-white text-slate-800 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                {tab === "login" ? "Entrar" : "Cadastrar"}
              </button>
            ))}
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">{error}</div>}

          {activeTab === "login" ? (
            <form onSubmit={submitLogin} className="space-y-5">
              <Input label="E-mail" name="email" type="email" value={loginForm.email} onChange={handleLoginChange} placeholder="seu@email.com" required disabled={isLoading} />
              <Input label="Senha" name="password" type="password" value={loginForm.password} onChange={handleLoginChange} placeholder="••••••••" required disabled={isLoading} />
              <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Entrando...</> : "Entrar"}
              </button>
              <p className="text-center text-sm text-slate-500">Não tem conta? <button type="button" onClick={() => setActiveTab("signup")} className="text-orange-600 hover:text-orange-700 font-medium">Cadastre-se</button></p>
            </form>
          ) : (
            <form onSubmit={submitSignup} className="space-y-4">
              <Input label="Nome completo" name="name" value={signup.name} onChange={handleSignupChange} placeholder="Maria Silva" required disabled={isLoading} />
              <Input label="E-mail" name="email" type="email" value={signup.email} onChange={handleSignupChange} placeholder="seu@email.com" required disabled={isLoading} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Documento</label>
                  <select name="id_type" value={signup.id_type} onChange={handleSignupChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800" disabled={isLoading}>
                    <option value="CPF">CPF</option><option value="CNPJ">CNPJ</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <Input label="Número" name="id_number" value={signup.id_number} onChange={handleSignupChange} placeholder={signup.id_type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"} required disabled={isLoading} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Senha" name="password" type="password" value={signup.password} onChange={handleSignupChange} placeholder="••••••••" required disabled={isLoading} />
                <Input label="Confirmar senha" name="confirmPassword" type="password" value={signup.confirmPassword} onChange={handleSignupChange} placeholder="••••••••" required disabled={isLoading} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input label="Telefone" name="phone" value={signup.phone} onChange={handleSignupChange} placeholder="(11) 99999-9999" required disabled={isLoading} />
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Perfil</label>
                  <select name="role" value={signup.role} onChange={handleSignupChange} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800" disabled={isLoading}>
                    <option value="viewer">Visualizador</option><option value="operator">Operador</option><option value="admin">Administrador</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg shadow-green-500/25 disabled:opacity-50 flex items-center justify-center gap-2">
                {isLoading ? <><Spinner /> Cadastrando...</> : "Criar conta"}
              </button>
              <p className="text-center text-sm text-slate-500">Já tem conta? <button type="button" onClick={() => setActiveTab("login")} className="text-orange-600 hover:text-orange-700 font-medium">Faça login</button></p>
            </form>
          )}
        </div>
        <div className="p-8 md:p-12 bg-gradient-to-br from-orange-500 via-red-500 to-rose-600 text-white hidden lg:block">
          <h2 className="text-2xl font-bold mb-3">Bem-vindo ao Pyro Alert</h2>
          <p className="text-white/80 mb-8">Monitore em tempo real as leituras dos sensores e receba alertas de incêndio.</p>
          <div className="space-y-4">
            <div className="bg-white/10 p-5 rounded-2xl border border-white/20">
              <span className="text-sm text-white/60 uppercase tracking-wide">Temperatura</span>
              <div className="text-4xl font-bold mt-2">— °C</div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                <span className="text-xs text-white/60 uppercase">Umidade</span>
                <div className="text-2xl font-bold mt-2">— %</div>
              </div>
              <div className="bg-white/10 p-4 rounded-2xl border border-white/20">
                <span className="text-xs text-white/60 uppercase">Gás</span>
                <div className="text-2xl font-bold mt-2">— ppm</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, className = "", ...props }) {
  return (
    <div className={className}>
      <label className="block text-sm font-medium text-slate-700 mb-2">{label}</label>
      <input {...props} className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 transition-colors" />
    </div>
  );
}

// Profile Page with 2FA
function ProfilePage({ user, onBack, onLogout, onUpdateUser, twoFAStatus, setTwoFAStatus }) {
  const [view, setView] = useState("main"); // main, edit, 2fa-setup
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [disablePassword, setDisablePassword] = useState("");

  const [editForm, setEditForm] = useState({
    name: user?.name || "", email: user?.email || "", phone: user?.phone ? maskPhone(user.phone) : "",
    id_type: user?.id_type || "CPF", id_number: user?.id_number ? formatDocument(user?.id_type || "CPF", user.id_number) : "",
    newPassword: "", confirmNewPassword: "", currentPassword: "",
  });

  function handleEditChange(e) {
    const { name, value } = e.target;
    if (name === "id_number") setEditForm(f => ({ ...f, [name]: f.id_type === "CPF" ? maskCPF(value) : maskCNPJ(value) }));
    else if (name === "phone") setEditForm(f => ({ ...f, [name]: maskPhone(value) }));
    else if (name === "id_type") setEditForm(f => ({ ...f, [name]: value, id_number: "" }));
    else setEditForm(f => ({ ...f, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    if (!editForm.currentPassword) return setError("Digite sua senha atual");
    if (editForm.newPassword && editForm.newPassword !== editForm.confirmNewPassword) return setError("As senhas não coincidem");
    if (editForm.newPassword && editForm.newPassword.length < 6) return setError("Mínimo 6 caracteres");
    setIsLoading(true);
    try {
      const updateData = { name: editForm.name, email: editForm.email, phone: editForm.phone.replace(/\D/g, ""), id_type: editForm.id_type, id_number: editForm.id_number.replace(/\D/g, ""), currentPassword: editForm.currentPassword };
      if (editForm.newPassword) updateData.newPassword = editForm.newPassword;
      await apiRequest("/api/v1/auth/me", { method: "PUT", body: JSON.stringify(updateData) });
      setSuccess("Dados atualizados!");
      setView("main");
      setEditForm(f => ({ ...f, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
      onUpdateUser();
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }

  async function start2FASetup() {
    setIsLoading(true); setError("");
    try {
      const data = await apiRequest("/api/v1/2fa/setup", { method: "POST" });
      setSetupData(data.data || data);
      setView("2fa-setup");
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }

  async function verify2FA(e) {
    e.preventDefault();
    setIsLoading(true); setError("");
    try {
      const data = await apiRequest("/api/v1/2fa/verify", { method: "POST", body: JSON.stringify({ code: verifyCode }) });
      const codes = data.data?.recovery_codes || data.recovery_codes || data.data?.recoveryCodes || data.recoveryCodes;
      setTwoFAStatus({ enabled: true });
      
      if (codes && codes.length > 0) {
        // Se tiver códigos de recuperação, mostra eles primeiro
        setRecoveryCodes(codes);
        setSuccess("2FA ativado com sucesso! Guarde seus códigos de recuperação.");
      } else {
        // Se não tiver códigos, volta direto para o perfil
        setSuccess("Autenticação de Dois Fatores ativada com sucesso!");
        setView("main");
        setSetupData(null);
        setVerifyCode("");
      }
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }

  async function disable2FA(e) {
    e.preventDefault();
    setIsLoading(true); setError("");
    try {
      await apiRequest("/api/v1/2fa", { method: "DELETE", body: JSON.stringify({ password: disablePassword }) });
      setTwoFAStatus({ enabled: false });
      setSuccess("Autenticação de Dois Fatores desativada com sucesso.");
      setView("main");
      setDisablePassword("");
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }

  async function regenerateRecoveryCodes() {
    setIsLoading(true); setError("");
    try {
      const data = await apiRequest("/api/v1/2fa/recovery-codes", { method: "POST" });
      setRecoveryCodes(data.data?.recovery_codes || data.recovery_codes);
      setSuccess("Novos códigos gerados!");
    } catch (err) { setError(err.message); }
    finally { setIsLoading(false); }
  }

  function cancelEdit() {
    setView("main"); setError(""); setSuccess("");
    setEditForm({ name: user?.name || "", email: user?.email || "", phone: user?.phone ? maskPhone(user.phone) : "", id_type: user?.id_type || "CPF", id_number: user?.id_number ? formatDocument(user?.id_type || "CPF", user.id_number) : "", newPassword: "", confirmNewPassword: "", currentPassword: "" });
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
          Voltar
        </button>
        <button onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-all border border-red-500/20">Sair</button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">{user?.name?.charAt(0).toUpperCase() || "U"}</div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.name || "Usuário"}</h1>
              <p className="text-white/70">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white">{getRoleName(user?.role)}</span>
                {twoFAStatus?.enabled && <span className="px-3 py-1 bg-emerald-500/30 rounded-full text-sm text-emerald-300 flex items-center gap-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                  2FA Ativo
                </span>}
              </div>
            </div>
          </div>
        </div>

        <div className="p-8">
          {error && <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">{error}</div>}
          {success && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 flex items-center gap-3">
              <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <span className="font-medium">{success}</span>
            </div>
          )}

          {view === "main" && (
            <>
              <div className="space-y-4 mb-8">
                {[["Nome", user?.name], ["E-mail", user?.email], ["Telefone", user?.phone ? maskPhone(user.phone) : "—"], ["Documento", user?.id_type && user?.id_number ? `${user.id_type}: ${formatDocument(user.id_type, user.id_number)}` : "—"], ["Perfil", getRoleName(user?.role)]].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-medium">{value || "—"}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <button onClick={() => setView("edit")} className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                  Editar dados
                </button>
                
                {twoFAStatus?.enabled ? (
                  <button onClick={() => setView("2fa-disable")} className="w-full py-3.5 bg-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-all border border-red-500/30 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                    Desativar 2FA
                  </button>
                ) : (
                  <button onClick={start2FASetup} disabled={isLoading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 rounded-xl font-semibold hover:from-emerald-500/30 hover:to-green-500/30 transition-all border border-emerald-500/30 flex items-center justify-center gap-2">
                    {isLoading ? <Spinner /> : <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>}
                    Ativar Autenticação de Dois Fatores
                  </button>
                )}
              </div>
            </>
          )}

          {view === "edit" && (
            <form onSubmit={handleSave} className="space-y-4">
              <DarkInput label="Nome completo" name="name" value={editForm.name} onChange={handleEditChange} required disabled={isLoading} />
              <DarkInput label="E-mail" name="email" type="email" value={editForm.email} onChange={handleEditChange} required disabled={isLoading} />
              <DarkInput label="Telefone" name="phone" value={editForm.phone} onChange={handleEditChange} placeholder="(11) 99999-9999" disabled={isLoading} />
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Documento</label>
                  <select name="id_type" value={editForm.id_type} onChange={handleEditChange} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white" disabled={isLoading}>
                    <option value="CPF" className="bg-slate-800">CPF</option><option value="CNPJ" className="bg-slate-800">CNPJ</option>
                  </select>
                </div>
                <div className="col-span-2"><DarkInput label="Número" name="id_number" value={editForm.id_number} onChange={handleEditChange} placeholder={editForm.id_type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"} disabled={isLoading} /></div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <p className="text-sm text-slate-400 mb-4">Alterar senha (opcional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <DarkInput label="Nova senha" name="newPassword" type="password" value={editForm.newPassword} onChange={handleEditChange} placeholder="••••••••" disabled={isLoading} />
                  <DarkInput label="Confirmar" name="confirmNewPassword" type="password" value={editForm.confirmNewPassword} onChange={handleEditChange} placeholder="••••••••" disabled={isLoading} />
                </div>
              </div>
              <div className="pt-4 border-t border-white/10">
                <label className="block text-sm font-medium text-orange-400 mb-2">Senha atual (obrigatória)</label>
                <input name="currentPassword" type="password" value={editForm.currentPassword} onChange={handleEditChange} className="w-full px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-white placeholder-slate-500" placeholder="Digite sua senha atual" required disabled={isLoading} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={cancelEdit} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium" disabled={isLoading}>Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? <><Spinner /> Salvando...</> : "Salvar"}
                </button>
              </div>
            </form>
          )}

          {view === "2fa-setup" && (
            <div className="space-y-6">
              {recoveryCodes ? (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">Códigos de Recuperação</h3>
                  <p className="text-slate-400 text-sm mb-4">Guarde esses códigos em um lugar seguro. Cada código só pode ser usado uma vez.</p>
                  <div className="bg-slate-900/50 p-4 rounded-xl grid grid-cols-2 gap-2 font-mono text-sm mb-4">
                    {recoveryCodes.map((code, i) => <div key={i} className="text-emerald-400">{code}</div>)}
                  </div>
                  <button onClick={() => { setView("main"); setRecoveryCodes(null); setSetupData(null); setVerifyCode(""); setSuccess("Autenticação de Dois Fatores ativada com sucesso!"); }} className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold">
                    Concluir
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">Configure seu Autenticador</h3>
                    <p className="text-slate-400 text-sm">Escaneie o QR Code com seu app (Google Authenticator, Authy, etc)</p>
                  </div>
                  
                  {/* QR Code Display */}
                  {setupData && (
                    <div className="flex justify-center">
                      {(setupData.qrCode || setupData.qr_code) ? (
                        <img src={setupData.qrCode || setupData.qr_code} alt="QR Code" className="w-48 h-48 rounded-xl bg-white p-2" />
                      ) : setupData.otpauthUrl ? (
                        <div className="w-48 h-48 rounded-xl bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center">
                          <p className="text-slate-400 text-sm text-center px-4">Use a chave manual abaixo</p>
                        </div>
                      ) : (
                        <div className="w-48 h-48 rounded-xl bg-slate-900/50 flex items-center justify-center">
                          <Spinner className="w-8 h-8 text-slate-400" />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Manual Secret */}
                  {setupData?.secret && (
                    <div className="text-center">
                      <p className="text-slate-400 text-xs mb-2">Ou digite manualmente:</p>
                      <code className="text-emerald-400 font-mono text-sm bg-slate-900/50 px-4 py-2 rounded-lg inline-block select-all">{setupData.secret}</code>
                    </div>
                  )}

                  {/* Instructions */}
                  {setupData?.instructions && setupData.instructions.length > 0 && (
                    <div className="bg-slate-900/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs font-medium mb-2">Instruções:</p>
                      <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
                        {setupData.instructions.map((inst, i) => <li key={i}>{inst}</li>)}
                      </ol>
                    </div>
                  )}

                  <form onSubmit={verify2FA} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Código de verificação</label>
                      <input type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))} className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-white/10 bg-white/5 text-white" placeholder="000000" maxLength={6} required disabled={isLoading} />
                    </div>
                    <div className="flex gap-3">
                      <button type="button" onClick={() => { setView("main"); setSetupData(null); setVerifyCode(""); }} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium">Cancelar</button>
                      <button type="submit" disabled={isLoading || verifyCode.length !== 6} className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                        {isLoading ? <><Spinner /> Verificando...</> : "Ativar 2FA"}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </div>
          )}

          {view === "2fa-disable" && (
            <form onSubmit={disable2FA} className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Desativar 2FA</h3>
                <p className="text-slate-400 text-sm">Isso tornará sua conta menos segura. Digite sua senha para confirmar.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                <input type="password" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)} className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-white placeholder-slate-500" placeholder="Digite sua senha" required disabled={isLoading} />
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => { setView("main"); setDisablePassword(""); }} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium">Cancelar</button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? <><Spinner /> Desativando...</> : "Desativar 2FA"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function DarkInput({ label, ...props }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <input {...props} className="w-full px-4 py-3 rounded-xl border border-white/10 bg-white/5 text-white placeholder-slate-500 transition-colors focus:border-indigo-500 focus:outline-none" />
    </div>
  );
}

// Dashboard
function Dashboard({ user, onLogout, onOpenProfile, isLoadingProfile }) {
  const [isLoading, setIsLoading] = useState(false);
  const sensorData = { temperature: 28.4, humidity: 54, gas: 120, lastUpdate: new Date().toLocaleString("pt-BR") };

  return (
    <div className="w-full max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
            <FireIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Pyro Alert</h1>
            <p className="text-slate-400">Monitoramento em tempo real</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button onClick={onOpenProfile} disabled={isLoadingProfile} className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all disabled:opacity-70">
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {isLoadingProfile ? <Spinner className="w-4 h-4" /> : (user.name?.charAt(0).toUpperCase() || "U")}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">{user.name || "Usuário"}</p>
                <p className="text-xs text-slate-400">{getRoleName(user.role)}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
            </button>
          )}
          <button onClick={() => { setIsLoading(true); setTimeout(() => setIsLoading(false), 1000); }} disabled={isLoading} className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/10">
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            Atualizar
          </button>
          <button onClick={onLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-all border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
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

      {/* Device Map */}
      <div className="mb-8">
        <DeviceMap />
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

      <p className="text-center text-sm text-slate-500 mt-8">Pyro Alert © 2025</p>
    </div>
  );
}

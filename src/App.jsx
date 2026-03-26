import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "./api/client.js";
import { fetchOAuthToken } from "./api/oauth.js";
import { TokenStorage } from "./api/tokenStorage.js";
import { API_BASE, DEFAULT_SIGNUP } from "./constants/config.js";
import { maskCNPJ, maskCPF, maskPhone } from "./utils/masks.js";
import { LoginPage } from "./components/auth/LoginPage.jsx";
import { TwoFactorLoginPage } from "./components/auth/TwoFactorLoginPage.jsx";
import { Dashboard } from "./components/dashboard/Dashboard.jsx";
import { ProfilePage } from "./components/profile/ProfilePage.jsx";

export default function App() {
  const [route, setRoute] = useState("login");
  const [activeTab, setActiveTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [requires2FA, setRequires2FA] = useState(false);
  const [tempLoginData, setTempLoginData] = useState(null);
  const [totpCode, setTotpCode] = useState("");

  const [signup, setSignup] = useState(() => ({ ...DEFAULT_SIGNUP }));

  const [loginForm, setLoginForm] = useState({ email: "", password: "" });

  const [twoFAStatus, setTwoFAStatus] = useState(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);

  const fetchUserData = useCallback(async () => {
    try {
      const response = await apiRequest("/api/v1/auth/me");
      return response.data || response.user || response;
    } catch {
      return null;
    }
  }, []);

  const refreshAccessToken = useCallback(async () => {
    const { refresh_token } = TokenStorage.get();
    if (!refresh_token) return false;
    try {
      const { data } = await fetchOAuthToken({ grant_type: "refresh_token", refresh_token });
      if (data.access_token) {
        TokenStorage.save(data);
        return true;
      }
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
      if (!access_token) {
        setIsInitializing(false);
        return;
      }
      if (TokenStorage.isExpired() && !(await refreshAccessToken())) {
        setIsInitializing(false);
        return;
      }
      const userData = await fetchUserData();
      if (userData) {
        setUser(userData);
        setRoute("dashboard");
      } else TokenStorage.clear();
      setIsInitializing(false);
    };
    checkSession();
  }, [refreshAccessToken, fetchUserData]);

  const logout = useCallback(async () => {
    const { access_token } = TokenStorage.get();
    if (access_token) {
      try {
        await fetch(`${API_BASE}/oauth/revoke`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: access_token }),
        });
      } catch {
        /* ignore */
      }
    }
    TokenStorage.clear();
    setRoute("login");
    setLoginForm({ email: "", password: "" });
    setUser(null);
  }, []);

  useEffect(() => {
    if (route === "login") return;
    const { expiry } = TokenStorage.get();
    const timeout = setTimeout(async () => {
      if (!(await refreshAccessToken())) logout();
    }, Math.max(0, expiry - Date.now() - 60000));
    return () => clearTimeout(timeout);
  }, [route, refreshAccessToken, logout]);

  function handleSignupChange(e) {
    const { name, value } = e.target;
    if (name === "id_number") setSignup((s) => ({ ...s, [name]: s.id_type === "CPF" ? maskCPF(value) : maskCNPJ(value) }));
    else if (name === "phone") setSignup((s) => ({ ...s, [name]: maskPhone(value) }));
    else if (name === "id_type") setSignup((s) => ({ ...s, [name]: value, id_number: "" }));
    else setSignup((s) => ({ ...s, [name]: value }));
    setError("");
  }

  function handleLoginChange(e) {
    setLoginForm((l) => ({ ...l, [e.target.name]: e.target.value }));
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
      setSignup({ ...DEFAULT_SIGNUP });
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
      const { response, data } = await fetchOAuthToken({
        grant_type: "password",
        email: loginForm.email,
        password: loginForm.password,
        scope: "read write",
      });

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
      const { response, data } = await fetchOAuthToken({
        grant_type: "password",
        email: tempLoginData.email,
        password: tempLoginData.password,
        totp_code: totpCode,
        scope: "read write",
      });
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
          <img src="/LogoPyro.svg" alt="Pyro Alert" className="w-14 h-14 animate-pulse" />
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
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            error={error}
            setError={setError}
            isLoading={isLoading}
            loginForm={loginForm}
            handleLoginChange={handleLoginChange}
            submitLogin={submitLogin}
            signup={signup}
            handleSignupChange={handleSignupChange}
            submitSignup={submitSignup}
          />
        )
      ) : route === "profile" ? (
        <ProfilePage
          user={user}
          onBack={() => setRoute("dashboard")}
          onLogout={logout}
          onUpdateUser={updateUser}
          twoFAStatus={twoFAStatus}
          setTwoFAStatus={setTwoFAStatus}
        />
      ) : (
        <Dashboard user={user} onLogout={logout} onOpenProfile={openProfile} isLoadingProfile={isLoadingProfile} />
      )}
    </div>
  );
}

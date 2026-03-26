import { useState } from "react";
import { apiRequest } from "../../api/client.js";
import { formatDocument, getRoleName, maskCNPJ, maskCPF, maskPhone } from "../../utils/masks.js";
import { buildProfileEditForm } from "../../utils/profileForm.js";
import { DarkInput } from "../DarkInput.jsx";
import { Spinner } from "../Spinner.jsx";

export function ProfilePage({ user, onBack, onLogout, onUpdateUser, twoFAStatus, setTwoFAStatus }) {
  const [view, setView] = useState("main");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [setupData, setSetupData] = useState(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState(null);
  const [disablePassword, setDisablePassword] = useState("");

  const [editForm, setEditForm] = useState(() => buildProfileEditForm(user));

  function handleEditChange(e) {
    const { name, value } = e.target;
    if (name === "id_number") setEditForm((f) => ({ ...f, [name]: f.id_type === "CPF" ? maskCPF(value) : maskCNPJ(value) }));
    else if (name === "phone") setEditForm((f) => ({ ...f, [name]: maskPhone(value) }));
    else if (name === "id_type") setEditForm((f) => ({ ...f, [name]: value, id_number: "" }));
    else setEditForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError("");
    setSuccess("");
    if (!editForm.currentPassword) return setError("Digite sua senha atual");
    if (editForm.newPassword && editForm.newPassword !== editForm.confirmNewPassword) return setError("As senhas não coincidem");
    if (editForm.newPassword && editForm.newPassword.length < 6) return setError("Mínimo 6 caracteres");
    setIsLoading(true);
    try {
      const updateData = {
        name: editForm.name,
        email: editForm.email,
        phone: editForm.phone.replace(/\D/g, ""),
        id_type: editForm.id_type,
        id_number: editForm.id_number.replace(/\D/g, ""),
        currentPassword: editForm.currentPassword,
      };
      if (editForm.newPassword) updateData.newPassword = editForm.newPassword;
      await apiRequest("/api/v1/auth/me", { method: "PUT", body: JSON.stringify(updateData) });
      setSuccess("Dados atualizados!");
      setView("main");
      setEditForm((f) => ({ ...f, currentPassword: "", newPassword: "", confirmNewPassword: "" }));
      onUpdateUser();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function start2FASetup() {
    setIsLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/v1/2fa/setup", { method: "POST" });
      setSetupData(data.data || data);
      setView("2fa-setup");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function verify2FA(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const data = await apiRequest("/api/v1/2fa/verify", { method: "POST", body: JSON.stringify({ code: verifyCode }) });
      const codes = data.data?.recovery_codes || data.recovery_codes || data.data?.recoveryCodes || data.recoveryCodes;
      setTwoFAStatus({ enabled: true });

      if (codes && codes.length > 0) {
        setRecoveryCodes(codes);
        setSuccess("2FA ativado com sucesso! Guarde seus códigos de recuperação.");
      } else {
        setSuccess("Autenticação de Dois Fatores ativada com sucesso!");
        setView("main");
        setSetupData(null);
        setVerifyCode("");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  async function disable2FA(e) {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await apiRequest("/api/v1/2fa", { method: "DELETE", body: JSON.stringify({ password: disablePassword }) });
      setTwoFAStatus({ enabled: false });
      setSuccess("Autenticação de Dois Fatores desativada com sucesso.");
      setView("main");
      setDisablePassword("");
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }

  function cancelEdit() {
    setView("main");
    setError("");
    setSuccess("");
    setEditForm(buildProfileEditForm(user));
  }

  return (
    <div className="w-full max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <button type="button" onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Voltar
        </button>
        <button type="button" onClick={onLogout} className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-all border border-red-500/20">
          Sair
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center text-white text-3xl font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">{user?.name || "Usuário"}</h1>
              <p className="text-white/70">{user?.email}</p>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-3 py-1 bg-white/20 rounded-full text-sm text-white">{getRoleName(user?.role)}</span>
                {twoFAStatus?.enabled && (
                  <span className="px-3 py-1 bg-emerald-500/30 rounded-full text-sm text-emerald-300 flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    2FA Ativo
                  </span>
                )}
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
                {[
                  ["Nome", user?.name],
                  ["E-mail", user?.email],
                  ["Telefone", user?.phone ? maskPhone(user.phone) : "—"],
                  [
                    "Documento",
                    user?.id_type && user?.id_number ? `${user.id_type}: ${formatDocument(user.id_type, user.id_number)}` : "—",
                  ],
                  ["Perfil", getRoleName(user?.role)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between items-center py-3 border-b border-white/10">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-medium">{value || "—"}</span>
                  </div>
                ))}
              </div>
              <div className="space-y-4">
                <button type="button" onClick={() => setView("edit")} className="w-full py-3.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar dados
                </button>

                {twoFAStatus?.enabled ? (
                  <button type="button" onClick={() => setView("2fa-disable")} className="w-full py-3.5 bg-red-500/20 text-red-400 rounded-xl font-semibold hover:bg-red-500/30 transition-all border border-red-500/30 flex items-center justify-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Desativar 2FA
                  </button>
                ) : (
                  <button type="button" onClick={start2FASetup} disabled={isLoading} className="w-full py-3.5 bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-400 rounded-xl font-semibold hover:from-emerald-500/30 hover:to-green-500/30 transition-all border border-emerald-500/30 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <Spinner />
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    )}
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
                    <option value="CPF" className="bg-slate-800">
                      CPF
                    </option>
                    <option value="CNPJ" className="bg-slate-800">
                      CNPJ
                    </option>
                  </select>
                </div>
                <div className="col-span-2">
                  <DarkInput
                    label="Número"
                    name="id_number"
                    value={editForm.id_number}
                    onChange={handleEditChange}
                    placeholder={editForm.id_type === "CPF" ? "000.000.000-00" : "00.000.000/0000-00"}
                    disabled={isLoading}
                  />
                </div>
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
                <input
                  name="currentPassword"
                  type="password"
                  value={editForm.currentPassword}
                  onChange={handleEditChange}
                  className="w-full px-4 py-3 rounded-xl border border-orange-500/30 bg-orange-500/10 text-white placeholder-slate-500"
                  placeholder="Digite sua senha atual"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={cancelEdit} className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium" disabled={isLoading}>
                  Cancelar
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Spinner /> Salvando...
                    </>
                  ) : (
                    "Salvar"
                  )}
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
                    {recoveryCodes.map((code, i) => (
                      <div key={i} className="text-emerald-400">
                        {code}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setView("main");
                      setRecoveryCodes(null);
                      setSetupData(null);
                      setVerifyCode("");
                      setSuccess("Autenticação de Dois Fatores ativada com sucesso!");
                    }}
                    className="w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-semibold"
                  >
                    Concluir
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-white mb-2">Configure seu Autenticador</h3>
                    <p className="text-slate-400 text-sm">Escaneie o QR Code com seu app (Google Authenticator, Authy, etc)</p>
                  </div>

                  {setupData && (
                    <div className="flex justify-center">
                      {setupData.qrCode || setupData.qr_code ? (
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

                  {setupData?.secret && (
                    <div className="text-center">
                      <p className="text-slate-400 text-xs mb-2">Ou digite manualmente:</p>
                      <code className="text-emerald-400 font-mono text-sm bg-slate-900/50 px-4 py-2 rounded-lg inline-block select-all">{setupData.secret}</code>
                    </div>
                  )}

                  {setupData?.instructions && setupData.instructions.length > 0 && (
                    <div className="bg-slate-900/30 rounded-xl p-4">
                      <p className="text-slate-400 text-xs font-medium mb-2">Instruções:</p>
                      <ol className="text-slate-300 text-sm space-y-1 list-decimal list-inside">
                        {setupData.instructions.map((inst, i) => (
                          <li key={i}>{inst}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  <form onSubmit={verify2FA} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">Código de verificação</label>
                      <input
                        type="text"
                        value={verifyCode}
                        onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] font-mono rounded-xl border border-white/10 bg-white/5 text-white"
                        placeholder="000000"
                        maxLength={6}
                        required
                        disabled={isLoading}
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setView("main");
                          setSetupData(null);
                          setVerifyCode("");
                        }}
                        className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={isLoading || verifyCode.length !== 6}
                        className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isLoading ? (
                          <>
                            <Spinner /> Verificando...
                          </>
                        ) : (
                          "Ativar 2FA"
                        )}
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
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Desativar 2FA</h3>
                <p className="text-slate-400 text-sm">Isso tornará sua conta menos segura. Digite sua senha para confirmar.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Senha</label>
                <input
                  type="password"
                  value={disablePassword}
                  onChange={(e) => setDisablePassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-red-500/30 bg-red-500/10 text-white placeholder-slate-500"
                  placeholder="Digite sua senha"
                  required
                  disabled={isLoading}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setView("main");
                    setDisablePassword("");
                  }}
                  className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={isLoading} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <Spinner /> Desativando...
                    </>
                  ) : (
                    "Desativar 2FA"
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

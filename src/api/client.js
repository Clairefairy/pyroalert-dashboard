import { API_BASE } from "../constants/config.js";
import { TokenStorage } from "./tokenStorage.js";

export async function apiRequest(endpoint, options = {}) {
  const { access_token } = TokenStorage.get();
  const headers = { "Content-Type": "application/json", ...options.headers };
  if (access_token) headers["Authorization"] = `Bearer ${access_token}`;

  const response = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || data.error || data.error_description || "Erro na requisição");
  }
  return data;
}

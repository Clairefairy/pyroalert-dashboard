import { API_BASE } from "../constants/config.js";

export async function fetchOAuthToken(payload) {
  const response = await fetch(`${API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  return { response, data };
}

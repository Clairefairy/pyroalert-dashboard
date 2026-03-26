export const TokenStorage = {
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

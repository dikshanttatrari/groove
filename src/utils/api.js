export const API_BASE_URL = "http://192.168.0.103:5000";

export const apiUrl = (path) => {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};

export const getAuthHeaders = (extra = {}) => {
  const token = localStorage.getItem("groove_token");
  return {
    ...(token ? { "x-auth-token": token } : {}),
    ...extra,
  };
};

export const apiFetch = (path, options = {}) => {
  const headers = getAuthHeaders(options.headers || {});
  return fetch(apiUrl(path), {
    ...options,
    headers,
  });
};

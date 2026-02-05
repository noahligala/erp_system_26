// src/utils/apiClient.js
const apiClient = async (url, options = {}) => {
  const token = localStorage.getItem("access_token");
  if (!token) throw new Error("No access token found");

  const headers = {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (response.status === 401) {
    throw new Error("Unauthorized. Token may have expired.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Error ${response.status}: ${text}`);
  }

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    const text = await response.text();
    throw new Error("Unexpected response: " + text);
  }

  return response.json();
};

// ✅ Add helper shortcuts
apiClient.get = (url) => apiClient(url, { method: "GET" });
apiClient.post = (url, body) =>
  apiClient(url, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });

export default apiClient;

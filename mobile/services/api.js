const API_BASE_URL = "https://brilhah-backend.onrender.com";

export async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  return response.json();
}

export async function apiPost(path, data) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  return response.json();
}

export const API_BASE_URL = "http://10.190.12.129:5000";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();

  let data: any;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }

  if (!response.ok) {
    throw new Error(
      data?.message || `Request failed with status ${response.status}`
    );
  }

  return data;
}
import { API_BASE_URL } from "./api";

export async function testBackend() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    const data = await response.json();

    console.log("Campusly Backend:", data);

    return data;
  } catch (error) {
    console.error("Backend connection failed:", error);
    throw error;
  }
}
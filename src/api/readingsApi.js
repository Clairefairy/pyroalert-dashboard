import { API_BASE, TEST_DEVICE_ID } from "../constants/config.js";

export async function fetchReadingsHistory() {
  try {
    const response = await fetch(
      `${API_BASE}/api/v1/readings/device/${TEST_DEVICE_ID}/history?limit=10000`
    );
    if (!response.ok) throw new Error("Erro ao buscar histórico");
    const data = await response.json();

    let readings = [];
    if (Array.isArray(data)) {
      readings = data;
    } else if (data.readings && Array.isArray(data.readings)) {
      readings = data.readings;
    } else if (data.data && Array.isArray(data.data)) {
      readings = data.data;
    }

    return readings;
  } catch (error) {
    console.error("Erro ao buscar histórico de leituras:", error);
    return [];
  }
}

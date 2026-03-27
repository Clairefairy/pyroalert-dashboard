import { ADAFRUIT_API } from "../constants/config.js";
import { convertSmokeToPercent, convertSoilHumidityToPercent, pluviRawToMm } from "../utils/sensors.js";

export async function fetchAdafruitData() {
  try {
    const feeds = [
      { key: "pyroalert.fumo", field: "smoke" },
      { key: "pyroalert.umisolo", field: "soilHumidity" },
      { key: "pyroalert.temp22", field: "airHumidity" },
      { key: "pyroalert.umi22", field: "temperature" },
      { key: "pyroalert.sense22", field: "heatIndex" },
      { key: "pyroalert.countpluvi", field: "pluvi" },
    ];

    const results = await Promise.all(
      feeds.map(async (feed) => {
        const response = await fetch(`${ADAFRUIT_API}/${feed.key}`);
        const data = await response.json();
        return { field: feed.field, value: parseFloat(data.last_value) || 0 };
      })
    );

    const sensorData = { rawValues: {} };
    results.forEach(({ field, value }) => {
      sensorData.rawValues[field] = value;
      sensorData[field] = value;
    });

    sensorData.pluvi = pluviRawToMm(sensorData.rawValues.pluvi ?? 0);

    const rawSoilHumidity = sensorData.soilHumidity;
    sensorData.rawValues.soilHumidityRaw = rawSoilHumidity;

    sensorData.smokePercent = convertSmokeToPercent(sensorData.smoke || 0);
    sensorData.soilHumidity = parseFloat(convertSoilHumidityToPercent(rawSoilHumidity));

    return sensorData;
  } catch (error) {
    console.error("Erro ao buscar dados do Adafruit:", error);
    return null;
  }
}

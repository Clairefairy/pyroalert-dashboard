import { PERIOD_FILTERS } from "../constants/config.js";
import { pluviRawToMm, smokeRawToPercentUncapped, soilHumidityPercentFromRaw } from "./sensors.js";

export function getReadingDate(reading) {
  const possibleDates = [
    reading.smoke?.readAt,
    reading.temp?.readAt,
    reading.humid?.readAt,
    reading.moist?.readAt,
    reading.sense?.readAt,
    reading.pluvi?.readAt,
    reading.createdAt,
    reading.updatedAt,
  ].filter(Boolean);

  if (possibleDates.length === 0) return null;
  return new Date(possibleDates[0]);
}

export function filterReadingsByPeriod(readings, periodKey) {
  if (!Array.isArray(readings)) return [];

  const filter = PERIOD_FILTERS.find((f) => f.key === periodKey);

  if (!filter || filter.days === null) return readings;

  const now = new Date();
  const cutoffDate = new Date(now.getTime() - filter.days * 24 * 60 * 60 * 1000);

  return readings.filter((reading) => {
    const readDate = getReadingDate(reading);
    if (!readDate) return false;
    return readDate >= cutoffDate;
  });
}

export function processReadingsForChart(readings, sensorType) {
  if (!Array.isArray(readings) || readings.length === 0) {
    return { labels: [], values: [] };
  }

  const sorted = [...readings].sort((a, b) => {
    const dateA = getReadingDate(a) || new Date(0);
    const dateB = getReadingDate(b) || new Date(0);
    return dateA - dateB;
  });

  const labels = [];
  const values = [];

  sorted.forEach((reading) => {
    const sensorData = reading[sensorType];
    if (sensorData && sensorData.value !== undefined && sensorData.value !== null) {
      const date = new Date(sensorData.readAt || reading.createdAt);
      labels.push(
        date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      );

      let value = parseFloat(sensorData.value);

      if (sensorType === "smoke") {
        value = smokeRawToPercentUncapped(value);
      } else if (sensorType === "moist") {
        value = soilHumidityPercentFromRaw(value);
      } else if (sensorType === "pluvi") {
        value = pluviRawToMm(value);
      }

      values.push(parseFloat(value.toFixed(2)));
    }
  });

  return { labels, values };
}

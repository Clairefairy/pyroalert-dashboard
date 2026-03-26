import { SMOKE_SENSOR_MAX } from "../constants/config.js";

export function smokeRawToPercentUncapped(value) {
  return (value / SMOKE_SENSOR_MAX) * 100;
}

/** Fórmula: y = -65.79x + 169.08 (pode resultar em valores negativos) */
export function soilHumidityPercentFromRaw(value) {
  return -65.79 * value + 169.08;
}

export function getDeviceSmokeRawValue(device) {
  const rawSmoke = device?.rawValues?.smoke;
  if (typeof rawSmoke === "number" && !Number.isNaN(rawSmoke)) return rawSmoke;

  const smokePercent = parseFloat(device?.smokePercent);
  if (!Number.isNaN(smokePercent)) return (smokePercent / 100) * SMOKE_SENSOR_MAX;

  return 0;
}

export function convertSmokeToPercent(value) {
  const percent = smokeRawToPercentUncapped(value);
  return Math.min(100, Math.max(0, percent)).toFixed(1);
}

export function convertSoilHumidityToPercent(value) {
  return soilHumidityPercentFromRaw(value).toFixed(1);
}

export function calculateRiskFromSensors(device) {
  let riskPoints = 0;

  if (device.temperature < 28) riskPoints += 0;
  else if (device.temperature <= 33) riskPoints += 1;
  else if (device.temperature <= 38) riskPoints += 2;
  else riskPoints += 3;

  if (device.airHumidity > 45) riskPoints += 0;
  else if (device.airHumidity >= 30) riskPoints += 1;
  else if (device.airHumidity >= 20) riskPoints += 2;
  else riskPoints += 3;

  if (device.soilHumidity > 30) riskPoints += 0;
  else if (device.soilHumidity >= 20) riskPoints += 1;
  else if (device.soilHumidity >= 10) riskPoints += 2;
  else riskPoints += 3;

  const smokePercent = parseFloat(device.smokePercent) || 0;
  if (smokePercent <= 3) riskPoints += 0;
  else if (smokePercent <= 6) riskPoints += 1;
  else if (smokePercent <= 10) riskPoints += 2;
  else riskPoints += 3;

  if (device.heatIndex < 30) riskPoints += 0;
  else if (device.heatIndex <= 36) riskPoints += 1;
  else if (device.heatIndex <= 40) riskPoints += 2;
  else riskPoints += 3;

  const riskPercent = Math.round((riskPoints / 15) * 100);

  let riskLevel;
  if (riskPercent <= 25) riskLevel = "low";
  else if (riskPercent <= 50) riskLevel = "moderate";
  else if (riskPercent <= 75) riskLevel = "high";
  else riskLevel = "critical";

  return { riskLevel, riskPercent };
}

import L from "leaflet";
import { riskLevelToCssSuffix } from "../../utils/risk.js";

export function createDeviceIcon(device) {
  const level = riskLevelToCssSuffix(device.riskLevel);
  const isAlert = Boolean(device.isAlerting);

  const pulseClass = isAlert ? "pulse-ring-bg--alert" : `pulse-ring-bg--${level}`;
  const iconBoxClass = `marker-icon marker-icon--${level}`;

  const centerIcon = isAlert
    ? `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" class="marker-center-svg marker-center-svg--alert">
        <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v4m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.34 18c-.77 1.333.192 3 1.732 3z" />
      </svg>
    `
    : `
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" class="marker-center-svg marker-center-svg--${level}">
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    `;

  return L.divIcon({
    className: "custom-device-marker",
    html: `
      <div class="device-marker-wrapper ${isAlert ? "device-marker-wrapper-alert" : ""}">
        <div class="pulse-ring ${isAlert ? "pulse-ring-alert" : ""} ${pulseClass}"></div>
        <div class="pulse-ring pulse-ring-delayed ${isAlert ? "pulse-ring-alert" : ""} ${pulseClass}"></div>
        <div class="${iconBoxClass}">
          ${centerIcon}
        </div>
        <div class="marker-badge marker-badge--${level}">${device.riskPercent}%</div>
        <div class="marker-label">${device.name}</div>
      </div>
    `,
    iconSize: [120, 90],
    iconAnchor: [60, 45],
  });
}

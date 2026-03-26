export const SENSOR_CHART_CONFIGS = {
  temp: {
    label: "Temperatura (°C)",
    color: "rgb(249, 115, 22)",
    bgColor: "rgba(249, 115, 22, 0.1)",
    unit: "°C",
    badgeClass: "chart-sensor-badge--temp",
  },
  humid: {
    label: "Umidade do Ar (%)",
    color: "rgb(59, 130, 246)",
    bgColor: "rgba(59, 130, 246, 0.1)",
    unit: "%",
    badgeClass: "chart-sensor-badge--humid",
  },
  moist: {
    label: "Umidade do Solo (%)",
    color: "rgb(245, 158, 11)",
    bgColor: "rgba(245, 158, 11, 0.1)",
    unit: "%",
    badgeClass: "chart-sensor-badge--moist",
  },
  sense: {
    label: "Sensação Térmica (°C)",
    color: "rgb(236, 72, 153)",
    bgColor: "rgba(236, 72, 153, 0.1)",
    unit: "°C",
    badgeClass: "chart-sensor-badge--sense",
  },
  smoke: {
    label: "Fumaça (%)",
    color: "rgb(34, 197, 94)",
    bgColor: "rgba(34, 197, 94, 0.1)",
    unit: "%",
    badgeClass: "chart-sensor-badge--smoke",
  },
};

export const CHART_SECTION_SENSORS = [
  { key: "temp", title: "Temperatura", icon: "🌡️" },
  { key: "humid", title: "Umidade do Ar", icon: "💧" },
  { key: "moist", title: "Umidade do Solo", icon: "🌱" },
  { key: "sense", title: "Sensação Térmica", icon: "☀️" },
  { key: "smoke", title: "Fumaça", icon: "💨" },
];

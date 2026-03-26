export const API_BASE = "https://pyroalert-mongodb.onrender.com";
export const ADAFRUIT_API = "https://io.adafruit.com/api/v2/pyroalert/feeds";
export const TEST_DEVICE_ID = "693306c876c035b62570fee6";
export const FIRE_SMOKE_THRESHOLD = 0.7;
/** Escala bruta do sensor de fumaça (0–4.8 corresponde a 0–100% na UI) */
export const SMOKE_SENSOR_MAX = 4.8;

export const PERIOD_FILTERS = [
  { key: "all", label: "Desde o início", days: null },
  { key: "1y", label: "Último ano", days: 365 },
  { key: "6m", label: "Últimos 6 meses", days: 180 },
  { key: "3m", label: "Últimos 3 meses", days: 90 },
  { key: "30d", label: "Últimos 30 dias", days: 30 },
  { key: "7d", label: "Última semana", days: 7 },
];

export const INITIAL_DEVICES = [
  {
    id: "001",
    name: "Dispositivo 001",
    lat: -8.05250294245876,
    lng: -34.885167228331994,
    status: "active",
    riskLevel: "moderate",
    riskPercent: 75,
    airHumidity: 15,
    soilHumidity: 8,
    temperature: 32,
    heatIndex: 35,
    smokePercent: 9.5,
    isRealData: true,
    rawValues: {},
  },
  {
    id: "002",
    name: "Dispositivo 002",
    lat: -8.052295054820497,
    lng: -34.885848827371845,
    status: "active",
    riskLevel: "moderate",
    riskPercent: 40,
    airHumidity: 45,
    soilHumidity: 22,
    temperature: 28,
    heatIndex: 30,
    smokePercent: 3.8,
    isRealData: false,
  },
  {
    id: "003",
    name: "Dispositivo 003",
    lat: -8.053875417301851,
    lng: -34.884462003473075,
    status: "active",
    riskLevel: "high",
    riskPercent: 85,
    airHumidity: 10,
    soilHumidity: 5,
    temperature: 38,
    heatIndex: 42,
    smokePercent: 12.9,
    isRealData: false,
  },
  {
    id: "004",
    name: "Dispositivo 004",
    lat: -8.054121070740555,
    lng: -34.88502135754518,
    status: "active",
    riskLevel: "low",
    riskPercent: 25,
    airHumidity: 65,
    soilHumidity: 40,
    temperature: 24,
    heatIndex: 25,
    smokePercent: 2.5,
    isRealData: false,
  },
];

export const DEFAULT_SIGNUP = {
  name: "",
  email: "",
  password: "",
  confirmPassword: "",
  phone: "",
  id_type: "CPF",
  id_number: "",
  role: "viewer",
};

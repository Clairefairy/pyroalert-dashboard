import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchAdafruitData } from "../../api/adafruit.js";
import { FIRE_SMOKE_THRESHOLD, INITIAL_DEVICES } from "../../constants/config.js";
import { calculateRiskFromSensors, getDeviceSmokeRawValue } from "../../utils/sensors.js";
import { getRoleName } from "../../utils/masks.js";
import { FireAlertModal } from "../FireAlertModal.jsx";
import { Spinner } from "../Spinner.jsx";
import { SensorChartsSection } from "../charts/SensorChartsSection.jsx";
import { DeviceMap } from "../map/DeviceMap.jsx";

export function Dashboard({ user, onLogout, onOpenProfile, isLoadingProfile }) {
  const [isLoading, setIsLoading] = useState(false);
  const [devices, setDevices] = useState(INITIAL_DEVICES);
  const [, setLastUpdate] = useState(new Date().toLocaleString("pt-BR"));
  const [isFireAlertVisible, setIsFireAlertVisible] = useState(false);
  const [isFireAlertAcknowledged, setIsFireAlertAcknowledged] = useState(false);
  const [isShortcutAlertActive, setIsShortcutAlertActive] = useState(false);
  const fireAudioRef = useRef(null);
  const isUpdatingRef = useRef(false);
  const shortcutAlertRef = useRef(false);

  const device001 = useMemo(() => devices.find((device) => device.id === "001") || null, [devices]);

  const isDevice001InFireRisk = useMemo(
    () => (device001 ? getDeviceSmokeRawValue(device001) > FIRE_SMOKE_THRESHOLD : false),
    [device001]
  );

  const isFireActive = isShortcutAlertActive || isDevice001InFireRisk;

  useEffect(() => {
    shortcutAlertRef.current = isShortcutAlertActive;
  }, [isShortcutAlertActive]);

  const updateDeviceData = useCallback(async () => {
    if (isUpdatingRef.current) return;

    isUpdatingRef.current = true;
    setIsLoading(true);
    try {
      const adafruitData = await fetchAdafruitData();
      if (adafruitData) {
        const latestSmokeRaw = adafruitData.rawValues?.smoke ?? 0;
        const isApiFireRisk = latestSmokeRaw > FIRE_SMOKE_THRESHOLD;

        setDevices((prevDevices) =>
          prevDevices.map((device) => {
            if (device.id === "001") {
              const updatedDevice = {
                ...device,
                temperature: adafruitData.temperature || device.temperature,
                airHumidity: adafruitData.airHumidity || device.airHumidity,
                soilHumidity: adafruitData.soilHumidity || device.soilHumidity,
                heatIndex: adafruitData.heatIndex || device.heatIndex,
                smokePercent: parseFloat(adafruitData.smokePercent) || device.smokePercent,
                pluvi:
                  typeof adafruitData.pluvi === "number" && !Number.isNaN(adafruitData.pluvi)
                    ? adafruitData.pluvi
                    : device.pluvi,
                rawValues: adafruitData.rawValues || {},
              };
              const { riskLevel, riskPercent } = calculateRiskFromSensors(updatedDevice);
              return { ...updatedDevice, riskLevel, riskPercent };
            }
            const { riskLevel, riskPercent } = calculateRiskFromSensors(device);
            return { ...device, riskLevel, riskPercent };
          })
        );
        setLastUpdate(new Date().toLocaleString("pt-BR"));

        if (!isApiFireRisk && !shortcutAlertRef.current) {
          setIsFireAlertAcknowledged(false);
        }
      }
    } catch (error) {
      console.error("Erro ao atualizar dados:", error);
    } finally {
      setIsLoading(false);
      isUpdatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    updateDeviceData();
    const interval = setInterval(updateDeviceData, 5000);
    return () => clearInterval(interval);
  }, [updateDeviceData]);

  useEffect(() => {
    function onKeyDown(event) {
      if (event.shiftKey && event.key.toLowerCase() === "a") {
        setIsShortcutAlertActive(true);
        setIsFireAlertAcknowledged(false);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (isFireActive && !isFireAlertAcknowledged) {
      setIsFireAlertVisible(true);
    } else {
      setIsFireAlertVisible(false);
    }
  }, [isFireActive, isFireAlertAcknowledged]);

  useEffect(() => {
    if (!fireAudioRef.current) {
      fireAudioRef.current = new Audio("/alert.mp3");
      fireAudioRef.current.preload = "auto";
      fireAudioRef.current.loop = true;
    }

    if (isFireAlertVisible) {
      fireAudioRef.current.play().catch((error) => console.warn("Nao foi possivel tocar o alerta sonoro:", error));
    } else {
      fireAudioRef.current.pause();
      fireAudioRef.current.currentTime = 0;
    }

    return () => {
      if (fireAudioRef.current) {
        fireAudioRef.current.pause();
      }
    };
  }, [isFireAlertVisible]);

  const devicesWithAlertState = useMemo(
    () =>
      devices.map((device) => ({
        ...device,
        isAlerting: device.id === "001" && isFireActive,
      })),
    [devices, isFireActive]
  );

  const acknowledgeAlert = useCallback(() => {
    setIsFireAlertVisible(false);
    setIsFireAlertAcknowledged(true);
  }, []);

  const averages = useMemo(() => {
    const sum = devices.reduce(
      (acc, d) => ({
        temperature: acc.temperature + d.temperature,
        airHumidity: acc.airHumidity + d.airHumidity,
        soilHumidity: acc.soilHumidity + d.soilHumidity,
        heatIndex: acc.heatIndex + d.heatIndex,
        smokePercent: acc.smokePercent + (parseFloat(d.smokePercent) || 0),
        pluvi: acc.pluvi + (typeof d.pluvi === "number" ? d.pluvi : parseFloat(d.pluvi) || 0),
      }),
      { temperature: 0, airHumidity: 0, soilHumidity: 0, heatIndex: 0, smokePercent: 0, pluvi: 0 }
    );

    const count = devices.length;
    return {
      temperature: (sum.temperature / count).toFixed(1),
      airHumidity: Math.round(sum.airHumidity / count),
      soilHumidity: Math.round(sum.soilHumidity / count),
      heatIndex: (sum.heatIndex / count).toFixed(1),
      smokePercent: (sum.smokePercent / count).toFixed(1),
      pluvi: (sum.pluvi / count).toFixed(1),
    };
  }, [devices]);

  return (
    <div className="w-full max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <img src="/LogoPyro.svg" alt="Pyro Alert" className="w-14 h-14" />
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Dashboard Pyro Alert</h1>
            <p className="text-slate-400">Monitoramento de riscos de incêndio</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {user && (
            <button
              type="button"
              onClick={onOpenProfile}
              disabled={isLoadingProfile}
              className="hidden md:flex items-center gap-3 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all disabled:opacity-70"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-semibold text-sm">
                {isLoadingProfile ? <Spinner className="w-4 h-4" /> : user.name?.charAt(0).toUpperCase() || "U"}
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-white">{user.name || "Usuário"}</p>
                <p className="text-xs text-slate-400">{getRoleName(user.role)}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          )}
          <button
            type="button"
            onClick={updateDeviceData}
            disabled={isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition-all border border-white/10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </button>
          <button type="button" onClick={onLogout} className="flex items-center gap-2 px-5 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl font-medium transition-all border border-red-500/20">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sair
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 sm:gap-3 mb-8">
        <div className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-orange-500/20 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-orange-300 uppercase tracking-wide truncate">Temp.</span>
            <div className="w-7 h-7 shrink-0 bg-orange-500/20 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 tabular-nums">{averages.temperature}°C</div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate">Média</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500/20 to-cyan-500/20 backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-blue-500/20 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-blue-300 uppercase tracking-wide truncate">Umid. ar</span>
            <div className="w-7 h-7 shrink-0 bg-blue-500/20 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
              </svg>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 tabular-nums">{averages.airHumidity}%</div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate">Média</p>
        </div>

        <div className="bg-gradient-to-br from-amber-500/20 to-yellow-500/20 backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-amber-500/20 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-amber-300 uppercase tracking-wide truncate">Umid. solo</span>
            <div className="w-7 h-7 shrink-0 bg-amber-500/20 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 tabular-nums">{averages.soilHumidity}%</div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate">Média</p>
        </div>

        <div className="bg-gradient-to-br from-rose-500/20 to-pink-500/20 backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-rose-500/20 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-rose-300 uppercase tracking-wide truncate">Sens. térm.</span>
            <div className="w-7 h-7 shrink-0 bg-rose-500/20 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 tabular-nums">{averages.heatIndex}°C</div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate">Média</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-emerald-500/20 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-emerald-300 uppercase tracking-wide truncate">Fumaça</span>
            <div className="w-7 h-7 shrink-0 bg-emerald-500/20 rounded-lg flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
              </svg>
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 tabular-nums">{averages.smokePercent}%</div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate">Média</p>
        </div>

        <div className="bg-gradient-to-br from-sky-500/20 to-cyan-600/20 backdrop-blur-xl p-3 sm:p-4 rounded-xl border border-sky-500/25 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-[10px] sm:text-xs font-medium text-sky-300 uppercase tracking-wide truncate">Pluviôm.</span>
            <div className="w-7 h-7 shrink-0 bg-sky-500/20 rounded-lg flex items-center justify-center text-sm" aria-hidden>
              🌧️
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-0.5 tabular-nums">{averages.pluvi} mm</div>
          <p className="text-[10px] sm:text-xs text-slate-400 truncate">Média</p>
        </div>
      </div>

      <div className="mb-8">
        <DeviceMap devices={devicesWithAlertState} />
      </div>

      <div className="mb-8">
        <SensorChartsSection />
      </div>

      <p className="text-center text-sm text-slate-500 mt-8">Pyro Alert © 2025</p>

      {isFireAlertVisible && (
        <FireAlertModal device={device001 || { id: "001", smokePercent: 0 }} onAcknowledge={acknowledgeAlert} />
      )}
    </div>
  );
}

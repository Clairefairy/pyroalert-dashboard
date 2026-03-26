import { useEffect, useMemo, useState } from "react";
import { fetchReadingsHistory } from "../../api/readingsApi.js";
import { PERIOD_FILTERS } from "../../constants/config.js";
import { CHART_SECTION_SENSORS, SENSOR_CHART_CONFIGS } from "../../chart/sensorChartConstants.js";
import { filterReadingsByPeriod } from "../../utils/readings.js";
import { Spinner } from "../Spinner.jsx";
import { SensorChart } from "./SensorChart.jsx";

export function SensorChartsSection() {
  const [readings, setReadings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("all");
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReadings() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchReadingsHistory();
        setReadings(data);
      } catch (err) {
        console.error("Erro ao carregar:", err);
        setError("Erro ao carregar histórico");
      } finally {
        setIsLoading(false);
      }
    }
    loadReadings();
  }, []);

  const filteredReadings = useMemo(
    () => filterReadingsByPeriod(readings, selectedPeriod),
    [readings, selectedPeriod]
  );

  return (
    <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-white">Evolução das Leituras</h3>
          <p className="text-sm text-slate-400">Histórico do dispositivo de teste</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {PERIOD_FILTERS.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => setSelectedPeriod(filter.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                selectedPeriod === filter.key
                  ? "bg-indigo-500 text-white"
                  : "bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-[400px]">
          <div className="flex flex-col items-center gap-3">
            <Spinner className="w-8 h-8 text-indigo-400" />
            <p className="text-slate-400 text-sm">Carregando histórico...</p>
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      ) : readings.length === 0 ? (
        <div className="flex items-center justify-center h-[200px]">
          <p className="text-slate-400 text-sm">Nenhuma leitura encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {CHART_SECTION_SENSORS.map(({ key, title, icon }) => (
            <div key={key} className="bg-slate-800/30 rounded-xl p-4 border border-white/5">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-lg">{icon}</span>
                <h4 className="text-sm font-medium text-white">{title}</h4>
                <span className={`ml-auto px-2 py-0.5 text-xs rounded-full ${SENSOR_CHART_CONFIGS[key].badgeClass}`}>
                  {filteredReadings.length} leituras
                </span>
              </div>
              <SensorChart readings={filteredReadings} sensorType={key} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

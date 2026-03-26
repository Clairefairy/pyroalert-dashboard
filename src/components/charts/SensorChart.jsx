import { useMemo } from "react";
import { Line } from "react-chartjs-2";
import { SENSOR_CHART_CONFIGS } from "../../chart/sensorChartConstants.js";
import { createSensorLineChartOptions } from "../../chart/sensorChartOptions.js";
import { processReadingsForChart } from "../../utils/readings.js";

export function SensorChart({ readings, sensorType }) {
  const config = SENSOR_CHART_CONFIGS[sensorType];

  const chartData = useMemo(
    () => processReadingsForChart(readings, sensorType),
    [readings, sensorType]
  );

  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: config.label,
        data: chartData.values,
        borderColor: config.color,
        backgroundColor: config.bgColor,
        fill: true,
        tension: 0.4,
        pointRadius: chartData.values.length > 50 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: config.color,
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
      },
    ],
  };

  const options = useMemo(() => createSensorLineChartOptions(config), [config]);

  if (chartData.values.length === 0) {
    return (
      <div className="h-[200px] flex items-center justify-center text-slate-500 text-sm">
        Sem dados disponíveis para este período
      </div>
    );
  }

  return (
    <div className="h-[200px]">
      <Line data={data} options={options} />
    </div>
  );
}

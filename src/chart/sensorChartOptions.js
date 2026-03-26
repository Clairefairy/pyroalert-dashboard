export function createSensorLineChartOptions(config) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: "rgba(15, 23, 42, 0.95)",
        titleColor: "#fff",
        bodyColor: "#94a3b8",
        borderColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        padding: 12,
        displayColors: false,
        callbacks: {
          label: (context) => `${context.parsed.y}${config.unit}`,
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#64748b",
          maxRotation: 45,
          minRotation: 0,
          maxTicksLimit: 8,
          font: { size: 10 },
        },
      },
      y: {
        grid: {
          color: "rgba(255, 255, 255, 0.05)",
        },
        ticks: {
          color: "#64748b",
          callback: (value) => `${value}${config.unit}`,
          font: { size: 10 },
        },
      },
    },
    interaction: {
      intersect: false,
      mode: "index",
    },
  };
}

import React, { useEffect, useRef } from "react";
import { Chart, ChartConfiguration, registerables } from "chart.js";

Chart.register(...registerables);

interface ChartProps {
  data: number[];
  labels: string[];
}

const MyChart: React.FC<ChartProps> = ({ data, labels }) => {
  const chartRef = useRef<HTMLCanvasElement | null>(null);
  const chartInstance = useRef<Chart | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;

    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const ctx = chartRef.current.getContext("2d");
    if (ctx) {
      const config: ChartConfiguration = {
        type: "line",
        data: {
          labels: labels,
          datasets: [
            {
              label: "API Latency (s)",
              data: data,
              borderColor: "blue",
              borderWidth: 2,
              fill: false,
            },
          ],
        },
      };

      chartInstance.current = new Chart(ctx, config);
    }

    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy();
      }
    };
  }, [data, labels]);

  return <canvas ref={chartRef}></canvas>;
};

export default MyChart;

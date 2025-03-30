import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface RequestStats {
    GET: { count: number; errors: number };
    POST: { count: number; errors: number };
    UPDATE: { count: number; errors: number };
}

interface Props {
    requestStats: RequestStats;
}

const BarChart: React.FC<Props> = ({ requestStats }) => {
    const data = {
        labels: ["GET", "POST", "UPDATE"],
        datasets: [
            {
                label: "Successful Requests",
                data: [requestStats.GET.count-requestStats.GET.errors, requestStats.POST.count-requestStats.POST.errors, requestStats.UPDATE.count-requestStats.UPDATE.errors],
                backgroundColor: "green",
            },
            {
                label: "Errors",
                data: [requestStats.GET.errors, requestStats.POST.errors, requestStats.UPDATE.errors],
                backgroundColor: "red",
            },
        ],
    };

    const options = {
        responsive: true,
        plugins: {
            legend: { position: "top" as const },
            title: { display: true, text: "API Request Count & Error Rate" },
        },
    };

    return <Bar data={data} options={options} />;
};

export default BarChart;

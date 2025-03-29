import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface PerformanceData {
    timestamp: string;
    avgResponseTime: number;
    errorRate: number;
}

export default function ComparativeAnalysis() {
    const [historicalData, setHistoricalData] = useState<PerformanceData[]>([]);
    const [baselineData, setBaselineData] = useState<PerformanceData[]>([]);
    const [loading, setLoading] = useState(false);
    const [dateRange, setDateRange] = useState("7d"); 

    useEffect(() => {
        fetchData();
    }, [dateRange]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("http://localhost:5000/api/performance", {
                params: { range: dateRange },
            });

            const baseline = data.map((item: PerformanceData) => ({
                ...item,
                avgResponseTime: item.avgResponseTime * 1.2, 
                errorRate: item.errorRate * 0.8, 
            }));

            setHistoricalData(data);
            setBaselineData(baseline);
        } catch (error) {
            console.error("Error fetching performance data:", error);
        }
        setLoading(false);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Comparative Analysis</h2>

            {/* Date Range Selection */}
            <div className="mb-4 flex gap-2">
                {["7d", "30d", "90d"].map(range => (
                    <button
                        key={range}
                        className={`p-2 rounded-lg ${dateRange === range ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                        onClick={() => setDateRange(range)}
                    >
                        Last {range}
                    </button>
                ))}
            </div>

            {/* Loading state */}
            {loading ? (
                <p className="text-gray-600">Loading...</p>
            ) : (
                <div>
                    <h3 className="text-lg font-semibold mt-6">Performance Over Time</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={historicalData}>
                            <XAxis dataKey="timestamp" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="avgResponseTime" stroke="#2563eb" name="Current" />
                            <Line type="monotone" dataKey="baselineAvgResponseTime" stroke="#ff0000" name="Baseline" />
                        </LineChart>
                    </ResponsiveContainer>

                    <h3 className="text-lg font-semibold mt-6">Error Rate Comparison</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={historicalData}>
                            <XAxis dataKey="timestamp" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="errorRate" stroke="#f97316" name="Current" />
                            <Line type="monotone" dataKey="baselineErrorRate" stroke="#16a34a" name="Baseline" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    );
}

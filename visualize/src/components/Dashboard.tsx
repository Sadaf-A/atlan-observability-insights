import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { 
    LineChart, 
    Line, 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer 
} from 'recharts';

interface Metric {
    _id: string;
    method: string;
    route: string;
    status: number;
    latency: number;
    timestamp: string;
    error?: string;
}

interface RequestStats {
    GET: { count: number; errors: number };
    POST: { count: number; errors: number };
    PUT: { count: number; errors: number };
    DELETE: { count: number; errors: number };
    PATCH: { count: number; errors: number };
}

interface ResourceMetrics {
    memory: {
        rss: number;
        heapTotal: number;
        heapUsed: number;
        external: number;
    };
    cpu: {
        loadAvg1min: number;
    };
}

interface WebSocketMessage {
    metrics: Metric[];
    requestStats: RequestStats;
    resourceMetrics?: ResourceMetrics;
}


const Dashboard: React.FC = () => {
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [averageLatencyByMethod, setAverageLatencyByMethod] = useState<Record<string, number>>({});
    const [requestStats, setRequestStats] = useState<RequestStats>({
        GET: { count: 0, errors: 0 },
        POST: { count: 0, errors: 0 },
        PUT: { count: 0, errors: 0 },
        DELETE: { count: 0, errors: 0 },
        PATCH: { count: 0, errors: 0 },
    });
    const [resourceMetrics, setResourceMetrics] = useState<ResourceMetrics | null>(null);
    const [monitoredUrl, setMonitoredUrl] = useState<string>(localStorage.getItem("monitoredUrl") || "");
    const [inputUrl, setInputUrl] = useState<string>("");
    const [isMonitoring, setIsMonitoring] = useState(false);
    const [isConnected, setIsConnected] = useState(false);

    const latencyChartData = metrics.map((metric) => ({
        name: metric.timestamp ? new Date(metric.timestamp).toLocaleTimeString() : "",
        latency: metric.latency,
        method: metric.method
    })).reverse();

    const errorData = Object.entries(requestStats).map(([method, stats]) => ({
        method,
        errorRate: stats.count > 0 ? (stats.errors / stats.count) * 100 : 0, 
    }));

    const resourceChartData = resourceMetrics ? [
        { name: "RSS", value: resourceMetrics.memory.rss },
        { name: "Heap Total", value: resourceMetrics.memory.heapTotal },
        { name: "Heap Used", value: resourceMetrics.memory.heapUsed },
        { name: "External", value: resourceMetrics.memory.external },
        { name: "CPU Load (1min)", value: resourceMetrics.cpu.loadAvg1min }
    ] : [];

        useEffect(() => {
            const methodLatencies = metrics.reduce((acc, metric) => {
                if (!acc[metric.method]) {
                    acc[metric.method] = { totalLatency: 0, count: 0 };
                }
                acc[metric.method].totalLatency += metric.latency;
                acc[metric.method].count += 1;
                return acc;
            }, {} as Record<string, { totalLatency: number; count: number }>);
    
            const averages = Object.entries(methodLatencies).reduce((acc, [method, data]) => {
                acc[method] = data.totalLatency / data.count;
                return acc;
            }, {} as Record<string, number>);
    
            setAverageLatencyByMethod(averages);
        }, [metrics]);
    
        const averageLatencyChartData = Object.entries(averageLatencyByMethod).map(([method, avgLatency]) => ({
            method,
            avgLatency,
        }));

    const connectWebSocket = useCallback(() => {
        const socket = new WebSocket("ws://localhost:8080");

        socket.onopen = () => {
            toast.success("Connected to WebSocket");
            setIsConnected(true);
        };

        socket.onmessage = (event) => {
            try {
                const data: WebSocketMessage = JSON.parse(event.data);
                
                if (data.metrics && Array.isArray(data.metrics)) {
                    setMetrics(prevMetrics => [...data.metrics]);
                }

                if (data.requestStats) {
                    setRequestStats(data.requestStats);
                }

                if (data.resourceMetrics) {
                    setResourceMetrics(data.resourceMetrics);
                }
            } catch (error) {
                toast.error("Error parsing WebSocket message");
                console.error("WebSocket message parsing error:", error);
            }
        };

        socket.onerror = () => {
            toast.error("WebSocket connection error");
            setIsConnected(false);
        };

        socket.onclose = () => {
            toast.warn("WebSocket disconnected. Attempting to reconnect...");
            setIsConnected(false);
            
            setTimeout(connectWebSocket, 3000);
        };

        return socket;
    }, []);
    
    useEffect(() => {
        const socket = connectWebSocket();

        return () => socket.close();
    }, [connectWebSocket]);

    const handleSetUrl = async () => {
        if (!inputUrl) {
            toast.error("Please enter a valid URL");
            return;
        }

        try {
            new URL(inputUrl);

            setMetrics([]);
            setRequestStats({
                GET: { count: 0, errors: 0 },
                POST: { count: 0, errors: 0 },
                PUT: { count: 0, errors: 0 },
                DELETE: { count: 0, errors: 0 },
                PATCH: { count: 0, errors: 0 },
            });
            setAverageLatencyByMethod({});

            await axios.post(`http://localhost:5000/api/set-url`, { url: inputUrl });
            
            localStorage.setItem("monitoredUrl", inputUrl);
            setMonitoredUrl(inputUrl);
            setIsMonitoring(true);

            toast.success(`Now monitoring ${inputUrl}`);
        } catch (error) {
            toast.error("Failed to set monitoring URL");
            console.error(error);
        }
    };

    const handleStopMonitoring = async () => {
        try {
            await axios.post(`http://localhost:5000/api/stop-monitoring`);
            
            setMonitoredUrl("");
            setMetrics([]);
            setRequestStats({
                GET: { count: 0, errors: 0 },
                POST: { count: 0, errors: 0 },
                PUT: { count: 0, errors: 0 },
                DELETE: { count: 0, errors: 0 },
                PATCH: { count: 0, errors: 0 },
            });
            setAverageLatencyByMethod({});
            
            localStorage.removeItem("monitoredUrl");
            setIsMonitoring(false);

            toast.info("Monitoring stopped");
        } catch (error) {
            toast.error("Failed to stop monitoring");
            console.error(error);
        }
    };

    return (
        <div className="container mx-auto p-4">
            <ToastContainer position="top-right" />
            
            <h2 className="text-2xl font-bold mb-4">API Monitoring Dashboard</h2>
            
            <div className="flex mb-4">
                <input
                    type="text"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="Enter URL to monitor"
                    className="flex-grow p-2 border rounded-l"
                />
                <button 
                    onClick={handleSetUrl}
                    className="bg-blue-500 text-white p-2 rounded-r"
                >
                    Start Monitoring
                </button>
            </div>
            
            {isMonitoring && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <p className="font-semibold">
                            Monitoring:
                            <span className="text-blue-600 ml-2">{monitoredUrl}</span>
                        </p>
                        <button 
                            onClick={handleStopMonitoring}
                            className="bg-red-500 text-white p-2 rounded"
                        >
                            Stop Monitoring
                        </button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                        {/* Latency Line Chart */}
                        <div className="border p-4 rounded">
                            <h3 className="text-lg font-semibold mb-2">Latency Over Time</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <LineChart data={latencyChartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis label={{ value:'Latency (ms)', angle:-90 }} />
                                    <Tooltip />
                                    <Legend />
                                    <Line type="monotone" dataKey="latency" stroke="#8884d8" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Status Code Line Chart */}
                        <div className="border p-4 rounded">
                        <h3 className="text-lg font-semibold mb-2">Average Latency by Method</h3>
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={averageLatencyChartData}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="method" />
                                <YAxis label={{ value: 'Average Latency (ms)', angle: -90 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="avgLatency" fill="#8884d8" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="border p-4 rounded">
    <h3 className="text-lg font-semibold mb-2">Error Rate (%)</h3>
    <ResponsiveContainer width="100%" height={300}>
        <BarChart data={errorData}>
            <XAxis dataKey="method" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="errorRate" fill="#FF5733" />
        </BarChart>
    </ResponsiveContainer>
</div>
                    </div>
                    <div className="border p-4 rounded">
                            <h3 className="text-lg font-semibold mb-2">System Resource Usage</h3>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={resourceChartData}>
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="value" fill="#00C49F" />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                </div>
            )}

            {!isMonitoring && (
                <div className="text-center text-gray-500 mt-8">
                    Enter a URL to start monitoring
                </div>
            )}
        </div>
    );
};

export default Dashboard;

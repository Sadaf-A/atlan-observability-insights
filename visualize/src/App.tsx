import React, { useEffect, useState } from "react";
import axios from "axios";
import MyChart from "./Chart"; 
import BarChart from "./BarChart"; 

interface Metric {
    _id: string;
    method: string;
    route: string;
    status: number;
    latency: number;
    timestamp: string;
}

interface RequestStats {
    GET: { count: number; errors: number };
    POST: { count: number; errors: number };
    UPDATE: { count: number; errors: number };
}

const App: React.FC = () => {
    const [metrics, setMetrics] = useState<Metric[]>([]);
    const [requestStats, setRequestStats] = useState<RequestStats>({
        GET: { count: 0, errors: 0 },
        POST: { count: 0, errors: 0 },
        UPDATE: { count: 0, errors: 0 },
    });

    useEffect(() => {
        axios.get<Metric[]>("http://localhost:5000/api/metrics")
            .then((response) => setMetrics(response.data))
            .catch((error) => console.error("Error fetching metrics:", error));
    }, []);

    useEffect(() => {
        axios.get<RequestStats>("http://localhost:5000/api/request-stats")
            .then((response) => setRequestStats(response.data))
            .catch((error) => console.error("Error fetching request stats:", error));
    }, []);

    useEffect(() => {
        let socket: WebSocket;
        let reconnectTimeout: NodeJS.Timeout;

        const connectWebSocket = () => {
            socket = new WebSocket("ws://localhost:8080");

            socket.onopen = () => console.log("Connected to WebSocket");

            socket.onmessage = (event: MessageEvent) => {
                const data = JSON.parse(event.data);
            
                if ("method" in data && "latency" in data) {
                    setMetrics((prevMetrics = []) => [...prevMetrics, data]);
            
                    setRequestStats((prevStats) => {
                        const updatedStats = { ...prevStats };
                        const method = data.method as keyof typeof prevStats;
            
                        if (updatedStats[method]) {
                            updatedStats[method].count += 1;
                            if (data.status >= 400) {
                                updatedStats[method].errors += 1;
                            }
                        }
            
                        return updatedStats;
                    });
                }
            
                if ("GET" in data || "POST" in data || "UPDATE" in data) {
                    setRequestStats({
                        GET: data.GET || { count: 0, errors: 0 },
                        POST: data.POST || { count: 0, errors: 0 },
                        UPDATE: data.UPDATE || { count: 0, errors: 0 },
                    });
                }
            };
            

            socket.onerror = (error) => console.error("WebSocket Error:", error);

            socket.onclose = () => {
                console.warn("WebSocket closed. Reconnecting in 3 seconds...");
                clearTimeout(reconnectTimeout);
                reconnectTimeout = setTimeout(connectWebSocket, 3000);
            };
        };

        connectWebSocket();

        return () => {
            socket.close();
            clearTimeout(reconnectTimeout);
        };
    }, []);

    return (
        <div>
            <h2>API Monitoring Dashboard</h2>

            <MyChart
                data={metrics.map((m) => m.latency)}
                labels={metrics.map((m) => new Date(m.timestamp).toLocaleTimeString())}
            />
            
            <BarChart requestStats={requestStats} />
        </div>
    );
};

export default App;

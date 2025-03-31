import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
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
  ResponsiveContainer,
} from "recharts";
import { Moon, Sun, Activity } from "lucide-react";

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

interface Endpoint {
  method: string;
  path: string;
}

// Color themes inspired by Atlan
const themes = {
  light: {
    background: "#FFFFFF",
    cardBackground: "#F4F5F7",
    primary: "#0052CC",
    secondary: "#00B8D9",
    text: "#172B4D",
    inputBorder: "#DFE1E6",
    inputBackground: "#FFFFFF",
    error: "#FF5630",
    success: "#36B37E",
    tableBorder: "#DFE1E6",
    tableHeaderBg: "#F4F5F7",
    tableRowHover: "#F8F9FA",
    chartLine: "#0052CC",
  },
  dark: {
    background: "#0D1117",
    cardBackground: "#161B22",
    primary: "#2684FF",
    secondary: "#00C7E6",
    text: "#F4F5F7",
    inputBorder: "#30363D",
    inputBackground: "#21262D",
    error: "#FF5630",
    success: "#36B37E",
    tableBorder: "#30363D",
    tableHeaderBg: "#21262D",
    tableRowHover: "#1C2128",
    chartLine: "#2684FF",
  },
};

const Dashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [averageLatencyByMethod, setAverageLatencyByMethod] = useState<
    Record<string, number>
  >({});
  const [requestStats, setRequestStats] = useState<RequestStats>({
    GET: { count: 0, errors: 0 },
    POST: { count: 0, errors: 0 },
    PUT: { count: 0, errors: 0 },
    DELETE: { count: 0, errors: 0 },
    PATCH: { count: 0, errors: 0 },
  });
  const [selectedMethod, setSelectedMethod] = useState("GET");
  const [endpoint, setEndpoint] = useState("");
  const [resourceMetrics, setResourceMetrics] =
    useState<ResourceMetrics | null>(null);
  const [monitoredUrl, setMonitoredUrl] = useState<string>(
    localStorage.getItem("monitoredUrl") || "",
  );
  const [inputUrl, setInputUrl] = useState<string>("");
  const [endpoints, setEndpoints] = useState<Endpoint[]>([
    { method: "GET", path: "" },
  ]);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (typeof window !== "undefined") {
      return (
        savedTheme === "dark" ||
        (!savedTheme &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)
      );
    }
    return false;
  });

  const currentTheme = darkMode ? themes.dark : themes.light;

  useEffect(() => {
    localStorage.setItem("theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  const toggleTheme = () => {
    setDarkMode(!darkMode);
  };

  const handleAddEndpoint = () => {
    setEndpoints([...endpoints, { method: "GET", path: "" }]);
  };

  const handleEndpointChange = (index: any, field: any, value: any) => {
    const newEndpoints: any = [...endpoints];
    newEndpoints[index][field] = value;
    setEndpoints(newEndpoints);
  };

  const handleSetUrl = async () => {
    console.log(inputUrl);
    console.log(endpoints);
    if (!inputUrl || endpoints.length === 0) {
      toast.error("Please enter a valid base URL and at least one endpoint.");
      return;
    }

    try {
      const userToken = localStorage.getItem("authToken");
      const structuredEndpoints: Record<string, string[]> = {
        GET: [],
        POST: [],
        PUT: [],
        DELETE: [],
        PATCH: [],
      };

      endpoints.forEach(({ method, path }) => {
        structuredEndpoints[method as keyof typeof structuredEndpoints]?.push(
          path,
        );
      });

      localStorage.setItem(
        "monitoredUrls",
        JSON.stringify({ baseUrl: inputUrl, endpoints: structuredEndpoints }),
      );

      await axios.post(
        `http://localhost:5000/api/set-url`,
        { baseUrl: inputUrl, endpoints: structuredEndpoints },
        { headers: { Authorization: `Bearer ${userToken}` } },
      );

      setIsMonitoring(true);
    } catch (error) {
      console.error(error);
    }
  };

  const latencyChartData = metrics
    .map((metric) => ({
      name: metric.timestamp
        ? new Date(metric.timestamp).toLocaleTimeString()
        : "",
      latency: metric.latency,
      method: metric.method,
    }))
    .reverse();

  const errorData = Object.entries(requestStats).map(([method, stats]) => ({
    method,
    errorRate: stats.count > 0 ? (stats.errors / stats.count) * 100 : 0,
  }));

  const resourceChartData = resourceMetrics
    ? [
        { name: "RSS", value: resourceMetrics.memory.rss },
        { name: "Heap Total", value: resourceMetrics.memory.heapTotal },
        { name: "Heap Used", value: resourceMetrics.memory.heapUsed },
        { name: "External", value: resourceMetrics.memory.external },
        { name: "CPU Load (1min)", value: resourceMetrics.cpu.loadAvg1min },
      ]
    : [];

  useEffect(() => {
    const methodLatencies = metrics.reduce(
      (acc, metric) => {
        if (!acc[metric.method]) {
          acc[metric.method] = { totalLatency: 0, count: 0 };
        }
        acc[metric.method].totalLatency += metric.latency;
        acc[metric.method].count += 1;
        return acc;
      },
      {} as Record<string, { totalLatency: number; count: number }>,
    );

    const averages = Object.entries(methodLatencies).reduce(
      (acc, [method, data]) => {
        acc[method] = data.totalLatency / data.count;
        return acc;
      },
      {} as Record<string, number>,
    );

    setAverageLatencyByMethod(averages);
  }, [metrics]);

  const averageLatencyChartData = Object.entries(averageLatencyByMethod).map(
    ([method, avgLatency]) => ({
      method,
      avgLatency,
    }),
  );

  const connectWebSocket = useCallback(() => {
    const socket = new WebSocket("ws://localhost:8080");

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onmessage = (event) => {
      try {
        const data: WebSocketMessage = JSON.parse(event.data);

        if (data.metrics && Array.isArray(data.metrics)) {
          setMetrics((prevMetrics) => [...data.metrics]);
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
      setIsConnected(false);

      setTimeout(connectWebSocket, 3000);
    };

    return socket;
  }, []);

  useEffect(() => {
    const socket = connectWebSocket();

    return () => socket.close();
  }, [connectWebSocket]);

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
    <div
      style={{
        backgroundColor: currentTheme.background,
        color: currentTheme.text,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        transition: "all 0.3s ease",
      }}
    >
      <ToastContainer
        position="top-right"
        theme={darkMode ? "dark" : "light"}
      />

      <div
        style={{
          maxWidth: "1200px",
          width: "100%",
          margin: "0 auto",
          padding: "24px",
        }}
      >
        <div
          style={{
            backgroundColor: currentTheme.cardBackground,
            borderRadius: "12px",
            padding: "24px",
            boxShadow: `0 4px 20px rgba(0,0,0,${darkMode ? "0.4" : "0.1"})`,
            transition: "all 0.3s ease",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <Activity
                size={22}
                style={{ marginRight: "12px", color: currentTheme.primary }}
              />
              <h1
                style={{
                  fontSize: "24px",
                  fontWeight: 700,
                  margin: 0,
                  color: currentTheme.text,
                }}
              >
                API Monitoring Dashboard
              </h1>
            </div>
            <button
              onClick={toggleTheme}
              style={{
                backgroundColor: "transparent",
                border: "none",
                color: currentTheme.text,
                cursor: "pointer",
                fontSize: "20px",
                padding: "8px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s ease",
              }}
            >
              {darkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <input
                type="text"
                style={{
                  flex: 1,
                  padding: "12px 16px",
                  fontSize: "14px",
                  borderRadius: "8px",
                  border: `1px solid ${currentTheme.inputBorder}`,
                  backgroundColor: currentTheme.inputBackground,
                  color: currentTheme.text,
                  outline: "none",
                  transition: "all 0.2s ease",
                }}
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="Enter base URL to monitor (e.g., https://api.example.com)"
              />
              <button
                style={{
                  display: "flex",
                  alignItems: "center",
                  backgroundColor: currentTheme.primary,
                  color: "#FFFFFF",
                  border: "none",
                  padding: "12px 16px",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
                onClick={handleSetUrl}
              >
                Start Monitoring
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {endpoints.map((endpoint, index) => (
                <div
                  key={index}
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  <select
                    value={endpoint.method}
                    onChange={(e) =>
                      handleEndpointChange(index, "method", e.target.value)
                    }
                    style={{
                      padding: "12px",
                      borderRadius: "8px",
                      border: `1px solid ${currentTheme.inputBorder}`,
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.text,
                      outline: "none",
                      minWidth: "120px",
                      cursor: "pointer",
                    }}
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                  <input
                    type="text"
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      fontSize: "14px",
                      borderRadius: "8px",
                      border: `1px solid ${currentTheme.inputBorder}`,
                      backgroundColor: currentTheme.inputBackground,
                      color: currentTheme.text,
                      outline: "none",
                      transition: "all 0.2s ease",
                    }}
                    value={endpoint.path}
                    onChange={(e) =>
                      handleEndpointChange(index, "path", e.target.value)
                    }
                    placeholder="Enter endpoint path (e.g., /users, /orders)"
                  />
                  {index === endpoints.length - 1 && (
                    <button
                      onClick={handleAddEndpoint}
                      style={{
                        padding: "12px 16px",
                        borderRadius: "8px",
                        backgroundColor: currentTheme.secondary,
                        color: "#FFFFFF",
                        border: "none",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                        whiteSpace: "nowrap",
                      }}
                    >
                      + Add Endpoint
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {isMonitoring && (
            <div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "24px",
                }}
              >
                <p
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    color: currentTheme.text,
                  }}
                >
                  Monitoring:{" "}
                  <span style={{ color: currentTheme.primary }}>
                    {monitoredUrl}
                  </span>
                </p>
                <button
                  style={{
                    padding: "8px 16px",
                    borderRadius: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    backgroundColor: currentTheme.error,
                    color: "#FFFFFF",
                  }}
                  onClick={handleStopMonitoring}
                >
                  Stop Monitoring
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
                  gap: "16px",
                  marginBottom: "24px",
                }}
              >
                <div
                  style={{
                    backgroundColor: currentTheme.cardBackground,
                    borderRadius: "8px",
                    padding: "16px",
                    border: `1px solid ${currentTheme.tableBorder}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "16px",
                      color: currentTheme.text,
                    }}
                  >
                    Latency Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={latencyChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.2)"
                            : "rgba(23, 43, 77, 0.2)"
                        }
                      />
                      <XAxis
                        dataKey="name"
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                      />
                      <YAxis
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                        label={{
                          value: "Latency (ms)",
                          angle: -90,
                          fill: currentTheme.text,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: currentTheme.cardBackground,
                          borderColor: currentTheme.tableBorder,
                          color: currentTheme.text,
                          fontSize: "12px",
                          borderRadius: "6px",
                        }}
                        itemStyle={{ color: currentTheme.text }}
                        labelStyle={{
                          color: currentTheme.text,
                          fontWeight: 600,
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="latency"
                        stroke={currentTheme.chartLine}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div
                  style={{
                    backgroundColor: currentTheme.cardBackground,
                    borderRadius: "8px",
                    padding: "16px",
                    border: `1px solid ${currentTheme.tableBorder}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "16px",
                      color: currentTheme.text,
                    }}
                  >
                    Average Latency by Method
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={averageLatencyChartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.2)"
                            : "rgba(23, 43, 77, 0.2)"
                        }
                      />
                      <XAxis
                        dataKey="method"
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                      />
                      <YAxis
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                        label={{
                          value: "Average Latency (ms)",
                          angle: -90,
                          fill: currentTheme.text,
                        }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: currentTheme.cardBackground,
                          borderColor: currentTheme.tableBorder,
                          color: currentTheme.text,
                          fontSize: "12px",
                          borderRadius: "6px",
                        }}
                        itemStyle={{ color: currentTheme.text }}
                        labelStyle={{
                          color: currentTheme.text,
                          fontWeight: 600,
                        }}
                      />
                      <Legend />
                      <Bar dataKey="avgLatency" fill={currentTheme.chartLine} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div
                  style={{
                    backgroundColor: currentTheme.cardBackground,
                    borderRadius: "8px",
                    padding: "16px",
                    border: `1px solid ${currentTheme.tableBorder}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "16px",
                      color: currentTheme.text,
                    }}
                  >
                    Error Rate (%)
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={errorData}>
                      <XAxis
                        dataKey="method"
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                      />
                      <YAxis
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: currentTheme.cardBackground,
                          borderColor: currentTheme.tableBorder,
                          color: currentTheme.text,
                          fontSize: "12px",
                          borderRadius: "6px",
                        }}
                        itemStyle={{ color: currentTheme.text }}
                        labelStyle={{
                          color: currentTheme.text,
                          fontWeight: 600,
                        }}
                      />
                      <Bar dataKey="errorRate" fill={currentTheme.error} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                <div
                  style={{
                    backgroundColor: currentTheme.cardBackground,
                    borderRadius: "8px",
                    padding: "16px",
                    border: `1px solid ${currentTheme.tableBorder}`,
                  }}
                >
                  <h3
                    style={{
                      fontSize: "18px",
                      fontWeight: 600,
                      marginBottom: "16px",
                      color: currentTheme.text,
                    }}
                  >
                    System Resource Usage
                  </h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={resourceChartData}>
                      <XAxis
                        dataKey="name"
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                      />
                      <YAxis
                        stroke={
                          darkMode
                            ? "rgba(244, 245, 247, 0.6)"
                            : "rgba(23, 43, 77, 0.6)"
                        }
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: currentTheme.cardBackground,
                          borderColor: currentTheme.tableBorder,
                          color: currentTheme.text,
                          fontSize: "12px",
                          borderRadius: "6px",
                        }}
                        itemStyle={{ color: currentTheme.text }}
                        labelStyle={{
                          color: currentTheme.text,
                          fontWeight: 600,
                        }}
                      />
                      <Bar dataKey="value" fill={currentTheme.success} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {!isMonitoring && (
            <div
              style={{
                textAlign: "center",
                padding: "40px 0",
                color: darkMode
                  ? "rgba(244, 245, 247, 0.6)"
                  : "rgba(23, 43, 77, 0.6)",
              }}
            >
              <p style={{ fontSize: "16px", marginBottom: "8px" }}>
                Enter a URL to start monitoring
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

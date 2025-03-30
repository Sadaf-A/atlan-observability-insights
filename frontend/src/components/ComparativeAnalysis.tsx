import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

// Color themes inspired by atlan
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
    success: "#36B37E"
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
    success: "#36B37E"
  }
};

interface PerformanceData {
  timestamp: string;
  avgResponseTime: number;
  errorRate: number;
}

export default function ComparativeAnalysis() {
  const [historicalData, setHistoricalData] = useState([]);
  const [baselineData, setBaselineData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState("7d");
  const [darkMode, setDarkMode] = useState(false);
  
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
    }
  }, []);
  
  const toggleTheme = () => {
    setDarkMode(!darkMode);
    localStorage.setItem("theme", !darkMode ? "dark" : "light");
  };
  
  const currentTheme = darkMode ? themes.dark : themes.light;

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
    <div style={{
      ...containerStyle,
      backgroundColor: currentTheme.background,
      color: currentTheme.text,
      transition: "all 0.3s ease"
    }}>
      <div style={{
        ...cardStyle,
        backgroundColor: currentTheme.cardBackground,
        boxShadow: `0 4px 20px rgba(0,0,0,${darkMode ? '0.4' : '0.1'})`,
      }}>
        <div style={headerStyle}>
          <h2 style={{
            ...titleStyle,
            color: currentTheme.text
          }}>Comparative Analysis</h2>
          <button 
            onClick={toggleTheme} 
            style={{
              ...themeToggleStyle,
              backgroundColor: 'transparent',
              color: currentTheme.text
            }}
          >
            {darkMode ? "🌞" : "🌙"}
          </button>
        </div>
        
        <div style={{
          display: "flex",
          gap: "10px",
          marginBottom: "24px"
        }}>
          {["7d", "30d", "90d"].map(range => (
            <button
              key={range}
              onClick={() => setDateRange(range)}
              style={{
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: dateRange === range ? "bold" : "normal",
                backgroundColor: dateRange === range 
                  ? currentTheme.primary 
                  : currentTheme.inputBackground,
                color: dateRange === range 
                  ? "#FFFFFF" 
                  : currentTheme.text,
                border: `1px solid ${dateRange === range 
                  ? currentTheme.primary 
                  : currentTheme.inputBorder}`,
                transition: "all 0.2s ease"
              }}
            >
              Last {range}
            </button>
          ))}
        </div>
        
        {loading ? (
          <div style={{
            textAlign: "center",
            padding: "40px",
            color: currentTheme.secondary
          }}>
            Loading...
          </div>
        ) : (
          <div>
            <div style={{
              ...chartContainerStyle,
              backgroundColor: currentTheme.inputBackground,
              borderColor: currentTheme.inputBorder
            }}>
              <h3 style={{
                fontSize: "16px",
                marginBottom: "16px",
                color: currentTheme.text
              }}>Performance Over Time</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={historicalData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <XAxis 
                    dataKey="timestamp" 
                    stroke={currentTheme.text}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis stroke={currentTheme.text} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: currentTheme.cardBackground,
                      borderColor: currentTheme.inputBorder,
                      color: currentTheme.text
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avgResponseTime"
                    name="Current Response Time"
                    stroke={currentTheme.primary}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="avgResponseTime"
                    name="Baseline Response Time"
                    data={baselineData}
                    stroke={currentTheme.secondary}
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <div style={{
              ...chartContainerStyle,
              backgroundColor: currentTheme.inputBackground,
              borderColor: currentTheme.inputBorder
            }}>
              <h3 style={{
                fontSize: "16px",
                marginBottom: "16px",
                color: currentTheme.text
              }}>Error Rate Comparison</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart
                  data={historicalData}
                  margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <XAxis 
                    dataKey="timestamp" 
                    stroke={currentTheme.text}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis stroke={currentTheme.text} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: currentTheme.cardBackground,
                      borderColor: currentTheme.inputBorder,
                      color: currentTheme.text
                    }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="errorRate"
                    name="Current Error Rate"
                    stroke={currentTheme.error}
                    activeDot={{ r: 8 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="errorRate"
                    name="Baseline Error Rate"
                    data={baselineData}
                    stroke="#FFA500"
                    strokeDasharray="5 5"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "100vh",
  width: "100%",
  padding: "20px",
  boxSizing: "border-box",
  transition: "background-color 0.3s ease"
};

const cardStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: "900px",
  padding: "32px",
  borderRadius: "12px",
  transition: "all 0.3s ease"
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "24px"
};

const titleStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 700,
  margin: 0
};

const themeToggleStyle: React.CSSProperties = {
  border: "none",
  fontSize: "20px",
  cursor: "pointer",
  padding: "8px",
  borderRadius: "50%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  transition: "all 0.2s ease"
};

const chartContainerStyle: React.CSSProperties = {
  padding: "24px",
  borderRadius: "8px",
  marginBottom: "24px",
  border: "1px solid",
  transition: "all 0.3s ease"
};
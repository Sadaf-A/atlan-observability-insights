import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Moon, Sun, RefreshCw, Search, AlertTriangle, CheckCircle, Activity } from "lucide-react";
import ReactMarkdown from "react-markdown";
// Type definitions
interface Span {
    spanId: string;
    serviceName: string;
    operationName: string;
    startTime: string;
    endTime: string;
    duration: number;
    tags: { statusCode: number };
}

interface Trace {
    _id: string;
    traceId: string;
    createdAt: string;
    spans: Span[];
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
        chartLine: "#0052CC"
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
        chartLine: "#2684FF"
    }
};

export default function TraceViewer() {
    const [monitoredUrl, setMonitoredUrl] = useState("http://localhost:5000");
    const [traces, setTraces] = useState<Trace[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<number | null>(null);
    const [diagnosis, setDiagnosis] = useState<string | null>(null);
    const [searchInput, setSearchInput] = useState<string>("");
    const [searchQuery, setSearchQuery] = useState<string>("");
    const [darkMode, setDarkMode] = useState(() => {
        const savedTheme = localStorage.getItem("theme");
        if (typeof window !== 'undefined') {
            return savedTheme === "dark" || 
                (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
        }
        return false;
    });
    
    // Get current theme
    const currentTheme = darkMode ? themes.dark : themes.light;
    
    useEffect(() => {
        fetchTraces();
    }, [monitoredUrl]);
    
    useEffect(() => {
        localStorage.setItem("theme", darkMode ? "dark" : "light");
    }, [darkMode]);

    const fetchTraces = async () => {
        setLoading(true);
        try {
            const { data } = await axios.get("http://localhost:5000/api/traces", {
                params: { monitoredUrl },
            });
            setTraces(data);
        } catch (error) {
            console.error("Error fetching traces:", error);
        }
        setLoading(false);
    };

    const runDiagnosis = async () => {
        setDiagnosis("Running diagnosis...");
        try {
            const { data } = await axios.post("http://localhost:5000/api/diagnose", { monitoredUrl });
            setDiagnosis(data.aiResponse);
        } catch (error) {
            console.error("Error running diagnosis:", error);
            setDiagnosis("Failed to run diagnosis");
        }
    };

    const applySearch = () => {
        setSearchQuery(searchInput);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            applySearch();
        }
    };

    const toggleTheme = () => {
        setDarkMode(!darkMode);
    };

    const filteredTraces = traces.slice(-20).filter(trace => {
        const matchesStatus = filterStatus === null || trace.spans.some(span => span.tags.statusCode === filterStatus);
        const matchesSearch = searchQuery === "" || trace.traceId.includes(searchQuery) || 
            trace.spans.some(span =>
                span.operationName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                span.startTime.toLowerCase().includes(searchQuery.toLowerCase())
            );
        return matchesStatus && matchesSearch;
    });

    return (
        <div style={{
            backgroundColor: currentTheme.background,
            color: currentTheme.text,
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            transition: "all 0.3s ease"
        }}>
            <div style={{
                maxWidth: "1200px",
                width: "100%",
                margin: "0 auto",
                padding: "24px"
            }}>
                <div style={{
                    backgroundColor: currentTheme.cardBackground,
                    borderRadius: "12px",
                    padding: "24px",
                    boxShadow: `0 4px 20px rgba(0,0,0,${darkMode ? '0.4' : '0.1'})`,
                    transition: "all 0.3s ease"
                }}>
                    <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "24px"
                    }}>
                        <div style={{ display: "flex", alignItems: "center" }}>
                            <Activity size={22} style={{ marginRight: "12px", color: currentTheme.primary }} />
                            <h1 style={{ 
                                fontSize: "24px", 
                                fontWeight: 700, 
                                margin: 0,
                                color: currentTheme.text
                            }}>
                                API Trace Explorer
                            </h1>
                        </div>
                        <button 
                            onClick={toggleTheme}
                            style={{
                                backgroundColor: 'transparent',
                                border: "none",
                                color: currentTheme.text,
                                cursor: "pointer",
                                fontSize: "20px",
                                padding: "8px",
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                transition: "all 0.2s ease"
                            }}
                        >
                            {darkMode ? <Sun size={20} /> : <Moon size={20} />}
                        </button>
                    </div>
                    
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                        gap: "16px",
                        marginBottom: "24px"
                    }}>
                        <div style={{
                            display: "flex",
                            alignItems: "center"
                        }}>
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
                                    transition: "all 0.2s ease"
                                }}
                                value={monitoredUrl}
                                onChange={(e) => setMonitoredUrl(e.target.value)}
                                placeholder="Enter monitored URL"
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
                                    marginLeft: "12px",
                                    cursor: "pointer",
                                    fontSize: "14px",
                                    fontWeight: 600,
                                    transition: "all 0.2s ease"
                                }} 
                                onClick={fetchTraces}
                            >
                                <RefreshCw size={16} style={{ marginRight: "8px" }} />
                                Refresh
                            </button>
                        </div>
                        
                        <div style={{
                            display: "flex",
                            alignItems: "center"
                        }}>
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
                                    transition: "all 0.2s ease"
                                }}
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Search traces..."
                            />
                            <button 
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundColor: currentTheme.secondary,
                                    color: "#FFFFFF",
                                    border: "none",
                                    padding: "12px",
                                    borderRadius: "8px",
                                    marginLeft: "12px",
                                    cursor: "pointer",
                                    transition: "all 0.2s ease"
                                }} 
                                onClick={applySearch}
                            >
                                <Search size={16} />
                            </button>
                        </div>
                    </div>
                    
                    <div style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginBottom: "24px",
                        alignItems: "center"
                    }}>
<button 
    style={{
        padding: "8px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        backgroundColor: filterStatus === null ? currentTheme.primary : "transparent",
        color: filterStatus === null ? "#FFFFFF" : currentTheme.text,
        border: filterStatus === null ? "none" : `1px solid ${currentTheme.inputBorder}`
    }}
    onClick={() => setFilterStatus(null)}
>
    All Traces
</button>

<button 
    style={{
        padding: "8px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        backgroundColor: filterStatus === 200 ? currentTheme.success : "transparent",
        color: filterStatus === 200 ? "#FFFFFF" : currentTheme.success,
        border: filterStatus === 200 ? "none" : `1px solid ${currentTheme.success}`
    }}
    onClick={() => setFilterStatus(200)}
>
    <CheckCircle size={14} style={{ marginRight: "8px" }} />
    Success (200)
</button>

<button 
    style={{
        padding: "8px 16px",
        borderRadius: "8px",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        backgroundColor: filterStatus === 500 ? currentTheme.error : "transparent",
        color: filterStatus === 500 ? "#FFFFFF" : currentTheme.error,
        border: filterStatus === 500 ? "none" : `1px solid ${currentTheme.error}`
    }}
    onClick={() => setFilterStatus(500)}
>
    <AlertTriangle size={14} style={{ marginRight: "8px" }} />
    Errors (500)
</button>
                        <button 
                            style={{
                                marginLeft: "auto",
                                padding: "8px 16px",
                                borderRadius: "8px",
                                fontSize: "14px",
                                fontWeight: 600,
                                border: "none",
                                cursor: "pointer",
                                transition: "all 0.2s ease",
                                backgroundColor: "#6554C0",
                                color: "#FFFFFF"
                            }}
                            onClick={runDiagnosis}
                        >
                            Run Diagnosis
                        </button>
                    </div>
                    
                    {diagnosis && (
                        <div style={{
                            marginBottom: "24px",
                            padding: "16px",
                            borderRadius: "8px",
                            border: `1px solid ${currentTheme.inputBorder}`,
                            backgroundColor: darkMode ? "rgba(38, 132, 255, 0.1)" : "rgba(0, 82, 204, 0.05)",
                            transition: "all 0.3s ease"
                        }}>
                            <h3 style={{
                                fontSize: "16px",
                                fontWeight: 600,
                                marginBottom: "8px",
                                color: currentTheme.text
                            }}>Diagnosis Report</h3>
                            <ReactMarkdown>{diagnosis}</ReactMarkdown>
                        </div>
                    )}
                    
                    {loading ? (
                        <div style={{
                            display: "flex", 
                            justifyContent: "center", 
                            alignItems: "center", 
                            padding: "40px 0"
                        }}>
                            <div style={{
                                width: "40px",
                                height: "40px",
                                borderRadius: "50%",
                                border: `3px solid ${currentTheme.inputBorder}`,
                                borderTopColor: currentTheme.primary,
                                animation: "spin 1s linear infinite"
                            }}></div>
                            <style>{`
                                @keyframes spin {
                                    0% { transform: rotate(0deg); }
                                    100% { transform: rotate(360deg); }
                                }
                            `}</style>
                        </div>
                    ) : (
                        <>
                            {filteredTraces.length === 0 ? (
                                <div style={{
                                    textAlign: "center",
                                    padding: "40px 0",
                                    color: darkMode ? "rgba(244, 245, 247, 0.6)" : "rgba(23, 43, 77, 0.6)"
                                }}>
                                    <p style={{ fontSize: "16px", marginBottom: "8px" }}>No traces found</p>
                                    <p style={{ fontSize: "14px" }}>Try changing your search criteria or refreshing the data</p>
                                </div>
                            ) : (
                                <div style={{
                                    borderRadius: "8px",
                                    border: `1px solid ${currentTheme.tableBorder}`,
                                    overflow: "hidden",
                                    transition: "all 0.3s ease"
                                }}>
                                    <div style={{
                                        overflowX: "auto",
                                        maxHeight: "400px"
                                    }}>
                                        <table style={{
                                            width: "100%",
                                            borderCollapse: "collapse"
                                        }}>
                                            <thead style={{
                                                backgroundColor: currentTheme.tableHeaderBg
                                            }}>
                                                <tr>
                                                    <th style={{
                                                        padding: "12px 16px",
                                                        textAlign: "left",
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: currentTheme.text,
                                                        borderBottom: `1px solid ${currentTheme.tableBorder}`
                                                    }}>Trace ID</th>
                                                    <th style={{
                                                        padding: "12px 16px",
                                                        textAlign: "left",
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: currentTheme.text,
                                                        borderBottom: `1px solid ${currentTheme.tableBorder}`
                                                    }}>Operation</th>
                                                    <th style={{
                                                        padding: "12px 16px",
                                                        textAlign: "left",
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: currentTheme.text,
                                                        borderBottom: `1px solid ${currentTheme.tableBorder}`
                                                    }}>Status</th>
                                                    <th style={{
                                                        padding: "12px 16px",
                                                        textAlign: "left",
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: currentTheme.text,
                                                        borderBottom: `1px solid ${currentTheme.tableBorder}`
                                                    }}>Duration (ms)</th>
                                                    <th style={{
                                                        padding: "12px 16px",
                                                        textAlign: "left",
                                                        fontSize: "14px",
                                                        fontWeight: 600,
                                                        color: currentTheme.text,
                                                        borderBottom: `1px solid ${currentTheme.tableBorder}`
                                                    }}>Start Time</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {filteredTraces.map(trace => (
                                                    trace.spans.map(span => (
                                                        <tr 
                                                            key={span.spanId} 
                                                            style={{
                                                                backgroundColor: span.tags.statusCode === 500 
                                                                    ? (darkMode ? "rgba(255, 86, 48, 0.15)" : "rgba(255, 86, 48, 0.05)") 
                                                                    : "transparent",
                                                                transition: "background-color 0.2s ease",
                                                                ...(span.tags.statusCode !== 500 && {
                                                                    ':hover': {
                                                                        backgroundColor: currentTheme.tableRowHover
                                                                    }
                                                                })
                                                            }}
                                                        >
                                                            <td style={{
                                                                padding: "12px 16px",
                                                                fontSize: "14px",
                                                                fontFamily: "monospace",
                                                                borderBottom: `1px solid ${currentTheme.tableBorder}`,
                                                                color: currentTheme.text
                                                            }}>{trace.traceId.substring(0, 10)}...</td>
                                                            <td style={{
                                                                padding: "12px 16px",
                                                                fontSize: "14px",
                                                                borderBottom: `1px solid ${currentTheme.tableBorder}`,
                                                                color: currentTheme.text
                                                            }}>{span.operationName}</td>
                                                            <td style={{
                                                                padding: "12px 16px",
                                                                fontSize: "14px",
                                                                borderBottom: `1px solid ${currentTheme.tableBorder}`
                                                            }}>
                                                                <span style={{
                                                                    display: "inline-block",
                                                                    padding: "4px 8px",
                                                                    borderRadius: "16px",
                                                                    fontSize: "12px",
                                                                    fontWeight: 600,
                                                                    backgroundColor: span.tags.statusCode === 500 
                                                                        ? currentTheme.error 
                                                                        : currentTheme.success,
                                                                    color: "#FFFFFF"
                                                                }}>
                                                                    {span.tags.statusCode}
                                                                </span>
                                                            </td>
                                                            <td style={{
                                                                padding: "12px 16px",
                                                                fontSize: "14px",
                                                                borderBottom: `1px solid ${currentTheme.tableBorder}`,
                                                                color: currentTheme.text
                                                            }}>{span.duration}</td>
                                                            <td style={{
                                                                padding: "12px 16px",
                                                                fontSize: "14px",
                                                                borderBottom: `1px solid ${currentTheme.tableBorder}`,
                                                                color: currentTheme.text
                                                            }}>{new Date(span.startTime).toLocaleString()}</td>
                                                        </tr>
                                                    ))
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            <div style={{ marginTop: "32px" }}>
                                <h3 style={{
                                    fontSize: "18px",
                                    fontWeight: 600,
                                    marginBottom: "16px",
                                    color: currentTheme.text
                                }}>
                                    Performance Timeline
                                </h3>
                                <div style={{
                                    padding: "16px",
                                    borderRadius: "8px",
                                    backgroundColor: currentTheme.cardBackground,
                                    border: `1px solid ${currentTheme.tableBorder}`
                                }}>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart 
                                            data={filteredTraces.flatMap(trace => trace.spans.map(span => ({
                                                name: span.operationName,
                                                duration: span.duration
                                            })))}
                                            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                                        >
                                            <XAxis 
                                                dataKey="name" 
                                                stroke={darkMode ? "rgba(244, 245, 247, 0.6)" : "rgba(23, 43, 77, 0.6)"} 
                                                tick={{fontSize: 12}}
                                            />
                                            <YAxis 
                                                stroke={darkMode ? "rgba(244, 245, 247, 0.6)" : "rgba(23, 43, 77, 0.6)"}
                                                tick={{fontSize: 12}}
                                            />
                                            <Tooltip 
                                                contentStyle={{
                                                    backgroundColor: currentTheme.cardBackground,
                                                    borderColor: currentTheme.tableBorder,
                                                    color: currentTheme.text,
                                                    fontSize: "12px",
                                                    borderRadius: "6px",
                                                }}
                                                itemStyle={{color: currentTheme.text}}
                                                labelStyle={{color: currentTheme.text, fontWeight: 600}}
                                            />
                                            <Line 
                                                type="monotone" 
                                                dataKey="duration" 
                                                stroke={currentTheme.chartLine}
                                                strokeWidth={2}
                                                dot={{ r: 4, fill: currentTheme.chartLine }}
                                                activeDot={{ r: 6, fill: currentTheme.chartLine }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
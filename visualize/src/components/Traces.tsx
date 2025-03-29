import { useState, useEffect } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

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

export default function TraceViewer() {
    const [monitoredUrl, setMonitoredUrl] = useState("http://localhost:5000");
    const [traces, setTraces] = useState<Trace[]>([]);
    const [loading, setLoading] = useState(false);
    const [filterStatus, setFilterStatus] = useState<number | null>(null);
    const [diagnosis, setDiagnosis] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState<string>(""); 
    const [searchQuery, setSearchQuery] = useState<string>(""); 
    useEffect(() => {
        fetchTraces();
    }, [monitoredUrl]);

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
        <div className="p-6 max-w-6xl mx-auto bg-white shadow-lg rounded-lg">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">API Trace Viewer</h2>
            <div className="flex items-center gap-4 mb-4">
                <input
                    type="text"
                    className="border border-gray-300 rounded-lg p-2 flex-1"
                    value={monitoredUrl}
                    onChange={(e) => setMonitoredUrl(e.target.value)}
                    placeholder="Enter monitored URL"
                />
                <button className="bg-blue-500 text-white px-4 py-2 rounded-lg" onClick={fetchTraces}>Refresh</button>
            </div>

            {/* Search Bar */}
            <div className="flex gap-2 mb-4">
                <input
                    type="text"
                    className="border border-gray-300 rounded-lg p-2 flex-1"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Search by Trace ID or Log Content..."
                />
                <button 
                    className="bg-gray-700 text-white px-4 py-2 rounded-lg" 
                    onClick={applySearch}
                >
                    Search
                </button>
            </div>
            
            <div className="flex gap-2 mb-4">
                <button className="p-2 border rounded-lg bg-gray-200" onClick={() => setFilterStatus(null)}>All</button>
                <button className="p-2 border rounded-lg bg-green-500 text-white" onClick={() => setFilterStatus(200)}>Success (200)</button>
                <button className="p-2 border rounded-lg bg-red-500 text-white" onClick={() => setFilterStatus(500)}>Errors (500)</button>
            </div>

            <button className="bg-purple-500 text-white px-4 py-2 rounded-lg mb-4" onClick={runDiagnosis}>Run Diagnosis</button>
            
            {diagnosis && (
                <div className="bg-gray-100 p-4 rounded-lg border mt-4">
                    <h3 className="text-lg font-semibold mb-2">Diagnosis Report</h3>
                    <p className="text-gray-700 whitespace-pre-wrap">{diagnosis}</p>
                </div>
            )}
            
            {loading ? <p className="text-gray-600">Loading...</p> : (
                <div>
                    {filteredTraces.length === 0 ? (
                        <p className="text-gray-600">No traces found.</p>
                    ) : (
                        <div className="overflow-auto max-h-96">
                            <table className="w-full border-collapse border border-gray-300 text-sm text-left">
                                <thead className="bg-gray-100 text-gray-700">
                                    <tr>
                                        <th className="border p-3">Trace ID</th>
                                        <th className="border p-3">Operation</th>
                                        <th className="border p-3">Status</th>
                                        <th className="border p-3">Duration (ms)</th>
                                        <th className="border p-3">Start Time</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredTraces.map(trace => (
                                        trace.spans.map(span => (
                                            <tr key={span.spanId} className={`border ${span.tags.statusCode === 500 ? 'bg-red-100' : 'bg-white'}`}>
                                                <td className="border p-3">{trace.traceId}</td>
                                                <td className="border p-3">{span.operationName}</td>
                                                <td className={`border p-3 ${span.tags.statusCode === 500 ? 'text-red-500 font-bold' : 'text-green-600'}`}>{span.tags.statusCode}</td>
                                                <td className="border p-3">{span.duration}</td>
                                                <td className="border p-3">{new Date(span.startTime).toLocaleString()}</td>
                                            </tr>
                                        ))
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <h3 className="text-lg font-semibold mt-6">Performance Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
                <LineChart data={filteredTraces.flatMap(trace => trace.spans.map(span => ({
                    name: span.operationName,
                    duration: span.duration
                })))}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="duration" stroke="#2563eb" />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

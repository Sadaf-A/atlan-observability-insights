import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Dashboard from "./components/Dashboard";
import Login from "./components/Login";
import Register from "./components/Register";
import TraceViewer from "./components/Traces";
import ComparativeAnalysis from "./components/ComparativeAnalysis";

const App: React.FC = () => {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Login />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/traces" element={<TraceViewer />} />
                <Route path="/compare" element={<ComparativeAnalysis />} />
            </Routes>
        </Router>
    );
};

export default App;

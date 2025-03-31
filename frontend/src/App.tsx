import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TopNavigation from "./pages/TopNavigation";
import Dashboard from "./pages/Dashboard";
import TraceViewer from "./pages/Traces";
import ComparativeAnalysis from "./pages/ComparativeAnalysis";
import Login from "./pages/Login";
import Register from "./pages/Register";

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route element={<TopNavigation />}>
          <Route path="/" element={<Login />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/traces" element={<TraceViewer />} />
          <Route path="/compare" element={<ComparativeAnalysis />} />
        </Route>
      </Routes>
    </Router>
  );
};

export default App;

import React from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import TopNavigation from "./components/TopNavigation";
import Dashboard from "./components/Dashboard";
import TraceViewer from "./components/Traces";
import ComparativeAnalysis from "./components/ComparativeAnalysis";
import Login from "./components/Login";
import Register from "./components/Register";

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

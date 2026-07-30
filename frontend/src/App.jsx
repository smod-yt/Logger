import React, { useState } from "react";
import Header from "./components/Header";
import { useTheme } from "./hooks/useTheme";

import DashboardView from "./features/DashboardView";
import AnalyticsView from "./features/AppTimeView";
import SessionsView from "./features/SessionsView";
import ApplicationsView from "./features/ApplicationsView";
import BackupsView from "./features/BackupsView";

export default function App() {
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState("dashboard");

  return (
    <div className={`min-h-screen transition-colors duration-300 ${isDarkMode ? "bg-background text-foreground" : "bg-slate-50 text-slate-900"}`}>
      
      <Header 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme} 
      />

      <main className="max-w-7xl mx-auto p-6">
        {activeTab === "dashboard" && <DashboardView />}
        {activeTab === "analytics" && <AnalyticsView />}
        {activeTab === "sessions" && <SessionsView />}
        {activeTab === "applications" && <ApplicationsView />}
        {activeTab === "backups" && <BackupsView />}
      </main>
    </div>
  );
}
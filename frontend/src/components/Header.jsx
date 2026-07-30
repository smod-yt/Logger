import React from "react";
import { Tabs } from "@heroui/react";
import { LayoutDashboard, History, Clock, List, DatabaseBackup } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

export default function Header({ activeTab, setActiveTab, isDarkMode, toggleTheme }) {
  return (
    <header className="w-full border-b border-default-100 bg-background/70 backdrop-blur-md sticky top-0 z-50 px-6 h-16 flex items-center justify-between transition-colors duration-300">
      <div className="flex items-center gap-3">
        <h1 className="font-semibold leading-none">Logger</h1>
      </div>

      <div className="flex-1 flex justify-center max-w-xl mx-4">
        <Tabs 
          variant="underlined" 
          classNames={{
            tabList: "gap-6 border-b-0 p-0",
            cursor: "w-full bg-primary",
            tab: "max-w-fit px-0 h-12 text-sm font-medium",
          }}
          selectedKey={activeTab}
          onSelectionChange={(key) => setActiveTab(key.toString())}
        >
          <Tabs.ListContainer>
            <Tabs.List aria-label="Основная навигация">
              <Tabs.Tab id="dashboard">
                <div className="flex items-center gap-2">
                  <LayoutDashboard size={16} />
                  <span>Главная</span>
                </div>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="analytics">
                <div className="flex items-center gap-2">
                  <Clock size={16} />
                  <span>Часы</span>
                </div>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="sessions">
                <div className="flex items-center gap-2">
                  <History size={16} />
                  <span>Сессии</span>
                </div>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="applications">
                <div className="flex items-center gap-2">
                  <List size={16} />
                  <span>Приложения</span>
                </div>
                <Tabs.Indicator />
              </Tabs.Tab>
              <Tabs.Tab id="backups">
                <div className="flex items-center gap-2">
                  <DatabaseBackup size={16} />
                  <span>Бэкапы</span>
                </div>
                <Tabs.Indicator />
              </Tabs.Tab>
            </Tabs.List>
          </Tabs.ListContainer>
        </Tabs>
      </div>

      <div className="flex items-center gap-3">
        <ThemeToggle isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
      </div>
    </header>
  );
}
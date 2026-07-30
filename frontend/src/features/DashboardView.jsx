"use client";

import React, { useEffect, useState } from "react";
import { Card, Meter, Label, Spinner } from "@heroui/react";
import { Activity, Flame, PieChart as ChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";

const COLORS = ["#006FEE", "#9353D3", "#17C964", "#F5A524", "#F31260"];

const MAX_DISPLAY_APPS = 5;

const renderActiveShape = (props) => {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <g>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius + 4}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
        stroke="none"
      />
    </g>
  );
};

export default function DashboardView() {
  const [activeSessions, setActiveSessions] = useState([]);
  const [topApps, setTopApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    async function fetchDashboardData(isInitial = false) {
      try {
        if (isInitial) {
          setLoading(true);
        } else {
          setIsRefreshing(true);
        }
        
        const sessionsRes = await fetch("/api/sessions/?is_active=true");
        const sessionsData = await sessionsRes.json();
        
        const timeRes = await fetch("/api/sessions/time?period=today");
        const timeData = await timeRes.json();

        const sessionsArray = sessionsData?.items || sessionsData || [];
        setActiveSessions(sessionsArray);
        
        const sortedApps = (timeData || []).sort((a, b) => b.total_seconds - a.total_seconds);
        setTopApps(sortedApps);
        
      } catch (error) {
        console.error("Ошибка при получении данных дашборда:", error);
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    }

    fetchDashboardData(true);
    
    const interval = setInterval(() => fetchDashboardData(false), 30000);
    return () => clearInterval(interval);
  }, []);

  const formatSeconds = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    if (hours === 0) return `${minutes}м`;
    return `${hours}ч ${minutes}м`;
  };

  const limitedTopApps = topApps.slice(0, MAX_DISPLAY_APPS);

  const chartData = limitedTopApps.map((app) => ({
    name: app.display_name || app.app_name,
    value: app.total_seconds || 0
  }));

  const totalValue = chartData.reduce((sum, item) => sum + item.value, 0);

  const maxSeconds = limitedTopApps[0]?.total_seconds || 1;

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size="lg" label="Загрузка дашборда..." color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {isRefreshing && (
        <div className="absolute top-0 right-0 z-50 opacity-70">
          <Spinner size="sm" color="primary" />
        </div>
      )}

      <div>
        <h2 className="text-2xl font-bold tracking-tight">Обзор активности</h2>
        <p className="text-default-500 text-sm mt-1">
          Оперативный мониторинг рабочих сессий и использования приложений
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card className="p-6 border border-default-100 bg-content1">
          <Card.Header className="p-0 pb-4 flex flex-row items-center gap-2">
            <Activity className="text-success size-5 animate-pulse" />
            <div>
              <Card.Title className="text-lg font-semibold">Активно сейчас</Card.Title>
              <Card.Description className="text-xs text-default-400">
                Что запущено в данный момент
              </Card.Description>
            </div>
          </Card.Header>
          
          <div className="space-y-4 mt-2">
            {activeSessions.length === 0 ? (
              <div className="text-center py-8 text-default-400 text-sm">
                В данный момент нет активных сессий трекинга
              </div>
            ) : (
              activeSessions.map((session, index) => (
                <div 
                  key={session.id || index} 
                  className="flex items-center justify-between p-3 rounded-xl border border-default-100 bg-default-50/50"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="text-sm font-medium">
                        {session.display_name || session.app_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-success bg-success-50 dark:bg-success-950/30 px-2 py-1 rounded-md font-medium">
                      {session.duration ? (
                          <span>{session.duration}</span>
                      ) : (
                          <div className="flex items-center gap-2">
                          <span className="relative flex size-2">
                              <span className="absolute inline-flex h-full w-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-success opacity-75"></span>
                              <span className="relative inline-flex size-2 rounded-full bg-success"></span>
                          </span>
                          </div>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card className="p-6 border border-default-100  bg-content1">
          <Card.Header className="p-0 pb-4 flex flex-row items-center gap-2">
            <Flame className="text-warning size-5" />
            <div>
              <Card.Title className="text-lg font-semibold">Лидеры дня</Card.Title>
              <Card.Description className="text-xs text-default-400">
                Приложения с наибольшим количеством времени
              </Card.Description>
            </div>
          </Card.Header>

          <div className="flex flex-col gap-4 mt-2">
                {limitedTopApps.length === 0 ? (
                    <div className="text-center py-8 text-default-400 text-sm">
                    Нет данных об активности за сегодня
                    </div>
                ) : (
                    limitedTopApps.map((app, index) => {
                    const meterValue = Math.round((app.total_seconds / maxSeconds) * 100);
                    const appColor = COLORS[index % COLORS.length];


                    return (
                        <Meter 
                          key={app.id || index} 
                          value={meterValue}
                        >
                        <div className="flex justify-between items-center text-sm mb-1">
                            <Label className="font-medium text-default-700 flex items-center gap-1.5">
                            <span>#{index + 1}</span>
                            <span className="truncate">{app.display_name || app.app_name}</span>
                            </Label>
                            <span className="font-semibold text-default-600 shrink-0">
                            {formatSeconds(app.total_seconds)}
                            </span>
                        </div>
                        <Meter.Track className="h-2 rounded-full bg-default-100">
                            <Meter.Fill className="rounded-full" style={{ backgroundColor: appColor }} />
                        </Meter.Track>
                        </Meter>
                    );
                    })
                )}
          </div>
        </Card>
      </div>

      {chartData.length > 0 && (
        <Card className="p-6 border border-default-100  bg-content1">
          <Card.Header className="p-0 pb-6 flex flex-row items-center gap-2">
            <ChartIcon className="text-primary size-5" />
            <div>
              <Card.Title className="text-lg font-semibold">Доли времени</Card.Title>
              <Card.Description className="text-xs text-default-400">
                Процентное соотношение использования приложений за сутки
              </Card.Description>
            </div>
          </Card.Header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            <div className="md:col-span-2 h-[260px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    animationDuration={800}
                    animationEasing="ease-out"
                    activeShape={renderActiveShape}
                    >
                    {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="none" />
                    ))}
                    </Pie>
                    <Tooltip 
                    labelFormatter={() => ''}
                    separator=""
                    formatter={(value) => {
                        const percent = totalValue > 0 ? ((value / totalValue) * 100).toFixed(1) : 0;
                        return [`Время: ${formatSeconds(value)} (${percent}%)`, ''];
                    }}
                    contentStyle={{ 
                        borderRadius: '12px', 
                        background: 'var(--code-background)', 
                        border: '1px solid var(--default-200)',
                        fontSize: '13px',
                        color: 'var(--foreground)'
                    }}
                    itemStyle={{ color: 'var(--foreground)' }}
                    />
                </PieChart>
                </ResponsiveContainer>
            </div>

            <div className="space-y-3">
                {chartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-3">
                    <div 
                    className="w-3 h-3 rounded-full shrink-0" 
                    style={{ backgroundColor: COLORS[index % COLORS.length] }} 
                    />
                    <div className="flex flex-col">
                    <span className="text-sm font-medium truncate max-w-[180px]">{entry.name}</span>
                    </div>
                </div>
                ))}
            </div>
            </div>
        </Card>
      )}
    </div>
  );
}
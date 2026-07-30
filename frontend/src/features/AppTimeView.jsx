"use client";

import React, { useEffect, useState } from "react";
import { 
  Card, 
  Pagination, 
  Spinner,
  Label,
  ListBox,
  Select,
  Button,
  Calendar, 
  DateField, 
  DatePicker, 
  DateRangePicker, 
  RangeCalendar
} from "@heroui/react";
import { 
  Clock, 
  X,
  Flame,
  Award,
  PieChart as ChartIcon,
  LayoutGrid
} from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Sector } from "recharts";

const LIMIT = 15;
const COLORS = ["#006FEE", "#9353D3", "#17C964", "#F5A524", "#F31260"];

const PERIODS = [
  { key: "all", label: "За всё время" },
  { key: "today", label: "Сегодня" },
  { key: "yesterday", label: "Вчера" },
  { key: "week", label: "Неделя" },
  { key: "month", label: "Месяц" },
  { key: "year", label: "Год" },
  { key: "specific_day", label: "Конкретный день" },
  { key: "custom", label: "Интервал дат" }
];

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

const formatCalendarDate = (dateObj) => {
  if (!dateObj) return null;
  if (dateObj instanceof Date) {
    return dateObj.toISOString().split("T")[0];
  }
  if (dateObj.year && dateObj.month && dateObj.day) {
    const year = dateObj.year;
    const month = String(dateObj.month).padStart(2, "0");
    const day = String(dateObj.day).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return String(dateObj);
};

export default function AppTimeView() {
  const [appTimes, setAppTimes] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [period, setPeriod] = useState("all");
  const [specificDay, setSpecificDay] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const offset = (page - 1) * LIMIT;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  const formatSeconds = (totalSeconds) => {
    if (!totalSeconds || totalSeconds <= 0) return "0 мин";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    if (h > 0) return `${h} ч ${m} мин`;
    return `${m} мин`;
  };

  async function fetchAppTimeData(isInitial = false) {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const params = new URLSearchParams();
      params.append("offset", offset.toString());
      params.append("limit", LIMIT.toString());

      if (period !== "all") {
        params.append("period", period);
      }

      if (period === "specific_day" && specificDay) {
        const formattedDate = formatCalendarDate(specificDay);
        if (formattedDate) {
          params.append("specific_day", formattedDate);
        }
      }

      if (period === "custom" && dateRange?.start && dateRange?.end) {
        const dateFrom = formatCalendarDate(dateRange.start);
        const dateTo = formatCalendarDate(dateRange.end);

        if (dateFrom && dateTo) {
          params.append("date_from", `${dateFrom}T00:00:00.000Z`);
          params.append("date_to", `${dateTo}T23:59:59.999Z`);
        }
      }

      const res = await fetch(`/api/sessions/time?${params.toString()}`);
      if (!res.ok) throw new Error("Не удалось загрузить статистику времени");
      
      const data = await res.json();
      const itemsArray = data.items || data || [];

      const processedItems = itemsArray.map((app) => {
        const baseSeconds = app.total_seconds || 0;
        const addedHours = app.added_hours || 0;
        
        const finalSeconds = period === "all" 
          ? baseSeconds + (addedHours * 3600)
          : baseSeconds;

        return {
          ...app,
          total_seconds: finalSeconds
        };
      });
      
      const sortedData = processedItems.sort((a, b) => b.total_seconds - a.total_seconds);
      
      setAppTimes(sortedData);
      setTotalCount(data.total || sortedData.length);
      
    } catch (error) {
      console.error("Ошибка при получении времени приложений:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchAppTimeData(appTimes.length === 0);
  }, [page, period, specificDay, dateRange]);

  const handlePeriodChange = (keys) => {
    let cleanKey = "all";
    if (typeof keys === "string") {
      cleanKey = keys;
    } else if (keys && typeof keys === "object" && keys.currentKey) {
      cleanKey = String(keys.currentKey);
    } else if (keys && keys.size > 0) {
      cleanKey = String(Array.from(keys)[0]);
    }

    setPeriod(cleanKey);
    if (cleanKey !== "specific_day") setSpecificDay(null);
    if (cleanKey !== "custom") setDateRange(null);
    setPage(1);
  };

  const resetFilters = () => {
    setPeriod("all");
    setSpecificDay(null);
    setDateRange(null);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
        <Spinner size="lg" label="Загрузка статистики времени..." color="primary" />
      </div>
    );
  }

  const topLeader = appTimes[0] || null;
  const totalPeriodSeconds = appTimes.reduce((acc, curr) => acc + (curr.total_seconds || 0), 0);
  const maxSeconds = topLeader?.total_seconds || 1;

  const chartData = appTimes.slice(0, 5).map((app) => ({
    name: app.display_name || app.app_name,
    value: app.total_seconds || 0
  }));

  const totalChartSeconds = chartData.reduce((sum, item) => sum + item.value, 0);

  const getPageNumbers = () => {
    const pages = [];
    pages.push(1);

    if (page > 3) {
      pages.push("ellipsis");
    }

    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (page < totalPages - 2) {
      pages.push("ellipsis");
    }

    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Время в приложениях</h2>
          <p className="text-default-500 text-sm mt-1">
            Анализ общего времени использования приложений и утилит за выбранный период
          </p>
        </div>
        {isRefreshing && !loading && (
          <div className="shrink-0 opacity-80 transition-opacity">
            <Spinner size="sm" color="primary" />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
        <Card className="p-4 border border-default-100 bg-content1 flex flex-row items-center gap-4 h-full">
          <div className="p-3 rounded-xl bg-warning-50 dark:bg-warning-950/20 border border-warning-100 dark:border-warning-900 shrink-0">
            <Flame className="text-warning size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-default-400 font-medium uppercase tracking-wider">Главный лидер периода</p>
            <h4 className="text-lg font-bold text-default-800 truncate mt-0.5">
              {topLeader ? (topLeader.display_name || topLeader.app_name) : "Нет данных"}
            </h4>
            <p className="text-xs text-default-500 mt-0.5">
              Суммарно: <span className="font-semibold text-warning">{topLeader ? formatSeconds(topLeader.total_seconds) : "0 мин"}</span>
            </p>
          </div>
        </Card>

        <Card className="p-4 border border-default-100 bg-content1 flex flex-row items-center gap-4 h-full">
          <div className="p-3 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900 shrink-0">
            <Award className="text-primary size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-default-400 font-medium uppercase tracking-wider">Всего время в приложениях</p>
            <h4 className="text-lg font-bold text-default-800 truncate mt-0.5">
              {formatSeconds(totalPeriodSeconds)}
            </h4>
            <p className="text-xs text-default-500 mt-0.5">
              Учтено приложений: <span className="font-semibold text-primary">{totalCount}</span>
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
        
        <div className="lg:col-span-2 flex flex-col justify-between">
          <Card className="p-4 border border-default-100 bg-content1 gap-4 flex flex-col overflow-visible h-full justify-between">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
              <div className="w-full">
                <Select 
                  className="w-full" 
                  selectedKeys={new Set([period])}
                  onSelectionChange={handlePeriodChange}
                >
                  <Label>Период выборки</Label>
                  <Select.Trigger>
                    <Select.Value>{PERIODS.find(p => p.key === period)?.label || "Выбрать"}</Select.Value>
                    <Select.Indicator />
                  </Select.Trigger>
                  <Select.Popover>
                    <ListBox variant="flat">
                      {PERIODS.map((p) => (
                        <ListBox.Item id={p.key} key={p.key} textValue={p.label}>
                          {p.label}
                          <ListBox.ItemIndicator />
                        </ListBox.Item>
                      ))}
                    </ListBox>
                  </Select.Popover>
                </Select>
              </div>

              <div className="w-full">
                <DatePicker 
                  className="w-full" 
                  name="specific_day"
                  isDisabled={period !== "specific_day"}
                  value={specificDay}
                  onChange={(date) => { setSpecificDay(date); setPage(1); }}
                >
                  <Label>Конкретный день</Label>
                  <DateField.Group fullWidth>
                    <DateField.Input>{(segment) => <DateField.Segment segment={segment} />}</DateField.Input>
                    <DateField.Suffix>
                      <DatePicker.Trigger>
                        <DatePicker.TriggerIndicator />
                      </DatePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  <DatePicker.Popover>
                    <Calendar aria-label="Выберите день">
                      <Calendar.Header>
                        <Calendar.YearPickerTrigger>
                          <Calendar.YearPickerTriggerHeading />
                          <Calendar.YearPickerTriggerIndicator />
                        </Calendar.YearPickerTrigger>
                        <Calendar.NavButton slot="previous" />
                        <Calendar.NavButton slot="next" />
                      </Calendar.Header>
                      <Calendar.Grid>
                        <Calendar.GridHeader>
                          {(day) => (
                            <Calendar.HeaderCell>
                              {day}
                            </Calendar.HeaderCell>
                          )}
                        </Calendar.GridHeader>
                        <Calendar.GridBody>
                          {(date) => (
                            <Calendar.Cell date={date} />
                          )}
                        </Calendar.GridBody>
                      </Calendar.Grid>
                    </Calendar>
                  </DatePicker.Popover>
                </DatePicker>
              </div>

              <div className="w-full">
                <DateRangePicker 
                  className="w-full" 
                  endName="endDate" 
                  startName="startDate"
                  isDisabled={period !== "custom"}
                  value={dateRange}
                  onChange={(range) => { setDateRange(range); setPage(1); }}
                >
                  <Label>Интервал дат</Label>
                  <DateField.Group fullWidth>
                    <DateField.Input slot="start">
                      {(segment) => <DateField.Segment segment={segment} />}
                    </DateField.Input>
                    <DateRangePicker.RangeSeparator />
                    <DateField.Input slot="end">
                      {(segment) => <DateField.Segment segment={segment} />}
                    </DateField.Input>
                    <DateField.Suffix>
                      <DateRangePicker.Trigger>
                        <DateRangePicker.TriggerIndicator />
                      </DateRangePicker.Trigger>
                    </DateField.Suffix>
                  </DateField.Group>
                  <DateRangePicker.Popover>
                    <RangeCalendar aria-label="Выберите интервал">
                      <RangeCalendar.Header>
                        <RangeCalendar.YearPickerTrigger>
                          <RangeCalendar.YearPickerTriggerHeading />
                          <RangeCalendar.YearPickerTriggerIndicator />
                        </RangeCalendar.YearPickerTrigger>
                        <RangeCalendar.NavButton slot="previous" />
                        <RangeCalendar.NavButton slot="next" />
                      </RangeCalendar.Header>
                      <RangeCalendar.Grid>
                        <RangeCalendar.GridHeader>
                          {(day) => (
                            <RangeCalendar.HeaderCell>
                              {day}
                            </RangeCalendar.HeaderCell>
                          )}
                        </RangeCalendar.GridHeader>
                        <RangeCalendar.GridBody>
                          {(date) => (
                            <RangeCalendar.Cell date={date} />
                          )}
                        </RangeCalendar.GridBody>
                      </RangeCalendar.Grid>
                    </RangeCalendar>
                  </DateRangePicker.Popover>
                </DateRangePicker>
              </div>
            </div>

            {(period !== "all" || specificDay || dateRange) && (
              <div className="flex justify-end pt-1 border-t border-default-50">
                <Button 
                  size="sm" 
                  variant="secondary" 
                  className="text-danger border border-danger-100 dark:border-danger-900/30 w-full sm:w-auto"
                  onPress={resetFilters}
                >
                  <X className="size-4 mr-1" /> Сбросить период
                </Button>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-default-100/60">
              <div className="p-3 rounded-xl bg-default-50 border border-default-100/80 flex flex-col justify-center">
                <span className="text-xs text-default-400 font-medium">Интенсивность сессий</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-default-700">
                    {appTimes.length > 0 ? formatSeconds(Math.round(totalPeriodSeconds / appTimes.length)) : '0 мин'}
                  </span>
                  <span className="text-xs text-default-400">/ среднее на приложение</span>
                </div>
              </div>
              <div className="p-3 rounded-xl bg-default-50 border border-default-100/80 flex flex-col justify-center">
                <span className="text-xs text-default-400 font-medium">Плотность распределения</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-xl font-bold text-default-700">
                    {appTimes.filter(a => a.total_seconds > 3600).length}
                  </span>
                  <span className="text-xs text-default-400">приложений используются больше часа</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="w-full">
          {chartData.length > 0 ? (
            <Card className="p-4 border border-default-100 bg-content1 h-full flex flex-col justify-between">
              <Card.Header className="p-0 pb-3 flex flex-row items-center gap-2 border-b border-default-50">
                <ChartIcon className="text-primary size-4" />
                <div>
                  <h4 className="text-sm font-semibold text-default-800">Доли времени (Топ-5)</h4>
                </div>
              </Card.Header>

              <div className="h-[140px] w-full mt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={3}
                      dataKey="value"
                      animationDuration={400}
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
                        const percent = totalChartSeconds > 0 ? ((value / totalChartSeconds) * 100).toFixed(1) : 0;
                        return [`Итого: ${formatSeconds(value)} (${percent}%)`, ''];
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

              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2 text-[11px]">
                {chartData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center gap-1.5 max-w-[120px]">
                    <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="truncate text-default-600 font-medium">{entry.name}</span>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-6 text-center text-sm text-default-400 border border-default-100 bg-content1 h-full flex items-center justify-center">
              Нет данных для графика
            </Card>
          )}
        </div>

      </div>

      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2 px-1">
          <LayoutGrid className="size-5 text-default-400" />
          <h3 className="text-lg font-bold tracking-tight text-default-800">Детализация по приложениям</h3>
        </div>

        {appTimes.length === 0 ? (
          <div className="text-center py-12 text-default-400 border border-dashed border-default-200 rounded-2xl bg-content1">
            Данные об активности за этот период отсутствуют
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {appTimes.map((app, index) => {
              const absoluteIndex = offset + index + 1;
              const meterValue = Math.round((app.total_seconds / maxSeconds) * 100);

              return (
                <Card 
                  key={app.app_id || app.app_name + index} 
                  className="p-4 border border-default-100 bg-content1 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-hover hover:border-default-200"
                >
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="flex items-center justify-center size-9 rounded-xl border border-default-100 bg-default-50 text-default-500 font-mono text-sm font-semibold shrink-0">
                      #{absoluteIndex}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <h4 className="font-semibold text-base text-default-800 truncate">
                        {app.display_name || app.app_name}
                      </h4>

                      <div className="w-full max-w-md hidden sm:block">
                        <div className="h-1.5 w-full bg-default-100 rounded-full overflow-hidden">
                          <div 
                            className="h-full rounded-full transition-all" 
                            style={{ 
                              width: `${meterValue}%`,
                              backgroundColor: COLORS[index % COLORS.length] || "var(--disabled-color)"
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                    <div className="flex items-center gap-2 bg-default-50 dark:bg-default-800/40 px-3 py-1.5 rounded-xl border border-default-100/60 h-9">
                      <Clock className="size-4 text-default-400" />
                      <span className="text-sm font-bold text-default-700 tabular-nums">
                        {formatSeconds(app.total_seconds)}
                      </span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {totalPages > 1 && (
          <div className="pt-4 flex justify-center">
            <div className="w-full max-w-2xs overflow-x-auto sm:max-w-full">
              <Pagination className="justify-center">
                <Pagination.Content>
                  <Pagination.Item>
                    <Pagination.Previous
                      isDisabled={page === 1}
                      onPress={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <Pagination.PreviousIcon />
                      <span>Назад</span>
                    </Pagination.Previous>
                  </Pagination.Item>

                  {getPageNumbers().map((p, i) =>
                    p === "ellipsis" ? (
                      <Pagination.Item key={`ellipsis-${i}`}>
                        <Pagination.Ellipsis />
                      </Pagination.Item>
                    ) : (
                      <Pagination.Item key={p}>
                        <Pagination.Link isActive={p === page} onPress={() => setPage(p)}>
                          {p}
                        </Pagination.Link>
                      </Pagination.Item>
                    ),
                  )}

                  <Pagination.Item>
                    <Pagination.Next
                      isDisabled={page === totalPages}
                      onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <span>Вперед</span>
                      <Pagination.NextIcon />
                    </Pagination.Next>
                  </Pagination.Item>
                </Pagination.Content>
              </Pagination>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
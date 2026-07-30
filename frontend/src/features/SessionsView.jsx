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
  RangeCalendar,
  Chip,
  Input
} from "@heroui/react";
import { 
  Activity, 
  Clock, 
  Calendar as CalendarIcon,
  X
} from "lucide-react";

const LIMIT = 15;

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

const STATUS_OPTIONS = [
  { key: "all", label: "Все сессии" },
  { key: "active", label: "Только активные" },
  { key: "inactive", label: "Только завершенные" }
];

export default function SessionsView() {
  const [sessions, setSessions] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState("all"); 
  const [period, setPeriod] = useState("all");
  const [specificDay, setSpecificDay] = useState(null);
  const [dateRange, setDateRange] = useState(null);
  
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const offset = (page - 1) * LIMIT;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [search]);

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return "0 мин";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h} ч ${m} мин`;
    return `${m} мин`;
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  async function fetchSessions(isInitial = false) {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const params = new URLSearchParams();
      params.append("offset", offset.toString());
      params.append("limit", LIMIT.toString());

      if (statusFilter === "active") {
        params.append("is_active", "true");
      } else if (statusFilter === "inactive") {
        params.append("is_active", "false");
      }
      
      if (period !== "all") {
        params.append("period", period);
      }

      if (period === "specific_day" && specificDay) {
        const formattedDate = `${specificDay.year}-${String(specificDay.month).padStart(2, '0')}-${String(specificDay.day).padStart(2, '0')}`;
        
        params.append("specific_day", formattedDate);
      }

      if (period === "custom" && dateRange?.start && dateRange?.end) {
        params.append("date_from", new Date(dateRange.start.toString()).toISOString());
        params.append("date_to", new Date(dateRange.end.toString()).toISOString());
      }

      if (debouncedSearch) {
        params.append("app_name", debouncedSearch);
      }

      const res = await fetch(`/api/sessions/?${params.toString()}`);
      if (!res.ok) throw new Error("Не удалось загрузить данные");
      
      const data = await res.json();
      
      setSessions(data.items || data || []);
      setTotalCount(data.total || (data || []).length);
      
    } catch (error) {
      console.error("Ошибка при получении сессий:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchSessions(sessions.length === 0);
  }, [page, statusFilter, period, specificDay, dateRange, debouncedSearch]);

  const handlePeriodChange = (key) => {
    const cleanKey = key ? String(key) : "all";
    setPeriod(cleanKey);
    if (cleanKey !== "specific_day") setSpecificDay(null);
    if (cleanKey !== "custom") setDateRange(null);
    
    setPage(1);
  };

  const handleStatusChange = (key) => {
    const cleanKey = key ? String(key) : "all";
    setStatusFilter(cleanKey);
    setPage(1);
  };

  const resetFilters = () => {
    setPeriod("all");
    setStatusFilter("all");
    setSearch("");
    setDebouncedSearch("");
    setSpecificDay(null);
    setDateRange(null);
    setPage(1);
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
        <Spinner size="lg" label="Загрузка истории сессий..." color="primary" />
      </div>
    );
  }

  const activePeriodStr = String(period);   

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
          <h2 className="text-2xl font-bold tracking-tight">История сессий</h2>
          <p className="text-default-500 text-sm mt-1">
            Просмотр активности, времени работы приложений и текущих запущенных процессов
          </p>
        </div>
        {isRefreshing && !loading && (
          <div className="shrink-0 opacity-80 transition-opacity">
            <Spinner size="sm" color="primary" />
          </div>
        )}
      </div>

      <Card className="p-4 border border-default-100  bg-content1 gap-4 flex flex-col overflow-visible">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 items-end">
          
          <div className="w-full">
            <Select 
              className="w-full" 
              selectedKey={activePeriodStr}
              onSelectionChange={handlePeriodChange}
            >
              <Label>Предустановленный период</Label>
              <Select.Trigger>
                <Select.Value>{PERIODS.find(p => p.key === activePeriodStr)?.label || "Выбрать"}</Select.Value>
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
            <Select 
              className="w-full" 
              selectedKey={statusFilter}
              onSelectionChange={handleStatusChange}
            >
              <Label>Статус активности</Label>
              <Select.Trigger>
                <Select.Value>{STATUS_OPTIONS.find(s => s.key === statusFilter)?.label || "Выбрать"}</Select.Value>
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox variant="flat">
                  {STATUS_OPTIONS.map((status) => (
                    <ListBox.Item id={status.key} key={status.key} textValue={status.label}>
                      {status.label}
                      <ListBox.ItemIndicator />
                    </ListBox.Item>
                  ))}
                </ListBox>
              </Select.Popover>
            </Select>
          </div>

          <div className="w-full flex flex-col gap-1">
            <Label>Поиск приложения</Label>
            <Input
                placeholder="Название..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                variant="bordered"
                size="md"
                className="w-full"
                isClearable
                onClear={() => setSearch("")}
            />
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
                      {(day) => <Calendar.HeaderCell>{day}</Calendar.HeaderCell>}
                    </Calendar.GridHeader>
                    <Calendar.GridBody>{(date) => <Calendar.Cell date={date} />}</Calendar.GridBody>
                  </Calendar.Grid>
                  <Calendar.YearPickerGrid>
                    <Calendar.YearPickerGridBody>
                      {({year}) => <Calendar.YearPickerCell year={year} />}
                    </Calendar.YearPickerGridBody>
                  </Calendar.YearPickerGrid>
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
                      {(day) => <RangeCalendar.HeaderCell>{day}</RangeCalendar.HeaderCell>}
                    </RangeCalendar.GridHeader>
                    <RangeCalendar.GridBody>
                      {(date) => <RangeCalendar.Cell date={date} />}
                    </RangeCalendar.GridBody>
                  </RangeCalendar.Grid>
                  <RangeCalendar.YearPickerGrid>
                    <RangeCalendar.YearPickerGridBody>
                      {({year}) => <RangeCalendar.YearPickerCell year={year} />}
                    </RangeCalendar.YearPickerGridBody>
                  </RangeCalendar.YearPickerGrid>
                </RangeCalendar>
              </DateRangePicker.Popover>
            </DateRangePicker>
          </div>

        </div>

        {(period !== "all" || statusFilter !== "all" || specificDay || dateRange || search) && (
          <div className="flex justify-end pt-2 border-t border-default-50">
            <Button 
              size="sm" 
              variant="secondary" 
              className="text-danger border border-danger-100 dark:border-danger-900/30 w-full sm:w-auto"
              onPress={resetFilters}
            >
              <X className="size-4 mr-1" /> Сбросить все фильтры
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 gap-4">
        {sessions.length === 0 ? (
          <div className="text-center py-12 text-default-400 border border-dashed border-default-200 rounded-2xl bg-content1">
            Сессии с такими параметрами не найдены
          </div>
        ) : (
          sessions.map((session) => (
            <Card key={session.id} className="p-4 border border-default-100  bg-content1 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className={`p-2.5 rounded-xl border shrink-0 relative ${
                  !session.end_time 
                    ? "bg-success-50 dark:bg-success-950/20 border-success-200 dark:border-success-900" 
                    : "bg-default-50 border-default-100"
                }`}>
                  <Activity className={"text-default-400"} />
                </div>
                
                <div className="flex-1 min-w-0 space-y-0.5">
                  <h4 className="font-semibold text-base text-default-800 truncate">
                    {session.display_name || session.app_name || "Неизвестное приложение"}
                  </h4>
                  <div className="flex items-center gap-4 text-xs text-default-400">
                    <span className="flex items-center gap-1">
                      <CalendarIcon className="size-3.5" />
                      {formatDate(session.start_time || session.created_at)}
                    </span>
                    {!session.end_time ? (
                      <span>
                        В процессе
                      </span>
                    ) : (
                      session.end_time && (
                        <span>До {new Date(session.end_time).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
                      )
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                {!session.end_time && (
                  <Chip 
                    color="success" 
                    variant="soft" 
                    size="sm" 
                    className="h-8 px-2.5 font-medium"
                  >
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="absolute inline-flex h-full w-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite] rounded-full bg-success opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
                      </span>
                      <span>Активна</span>
                    </div>
                  </Chip>
                )}
                
                <div className="flex items-center gap-3 bg-default-50 dark:bg-default-800/40 px-3 py-1.5 rounded-xl border border-default-100/60 h-8">
                  <Clock className="size-4 text-default-500" />
                  <span className="text-sm font-semibold text-default-700 tabular-nums">
                    {formatDuration(
                      session.duration_seconds || 
                      session.duration || 
                      Math.max(0, Math.floor(
                        ((!session.end_time 
                          ? new Date().getTime() 
                          : new Date(session.end_time || session.last_seen || new Date()).getTime()
                         ) - new Date(session.start_time).getTime()) / 1000
                      ))
                    )}
                  </span>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {totalPages > 1 && (
        <div className="pt-4 flex justify-center">
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
      )}
    </div>
  );
}
"use client";

import React, { useEffect, useState } from "react";
import { 
  Card, 
  Spinner,
  Label,
  ListBox,
  Select,
  Button,
  Tooltip,
  AlertDialog,
  Calendar, 
  DateField, 
  DatePicker, 
  DateRangePicker, 
  RangeCalendar
} from "@heroui/react";
import { 
  Database, 
  Calendar as CalendarIcon,
  Plus,
  RotateCcw,
  Trash2,
  HardDrive,
  RefreshCw,
  X
} from "lucide-react";

const TYPE_OPTIONS = [
  { key: "all", label: "Все типы" },
  { key: "manual", label: "Ручные" },
  { key: "auto", label: "Автоматические" },
  { key: "BEFORE-RESTORE", label: "Перед восстановлением" }
];

const PERIODS = [
  { key: "all", label: "За всё время" },
  { key: "today", label: "Сегодня" },
  { key: "specific_day", label: "Конкретный день" },
  { key: "custom", label: "Интервал дат" }
];

export default function BackupsView() {
  const [backups, setBackups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);

  const [backupToDelete, setBackupToDelete] = useState(null);
  const [backupToRestore, setBackupToRestore] = useState(null);

  const [typeFilter, setTypeFilter] = useState("all");
  const [period, setPeriod] = useState("all");
  const [specificDay, setSpecificDay] = useState(null);
  const [dateRange, setDateRange] = useState(null);

  const getBackupFilename = (backup) => {
    if (!backup) return "";
    return backup.backup_name || backup.filename || backup.name || backup.id || "";
  };

  const parseBackupDate = (backup) => {
    if (backup?.created_at) {
      const numSec = Number(backup.created_at);
      if (!isNaN(numSec) && numSec > 0) {
        return new Date(numSec * 1000);
      }
    }

    const rawName = getBackupFilename(backup);
    const matchFull = rawName.match(/(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})/);
    if (matchFull) {
      const [_, datePart, h, m, s] = matchFull;
      return new Date(`${datePart}T${h}:${m}:${s}`);
    }

    const matchDateOnly = rawName.match(/(\d{4}-\d{2}-\d{2})/);
    if (matchDateOnly) {
      return new Date(matchDateOnly[1]);
    }

    return null;
  };

  const getBackupType = (backup) => {
    const filename = getBackupFilename(backup);
    const rawType = backup?.backup_type || "";
    
    if (filename.startsWith("auto_") || rawType === "auto") return "auto";
    if (
      filename.startsWith("BEFORE-RESTORE_") || 
      filename.includes("BEFORE-RESTORE") || 
      rawType === "BEFORE-RESTORE"
    ) {
      return "BEFORE-RESTORE";
    }
    if (filename.startsWith("manual_") || rawType === "manual") return "manual";
    
    return rawType || "manual";
  };

  const getBackupTypeName = (type) => {
    switch (type) {
      case "manual":
        return "Ручной";
      case "auto":
        return "Авто";
      case "BEFORE-RESTORE":
        return "Перед восстановлением";
      default:
        return type;
    }
  };

  const formatSize = (sizeKb) => {
    if (sizeKb === undefined || sizeKb === null) return "0 КБ";
    if (sizeKb >= 1024) {
      return `${(sizeKb / 1024).toFixed(2)} МБ`;
    }
    return `${sizeKb.toFixed(1)} КБ`;
  };

  const formatDate = (dateObj) => {
    if (!dateObj || isNaN(dateObj.getTime())) return "Дата неизвестна";
    return dateObj.toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  async function fetchBackups(isInitial = false) {
    try {
      if (isInitial) setLoading(true);
      else setIsRefreshing(true);

      const res = await fetch("/api/backups/");
      if (!res.ok) throw new Error("Не удалось загрузить данные");
      
      const data = await res.json();
      setBackups(Array.isArray(data) ? data : data.items || []);
    } catch (error) {
      console.error("Ошибка при получении бэкапов:", error);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchBackups(true);
  }, []);

  const handleCreateBackup = async () => {
    try {
      setActionLoading("create");
      const res = await fetch("/api/backups/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_type: "manual", add_time: true })
      });
      if (!res.ok) throw new Error("Ошибка при создании бэкапа");
      await fetchBackups();
    } catch (error) {
      console.error(error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRestore = async () => {
    if (!backupToRestore) return;
    const backupName = getBackupFilename(backupToRestore);
    
    try {
      setActionLoading(`load:${backupName}`);
      setBackupToRestore(null);

      const res = await fetch("/api/backups/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_name: backupName })
      });

      if (!res.ok) {
        let errorMessage = `Ошибка ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) {
            errorMessage = Array.isArray(errData.detail)
              ? errData.detail.map((e) => `${e.loc?.join(".") || "field"}: ${e.msg}`).join(" | ")
              : String(errData.detail);
          } else {
            errorMessage = JSON.stringify(errData);
          }
        } catch (_) {
          const text = await res.text().catch(() => "");
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      await fetchBackups();
    } catch (error) {
      console.error("Ошибка при восстановлении:", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Не удалось восстановить бэкап: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!backupToDelete) return;
    const backupName = getBackupFilename(backupToDelete);

    try {
      setActionLoading(`delete:${backupName}`);
      setBackupToDelete(null);

      const res = await fetch("/api/backups/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ backup_name: backupName })
      });

      if (!res.ok) {
        let errorMessage = `Ошибка ${res.status}`;
        try {
          const errData = await res.json();
          if (errData.detail) {
            errorMessage = Array.isArray(errData.detail)
              ? errData.detail.map((e) => `${e.loc?.join(".") || "field"}: ${e.msg}`).join(" | ")
              : String(errData.detail);
          } else {
            errorMessage = JSON.stringify(errData);
          }
        } catch (_) {
          const text = await res.text().catch(() => "");
          if (text) errorMessage = text;
        }
        throw new Error(errorMessage);
      }

      await fetchBackups();
    } catch (error) {
      console.error("Ошибка при удалении:", error);
      const msg = error instanceof Error ? error.message : String(error);
      alert(`Не удалось удалить бэкап: ${msg}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handlePeriodChange = (key) => {
    const cleanKey = key ? String(key) : "all";
    setPeriod(cleanKey);
    if (cleanKey !== "specific_day") setSpecificDay(null);
    if (cleanKey !== "custom") setDateRange(null);
  };

  const resetFilters = () => {
    setTypeFilter("all");
    setPeriod("all");
    setSpecificDay(null);
    setDateRange(null);
  };

  const filteredBackups = backups.filter((backup) => {
    const type = getBackupType(backup);
    const date = parseBackupDate(backup);

    if (typeFilter !== "all" && type !== typeFilter) {
      return false;
    }

    if (period !== "all" && date) {
      const now = new Date();
      if (period === "today") {
        const isToday = date.getDate() === now.getDate() &&
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (period === "specific_day" && specificDay) {
        const isSameDay = date.getDate() === specificDay.day &&
          date.getMonth() + 1 === specificDay.month &&
          date.getFullYear() === specificDay.year;
        if (!isSameDay) return false;
      } else if (period === "custom" && dateRange?.start && dateRange?.end) {
        const startDate = new Date(dateRange.start.toString());
        const endDate = new Date(dateRange.end.toString());
        endDate.setHours(23, 59, 59, 999);
        if (date < startDate || date > endDate) return false;
      }
    }

    return true;
  });

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
        <Spinner size="lg" label="Загрузка резервных копий..." color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Резервные копии</h2>
          <p className="text-default-500 text-sm mt-1">
            Управление точками восстановления данных и создание снимков системы
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isRefreshing && !loading && (
            <div className="shrink-0 opacity-80 mr-2">
              <Spinner size="sm" color="primary" />
            </div>
          )}
          <Button
            variant="flat"
            size="md"
            onPress={() => fetchBackups()}
            isDisabled={isRefreshing}
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button 
            color="primary" 
            size="md"
            className="font-medium"
            onPress={handleCreateBackup}
            isDisabled={actionLoading === "create"}
          >
            {actionLoading === "create" ? (
              <Spinner size="sm" color="white" />
            ) : (
              <Plus className="size-4 mr-1" />
            )}
            Создать бэкап
          </Button>
        </div>
      </div>

      <Card className="p-4 border border-default-100 bg-content1 gap-4 flex flex-col overflow-visible">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          
          <div className="w-full">
            <Select 
              className="w-full" 
              selectedKey={typeFilter}
              onSelectionChange={(key) => setTypeFilter(key ? String(key) : "all")}
            >
              <Label>Тип бэкапа</Label>
              <Select.Trigger>
                <Select.Value>{TYPE_OPTIONS.find(t => t.key === typeFilter)?.label || "Выбрать"}</Select.Value>
                <Select.Indicator />
              </Select.Trigger>
              <Select.Popover>
                <ListBox variant="flat">
                  {TYPE_OPTIONS.map((type) => (
                    <ListBox.Item id={type.key} key={type.key} textValue={type.label}>
                      {type.label}
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
              selectedKey={period}
              onSelectionChange={handlePeriodChange}
            >
              <Label>Период</Label>
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
              isDisabled={period !== "specific_day"}
              value={specificDay}
              onChange={(date) => setSpecificDay(date)}
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
              isDisabled={period !== "custom"}
              value={dateRange}
              onChange={(range) => setDateRange(range)}
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

        {(typeFilter !== "all" || period !== "all" || specificDay || dateRange) && (
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

      <div className="grid grid-cols-1 gap-3">
        {filteredBackups.length === 0 ? (
          <div className="text-center py-12 text-default-400 border border-dashed border-default-200 rounded-2xl bg-content1">
            Резервные копии не найдены
          </div>
        ) : (
          filteredBackups.map((backup, idx) => {
            const filename = getBackupFilename(backup) || `backup_${idx}`;
            const type = getBackupType(backup);
            const dateObj = parseBackupDate(backup);
            const sizeFormatted = formatSize(backup.size_kb);

            const isRestoring = actionLoading === `load:${filename}`;
            const isDeleting = actionLoading === `delete:${filename}`;

            return (
              <Card 
                key={filename} 
                className="relative p-4 border border-default-100 bg-content1 flex flex-row items-center justify-between gap-4 overflow-visible"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2.5 bg-default-50 rounded-xl border border-default-100 shrink-0">
                    <Database className="size-5 text-default-500" />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <h4 className="font-semibold text-base text-default-800 truncate">
                      {getBackupTypeName(type)}
                    </h4>

                    <div className="flex items-center gap-4 text-xs text-default-400 flex-wrap">
                      <span className="flex items-center gap-1.5">
                        <CalendarIcon className="size-3.5" />
                        {formatDate(dateObj)}
                      </span>

                      <span className="flex items-center gap-1.5">
                        <HardDrive className="size-3.5" />
                        {sizeFormatted}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  
                  <Tooltip delay={200} closeDelay={0}>
                    <Button 
                      isIconOnly
                      variant="tertiary"
                      className="size-9 rounded-xl hover:bg-default-100 dark:hover:bg-default-800"
                      isDisabled={Boolean(actionLoading)}
                      onPress={() => setBackupToRestore(backup)}
                    >
                      {isRestoring ? (
                        <Spinner size="sm" color="primary" />
                      ) : (
                        <RotateCcw className="size-4.5 text-primary" />
                      )}
                    </Button>
                    <Tooltip.Content>
                      <p className="text-xs text-default-500 leading-normal">
                        Восстановить базу данных из этой точки
                      </p>
                    </Tooltip.Content>
                  </Tooltip>

                  <Tooltip delay={200} closeDelay={0}>
                    <Button 
                      isIconOnly 
                      variant="tertiary" 
                      className="text-danger-soft-foreground hover:bg-danger-50 dark:hover:bg-danger-950/20 size-9 rounded-xl"
                      isDisabled={Boolean(actionLoading)}
                      onPress={() => setBackupToDelete(backup)}
                    >
                      {isDeleting ? (
                        <Spinner size="sm" color="danger" />
                      ) : (
                        <Trash2 className="size-4.5 text-danger" />
                      )}
                    </Button>
                    <Tooltip.Content>
                      <p className="text-xs text-default-500 leading-normal">
                        Удалить файл резервной копии безвозвратно
                      </p>
                    </Tooltip.Content>
                  </Tooltip>

                </div>
              </Card>
            );
          })
        )}
      </div>

      <AlertDialog isOpen={!!backupToDelete} onClose={() => setBackupToDelete(null)}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger onPress={() => setBackupToDelete(null)} />
              <AlertDialog.Header>
                <AlertDialog.Icon status="danger" />
                <AlertDialog.Heading>Удалить бэкап?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Вы действительно хотите удалить резервную копию{" "}
                  <strong>
                    {backupToDelete && getBackupTypeName(getBackupType(backupToDelete))}
                  </strong>{" "}
                  от{" "}
                  <strong>
                    {backupToDelete && formatDate(parseBackupDate(backupToDelete))}
                  </strong>? Это действие нельзя будет отменить.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary" onPress={() => setBackupToDelete(null)}>
                  Отмена
                </Button>
                <Button variant="danger" onPress={handleConfirmDelete}>
                  Удалить
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

      <AlertDialog isOpen={!!backupToRestore} onClose={() => setBackupToRestore(null)}>
        <AlertDialog.Backdrop>
          <AlertDialog.Container>
            <AlertDialog.Dialog className="sm:max-w-[400px]">
              <AlertDialog.CloseTrigger onPress={() => setBackupToRestore(null)} />
              <AlertDialog.Header>
                <AlertDialog.Icon status="warning" />
                <AlertDialog.Heading>Восстановить систему?</AlertDialog.Heading>
              </AlertDialog.Header>
              <AlertDialog.Body>
                <p>
                  Вы действительно хотите восстановить базу данных из копии от{" "}
                  <strong>
                    {backupToRestore && formatDate(parseBackupDate(backupToRestore))}
                  </strong>? Текущее состояние системы будет перезаписано этим снимком.
                </p>
              </AlertDialog.Body>
              <AlertDialog.Footer>
                <Button slot="close" variant="tertiary" onPress={() => setBackupToRestore(null)}>
                  Отмена
                </Button>
                <Button color="primary" onPress={handleConfirmRestore}>
                  Восстановить
                </Button>
              </AlertDialog.Footer>
            </AlertDialog.Dialog>
          </AlertDialog.Container>
        </AlertDialog.Backdrop>
      </AlertDialog>

    </div>
  );
}
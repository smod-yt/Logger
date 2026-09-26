"use client";

import React, { useEffect, useState } from "react";
import { Card, Switch, Button, Spinner, Tooltip, toast } from "@heroui/react";
import { Settings as SettingsIcon, FileText, DatabaseBackup, FolderOpen } from "lucide-react";

export default function SettingsView() {
  const [settings, setSettings] = useState({
    enable_logging: false,
    enable_auto_backup: false,
  });
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState(null);
  const [isOpening, setIsOpening] = useState(false);

  async function fetchSettings() {
    try {
      setLoading(true);
      const res = await fetch("/api/settings/");
      if (!res.ok) throw new Error("Не удалось загрузить настройки");

      const data = await res.json();
      setSettings({
        enable_logging: Boolean(data.enable_logging),
        enable_auto_backup: Boolean(data.enable_auto_backup),
      });
    } catch (error) {
      console.error("Ошибка при получении настроек:", error);
      toast.danger("Ошибка загрузки", {
        description: "Не удалось получить текущие настройки.",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleToggle = async (key, nextValue) => {
    try {
      setSavingKey(key);

      const res = await fetch("/api/settings/", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, value: nextValue }),
      });

      if (!res.ok) throw new Error("Не удалось сохранить настройку");

      // Обновляем только после успешного ответа сервера
      setSettings((prev) => ({ ...prev, [key]: nextValue }));

      toast.success("Сохранено", {
        description:
          key === "enable_logging"
            ? nextValue
              ? "Логирование включено."
              : "Логирование отключено."
            : nextValue
            ? "Автоматические бэкапы включены."
            : "Автоматические бэкапы отключены.",
      });
    } catch (error) {
      console.error("Ошибка при сохранении настройки:", error);
      toast.danger("Ошибка", {
        description: "Не удалось сохранить настройку.",
      });
    } finally {
      setSavingKey(null);
    }
  };

  const handleOpenSettingsDir = async () => {
    try {
      setIsOpening(true);
      // Эндпоинт не возвращает полезного ответа — просто открывает проводник
      await fetch("/api/settings/open");
    } catch (error) {
      console.error("Ошибка при открытии папки:", error);
      toast.danger("Ошибка", {
        description: "Не удалось открыть папку с данными.",
      });
    } finally {
      setIsOpening(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm">
        <Spinner size="lg" label="Загрузка настроек..." color="primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Настройки</h2>
          <p className="text-default-500 text-sm mt-1">
            Управление параметрами логирования, авто-бэкапов и доступом к данным
          </p>
        </div>
      </div>

      <Card className="p-6 border border-default-100 bg-content1 space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="p-2.5 rounded-xl bg-primary-50 dark:bg-primary-950/20 border border-primary-100 dark:border-primary-900 shrink-0">
              <FileText className="text-primary size-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-base text-default-800">
                Включить логирование
              </h4>
              <p className="text-xs text-default-500 mt-1 leading-relaxed">
                Записывать служебные события приложения в лог-файлы. Полезно
                для диагностики проблем.
              </p>
            </div>
          </div>

          <div className="shrink-0 pt-1">
            {savingKey === "enable_logging" ? (
              <div className="h-6 flex items-center pr-2">
                <Spinner size="sm" color="primary" />
              </div>
            ) : (
              <Switch
                isSelected={settings.enable_logging}
                onChange={(isSelected) =>
                  handleToggle("enable_logging", isSelected)
                }
                aria-label="Включить логирование"
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            )}
          </div>
        </div>

        <div className="border-t border-default-100" />

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="p-2.5 rounded-xl bg-success-50 dark:bg-success-950/20 border border-success-100 dark:border-success-900 shrink-0">
              <DatabaseBackup className="text-success size-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-base text-default-800">
                Включить авто-бэкапы
              </h4>
              <p className="text-xs text-default-500 mt-1 leading-relaxed">
                Автоматически создавать резервные копии базы данных по
                расписанию.
              </p>
            </div>
          </div>

          <div className="shrink-0 pt-1">
            {savingKey === "enable_auto_backup" ? (
              <div className="h-6 flex items-center pr-2">
                <Spinner size="sm" color="primary" />
              </div>
            ) : (
              <Switch
                isSelected={settings.enable_auto_backup}
                onChange={(isSelected) =>
                  handleToggle("enable_auto_backup", isSelected)
                }
                aria-label="Включить авто-бэкапы"
              >
                <Switch.Content>
                  <Switch.Control>
                    <Switch.Thumb />
                  </Switch.Control>
                </Switch.Content>
              </Switch>
            )}
          </div>
        </div>
      </Card>

      <Card className="p-6 border border-default-100 bg-content1">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="p-2.5 rounded-xl bg-default-50 border border-default-100 shrink-0">
              <FolderOpen className="text-default-500 size-5" />
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-base text-default-800">
                Папка с данными
              </h4>
              <p className="text-xs text-default-500 mt-1 leading-relaxed">
                Открыть директорию с файлами базы данных, логов и резервных
                копий в проводнике.
              </p>
            </div>
          </div>

          <Button
            color="primary"
            variant="flat"
            className="shrink-0 self-end sm:self-auto"
            isLoading={isOpening}
            onPress={handleOpenSettingsDir}
            startContent={!isOpening ? <FolderOpen className="size-4" /> : null}
          >
            Открыть папку
          </Button>
        </div>
      </Card>
    </div>
  );
}
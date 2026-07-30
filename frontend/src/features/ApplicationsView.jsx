"use client";

import React, { useEffect, useState } from "react";
import { 
  Card, 
  Pagination, 
  Button, 
  AlertDialog, 
  Modal,
  Checkbox,
  Input, 
  Tooltip, 
  Spinner,
  toast 
} from "@heroui/react";
import { 
  AppWindow, 
  Pencil, 
  Check, 
  X, 
  Trash2,
  Eye, 
  EyeOff,
  Plus,
  Clock,
  ShieldCheck,
  ShieldOff,
  AlertCircle,
  PackagePlus,
  Info
} from "lucide-react";

const LIMIT = 15;
const MAX_HOURS = 20000;

export default function ApplicationsView() {
  const [apps, setApps] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [editingAppId, setEditingAppId] = useState(null);
  const [editNameValue, setEditNameValue] = useState("");

  const [editingHoursId, setEditingHoursId] = useState(null);
  const [editHoursValue, setEditHoursValue] = useState("");

  const [appToDelete, setAppToDelete] = useState(null);

  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [newApps, setNewApps] = useState([]);
  const [selectedNewAppIds, setSelectedNewAppIds] = useState([]);
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoadingNewApps, setIsLoadingNewApps] = useState(false);

  const offset = (page - 1) * LIMIT;
  const totalPages = Math.ceil(totalCount / LIMIT) || 1;

  async function fetchApps(isInitial = false) {
    try {
      if (isInitial) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const res = await fetch(`/api/apps/?offset=${offset}&limit=${LIMIT}`);
      if (!res.ok) throw new Error("Не удалось загрузить данные");
      
      const data = await res.json();
      const rawItems = data.items || data || [];
      const registeredApps = rawItems.filter((app) => !app.is_new);
      
      setApps(registeredApps);
      setTotalCount(data.total || registeredApps.length);
      
    } catch (error) {
      console.error("Ошибка при получении приложений:", error);
      toast.danger("Ошибка загрузки", {
        description: "Не удалось загрузить список приложений.",
      });
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    fetchApps(apps.length === 0);
  }, [page]);

  const fetchNewApps = async () => {
    setIsLoadingNewApps(true);
    try {
      const res = await fetch(`/api/apps/?is_new=true`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const items = data.items || data || [];
      
      const unregistered = items.filter((app) => app.is_new);
      setNewApps(unregistered);
      
      setSelectedNewAppIds([]);
    } catch (error) {
      toast.danger("Ошибка", { description: "Не удалось загрузить новые приложения." });
    } finally {
      setIsLoadingNewApps(false);
    }
  };

  const handleOpenRegisterModal = () => {
    setIsRegisterModalOpen(true);
    fetchNewApps();
  };

  const handleRegisterApps = async () => {
    setIsRegistering(true);
    try {
      const res = await fetch("/api/apps/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          app_ids: selectedNewAppIds,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Успешно", { description: "Приложения добавлены в список." });
      setIsRegisterModalOpen(false);
      fetchApps(false);
    } catch (error) {
      toast.danger("Ошибка", { description: "Не удалось зарегистрировать приложения." });
    } finally {
      setIsRegistering(false);
    }
  };

  const handleSaveName = async (appId) => {
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ display_name: editNameValue.trim() || null }),
      });

      if (!res.ok) throw new Error();

      toast.success("Успешно", { description: "Имя приложения обновлено." });
      setEditingAppId(null);
      fetchApps(false);
    } catch (error) {
      toast.danger("Ошибка", { description: "Не удалось обновить имя приложения." });
    }
  };

  const handleSaveHours = async (appId) => {
    let rawVal = parseInt(editHoursValue, 10);
    if (isNaN(rawVal)) rawVal = 0;
    
    const clampedHours = Math.max(0, Math.min(MAX_HOURS, rawVal));

    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ added_hours: clampedHours }),
      });

      if (!res.ok) throw new Error();

      toast.success("Успешно", { description: `Дополнительные часы обновлены (${clampedHours} ч.).` });
      setEditingHoursId(null);
      fetchApps(false);
    } catch (error) {
      toast.danger("Ошибка", { description: "Не удалось обновить дополнительные часы." });
    }
  };

  const handleToggleShown = async (appId, currentShown) => {
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_shown: !currentShown }),
      });

      if (!res.ok) throw new Error();

      toast.success("Отображение изменено", { 
        description: !currentShown ? "Приложение отображается." : "Приложение скрыто." 
      });
      fetchApps(false);
    } catch (error) {
      toast.danger("Ошибка", { description: "Не удалось изменить отображение." });
    }
  };

  const handleToggleIgnore = async (appId, currentIgnored) => {
    try {
      const res = await fetch(`/api/apps/${appId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_ignored: !currentIgnored }),
      });

      if (!res.ok) throw new Error();

      toast.success("Статус изменен", { 
        description: !currentIgnored ? "Приложение переведено в игнорируемые." : "Приложение снова отслеживается." 
      });
      fetchApps(false);
    } catch (error) {
      toast.danger("Ошибка", { description: "Не удалось изменить статус отслеживания." });
    }
  };

  const handleDeleteApp = async () => {
    if (!appToDelete) return;
    try {
      const res = await fetch(`/api/apps/${appToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      toast.success("Удалено", { description: "Приложение успешно удалено." });
      setAppToDelete(null);
      
      if (apps.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        fetchApps(false);
      }
    } catch (error) {
      toast.danger("Ошибка", { description: "Не удалось удалить приложение." });
    }
  };

  const toggleSelectNewApp = (id) => {
    setSelectedNewAppIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  if (loading) {
    return (
      <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/70 backdrop-blur-sm pointer-events-auto">
        <Spinner size="lg" label="Загрузка приложений..." color="primary" />
      </div>
    );
  }

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Управление приложениями</h2>
          <p className="text-default-500 text-sm mt-1">
            Настройка отображения, кастомных имён, ручного учёта часов и фильтрации
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {isRefreshing && !loading && (
            <div className="shrink-0 opacity-80 transition-opacity">
              <Spinner size="sm" color="primary" />
            </div>
          )}
          
          <Button color="primary" startContent={<Plus className="size-4" />} onPress={handleOpenRegisterModal}>
            Добавить новые приложения
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {apps.length === 0 ? (
          <div className="text-center py-12 text-default-400 border border-dashed border-default-200 rounded-2xl bg-content1">
            Список зарегистрированных приложений пуст
          </div>
        ) : (
          apps.map((app) => {
            const isEditingName = editingAppId === app.id;
            const isEditingHours = editingHoursId === app.id;
            const displayName = app.display_name || app.app_name;

            return (
              <Card 
                key={app.id} 
                className="relative p-4 border border-default-100 bg-content1 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 overflow-visible"
              >
                <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                  <div className="p-2.5 rounded-xl border shrink-0 transition-colors bg-default-50 border-default-100 text-default-500">
                    <AppWindow className="size-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0 space-y-0.5">
                    {isEditingName ? (
                      <div className="flex items-center gap-2 max-w-full">
                        <Input
                          size="sm"
                          className="w-full max-w-[260px]"
                          value={editNameValue}
                          onChange={(e) => setEditNameValue(e.target.value)}
                          placeholder="Новое имя приложения"
                          autoFocus
                        />
                        <Button isIconOnly size="sm" variant="secondary" onPress={() => handleSaveName(app.id)}>
                          <Check className="size-4 text-success" />
                        </Button>
                        <Button isIconOnly size="sm" variant="tertiary" onPress={() => setEditingAppId(null)}>
                          <X className="size-4 text-danger" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-wrap group">
                        <h4 className="font-semibold text-base truncate text-default-800">
                          {displayName}
                        </h4>

                        <Tooltip delay={400}>
                          <Button 
                            isIconOnly 
                            size="sm" 
                            variant="tertiary" 
                            className="opacity-0 group-hover:opacity-100 transition-opacity size-7 rounded-lg"
                            onPress={() => {
                              setEditingAppId(app.id);
                              setEditNameValue(app.display_name || "");
                            }}
                          >
                            <Pencil className="size-3.5 text-default-400" />
                          </Button>
                          <Tooltip.Content>
                            <p>Задать собственное имя приложения</p>
                          </Tooltip.Content>
                        </Tooltip>
                      </div>
                    )}
                    
                    {app.display_name && (
                      <p className="text-xs text-default-400 truncate">
                        Системное: {app.app_name}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0 w-full md:w-auto justify-end border-t md:border-t-0 pt-3 md:pt-0 border-default-100">
                  
                  <Tooltip delay={0}>
                    <Button isIconOnly variant="tertiary" className="size-9 rounded-xl text-default-400 hover:text-default-600">
                      <Info className="size-4.5" />
                    </Button>
                    <Tooltip.Content className="max-w-[260px]">
                      <p className="text-xs">
                        Укажите ранее проведённые часы (от 0 до 20 000). Учитываются только в статистике <strong>«За всё время»</strong>.
                      </p>
                    </Tooltip.Content>
                  </Tooltip>

                  {isEditingHours ? (
                    <div className="flex items-center gap-1.5 bg-default-100 dark:bg-default-800/80 p-1 pl-2.5 rounded-xl border border-default-200">
                      <Clock className="size-3.5 text-primary shrink-0" />
                      <Input
                        size="sm"
                        type="number"
                        min="0"
                        max={MAX_HOURS}
                        className="w-20 text-xs"
                        value={editHoursValue}
                        onChange={(e) => setEditHoursValue(e.target.value)}
                        placeholder="0-20000"
                        autoFocus
                      />
                      <span className="text-xs text-default-400 pr-1">ч.</span>
                      <Button isIconOnly size="sm" variant="secondary" onPress={() => handleSaveHours(app.id)}>
                        <Check className="size-3.5 text-success" />
                      </Button>
                      <Button isIconOnly size="sm" variant="tertiary" onPress={() => setEditingHoursId(null)}>
                        <X className="size-3.5 text-danger" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingHoursId(app.id);
                        setEditHoursValue(app.added_hours ?? 0);
                      }}
                      className="group flex items-center gap-1.5 px-3 py-2 rounded-xl bg-default-50 hover:bg-default-100 dark:bg-default-800/40 dark:hover:bg-default-800 border border-default-100 transition-colors text-xs text-default-600"
                    >
                      <Clock className="size-3.5 text-default-400 group-hover:text-primary transition-colors" />
                      <span>+{app.added_hours || 0} ч.</span>
                      <Pencil className="size-3 text-default-400 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                    </button>
                  )}

                  <Tooltip delay={200} closeDelay={0}>
                    <Button 
                      isIconOnly
                      variant={!app.is_shown ? "flat" : "tertiary"}
                      className={`size-9 rounded-xl transition-all ${
                        !app.is_shown 
                          ? "bg-primary-500/20 text-primary border border-primary-500/40 hover:bg-primary-500/30" 
                          : "hover:bg-default-100 text-default-400"
                      }`}
                      onPress={() => handleToggleShown(app.id, app.is_shown)}
                    >
                      {app.is_shown ? (
                        <Eye className="size-4.5 text-default-400" />
                      ) : (
                        <EyeOff className="size-4.5 text-primary" />
                      )}
                    </Button>
                    <Tooltip.Content>
                      <p className="text-xs">
                        {app.is_shown ? "Отображается в списках (нажмите, чтобы скрыть)" : "Скрыто из списков (нажмите, чтобы показать)"}
                      </p>
                    </Tooltip.Content>
                  </Tooltip>

                  <Tooltip delay={200} closeDelay={0}>
                    <Button 
                      isIconOnly
                      variant={app.is_ignored ? "flat" : "tertiary"}
                      className={`size-9 rounded-xl transition-all ${
                        app.is_ignored 
                          ? "bg-warning-500/20 text-warning border border-warning-500/40 hover:bg-warning-500/30" 
                          : "hover:bg-default-100 text-default-400"
                      }`}
                      onPress={() => handleToggleIgnore(app.id, app.is_ignored)}
                    >
                      {app.is_ignored ? (
                        <ShieldOff className="size-4.5 text-warning" />
                      ) : (
                        <ShieldCheck className="size-4.5 text-default-400" />
                      )}
                    </Button>
                    <Tooltip.Content>
                      <p className="text-xs text-default-500 leading-normal whitespace-pre-line">
                        {app.is_ignored ? (
                          <>
                            <strong className="font-semibold text-warning">Не отслеживается:</strong>
                            {"\n"}Сбор статистики отключен. Нажмите, чтобы включить.
                          </>
                        ) : (
                          <>
                            <strong className="font-semibold text-default-700">Отслеживается:</strong>
                            {"\n"}Нажмите, чтобы отключить трекинг.
                          </>
                        )}
                      </p>
                    </Tooltip.Content>
                  </Tooltip>

                  <Tooltip delay={200} closeDelay={0}>
                    <Button 
                      isIconOnly 
                      variant="tertiary" 
                      className="text-danger-soft-foreground hover:bg-danger-50 dark:hover:bg-danger-950/20 size-9 rounded-xl"
                      onPress={() => setAppToDelete(app)}
                    >
                      <Trash2 className="size-4.5 text-danger" />
                    </Button>
                    <Tooltip.Content>
                      <p>Удалить приложение и статистику</p>
                    </Tooltip.Content>
                  </Tooltip>

                </div>
              </Card>
            );
          })
        )}
      </div>

      {totalPages > 1 && (
        <div className="pt-4 flex justify-center">
          <Pagination className="justify-center">
            <Pagination.Content>
              <Pagination.Item>
                <Pagination.Previous
                  isDisabled={page === 1}
                  onPress={() => setPage((p) => p - 1)}
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
                  onPress={() => setPage((p) => p + 1)}
                >
                  <span>Вперед</span>
                  <Pagination.NextIcon />
                </Pagination.Next>
              </Pagination.Item>
            </Pagination.Content>
          </Pagination>
        </div>
      )}

      <Modal isOpen={isRegisterModalOpen} onOpenChange={setIsRegisterModalOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className="sm:max-w-[500px]">
              <Modal.CloseTrigger onPress={() => setIsRegisterModalOpen(false)} />
              
              <Modal.Header>
                <Modal.Icon className="bg-primary/10 text-primary">
                  <PackagePlus className="size-5" />
                </Modal.Icon>
                <Modal.Heading>Новые обнаруженные приложения</Modal.Heading>
              </Modal.Header>

              <Modal.Body className="space-y-4">
                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-start gap-3">
                  <AlertCircle className="size-5 text-amber-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-default-600 leading-relaxed">
                    Отметьте галочками приложения, которые хотите отслеживать. 
                    <span className="block mt-1 text-amber-600 dark:text-amber-400 font-medium">
                      Выбранные добавятся в основной список, а неотмеченные будут удалены из обнаруженных.
                    </span>
                  </p>
                </div>

                {isLoadingNewApps ? (
                  <div className="py-12 flex justify-center">
                    <Spinner size="md" color="primary" label="Загрузка списка..." />
                  </div>
                ) : newApps.length === 0 ? (
                  <div className="text-center py-8 text-sm text-default-400 border border-dashed border-default-200 rounded-xl">
                    Новых приложений не обнаружено.
                  </div>
                ) : (
                  <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
                    {newApps.map((app) => {
                      const isSelected = selectedNewAppIds.includes(app.id);
                      return (
                        <div 
                          key={app.id} 
                          onClick={() => toggleSelectNewApp(app.id)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer ${
                            isSelected 
                              ? "bg-primary-50/20 border-primary-300 dark:border-primary-800" 
                              : "bg-default-50 hover:bg-default-100 border-default-100"
                          }`}
                        >
                          <Checkbox 
                            isSelected={isSelected}
                            onChange={() => toggleSelectNewApp(app.id)}
                          >
                            <Checkbox.Content>
                              <Checkbox.Control>
                                <Checkbox.Indicator />
                              </Checkbox.Control>
                              <span className="text-sm font-medium text-foreground ml-2 truncate">
                                {app.display_name || app.app_name}
                              </span>
                            </Checkbox.Content>
                          </Checkbox>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Modal.Body>

              <Modal.Footer>
                <Button variant="tertiary" onPress={() => setIsRegisterModalOpen(false)}>
                  Отмена
                </Button>
                <Button 
                  color="primary" 
                  isDisabled={newApps.length === 0} 
                  isLoading={isRegistering} 
                  onPress={handleRegisterApps}
                >
                  Добавить выбранные ({selectedNewAppIds.length})
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>

      {appToDelete && (
        <AlertDialog isOpen={!!appToDelete} onClose={() => setAppToDelete(null)}>
          <AlertDialog.Backdrop>
            <AlertDialog.Container>
              <AlertDialog.Dialog className="sm:max-w-[400px]">
                <AlertDialog.CloseTrigger onPress={() => setAppToDelete(null)} />
                <AlertDialog.Header>
                  <AlertDialog.Icon status="danger" />
                  <AlertDialog.Heading>Удалить приложение?</AlertDialog.Heading>
                </AlertDialog.Header>
                <AlertDialog.Body>
                  <p>
                    Вы действительно хотите удалить{" "}
                    <strong>
                      {appToDelete && (appToDelete.display_name || appToDelete.app_name)}
                    </strong>
                    ? Все собранные данные по времени использования будут уничтожены.
                  </p>
                </AlertDialog.Body>
                <AlertDialog.Footer>
                  <Button slot="close" variant="tertiary" onPress={() => setAppToDelete(null)}>
                    Отмена
                  </Button>
                  <Button variant="danger" onPress={handleDeleteApp}>
                    Удалить
                  </Button>
                </AlertDialog.Footer>
              </AlertDialog.Dialog>
            </AlertDialog.Container>
          </AlertDialog.Backdrop>
        </AlertDialog>
      )}
    </div>
  );
}
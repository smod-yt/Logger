# ⏱️ Logger — Приложение для трекинга активности и времени

[🇷🇺 Русская версия](#-logger--приложение-для-трекинга-активности-и-времени) | [🇬🇧 English version](#-logger--activity--time-tracking-application)

---

## 🇷🇺 Русская версия

**Logger** — это локальный сервисный комплекс для автоматического отслеживания времени, проведённого в приложениях и играх. Приложение работает в фоновом режиме, собирает детальную аналитику, строит наглядные отчёты и поддерживает гибкое управление сессиями.

> 💡 **Фокус разработки:** Проект создавался с упором на бэкенд-архитектуру, проектирование базы данных и надежность системных фоновых процессов. Для быстрого прототипирования и создания UI фронтенд (React + HeroUI) был разработан с привлечением AI-инструментов, что позволило полностью сосредоточиться на бизнес-логике, асинхронности и REST API.

---

## 🌟 Основные возможности

* **Фоновое отслеживание:** Автоматический учёт активных окон и процессов без влияния на производительность.
* **Автозагрузка:** Возможность запуска вместе со стартом системы Windows.
* **Детальная аналитика:** Удобная статистика по дням, неделям, месяцам, годам и произвольным периодам.
* **Кастомизация:** Поддержка светлой и тёмной тем оформления.
* **Надёжность:** Автоматическое и ручное резервное копирование данных (бэкапы).

---

## 📱 Обзор страниц и функционала

* **📋 Добавление приложений:**
* Автоматический поиск и предложение запущенных в системе процессов.
* Настройка отображаемого имени для каждого приложения.
* Включение/отключение отслеживания и отображения в общей статистике.
* Ручной ввод ранее проведённого времени (удобно, если вы ранее играли через Steam или на другом устройстве).


* **📊 Дашборд:**
* Аналитика за текущий день с наглядной визуализацией.
* Список активных и недавно завершённых сессий.


* **📈 Статистика времени:**
* Просмотр суммарного времени в приложениях.
* Гибкая фильтрация: *за всё время, сегодня, вчера, неделя, месяц, год, конкретный день, произвольный диапазон дат*.
* Дополнительные сводные метрики и показатели активности.


* **📜 Журнал сессий:**
* Детальный лог всех зафиксированных сессий.
* Фильтрация по периодам и поиск по конкретным приложениям.


* **💾 Бэкапы и безопасность:**
* **Авто-бэкап:** Создаётся автоматически каждый день при первом запуске приложения.
* **Ручные бэкапы:** Возможность создания и загрузки точечных копий базы данных.
* **Страховка:** При загрузке стороннего бэкапа система автоматически делает страховочную резервную копию текущего состояния.



---

## 🛠️ Стек технологий

* **Backend:** Python 3.14, FastAPI, SQLite, SQLAlchemy + SQLModel, Alembic (миграции), Pydantic.
* **Frontend:** JavaScript, React, HeroUI.
* **System & Automation:** Windows Registry (`winreg`), VBS scripts, PowerShell.

---

## 🚀 Установка и запуск

### 1. Подготовка окружения

1. Установите **Python 3.14** с [официального сайта](https://www.python.org/), если он ещё не установлен.
2. Перейдите в папку `backend` и создайте виртуальное окружение:

```bash
cd backend
python -m venv .venv

```

3. Активируйте виртуальное окружение:
* **Windows (PowerShell / CMD):**



```bash
.venv\Scripts\activate

```

4. Установите необходимые зависимости:

```bash
pip install -r requirements.txt

```

---

### 2. Запуск приложения

> ⚠️ **Важно (Антивирус / Windows Defender):**
> Из-за специфики работы лаунчера (взаимодействие с реестром Windows и запуск фоновых процессов) антивирусы могут ложно срабатывать на `.exe` файл. Рекомендуется добавить папку проекта в **исключения антивируса**.

Запустить приложение можно двумя способами из папки `launcher`:

* **Вариант А (через Executable):** Запустите `launcher/LoggerLauncher.exe`.
* **Вариант Б (через Python):**
1. Убедитесь, что виртуальное окружение активировано (`backend/.venv`).
2. Перейдите в папку `launcher` и запустите:



```bash
python LoggerLauncher.py

```

#### Меню консольного лаунчера:

После запуска консоли используйте следующие клавиши:

* `1` — Запустить Logger (сервер и вотчер).
* `2` — Остановить Logger.
* `3` — Настройка автозапуска (`1` — включить, `2` — выключить).
* `0` — Выход.

После запуска веб-интерфейс будет доступен по адресу: **[http://localhost:8001](http://localhost:8001)** (или через ярлык `launcher/Logger.url`).

---

## 🛠️ Решение проблем и логирование

Если при запуске или настройке возникают ошибки:

1. **Проблемы с запуском сервера/вотчера:**
Проверьте файлы логов на наличие ошибок:
* Логи бэкенд-сервера: `backend/logs/app.log`
* Логи вотчера процессов: `launcher/dev/watcher.log`


2. **Проблемы с настройкой автозапуска:**
Автозапуск использует скрипт `launcher/dev/launch.vbs`, ярлык `launcher/dev/LoggerLauncher.lnk` и запись в реестре Windows.
Если автозапуск не работает или консоль зависает:
* Проверьте наличие ключа `LoggerLauncherVBS` в ветке реестра:
`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
* Проверьте наличие ярлыка `LoggerLauncher.lnk` в папке `launcher/dev/`.
* Попробуйте запустить лаунчер от имени **Администратора**.


3. **Очистка диска:**
* Логи и бэкапы занимают немного места, но при необходимости их можно удалить вручную.
* Ручные и автоматические бэкапы хранятся по пути: `backend/backups/`.



---

## 👨‍💻 Информация для разработчиков

Если вы хотите доработать фронтенд или использовать бэкенд в собственных целях:

### Документация API (Swagger / OpenAPI)

Бэкенд полностью задокументирован. При запущенном сервере документация доступна по адресам:

* **Swagger UI:** `http://localhost:8001/docs`
* **OpenAPI JSON:** `http://localhost:8001/openapi.json`

### Ручной запуск компонентов (без лаунчера)

* **Бэкенд:**

```bash
cd backend
.venv\Scripts\activate
uvicorn src.main:app --reload

```

* **Вотчер:**

```bash
cd launcher/dev
..\..\backend\.venv\Scripts\activate
python watcher.py

```

### Сборка и доработка Frontend

Фронтенд находится в папке `frontend`. Сервер отдаёт скомпилированный статический файл `backend/static/index.html`.

1. Установите Node.js и npm.
2. Перейдите в папку фронтенда и установите зависимости:

```bash
cd frontend
npm install

```

3. Для сборки проекта выполните:

```bash
npm run build

```

4. Скопируйте содержимое сгенерированной директории `frontend/dist/` в папку `backend/static/`.

---

## 🇬🇧 English version

**Logger** is a local service suite for automatically tracking time spent in applications and games. It runs in the background, collects detailed analytics, builds visual reports, and supports flexible session management.

> 💡 **Development Focus:** The project was built with an emphasis on backend architecture, database design, and the reliability of system background processes. For rapid prototyping and UI creation, the frontend (React + HeroUI) was developed with the help of AI tools, allowing full focus on business logic, asynchrony, and the REST API.

---

## 🌟 Key Features

* **Background tracking:** Automatic tracking of active windows and processes without performance impact.
* **Auto-start:** Ability to launch alongside Windows system startup.
* **Detailed analytics:** Convenient statistics by days, weeks, months, years, and custom periods.
* **Customization:** Light and dark theme support.
* **Reliability:** Automatic and manual data backups.

---

## 📱 Pages & Functionality Overview

* **📋 Adding Applications:**
* Automatic search and suggestion of running system processes.
* Configuring a display name for each application.
* Enabling/disabling tracking and display in overall statistics.
* Manual entry of previously spent time (useful if you previously played via Steam or on another device).


* **📊 Dashboard:**
* Analytics for the current day with visual representation.
* List of active and recently completed sessions.


* **📈 Time Statistics:**
* View total time spent in applications.
* Flexible filtering: *all time, today, yesterday, week, month, year, specific day, custom date range*.
* Additional summary metrics and activity indicators.


* **📜 Session Log:**
* Detailed log of all recorded sessions.
* Filtering by periods and search by specific applications.


* **💾 Backups & Security:**
* **Auto-backup:** Created automatically every day on the first application launch.
* **Manual backups:** Ability to create and upload point-in-time database copies.
* **Safety net:** When uploading an external backup, the system automatically creates a safety backup of the current state.



---

## 🛠️ Technology Stack

* **Backend:** Python 3.14, FastAPI, SQLite, SQLAlchemy + SQLModel, Alembic (migrations), Pydantic.
* **Frontend:** JavaScript, React, HeroUI.
* **System & Automation:** Windows Registry (`winreg`), VBS scripts, PowerShell.

---

## 🚀 Installation & Launch

### 1. Environment Setup

1. Install **Python 3.14** from the [official website](https://www.python.org/) if not already installed.
2. Navigate to the `backend` folder and create a virtual environment:

```bash
cd backend
python -m venv .venv

```

3. Activate the virtual environment:
* **Windows (PowerShell / CMD):**



```bash
.venv\Scripts\activate

```

4. Install the required dependencies:

```bash
pip install -r requirements.txt

```

---

### 2. Running the Application

> ⚠️ **Important (Antivirus / Windows Defender):**
> Due to the specifics of the launcher's operation (interaction with the Windows registry and launching background processes), antiviruses may falsely trigger on the `.exe` file. It is recommended to add the project folder to your **antivirus exclusions**.

You can launch the application in two ways from the `launcher` folder:

* **Option A (via Executable):** Run `launcher/LoggerLauncher.exe`.
* **Option B (via Python):**
1. Make sure the virtual environment is activated (`backend/.venv`).
2. Navigate to the `launcher` folder and run:



```bash
python LoggerLauncher.py

```

#### Console Launcher Menu:

After launching the console, use the following keys:

* `1` — Start Logger (server and watcher).
* `2` — Stop Logger.
* `3` — Auto-start setup (`1` — enable, `2` — disable).
* `0` — Exit.

After launching, the web interface will be available at: **[http://localhost:8001](http://localhost:8001)** (or via the `launcher/Logger.url` shortcut).

---

## 🛠️ Troubleshooting & Logging

If errors occur during launch or setup:

1. **Server/watcher launch issues:**
Check the log files for errors:
* Backend server logs: `backend/logs/app.log`
* Process watcher logs: `launcher/dev/watcher.log`


2. **Auto-start setup issues:**
Auto-start uses the `launcher/dev/launch.vbs` script, the `launcher/dev/LoggerLauncher.lnk` shortcut, and a Windows registry entry.
If auto-start doesn't work or the console hangs:
* Check for the `LoggerLauncherVBS` key in the registry branch:
`HKEY_CURRENT_USER\Software\Microsoft\Windows\CurrentVersion\Run`
* Check for the `LoggerLauncher.lnk` shortcut in the `launcher/dev/` folder.
* Try running the launcher as **Administrator**.


3. **Disk cleanup:**
* Logs and backups take up little space, but can be deleted manually if needed.
* Manual and automatic backups are stored at: `backend/backups/`.



---

## 👨‍💻 Developer Information

If you want to improve the frontend or use the backend for your own purposes:

### API Documentation (Swagger / OpenAPI)

The backend is fully documented. When the server is running, documentation is available at:

* **Swagger UI:** `http://localhost:8001/docs`
* **OpenAPI JSON:** `http://localhost:8001/openapi.json`

### Manual Component Launch (without launcher)

* **Backend:**

```bash
cd backend
.venv\Scripts\activate
uvicorn src.main:app --reload

```

* **Watcher:**

```bash
cd launcher/dev
..\..\backend\.venv\Scripts\activate
python watcher.py

```

### Frontend Build & Development

The frontend is located in the `frontend` folder. The server serves the compiled static file `backend/static/index.html`.

1. Install Node.js and npm.
2. Navigate to the frontend folder and install dependencies:

```bash
cd frontend
npm install

```

3. To build the project, run:

```bash
npm run build

```

4. Copy the contents of the generated `frontend/dist/` directory to the `backend/static/` folder.
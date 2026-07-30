@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

set "PYTHON_VERSION=3.14"
set "VENV_DIR=..\backend\.venv"
set "REQUIREMENTS_DIR=..\backend\requirements.txt"

echo [1/4] Проверка наличия Python %PYTHON_VERSION%...

py -%PYTHON_VERSION% --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python %PYTHON_VERSION% уже установлен.
    set "PY_CMD=py -%PYTHON_VERSION%"
    goto create_venv
)

echo Python %PYTHON_VERSION% не найден. Попытка установки через winget...
winget install --id Python.Python.%PYTHON_VERSION% --exact --silent --accept-source-agreements --accept-package-agreements

py -%PYTHON_VERSION% --version >nul 2>&1
if %errorlevel% equ 0 (
    echo Python %PYTHON_VERSION% успешно установлен!
    set "PY_CMD=py -%PYTHON_VERSION%"
    goto create_venv
) else (
    echo [ОШИБКА] Не удалось автоматически установить Python %PYTHON_VERSION%.
    echo Пожалуйста, установите его вручную с сайта python.org и перезапустите скрипт.
    pause
    exit /b
)

:create_venv
echo.
echo [2/4] Создание виртуального окружения в "%VENV_DIR%"...
if exist "%VENV_DIR%" (
    echo Папка "%VENV_DIR%" уже существует. Пропускаю создание.
) else (
    %PY_CMD% -m venv "%VENV_DIR%"
    if !errorlevel! neq 0 (
        echo [ОШИБКА] Не удалось создать виртуальное окружение.
        pause
        exit /b
    )
    echo Виртуальное окружение успешно создано.
)

:install_reqs
echo.
echo [3/4] Обновление pip и установка зависимостей...
if exist "%REQUIREMENTS_DIR%" (
    call "%VENV_DIR%\Scripts\python.exe" -m pip install --upgrade pip
    call "%VENV_DIR%\Scripts\pip.exe" install -r "%REQUIREMENTS_DIR%"
    if !errorlevel! neq 0 (
        echo [ОШИБКА] Произошла ошибка при установке библиотек.
        pause
        exit /b
    )
    echo Все библиотеки успешно установлены.
) else (
    echo [ПРЕДУПРЕЖДЕНИЕ] Файл requirements.txt не найден по пути "%REQUIREMENTS_DIR%". Нечего устанавливать.
)

:finish
echo.
echo [4/4] Настройка завершена!
echo Чтобы активировать окружение вручную, используйте: call "%VENV_DIR%\Scripts\activate"
echo.
pause
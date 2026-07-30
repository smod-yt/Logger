from pathlib import Path
from rich import print
from rich.panel import Panel
import winreg
import sys
import os
import subprocess
import time

if getattr(sys, 'frozen', False):
    BASE_DIR = Path(sys.executable).resolve().parent
else:
    BASE_DIR = Path(__file__).resolve().parent

class StartupError(Exception):
    pass

class LoggerLaunchError(Exception):
    pass

class LoggerStopError(Exception):
    pass

class App:
    def __init__(self) -> None:
        self.is_running = True
        self.status = {"server": False, "watcher": False, "autostart": False}

    def clear_screen(self) -> None:
        os.system("cls" if os.name == "nt" else "clear")

    def check_logger_status(self) -> None:
        self.status = {"server": False, "watcher": False, "autostart": False}
        
        if os.name != "nt":
            return

        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        app_key = "LoggerLauncherVBS"
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_READ)
            try:
                winreg.QueryValueEx(key, app_key)
                self.status["autostart"] = True
            except FileNotFoundError:
                self.status["autostart"] = False
            finally:
                winreg.CloseKey(key)
        except Exception:
            self.status["autostart"] = False

        try:
            cmd_server = (
                'powershell -NoProfile -Command '
                '"if (Get-CimInstance Win32_Process | Where-Object { ($_.Name -like \'*python*\') -and ($_.CommandLine -like \'*logger_server*\') }) { Write-Output \'FOUND\' }"'
            )
            cmd_watcher = (
                'powershell -NoProfile -Command '
                '"if (Get-CimInstance Win32_Process | Where-Object { ($_.Name -like \'*python*\') -and ($_.CommandLine -like \'*logger_watcher*\') }) { Write-Output \'FOUND\' }"'
            )

            res_server = subprocess.run(
                cmd_server,
                capture_output=True,
                text=True,
                shell=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            if "FOUND" in res_server.stdout:
                self.status["server"] = True

            res_watcher = subprocess.run(
                cmd_watcher,
                capture_output=True,
                text=True,
                shell=True,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            if "FOUND" in res_watcher.stdout:
                self.status["watcher"] = True

        except Exception:
            pass

    def render(self, text: str, title: str) -> None:
        self.clear_screen()
        print(Panel(renderable=text, title=title))

    def home(self) -> None:
        self.check_logger_status()

        server_indicator = "[green]ЗАПУЩЕН[/green]" if self.status["server"] else "[red]ОСТАНОВЛЕН[/red]"
        watcher_indicator = "[green]ЗАПУЩЕН[/green]" if self.status["watcher"] else "[red]ОСТАНОВЛЕН[/red]"
        autostart_indicator = "[green]ВКЛЮЧЕН[/green]" if self.status["autostart"] else "[red]ВЫКЛЮЧЕН[/red]"

        text = (
            f"Logger Server: {server_indicator}\n"
            f"Logger Watcher: {watcher_indicator}\n"
            f"Автозапуск: {autostart_indicator}\n\n"
            f"Выберите действие:\n"
            f"0) Закрыть настройки\n------------------\n"
            f"1) Запустить Logger\n2) Остановить Logger\n------------------\n"
            f"3) Настроить автозапуск"
        )

        self.render(text=text, title="Главная")

        choice = input("Выберите 0-3: ").strip()

        if choice == "0":
            self.is_running = False
        elif choice == "1":
            self.launch()
        elif choice == "2":
            self.stop()
        elif choice == "3":
            self.manage_autostart()

    def manage_autostart(self):
        text = "Выберите действие:\n\n1) [green]Включить[/green]\n2) [red]Выключить[/red]"
        self.render(text=text, title="Настройка автозапуска")

        choice = input("Выберите 1-2 (Enter для отмены): ").strip()

        try:
            if choice == "1":
                self.change_autostart("install")
            elif choice == "2":
                self.change_autostart("uninstall")
        except StartupError as e:
            self.render(
                text=f"[red]Ошибка автозагрузки:[/red]\n{e}",
                title="[red]Ошибка[/red]"
            )
            input("Нажмите Enter для продолжения...")

    def launch(self) -> None:
        self.check_logger_status()

        if self.status["server"] or self.status["watcher"]:
            return

        vbs_path = BASE_DIR / "dev" / "launch.vbs"

        try:
            if vbs_path.exists():
                try:
                    subprocess.Popen(
                        ["wscript.exe", str(vbs_path)],
                        creationflags=subprocess.CREATE_NO_WINDOW
                    )
                    time.sleep(1.5)
                except Exception as e:
                    raise LoggerLaunchError(e)
            else:
                raise LoggerLaunchError(f"Файл {vbs_path} не найден!")
        except LoggerLaunchError as e:
            self.render(
                text=f"[red]Ошибка запуска:[/red]\n{e}",
                title="[red]Ошибка[/red]"
            )
            input("Нажмите Enter для продолжения...")

    def stop(self) -> None:
        bat_path = BASE_DIR / "dev" / "kill.bat"

        try:
            if bat_path.exists():
                try:
                    process = subprocess.Popen(
                        [str(bat_path)], 
                        creationflags=subprocess.CREATE_NO_WINDOW
                    )
                    
                    try:
                        process.wait(timeout=5.0)
                    except subprocess.TimeoutExpired:
                        process.kill()

                    for _ in range(4):
                        self.check_logger_status()
                        if not self.status["server"] and not self.status["watcher"]:
                            break
                        time.sleep(1.0)
                        
                except Exception as e:
                    raise LoggerStopError(f"Ошибка при выполнении kill.bat: {e}")
            else:
                raise LoggerStopError(f"Файл {bat_path} не найден!")
        except LoggerStopError as e:
            self.render(
                text=f"[red]Ошибка остановки:[/red]\n{e}",
                title="[red]Ошибка[/red]"
            )
            input("Нажмите Enter для продолжения...")

    def change_autostart(self, action="install"):
        app_key = "LoggerLauncherVBS"
        
        autostart_dir = BASE_DIR / "dev"
        vbs_path = (autostart_dir / "launch.vbs").resolve()
        
        if not vbs_path.exists():
            raise StartupError("Файл launch.vbs не найден")

        shortcut_path = autostart_dir / "LoggerLauncher.lnk"

        if action == "install":
            try:
                create_shortcut_cmd = (
                    f'$WshShell = New-Object -ComObject WScript.Shell; '
                    f'$Shortcut = $WshShell.CreateShortcut("{shortcut_path}"); '
                    f'$Shortcut.TargetPath = "wscript.exe"; '
                    f'$Shortcut.Arguments = "`"{vbs_path}`""; '
                    f'$Shortcut.WorkingDirectory = "{autostart_dir}"; '
                    f'$Shortcut.Save()'
                )
                subprocess.run(["powershell", "-Command", create_shortcut_cmd], capture_output=True)
            except Exception as e:
                raise StartupError(f"Не удалось создать ярлык: {e}")

        run_command = f'"{shortcut_path}"'
        key_path = r"Software\Microsoft\Windows\CurrentVersion\Run"
        
        try:
            key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, key_path, 0, winreg.KEY_SET_VALUE)
            if action == "install":
                winreg.SetValueEx(key, app_key, 0, winreg.REG_SZ, run_command)
            elif action == "uninstall":
                try:
                    winreg.DeleteValue(key, app_key)
                    if shortcut_path.exists():
                        os.remove(shortcut_path)
                except FileNotFoundError:
                    pass
            winreg.CloseKey(key)
        except Exception as e:
            raise StartupError(f"Ошибка работы с реестром: {e}")
        
    def run(self) -> None:
        while self.is_running:
            self.home()

if __name__ == "__main__":
    app = App()
    app.run()
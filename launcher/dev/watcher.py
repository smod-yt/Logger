import win32gui
import win32process
import win32con
import win32api
import os
import time
import threading
from datetime import datetime
import requests
import logging
import psutil

API_URL = "http://127.0.0.1:8000/api/sessions/activity"

DEV_DIR = os.path.dirname(os.path.abspath(__file__))          
LOG_FILE = os.path.join(DEV_DIR, "watcher.log")               

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s]: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[logging.FileHandler(LOG_FILE, encoding="utf-8"), logging.StreamHandler()]
)
logger = logging.getLogger("watcher")

previously_running = set()
running_lock = threading.Lock()
is_system_sleeping = False


def send_event(app_name, event_type, timestamp):
    payload = {"app_name": app_name, "event_type": event_type, "timestamp": timestamp}
    try:
        requests.post(API_URL, json=payload, timeout=3)
        logger.info(f"App '{app_name}' -> Event: '{event_type}'")
    except requests.exceptions.RequestException:
        logger.warning(f"Failed to send '{event_type}' event for '{app_name}': Server unreachable.")


def close_all_active_sessions():
    global previously_running
    with running_lock:
        if previously_running:
            now_str = datetime.now().isoformat()
            logger.info("Closing all active tracked sessions due to sleep/shutdown event...")
            for app in list(previously_running):
                send_event(app, "stop", now_str)
            previously_running.clear()


def get_real_uwp_exe_name(hwnd):
    real_exe_name = None

    def enum_child_callback(child_hwnd, param):
        nonlocal real_exe_name
        try:
            _, child_pid = win32process.GetWindowThreadProcessId(child_hwnd)
            proc = psutil.Process(child_pid)
            child_exe = proc.name().lower()
            
            if child_exe not in {"applicationframehost.exe", "runtimebroker.exe"}:
                real_exe_name = child_exe
                return False
        except Exception:
            pass
        return True

    try:
        win32gui.EnumChildWindows(hwnd, enum_child_callback, None)
    except Exception:
        pass
    return real_exe_name


def get_running_taskbar_apps():
    running_apps = set()

    def enum_windows_callback(hwnd, extra):
        if not win32gui.IsWindowVisible(hwnd): return True
        if win32gui.GetWindow(hwnd, win32con.GW_OWNER) != 0: return True
        
        ex_style = win32gui.GetWindowLong(hwnd, win32con.GWL_EXSTYLE)
        if ex_style & win32con.WS_EX_TOOLWINDOW: return True
        
        title = win32gui.GetWindowText(hwnd).strip()
        if not title: return True
        
        try:
            _, pid = win32process.GetWindowThreadProcessId(hwnd)
            proc = psutil.Process(pid)
            exe_name = proc.name().lower()

            if exe_name == "applicationframehost.exe":
                uwp_name = get_real_uwp_exe_name(hwnd)
                if uwp_name:
                    exe_name = uwp_name
                else:
                    return True

            running_apps.add(exe_name)
        except (psutil.NoSuchProcess, psutil.AccessDenied, Exception):
            pass

        return True

    win32gui.EnumWindows(enum_windows_callback, None)
    return list(running_apps)


def tracker_loop():
    global previously_running, is_system_sleeping
    
    logger.info("Taskbar applications tracker loop started.")
    last_heartbeat_time = 0
    HEARTBEAT_INTERVAL = 10

    while True:
        try:
            if is_system_sleeping:
                time.sleep(1)
                continue

            current_running = set(get_running_taskbar_apps())
            now_str = datetime.now().isoformat()
            current_timestamp = time.time()

            with running_lock:
                just_started = current_running - previously_running
                for app in just_started:
                    send_event(app, "start", now_str)

                if current_timestamp - last_heartbeat_time >= HEARTBEAT_INTERVAL:
                    still_running = current_running & previously_running
                    for app in still_running:
                        send_event(app, "alive", now_str)
                    last_heartbeat_time = current_timestamp

                just_stopped = previously_running - current_running
                for app in just_stopped:
                    send_event(app, "stop", now_str)

                previously_running = current_running

        except Exception as e:
            logger.error(f"Error in tracking cycle: {e}", exc_info=True)

        time.sleep(2)


def wnd_proc(hwnd, msg, wparam, lparam):
    global is_system_sleeping

    if msg == win32con.WM_POWERBROADCAST:
        if wparam == win32con.PBT_APMSUSPEND:
            logger.warning("System is going to SLEEP (PBT_APMSUSPEND).")
            is_system_sleeping = True
            close_all_active_sessions()

        elif wparam in (win32con.PBT_APMRESUMESUSPEND, win32con.PBT_APMRESUMEAUTOMATIC):
            logger.info("System WOKE UP from sleep.")
            is_system_sleeping = False

    elif msg in (win32con.WM_QUERYENDSESSION, win32con.WM_ENDSESSION):
        logger.warning("System SHUTDOWN / LOGOFF detected.")
        is_system_sleeping = True
        close_all_active_sessions()
        return True

    return win32gui.DefWindowProc(hwnd, msg, wparam, lparam)


def start_power_event_listener():
    wc = win32gui.WNDCLASS()
    wc.lpszClassName = "PowerEventWatcherWindow"
    wc.lpfnWndProc = wnd_proc
    class_atom = win32gui.RegisterClass(wc)

    hwnd = win32gui.CreateWindow(
        class_atom,
        "PowerEventWatcher",
        0, 0, 0, 0, 0,
        0, 0, 0, None
    )

    logger.info("Power event listener window successfully created.")
    win32gui.PumpMessages()


if __name__ == "__main__":
    tracker_thread = threading.Thread(target=tracker_loop, daemon=True)
    tracker_thread.start()

    try:
        start_power_event_listener()
    except KeyboardInterrupt:
        logger.info("Stopping watcher by KeyboardInterrupt.")
        close_all_active_sessions()
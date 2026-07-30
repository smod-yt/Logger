import win32gui
import win32process
import win32con
import os
import time
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


if __name__ == "__main__":
    logger.info("Taskbar applications tracker successfully started (Polling mode).")
    
    previously_running = set()
    last_heartbeat_time = 0
    HEARTBEAT_INTERVAL = 10

    while True:
        try:
            current_running = set(get_running_taskbar_apps())
            now_str = datetime.now().isoformat()
            current_timestamp = time.time()

            just_started = current_running - previously_running
            for app in just_started:
                payload = {"app_name": app, "event_type": "start", "timestamp": now_str}
                try:
                    requests.post(API_URL, json=payload)
                    logger.info(f"App started tracking: '{app}'")
                except requests.exceptions.ConnectionError:
                    logger.warning(f"Failed to send START event for '{app}': Server offline.")

            if current_timestamp - last_heartbeat_time >= HEARTBEAT_INTERVAL:
                still_running = current_running & previously_running
                for app in still_running:
                    payload = {"app_name": app, "event_type": "alive", "timestamp": now_str}
                    try:
                        requests.post(API_URL, json=payload)
                        logger.debug(f"Heartbeat sent for running app: '{app}'")
                    except requests.exceptions.ConnectionError:
                        pass
                last_heartbeat_time = current_timestamp

            just_stopped = previously_running - current_running
            for app in just_stopped:
                payload = {"app_name": app, "event_type": "stop", "timestamp": now_str}
                try:
                    requests.post(API_URL, json=payload)
                    logger.info(f"App stopped tracking: '{app}'")
                except requests.exceptions.ConnectionError:
                    pass

            previously_running = current_running

        except Exception as e:
            logger.error(f"Error in tracking cycle: {e}", exc_info=True)

        time.sleep(2)
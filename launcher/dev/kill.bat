@echo off
powershell -Command "Get-CimInstance Win32_Process | Where-Object {$_.CommandLine -like '*logger_watcher*'} | Remove-CimInstance"
echo Watcher closed
powershell -Command "Get-CimInstance Win32_Process | Where-Object {$_.CommandLine -like '*logger_server*'} | Remove-CimInstance"
echo Server closed
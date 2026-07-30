Set WshShell = CreateObject("WScript.Shell")
Set FSO = CreateObject("Scripting.FileSystemObject")

strVbsFolder = FSO.GetParentFolderName(WScript.ScriptFullName)
strRootFolder = FSO.GetParentFolderName(FSO.GetParentFolderName(strVbsFolder))

strPython = FSO.BuildPath(strRootFolder, "backend\.venv\Scripts\python.exe")
strWatcher = FSO.BuildPath(strVbsFolder, "watcher.py")

WshShell.CurrentDirectory = FSO.BuildPath(strRootFolder, "backend")

WshShell.Run """" & strPython & """ -X logger_server -m uvicorn src.main:app", 0, False
WshShell.Run """" & strPython & """ -X logger_watcher """ & strWatcher & """", 0, False
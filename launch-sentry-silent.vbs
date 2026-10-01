Set FSO = CreateObject("Scripting.FileSystemObject")
strDir = FSO.GetParentFolderName(WScript.ScriptFullName)
Set WshShell = CreateObject("WScript.Shell")
WshShell.CurrentDirectory = strDir
WshShell.Run "cmd.exe /c """ & strDir & "\start-laddu-sentry.bat""", 0, False


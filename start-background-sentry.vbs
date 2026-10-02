Set WshShell = CreateObject("WScript.Shell")
WshShell.Run "node voice/sentry/daemon.js", 0, False

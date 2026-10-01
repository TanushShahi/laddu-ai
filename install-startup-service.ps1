# PowerShell script to install LADDU Background Voice Sentry into Windows Startup
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$startupDir = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupDir, 'LADDU Background Sentry.lnk')

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = [System.IO.Path]::Combine($scriptDir, 'launch-sentry-silent.vbs')
$Shortcut.WorkingDirectory = $scriptDir
$Shortcut.Description = "LADDU Always-On Background Voice Sentry"
$Shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,168" # Microphone / Audio Sentry icon
$Shortcut.Save()

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] LADDU Background Sentry installed into Windows Startup!" -ForegroundColor Green
Write-Host "Location: $shortcutPath" -ForegroundColor White
Write-Host "LADDU will now automatically start in the background when your PC boots or logs in." -ForegroundColor White
Write-Host "You can activate LADDU anytime hands-free by speaking: 'Hey Laddu'!" -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan

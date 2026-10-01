# PowerShell script to remove LADDU Background Sentry from Windows Startup
$startupDir = [System.IO.Path]::Combine($env:APPDATA, 'Microsoft\Windows\Start Menu\Programs\Startup')
$shortcutPath = [System.IO.Path]::Combine($startupDir, 'LADDU Background Sentry.lnk')

if (Test-Path $shortcutPath) {
    Remove-Item $shortcutPath -Force
    Write-Host "[SUCCESS] Removed LADDU Background Sentry from Windows Startup." -ForegroundColor Green
} else {
    Write-Host "[INFO] LADDU Background Sentry shortcut was not found in Startup folder." -ForegroundColor Yellow
}

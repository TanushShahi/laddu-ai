# PowerShell Script to install Desktop Shortcut for LADDU AI Assistant
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$desktopPath = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$shortcutPath = Join-Path $desktopPath "LADDU AI Assistant.lnk"

$WshShell = New-Object -ComObject WScript.Shell
$Shortcut = $WshShell.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = Join-Path $scriptDir "LADDU.bat"
$Shortcut.WorkingDirectory = $scriptDir
$Shortcut.Description = "LADDU - Universal Personal AI Assistant"
$customIcon = Join-Path $scriptDir "frontend\icons\laddu.ico"
if (Test-Path $customIcon) {
    $Shortcut.IconLocation = $customIcon
} else {
    $Shortcut.IconLocation = "$env:SystemRoot\System32\imageres.dll,102"
}
$Shortcut.Save()

Write-Host "=================================================================" -ForegroundColor Cyan
Write-Host "[SUCCESS] LADDU Desktop Shortcut installed successfully!" -ForegroundColor Green
Write-Host "Location: $shortcutPath" -ForegroundColor White
Write-Host "You can now double-click 'LADDU AI Assistant' directly from your Desktop." -ForegroundColor White
Write-Host "=================================================================" -ForegroundColor Cyan

# LADDU Assistant - Windows Defender Firewall Port Opener
# Allows inbound connections on Port 3000 (HTTP) and Port 3443 (HTTPS) for LAN & Mobile Devices

param (
    [int]$HttpPort = 3000,
    [int]$HttpsPort = 3443
)

$IsAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Host "Requesting Administrator privileges to configure Windows Firewall..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  LADDU Universal AI - Windows Firewall Configuration     " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

try {
    # Remove older rules if present
    Remove-NetFirewallRule -DisplayName "LADDU Assistant HTTP (Port $HttpPort)" -ErrorAction SilentlyContinue
    Remove-NetFirewallRule -DisplayName "LADDU Assistant HTTPS (Port $HttpsPort)" -ErrorAction SilentlyContinue

    # Add Rule for Port 3000 (HTTP)
    New-NetFirewallRule -DisplayName "LADDU Assistant HTTP (Port $HttpPort)" `
                        -Direction Inbound `
                        -LocalPort $HttpPort `
                        -Protocol TCP `
                        -Action Allow `
                        -Profile Any `
                        -Description "Allows mobile devices and LAN clients to access LADDU Assistant HUD over HTTP" | Out-Null
    Write-Host "[+] Port $HttpPort (HTTP) opened successfully." -ForegroundColor Green

    # Add Rule for Port 3443 (HTTPS)
    New-NetFirewallRule -DisplayName "LADDU Assistant HTTPS (Port $HttpsPort)" `
                        -Direction Inbound `
                        -LocalPort $HttpsPort `
                        -Protocol TCP `
                        -Action Allow `
                        -Profile Any `
                        -Description "Allows mobile devices to access LADDU Assistant over HTTPS for Microphone and Voice commands" | Out-Null
    Write-Host "[+] Port $HttpsPort (HTTPS) opened successfully." -ForegroundColor Green

    Write-Host ""
    Write-Host "SUCCESS: Windows Defender Firewall is configured!" -ForegroundColor Green
    Write-Host "Your mobile phone and other devices on this Wi-Fi network can now connect to LADDU." -ForegroundColor White
    Write-Host "==========================================================" -ForegroundColor Cyan
} catch {
    Write-Host "Error configuring firewall rules: $_" -ForegroundColor Red
}

Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

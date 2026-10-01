param(
    [string]$OutputDir = "data/certs",
    [string]$Password = "laddu-ssl-secure"
)

$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

$targetDir = Join-Path $projectRoot $OutputDir
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

$pfxPath = Join-Path $targetDir "laddu.pfx"
$crtPath = Join-Path $targetDir "laddu.crt"

# Collect local IP addresses and hostnames for Subject Alternative Names (SAN)
$dnsNames = @("localhost", "127.0.0.1", [System.Net.Dns]::GetHostName())
try {
    $ips = [System.Net.Dns]::GetHostAddresses([System.Net.Dns]::GetHostName()) | 
        Where-Object { $_.AddressFamily -eq 'InterNetwork' -and $_.IPAddressToString -notlike '127.*' } |
        ForEach-Object { $_.IPAddressToString }
    if ($ips) {
        $dnsNames += $ips
    }
} catch {
    Write-Warning "Could not retrieve LAN IPs: $_"
}

Write-Host "[SSLManager] Generating Self-Signed Certificate for: $($dnsNames -join ', ')" -ForegroundColor Cyan

# Create self-signed certificate valid for 10 years
$cert = New-SelfSignedCertificate `
    -DnsName $dnsNames `
    -CertStoreLocation "cert:\CurrentUser\My" `
    -NotAfter (Get-Date).AddYears(10) `
    -KeyAlgorithm RSA `
    -KeyLength 2048 `
    -FriendlyName "LADDU AI Assistant Local Root"

# Export PFX
$secPwd = ConvertTo-SecureString -String $Password -Force -AsPlainText
Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $secPwd | Out-Null

# Export public CRT (X.509 DER) for easy install/trust on phones/PCs if desired
Export-Certificate -Cert $cert -FilePath $crtPath | Out-Null

Write-Host "[SSLManager] Successfully created PFX certificate at: $pfxPath" -ForegroundColor Green
Write-Host "[SSLManager] Public certificate exported at: $crtPath" -ForegroundColor Green

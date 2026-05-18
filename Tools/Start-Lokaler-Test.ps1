$ErrorActionPreference = "Stop"

$projectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$projectFile = Join-Path $projectRoot "Nasreddins-Camera-Arcanum.csproj"
$appPort = 5030
$appUrl = "http://localhost:$appPort"

Get-Process -Name "ngrok" -ErrorAction SilentlyContinue | Stop-Process -Force

Write-Host "Starte Nasreddin's Camera Arcanum auf $appUrl ..."

$appCommand = "Set-Location -LiteralPath '$projectRoot'; dotnet run --project '$projectFile' --urls '$appUrl'"
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    $appCommand
)

Write-Host "Warte auf lokale Anwendung ..."
$deadline = (Get-Date).AddSeconds(45)
$appReady = $false

do {
    try {
        $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -lt 500) {
            $appReady = $true
            break
        }
    }
    catch {
        Start-Sleep -Seconds 1
    }
} while ((Get-Date) -lt $deadline)

if (-not $appReady) {
    Write-Host "Die lokale Anwendung war nach 45 Sekunden nicht erreichbar."
    Write-Host "Pruefe das geoeffnete App-Fenster auf Build- oder Startfehler."
    Read-Host "Enter zum Beenden"
    exit 1
}

$ngrokCommand = Get-Command ngrok -ErrorAction SilentlyContinue
if (-not $ngrokCommand) {
    Write-Host "ngrok wurde nicht im PATH gefunden. Oeffne lokale Browser-Adresse."
    Start-Process $appUrl
    Write-Host "Fuer Smartphone-Kameratests installiere ngrok und starte diese Datei erneut."
    Read-Host "Enter zum Beenden"
    exit 0
}

Write-Host "Starte ngrok-Tunnel fuer Smartphone-Tests ..."
Start-Process -FilePath "powershell.exe" -ArgumentList @(
    "-NoExit",
    "-NoProfile",
    "-ExecutionPolicy",
    "Bypass",
    "-Command",
    "ngrok http --host-header=localhost:$appPort $appPort"
)

Write-Host "Warte auf oeffentliche HTTPS-Adresse von ngrok ..."
$deadline = (Get-Date).AddSeconds(30)
$publicUrl = $null

do {
    try {
        $tunnels = (Invoke-RestMethod -Uri "http://127.0.0.1:4040/api/tunnels" -TimeoutSec 2).tunnels
        $httpsTunnel = $tunnels | Where-Object { $_.proto -eq "https" } | Select-Object -First 1
        if ($httpsTunnel.public_url) {
            $publicUrl = $httpsTunnel.public_url
            break
        }
    }
    catch {
        Start-Sleep -Seconds 1
    }
} while ((Get-Date) -lt $deadline)

if ($publicUrl) {
    Write-Host "Oeffne $publicUrl im Browser."
    Start-Process $publicUrl
    Write-Host ""
    Write-Host "Smartphone-Test: Oeffne diese Adresse auf dem Smartphone:"
    Write-Host $publicUrl
}
else {
    Write-Host "ngrok wurde gestartet, aber die HTTPS-Adresse konnte nicht automatisch gelesen werden."
    Write-Host "Falls ngrok nach einem Authtoken fragt, fuehre einmalig aus:"
    Write-Host "ngrok config add-authtoken DEIN_TOKEN"
    Write-Host ""
    Write-Host "Oeffne http://127.0.0.1:4040 und kopiere dort die HTTPS-Adresse."
    Start-Process "http://127.0.0.1:4040"
    Start-Process $appUrl
}

Read-Host "Enter zum Beenden"

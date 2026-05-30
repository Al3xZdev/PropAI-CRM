# RealEstate CRM — Backup PostgreSQL
# Uso: .\scripts\backup.ps1
# Dependencia: pg_dump debe estar instalado y en PATH

$ErrorActionPreference = "Stop"

# Resolver paths relativos al script
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Resolve-Path "$ScriptDir\.."
$BackendEnv = "$ProjectRoot\backend\.env"
$BackupDir = "$ProjectRoot\backups"

# Crear carpeta backups si no existe
if (-not (Test-Path -LiteralPath $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Host "📁 Created backups directory: $BackupDir"
}

# Verificar pg_dump
$pgDumpPath = (Get-Command "pg_dump" -ErrorAction SilentlyContinue).Source
if (-not $pgDumpPath) {
    Write-Error "❌ pg_dump no encontrado. Instalá PostgreSQL o agregalo al PATH."
    exit 1
}

# Verificar .env
if (-not (Test-Path -LiteralPath $BackendEnv)) {
    Write-Error "❌ .env no encontrado en $BackendEnv"
    exit 1
}

# Leer DATABASE_URL del .env
$envContent = Get-Content -LiteralPath $BackendEnv -Raw
$match = [regex]::Match($envContent, 'DATABASE_URL="?(postgresql://[^"\s]+)"?')
if (-not $match.Success) {
    $match = [regex]::Match($envContent, "DATABASE_URL='?(postgresql://[^'\s]+)'?")
}
if (-not $match.Success) {
    Write-Error "❌ DATABASE_URL no encontrada en .env"
    exit 1
}
$DATABASE_URL = $match.Groups[1].Value

# Generar nombre de archivo con timestamp
$timestamp = Get-Date -Format "yyyy-MM-dd_HHmmss"
$backupFile = "$BackupDir\backup_$timestamp.sql"

Write-Host "📦 Iniciando backup de PostgreSQL..."
Write-Host "  Target: $backupFile"

# Ejecutar pg_dump
try {
    $env:PGPASSWORD = ""  # La URL ya contiene la password
    & pg_dump $DATABASE_URL --no-owner --no-acl --file="$backupFile"

    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump exit code: $LASTEXITCODE"
    }

    $fileInfo = Get-Item -LiteralPath $backupFile
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    Write-Host "✅ Backup completado: $sizeMB MB"
    Write-Host "  Path: $backupFile"
}
catch {
    Write-Error "❌ Error durante el backup: $_"
    if (Test-Path -LiteralPath $backupFile) {
        Remove-Item -LiteralPath $backupFile -Force
    }
    exit 1
}

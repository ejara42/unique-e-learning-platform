<#
.SYNOPSIS
    Safe MongoDB Disaster Recovery & Database Restoration Script for EduSphere
.DESCRIPTION
    Safely restores a compressed gzip database archive created by mongodump.
    Enforces target validation and explicit confirmation barriers to prevent accidental production overwrite.
#>

param (
    [Parameter(Mandatory = $true)]
    [string]$ArchiveFile,

    [string]$MongoUri = "mongodb://localhost:27017/edusphere_restore_test",

    [switch]$DropExisting,

    [switch]$ForceProductionRestore
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🛡️  EduSphere Enterprise MongoDB Safe Disaster Recovery" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Archive existence validation
if (-not (Test-Path $ArchiveFile)) {
    Write-Error "❌ Error: Backup archive not found at path: $ArchiveFile"
    exit 1
}

$fileInfo = Get-Item $ArchiveFile
Write-Host "📦 Source Archive: $($fileInfo.FullName) ($([Math]::Round($fileInfo.Length / 1KB, 2)) KB)" -ForegroundColor Yellow
Write-Host "🎯 Target Database URI: $MongoUri" -ForegroundColor Yellow

# 2. Production safety barrier
if ($MongoUri -match "production|prod|replicaSet" -and -not $ForceProductionRestore) {
    Write-Warning "⚠️  CRITICAL SAFETY BARRIER: The target URI appears to reference a PRODUCTION cluster."
    Write-Warning "To restore onto a production cluster, you MUST explicitly provide -ForceProductionRestore."
    Write-Error "Aborting restoration to prevent unintended production data overwrite."
    exit 1
}

# 3. Construct mongorestore command
$dropFlag = if ($DropExisting) { "--drop" } else { "" }
$mongorestoreCmd = "mongorestore --uri=""$MongoUri"" --archive=""$ArchiveFile"" --gzip $dropFlag"

Write-Host "⏳ [1/2] Executing mongorestore..." -ForegroundColor Cyan

try {
    Invoke-Expression $mongorestoreCmd
    Write-Host "✅ [2/2] Database restoration completed successfully!" -ForegroundColor Green
    Write-Host "🎯 Target database '$MongoUri' has been safely restored from $ArchiveFile." -ForegroundColor Green
}
catch {
    Write-Error "❌ mongorestore failed: $_"
    exit 1
}


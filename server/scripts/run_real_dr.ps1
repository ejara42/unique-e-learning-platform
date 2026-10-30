$ErrorActionPreference = "Stop"
$dbDir = Join-Path $PSScriptRoot "..\tmp_disposable_mongo"
if (Test-Path $dbDir) {
    Remove-Item -Recurse -Force $dbDir
}
New-Item -ItemType Directory -Path $dbDir | Out-Null
$logFile = Join-Path $dbDir "mongod.log"

$mongodExe = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
Write-Host "Starting disposable MongoDB daemon on port 27018..."
$proc = Start-Process -FilePath $mongodExe -ArgumentList "--dbpath `"$dbDir`" --port 27018 --bind_ip 127.0.0.1 --logpath `"$logFile`"" -PassThru

Start-Sleep -Seconds 4

try {
    if ($proc.HasExited) {
        Write-Host "mongod exited unexpectedly. Log:"
        if (Test-Path $logFile) { Get-Content $logFile }
    } else {
        $env:ALLOW_DISASTER_RECOVERY_TEST = "true"
        $env:TEST_MONGODB_URI = "mongodb://127.0.0.1:27018/edusphere_synthetic_dr_test"
        
        Set-Location (Join-Path $PSScriptRoot "..")
        npm run verify:dr
    }
}
finally {
    if (!$proc.HasExited) {
        Write-Host "Shutting down disposable MongoDB daemon..."
        Stop-Process -Id $proc.Id -Force
    }
    Start-Sleep -Seconds 1
    Remove-Item -Recurse -Force $dbDir -ErrorAction SilentlyContinue
}


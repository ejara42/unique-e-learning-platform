$dbDir = Join-Path $PSScriptRoot "tmp_test_db"
New-Item -ItemType Directory -Path $dbDir -Force | Out-Null
$mongodExe = "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe"
& $mongodExe --dbpath $dbDir --port 27018 --bind_ip 127.0.0.1


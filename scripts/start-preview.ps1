$ErrorActionPreference = 'Stop'
$projectDirectory = Split-Path -Parent $PSScriptRoot
$nodeExecutable = (Get-Command node.exe -ErrorAction Stop).Source
$logDirectory = Join-Path $projectDirectory '.local\preview'
New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null

# Independent hidden processes keep previews available after the caller exits.
# Never kill or replace an existing port owner.
$services = @(
    @{ Name = 'website'; Port = 3100; Arguments = 'node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port 3100'; Marker = 'AI' },
    @{ Name = 'console'; Port = 3101; Arguments = 'node_modules/tsx/dist/cli.mjs scripts/publish-console/server.ts'; Marker = 'data-session-token' }
)

foreach ($service in $services) {
    $listener = Get-NetTCPConnection -LocalPort $service.Port -State Listen -ErrorAction SilentlyContinue
    if (-not $listener) {
        $outLog = Join-Path $logDirectory ($service.Name + '.stdout.log')
        $errLog = Join-Path $logDirectory ($service.Name + '.stderr.log')
        $process = Start-Process -FilePath $nodeExecutable -ArgumentList $service.Arguments -WorkingDirectory $projectDirectory -WindowStyle Hidden -RedirectStandardOutput $outLog -RedirectStandardError $errLog -PassThru
        Write-Output ($service.Name + ' started, PID ' + $process.Id)
    }

    $url = 'http://127.0.0.1:' + $service.Port + '/'
    $ready = $false
    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        try {
            $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2
            if ($response.StatusCode -eq 200 -and $response.Content.Contains($service.Marker)) {
                $ready = $true
                break
            }
            throw ('Unexpected service on port ' + $service.Port)
        } catch {
            if ($listener) { throw ('Existing service could not be verified at ' + $url + '. No process was changed.') }
            Start-Sleep -Milliseconds 500
        }
    }
    if (-not $ready) { throw ('Preview failed at ' + $url + '. Check logs: ' + $logDirectory) }
    Write-Output ('READY ' + $url)
}

Write-Output 'Keep these processes running while reviewing. Ask Codex to stop them after review. They do not auto-start after reboot.'

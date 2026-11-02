# Launches Chrome (visible) with a separate dev profile and a debugging port so the AI agent can attach.
$rootDir = (Resolve-Path -LiteralPath "$PSScriptRoot\..").Path
$profileDir = "$rootDir\.dev-profile-user"
$chrome = "C:\Program Files\Google\Chrome\Application\chrome.exe"
if (-not (Test-Path $chrome)) { $chrome = "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe" }

$cmd = "`"$chrome`" --remote-debugging-port=9222 `"--user-data-dir=$profileDir`" --no-first-run chrome://extensions https://messages.google.com/web/"
Invoke-CimMethod -ClassName Win32_Process -MethodName Create -Arguments @{ CommandLine = $cmd }

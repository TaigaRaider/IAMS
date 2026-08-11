<#
curl-json.ps1 - quote-safe curl wrapper for PowerShell 5.1

WHY: PowerShell 5.1 strips / mangles double quotes in arguments passed to
native executables, so calling  `curl.exe -d '{"a":1}'` silently corrupts the
JSON (the server then replies 500 "Expected property name..."). This script
keeps the JSON string inside PowerShell and pipes it to curl via stdin, which
never touches the native-argument parser.

USAGE:
  # GET (no body)
  .\scripts\curl-json.ps1 -Url http://localhost:5173/api/roles

  # POST / PATCH with an inline JSON string (quotes are safe)
  .\scripts\curl-json.ps1 -Url http://localhost:5173/api/interviews -Method POST `
      -Body '{"application_id":999,"scheduled_at":"2026-08-20T10:00:00Z"}'

  # With a bearer token
  .\scripts\curl-json.ps1 -Url http://localhost:5173/api/interviews `
      -Token $env:IAMS_ADMIN_TOKEN

  # Show the HTTP status code (colored) after the body
  .\scripts\curl-json.ps1 -Url http://localhost:5173/api/roles -StatusCode
#>

param(
    [Parameter(Mandatory = $true)][string]$Url,
    [ValidateSet("GET", "POST", "PATCH", "DELETE", "PUT")][string]$Method = "POST",
    [string]$Body,
    [string]$Token,
    [switch]$StatusCode
)

$curl = "curl.exe"
$curlArgs = @("-s", "-X", $Method)

if ($Url -match "^\w+://") {
    $curlArgs += $Url
}
else {
    Write-Error "Url must be absolute (e.g. http://localhost:5173/api/...)"
    exit 1
}

if ($Token) {
    $curlArgs += @("-H", "Authorization: Bearer $Token")
}
if ($Body) {
    # A body can still go to GET, but it's almost always a mistake outside tests.
    if ($Method -eq "GET") {
        Write-Warning "GET with a body is unusual; sending anyway."
    }
    $curlArgs += @("-H", "Content-Type: application/json")
    if ($StatusCode) {
        $curlArgs += @("-w", "`nHTTP %{http_code}`n")
    }
    # Pipe the JSON through stdin so PowerShell never re-quotes it.
    Write-Output $Body | & $curl $curlArgs -d "@-" 2>&1
}
else {
    if ($StatusCode) {
        $curlArgs += @("-w", "`nHTTP %{http_code}`n")
    }
    & $curl $curlArgs 2>&1
}

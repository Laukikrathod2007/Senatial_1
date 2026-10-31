[CmdletBinding()]
param(
  [string]$ApiBaseUrl = "http://127.0.0.1:8000",
  [string]$TargetBaseUrl = "http://127.0.0.1:8010",
  [switch]$ExpectUnavailableTarget,
  [ValidateRange(1, 20000)][int]$ExpectedMaxProbes = 20000,
  [ValidateRange(50, 2000)][int]$PerCohort = 50,
  [ValidateRange(1, 600)][int]$TimeoutSeconds = 240
)

$ErrorActionPreference = "Stop"
$ApiBaseUrl = $ApiBaseUrl.TrimEnd("/")
$TargetBaseUrl = $TargetBaseUrl.TrimEnd("/")

function Get-Json([string]$Uri, [hashtable]$Headers = @{}) {
  return Invoke-RestMethod -Method Get -Uri $Uri -Headers $Headers -TimeoutSec 10
}

function Assert-True([bool]$Condition, [string]$Message) {
  if (-not $Condition) { throw $Message }
}

Write-Host "Checking SENTINEL API at $ApiBaseUrl" -ForegroundColor Cyan
$apiHealth = Get-Json "$ApiBaseUrl/health"
Assert-True ($apiHealth.status -eq "ok") "SENTINEL API health check did not return status=ok."

$targetHealthy = $false
try {
  $targetHealth = Get-Json "$TargetBaseUrl/health"
  $targetHealthy = ($targetHealth.status -eq "ok")
} catch {
  $targetHealthy = $false
}

if ($ExpectUnavailableTarget) {
  Assert-True (-not $targetHealthy) "Expected the mock target to be unavailable, but its health endpoint responded. Stop the mock target before this failure-path run."
  Write-Host "Mock target is unavailable as expected; checking capped failure accounting." -ForegroundColor Yellow
} else {
  Assert-True $targetHealthy "Mock target is unavailable. Start it with .\start-mock-target.ps1 in another PowerShell window."
  $targetHealth = Get-Json "$TargetBaseUrl/health"
  Assert-True ($targetHealth.model_id -eq "welfare-eligibility-demo") "Unexpected mock target model_id: $($targetHealth.model_id)"
  Write-Host "Mock target health passed: $($targetHealth.model_id) / $($targetHealth.model_version)" -ForegroundColor Green
}

$login = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/auth/login" -ContentType "application/json" -Body (@{
  subject = "sentinel-manual-smoke"
  role = "journalist"
} | ConvertTo-Json -Compress) -TimeoutSec 10
$headers = @{ Authorization = "Bearer $($login.access_token)" }

$accepted = Invoke-RestMethod -Method Post -Uri "$ApiBaseUrl/audits/fairness/http-demo/jobs" -Headers $headers -ContentType "application/json" -Body (@{
  per_cohort = $PerCohort
} | ConvertTo-Json -Compress) -TimeoutSec 20
Assert-True (-not [string]::IsNullOrWhiteSpace($accepted.job_id)) "Job submission returned no job_id."
Assert-True ($accepted.status -in @("queued", "running", "completed")) "Unexpected initial status: $($accepted.status)"
Write-Host "Accepted job $($accepted.job_id); planned probes: $($accepted.total_probes)" -ForegroundColor Green

$deadline = (Get-Date).AddSeconds($TimeoutSeconds)
$previousAttempted = 0
$job = $null
do {
  Start-Sleep -Seconds 2
  $job = Get-Json "$ApiBaseUrl/audits/jobs/$($accepted.job_id)" $headers
  Assert-True ($job.attempted_probes -ge $previousAttempted) "Progress counters moved backwards."
  Assert-True ($job.completed_probes + $job.failed_probes -eq $job.attempted_probes) "Probe counters do not add up."
  Assert-True ($job.unattempted_probes + $job.attempted_probes -eq $job.total_probes) "Attempted and unattempted counts do not match the plan."
  $previousAttempted = $job.attempted_probes
  Write-Host ("{0,-10} {1,6}% completed={2} failed={3} unattempted={4}" -f $job.status, $job.progress_pct, $job.completed_probes, $job.failed_probes, $job.unattempted_probes)
  if ($job.status -in @("completed", "failed")) { break }
} while ((Get-Date) -lt $deadline)

Assert-True ($job.status -in @("completed", "failed")) "Timed out waiting for job completion after $TimeoutSeconds seconds. Last status: $($job.status)"
if ($job.status -eq "failed") { throw "Audit job failed: $($job.error_message)" }
Assert-True ($null -ne $job.result) "Completed job did not return its sealed result."
Assert-True ($job.result.report.target.type -eq "controlled_local_http") "Result does not identify the controlled HTTP target."
Assert-True ($job.result.report.disclosure -match "synthetic") "Result is missing its synthetic-data disclosure."

if ($ExpectUnavailableTarget) {
  $expectedAttempted = [Math]::Min($ExpectedMaxProbes, $job.total_probes)
  Assert-True ($job.attempted_probes -eq $expectedAttempted) "Expected $expectedAttempted attempted probes, got $($job.attempted_probes)."
  Assert-True ($job.completed_probes -eq 0) "Unavailable target unexpectedly completed probes: $($job.completed_probes)."
  Assert-True ($job.failed_probes -eq $expectedAttempted) "Expected every attempted probe to fail; got $($job.failed_probes)."
  Assert-True ($job.unattempted_probes -eq ($job.total_probes - $expectedAttempted)) "Incorrect unattempted probe count."
  Assert-True ($job.result.report.cohorts[0].metric_available -eq $false) "Report should mark metrics unavailable when every target request fails."
} else {
  Assert-True ($job.attempted_probes -eq $job.total_probes) "Healthy run did not attempt all planned probes."
  Assert-True ($job.completed_probes -eq $job.total_probes) "Healthy run has failed target responses."
  Assert-True ($job.failed_probes -eq 0 -and $job.unattempted_probes -eq 0) "Healthy run has failed or unattempted probes."
}

$sequence = $job.result.sealed.sequence
$verified = Get-Json "$ApiBaseUrl/verify/reports/$sequence"
Assert-True ($verified.valid -eq $true) "Sealed report verification failed for sequence $sequence."
Write-Host "PASS: job lifecycle, owner-authenticated polling, probe accounting, disclosure, and seal verification." -ForegroundColor Green


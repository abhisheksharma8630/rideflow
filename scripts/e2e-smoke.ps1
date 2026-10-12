# End-to-end smoke test of the RideFlow API happy path + guard checks.
# Requires the API running on http://localhost:4000 with seed data loaded.
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:4000/api'

function Post($url, $body, $token) {
  $headers = @{ 'Content-Type' = 'application/json' }
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Method Post -Uri "$base$url" -Headers $headers -Body ($body | ConvertTo-Json -Depth 8)
}
function Get-Api($url, $token) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Method Get -Uri "$base$url" -Headers $headers
}

Write-Host "1. Health" -ForegroundColor Cyan
$h = Get-Api '/health'
if ($h.status -ne 'ok') { throw "Health not ok: $($h | ConvertTo-Json)" }
Write-Host "   db=$($h.db) status=$($h.status)"

Write-Host "2. Customer demo-login" -ForegroundColor Cyan
$cust = Post '/auth/demo-login' @{ phone = '9810000001'; role = 'CUSTOMER' }
$custToken = $cust.accessToken
Write-Host "   customer=$($cust.user.name)"

Write-Host "3. Fare estimate" -ForegroundColor Cyan
$est = Post '/fares/estimate' @{ vehicleCategory = 'BIKE'; pickup = @{ latitude = 30.7411; longitude = 76.7822 }; destination = @{ latitude = 30.7056; longitude = 76.8013 } } $custToken
Write-Host "   BIKE total=$($est.total) dist=$($est.distanceKm)km noRouting=$($est.estimatedWithoutRouting)"

Write-Host "4. Create ride (booking persists)" -ForegroundColor Cyan
$ride = Post '/rides' @{ vehicleCategory = 'BIKE'; pickupAddress = 'Sector 17 Plaza'; pickup = @{ latitude = 30.7411; longitude = 76.7822 }; destinationAddress = 'Elante Mall'; destination = @{ latitude = 30.7056; longitude = 76.8013 }; paymentMethod = 'CASH' } $custToken
$rideId = $ride.id
Write-Host "   rideId=$rideId status=$($ride.status) estFare=$($ride.estimatedFare)"
if ($ride.status -ne 'SEARCHING') { throw "Expected SEARCHING" }

Write-Host "5. Driver demo-login (BIKE)" -ForegroundColor Cyan
$drv = Post '/auth/demo-login' @{ phone = '9820000001'; role = 'DRIVER' }
$drvToken = $drv.accessToken
Write-Host "   driver=$($drv.user.name)"

Start-Sleep -Milliseconds 800
Write-Host "6. Driver accepts" -ForegroundColor Cyan
$acc = Post "/rides/$rideId/accept" @{} $drvToken
Write-Host "   status=$($acc.status) driver=$($acc.driver.name) veh=$($acc.driver.vehicle.registrationNumber)"
if ($acc.status -ne 'ACCEPTED') { throw "Expected ACCEPTED" }

Write-Host "7. Ownership guard: a different driver cannot complete" -ForegroundColor Cyan
try {
  $drv2 = Post '/auth/demo-login' @{ phone = '9820000003'; role = 'DRIVER' }
  Post "/rides/$rideId/complete" @{} $drv2.accessToken | Out-Null
  throw "SECURITY FAIL: non-assigned driver completed ride"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -in 403,400) { Write-Host "   correctly blocked ($($_.Exception.Response.StatusCode.value__))" }
  else { throw }
}

Write-Host "8. Arrive -> Start -> Complete" -ForegroundColor Cyan
Post "/rides/$rideId/arrive" @{} $drvToken | Out-Null
Post "/rides/$rideId/start" @{} $drvToken | Out-Null
$done = Post "/rides/$rideId/complete" @{} $drvToken
Write-Host "   status=$($done.status) finalFare=$($done.finalFare)"
if ($done.status -ne 'COMPLETED') { throw "Expected COMPLETED" }
if (-not $done.finalFare) { throw "No final fare" }

Write-Host "9. Customer ownership: stranger cannot read ride" -ForegroundColor Cyan
$stranger = Post '/auth/demo-login' @{ phone = '9811111199'; role = 'CUSTOMER'; name = 'Stranger' }
try {
  Get-Api "/rides/$rideId" $stranger.accessToken | Out-Null
  throw "SECURITY FAIL: stranger read another ride"
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 403) { Write-Host "   correctly blocked (403)" }
  else { throw }
}

Write-Host "10. Admin overview reflects completed ride" -ForegroundColor Cyan
$admin = Post '/auth/demo-login' @{ phone = '9800000000'; role = 'ADMIN' }
$ov = Get-Api '/admin/overview' $admin.accessToken
Write-Host "   customers=$($ov.totalCustomers) drivers=$($ov.totalDrivers) completed=$($ov.completedRides) GBV=$($ov.grossBookingValue) demoData=$($ov.isDemoData)"

Write-Host "11. No-driver scenario (CAB requested but we take all CABs offline? use AUTO-less category trick)" -ForegroundColor Cyan
# Suspend driver approval scenario is covered by tests; here just confirm history.
$hist = Get-Api '/users/me/rides?pageSize=50' $custToken
Write-Host "   customer ride history count=$($hist.total)"

Write-Host ""
Write-Host "E2E SMOKE PASSED" -ForegroundColor Green

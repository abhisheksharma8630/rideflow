# Reset RideFlow to a clean, predictable demo state.
# Resets the database, re-applies migrations, and re-seeds deterministic demo data.
$ErrorActionPreference = 'Stop'
Write-Host "Resetting RideFlow demo data..." -ForegroundColor Cyan
Push-Location "$PSScriptRoot/../services/api"
try {
  npx prisma migrate reset --force
  Write-Host "Demo data reset complete." -ForegroundColor Green
} finally {
  Pop-Location
}

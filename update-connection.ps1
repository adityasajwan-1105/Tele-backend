# PowerShell script to update MongoDB connection string
Write-Host "`n=== MongoDB Connection String Updater ===" -ForegroundColor Cyan
Write-Host ""

# Get password from user
$password = Read-Host "Enter your MongoDB password (from Atlas → Database Access)"

if ([string]::IsNullOrWhiteSpace($password)) {
    Write-Host "❌ Password cannot be empty!" -ForegroundColor Red
    exit 1
}

# URL encode special characters
$encodedPassword = [System.Web.HttpUtility]::UrlEncode($password)

Write-Host "`n📝 Original password: $password" -ForegroundColor Yellow
Write-Host "🔐 URL-encoded password: $encodedPassword" -ForegroundColor Yellow
Write-Host ""

# Build connection string
$connectionString = "mongodb+srv://adityasajwan1105:$encodedPassword@cluster0.iaghazm.mongodb.net/telemedicine?retryWrites=true&w=majority"

# Update .env file
$envFile = Join-Path $PSScriptRoot ".env"

if (Test-Path $envFile) {
    $content = Get-Content $envFile -Raw
    
    # Replace MONGODB_URI line
    if ($content -match "MONGODB_URI=.*") {
        $content = $content -replace "MONGODB_URI=.*", "MONGODB_URI=$connectionString"
        Set-Content -Path $envFile -Value $content -NoNewline
        Write-Host "✅ Updated .env file successfully!" -ForegroundColor Green
        Write-Host "`n📝 Connection string updated (password is URL-encoded)" -ForegroundColor Cyan
        Write-Host "`n🚀 Now run: npm start" -ForegroundColor Green
    } else {
        Write-Host "❌ MONGODB_URI not found in .env file" -ForegroundColor Red
    }
} else {
    Write-Host "❌ .env file not found at: $envFile" -ForegroundColor Red
}


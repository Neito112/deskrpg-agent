# scripts/start-gemini-web.ps1
# Khởi chạy Google Chrome tách biệt hỗ trợ CDP (Remote Debugging Port 9222) cho DeskRPG Gemini Guide

$port = 9222
$profileDir = Join-Path $env:LOCALAPPDATA "DeskRPG\gemini-chrome-profile"

$chromeCandidates = @(
    "C:\Program Files\Google\Chrome\Application\chrome.exe",
    "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
)

$chromePath = $chromeCandidates | Where-Object { Test-Path $_ } | Select-Object -First 1

if (-not $chromePath) {
    Write-Error "Không tìm thấy trình duyệt Google Chrome trên hệ thống."
    exit 1
}

if (-not (Test-Path $profileDir)) {
    New-Item -ItemType Directory -Path $profileDir -Force | Out-Null
}

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " Khởi chạy Chrome CDP cho Gemini Web Guide (Cổng $port)" -ForegroundColor Green
Write-Host " Profile: $profileDir" -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Lưu ý: Đăng nhập tài khoản Google của bạn trên cửa sổ Chrome này một lần." -ForegroundColor Gray
Write-Host "DeskRPG sẽ tự động giao tiếp ngầm với tab gemini.google.com." -ForegroundColor Gray

Start-Process -FilePath $chromePath -ArgumentList `
    "--remote-debugging-port=$port", `
    "--user-data-dir=`"$profileDir`"", `
    "--no-first-run", `
    "--no-default-browser-check", `
    "https://gemini.google.com/app"

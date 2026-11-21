@echo off
chcp 65001 >nul
echo Đang tắt DeskRPG và các dịch vụ nền (cổng 3000, 9119, 8642)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do (
    taskkill /F /T /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9119 ^| findstr LISTENING') do (
    taskkill /F /T /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8642 ^| findstr LISTENING') do (
    taskkill /F /T /PID %%a >nul 2>&1
)
echo Đã tắt hoàn toàn DeskRPG và Hermes thành công!
timeout /t 2 >nul

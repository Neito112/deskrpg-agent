Option Explicit
Dim WshShell

Set WshShell = CreateObject("WScript.Shell")

' Đóng tiến trình đang chạy DeskRPG (cổng 3000), Hermes Dashboard (cổng 9119) và Hermes Gateway (cổng 8642)
WshShell.Run "cmd.exe /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :3000 ^| findstr LISTENING') do taskkill /F /T /PID %a", 0, True
WshShell.Run "cmd.exe /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :9119 ^| findstr LISTENING') do taskkill /F /T /PID %a", 0, True
WshShell.Run "cmd.exe /c for /f ""tokens=5"" %a in ('netstat -aon ^| findstr :8642 ^| findstr LISTENING') do taskkill /F /T /PID %a", 0, True

MsgBox "Đã tắt hoàn toàn DeskRPG và dịch vụ Hermes chạy ngầm thành công!", vbInformation, "DeskRPG"

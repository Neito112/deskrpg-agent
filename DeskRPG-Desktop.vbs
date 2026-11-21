Option Explicit
Dim WshShell, fso, scriptDir

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Kiểm tra database SQLite và .env.local
If Not fso.FileExists(scriptDir & "\.env.local") Or Not fso.FileExists(scriptDir & "\data\deskrpg.db") Then
    WshShell.Run "cmd.exe /c npm run setup:lite", 0, True
End If

' Khởi chạy ứng dụng Desktop (Electron) ẩn toàn bộ terminal
WshShell.Run "cmd.exe /c npm run desktop", 0, False

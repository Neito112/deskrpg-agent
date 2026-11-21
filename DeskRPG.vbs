Option Explicit
Dim WshShell, fso, scriptDir

Set WshShell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")

' Lấy đường dẫn thư mục của dự án
scriptDir = fso.GetParentFolderName(WScript.ScriptFullName)
WshShell.CurrentDirectory = scriptDir

' Kiểm tra nếu chưa cài thư mục node_modules
If Not fso.FolderExists(scriptDir & "\node_modules") Then
    MsgBox "Chưa tìm thấy thư mục node_modules." & vbCrLf & "Vui lòng mở terminal chạy 'npm install' trước khi khởi chạy!", vbExclamation, "DeskRPG"
    WScript.Quit
End If

' Tự động thiết lập database SQLite nếu chưa có
If Not fso.FileExists(scriptDir & "\.env.local") Or Not fso.FileExists(scriptDir & "\data\deskrpg.db") Then
    WshShell.Run "cmd.exe /c npm run setup:lite", 0, True
End If

' Khởi chạy ứng dụng chạy ngầm (0 = ẩn hoàn toàn cửa sổ terminal, False = không chờ)
WshShell.Run "cmd.exe /c npm run dev", 0, False

' Chờ 4 giây để máy chủ khởi động
WScript.Sleep 4000

' Tự động mở trình duyệt web mặc định truy cập DeskRPG
WshShell.Run "http://localhost:3000"

---
name: agy-executor
description: Kỹ năng thực thi trực tiếp trên workspace bằng Antigravity CLI (agy.EXE). Tự động đọc cấu hình model từ Settings, phát hiện chạm hạn mức quota để dừng an toàn và phản hồi cho Hermes.
---

# Antigravity Executor (Kỹ Năng Thực Thi Trực Tiếp)

Kỹ năng này chịu trách nhiệm **trực tiếp thực hiện** các thao tác trên máy tính, workspace, file mã nguồn và HyperFrames dựa trên bản hướng dẫn kỹ thuật đã lập trước.

## 1. Nguyên Tắc Cốt Lõi
- **Chỉ làm nhiệm vụ THỰC THI**: Luôn nhận bản hướng dẫn/spec cụ thể trước khi thao tác.
- **Tuân thủ cấu hình Settings**: Tự động đọc `data/cli-routing-config.json` để chọn model (hoặc dùng model do `task-model-router` chỉ định khi ở chế độ Auto).
- **Phát hiện chạm trần hạn mức (Quota Exhaustion)**: Khi phát hiện `agy.EXE` chạm giới hạn lượt dùng, lập tức dừng ngay và trả cờ `quotaExhausted: true` để tránh vòng lặp lỗi.
- **An toàn workspace**: Giới hạn thao tác trong phạm vi thư mục chỉ định (`--add-dir <cwd>`).

## 2. Cách Thực Thi Wrapper Script
```bash
node scripts/execute.mjs --plan "<Bản kế hoạch>" [--model "<Tên model>"] [--cwd "<Thư mục>"] [--json]
```

## 3. Quy Chuẩn Ngầm
- Mọi thao tác thực thi diễn ra âm thầm ở hậu trường; không để lộ tên công cụ `agy`, cờ lệnh, log kỹ thuật hay từng bước gọi tool ra khung chat.

---
name: task-model-router
description: Kỹ năng phân tích độ phức tạp nhiệm vụ và tự động điều phối model tối ưu cho Gemini Guide và AGY Executor theo 3 mức độ (Nhẹ, Trung bình, Nặng), tôn trọng lựa chọn thủ công trong Settings.
---

# Task Model Router (Điều Phối Model Theo Độ Phức Tạp)

Kỹ năng này chịu trách nhiệm đánh giá độ phức tạp của bài toán trước khi Hermes điều phối công việc cho các bộ phận hướng dẫn và thực thi.

## 1. Bảng Đánh Giá Độ Phức Tạp Đề Bài

| Mức độ | Tiêu chí phân loại | Gemini Guide (`--tier`) | AGY Executor (`--model`) |
| :--- | :--- | :--- | :--- |
| **Mức 1 (Nhẹ / Low)** | Sửa lỗi nhỏ, đổi text, format code, tra cứu tài liệu, giải đáp câu hỏi đơn giản | `fast` | `gemini-3.8-flash-low` |
| **Mức 2 (Trung bình / Medium)** | Thêm component UI, viết unit test, dựng slide HyperFrames, xử lý API logic, tổng hợp biên bản | `pro` | `gemini-3.8-flash-medium` hoặc `gemini-3.8-flash-high` |
| **Mức 3 (Nặng / High)** | Thiết kế kiến trúc, tái cấu trúc đa module, tối ưu hiệu năng sâu, gỡ lỗi race-condition/treo hệ thống | `thinking` | `claude-sonnet-4-6` hoặc `claude-opus-4-6-thinking` |

## 2. Nguyên Tắc Điều Phối
1. **Kiểm tra Cài đặt (Settings)**:
   - Đọc cấu hình từ `data/cli-routing-config.json`.
   - Nếu mục nào đang đặt `manual`, **tôn trọng tuyệt đối** lựa chọn thủ công của người dùng.
   - Nếu mục nào đang đặt `auto`, áp dụng model theo mức độ đánh giá ở bảng trên.
2. **Truyền Tham Số Chuẩn**:
   - Khi gọi `gemini-guide/scripts/guide.mjs`: truyền `--tier <low|medium|high>`.
   - Khi gọi `agy-executor/scripts/execute.mjs`: truyền `--model <tên-model>`.

## 3. Hoạt Động Ngầm
- Việc chấm điểm và điều phối model diễn ra âm thầm ở hậu trường, không in bảng tính điểm hay lý do chọn model ra khung chat.

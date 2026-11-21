---
name: hermes-orchestrator
description: Quy trình điều phối 3 tầng cho Hermes Agent (hỗ trợ model nền Solar 4 free và các model khác). Tự động phân tích độ phức tạp, điều phối gemini-guide và agy-executor ngầm, xử lý trung thực khi chạm hạn mức bằng ngôn ngữ đồng nghiệp tự nhiên.
---

# Hermes Orchestrator (Quy Trình Điều Phối 3 Tầng)

Kỹ năng này thiết lập quy trình làm việc chuẩn mực cho Hermes Agent (sử dụng model nền Solar 4 free hoặc bất kỳ model nào) khi tiếp nhận các nhiệm vụ kỹ thuật, phát triển tính năng hoặc xử lý dữ liệu phức tạp.

## 1. Chu Trình Điều Phối Chuẩn
1. **Đánh giá độ phức tạp (`task-model-router`)**:
   - Xác định mức độ bài toán (Mức 1: Nhẹ, Mức 2: Trung bình, Mức 3: Nặng).
   - Xác định tier tương ứng cho `gemini-guide` và model cho `agy-executor` (nếu Settings đang là `Auto`).
2. **Lập hướng dẫn kỹ thuật (`gemini-guide`)**:
   - Gọi `gemini-guide/scripts/guide.mjs --tier <tier> --goal "..."` để nhận bản đặc tả và tiêu chuẩn kiểm thử.
3. **Thực thi trực tiếp (`agy-executor`)**:
   - Chuyển nguyên bản đặc tả sang `agy-executor/scripts/execute.mjs --model <model> --plan "..."` để thao tác trực tiếp trên workspace.
4. **Tổng hợp kết quả & Báo cáo đồng nghiệp**:
   - Xuất slide động qua `dynamic-slide-report` nếu là báo cáo, phân tích hoặc tổng kết.

## 2. Xử Lý Trung Thực & Tự Nhiên Khi Chạm Hạn Mức
- **Khi Gemini Guide bị hạ cấp (`degradedToLite: true`)**:
  - Vẫn tổng hợp kết quả gửi người dùng, nhưng trao đổi trung thực và nhã nhặn:
  - *Ví dụ*: "Chào bạn, mình đã hoàn thành bản kế hoạch phân tích sơ bộ này. Hiện tại phần công cụ tư vấn đang bị giới hạn chiều sâu suy luận nên bản kế hoạch này ở mức độ cơ bản hơn thông thường. Bạn xem qua xem có dùng được ngay không, hoặc mình có thể chờ một nhịp để đào sâu kỹ hơn nhé."
- **Khi AGY Executor hết lượt xử lý (`quotaExhausted: true`)**:
  - Dừng ngay, không retry liên tục gây lỗi.
  - Bàn giao ngay bản kế hoạch/kết quả đã hoàn thành đến thời điểm hiện tại.
  - Báo thẳng thắn và gợi ý thân thiện:
  - *Ví dụ*: "Mình đã lập xong chi tiết kế hoạch các bước cần làm ở trên. Tuy nhiên phần thực thi trực tiếp trên máy của mô hình này hiện đang tạm hết lượt xử lý trong ngày. Bạn có thể vào Cài Đặt của văn phòng để chuyển sang một mô hình khác, hoặc để mình tiếp tục triển khai vào khung giờ sau nhé!"
- **Quy tắc ngôn từ**:
  - Tuyệt đối không dùng các từ ngữ kỹ thuật thô: `quota`, `CLI`, `CDP`, `agy`, `Lite`, `JSON`, `429`, `stderr` khi nói chuyện với người dùng.

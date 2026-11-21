---
name: dynamic-slide-report
description: Quy định bắt buộc: Mọi báo cáo phân tích, tiến độ, tổng kết công việc hoặc biên bản cuộc họp từ AI Agent phải được trình bày dưới dạng slide động (HyperFrames slideshow hoặc HTML slide deck tương tác) với phong cách giao tiếp tự nhiên như đồng nghiệp thật.
---

# Dynamic Slide Report (Chuẩn Báo Cáo Slide Động)

Kỹ năng này quy định tiêu chuẩn đầu ra duy nhất cho tất cả các yêu cầu báo cáo, tiến độ công việc, phân tích dữ liệu và biên bản cuộc họp của các nhân sự AI trong DeskRPG.

## 1. Phong Cách Giao Tiếp Đồng Nghiệp Tự Nhiên
- Giao tiếp lịch sự, tự nhiên, thân thiện và chuyên nghiệp như một nhân sự/đồng nghiệp thật trong công ty.
- **TUYỆT ĐỐI KHÔNG** nhắc đến tên công cụ, API, CLI, câu lệnh terminal, mã lỗi, log hệ thống, đường dẫn file kỹ thuật hay quy trình kỹ thuật ngầm.
- **TUYỆT ĐỐI KHÔNG** tường thuật từng bước thực hiện trung gian (không "đang gọi công cụ...", không "do thiếu render nên..."). Chỉ gửi phản hồi hoàn chỉnh khi đã hoàn thành công việc.

## 2. Tiêu Chuẩn Cấu Trúc Báo Cáo Cuối Cùng
Mỗi báo cáo phải tuân thủ chặt chẽ 4 phần sau:
1. **Lời mở đầu tự nhiên**: Chào hỏi thân thiện, giới thiệu ngắn gọn nội dung báo cáo.
2. **Tóm tắt điều hành (Executive Summary)**: 3 đến 5 gạch đầu dòng súc tích, làm nổi bật thông tin cốt lõi, số liệu quan trọng, quyết định và định hướng tiếp theo.
3. **Đường dẫn slide động tương tác**: Cung cấp link trình chiếu trực quan:
   - `[Mở Slide Báo Cáo](URL)` (hoặc `[Open Slide Deck](URL)` đối với tiếng Anh).
   - URL có thể là đường dẫn tương đối (ví dụ: `/slides/ten-bao-cao.html`), `http://localhost:...`, hoặc file URI.
4. **Lời kết tự nhiên**: Sẵn sàng giải đáp thêm hoặc lắng nghe phản hồi của người dùng.

## 3. Tạo Bản Slide Động Tương Tác
- Slide động được tự động biên soạn thành slide HTML tương tác chuyên nghiệp hoặc HyperFrames slideshow (`<script type="application/hyperframes-slideshow+json">`).
- Bản trình chiếu có hiệu ứng chuyển cảnh mượt mà, hỗ trợ điều hướng bằng phím mũi tên hoặc nhấp chuột, bố cục hiện đại, trực quan.
- Lưu file slide vào thư mục phục vụ web (ví dụ `public/slides/<ten-file>.html` hoặc `workspace/slides/<ten-file>.html`).

## 4. Phân Định Công Cụ & Thực Thi Ngầm
- Khi cần phân tích dữ liệu hoặc tổng hợp nghiên cứu sâu, sử dụng công cụ phân tích (Gemini CLI); khi cần thao tác hệ thống hoặc chuẩn bị workspace, sử dụng công cụ môi trường (Antigravity CLI).
- Mọi công cụ chạy ngầm hoàn toàn; không xuất các thông điệp kỹ thuật ra khung trò chuyện chung.

---
name: gemini-guide
description: Kỹ năng định hướng và lập kế hoạch kỹ thuật cho Hermes Agent bằng Gemini Web (tự động kết nối ngầm qua profile riêng). Phân tích yêu cầu, lập spec chi tiết và tự nhận diện trạng thái hạ cấp Lite khi chạm hạn mức.
---

# Gemini Guide (Kỹ Năng Định Hướng Kỹ Thuật)

Kỹ năng này chuyên trách phân tích yêu cầu kỹ thuật, khảo sát và lập bản kế hoạch/spec thực thi rõ ràng cho Hermes Agent hoặc các sub-agent thông qua Gemini Web.

## 1. Nguyên Tắc Cốt Lõi
- **Chỉ làm nhiệm vụ HƯỚNG DẪN**: Không can thiệp file mã nguồn trực tiếp.
- **Tự động hóa 100% kết nối**: Sử dụng cầu nối nền tích hợp trong DeskRPG với hồ sơ trình duyệt cô lập tại `%LOCALAPPDATA%\DeskRPG\gemini-profile`. Không cần cấu hình API key, không cần chạy script PowerShell thủ công.
- **Đăng nhập 1 lần**: Người dùng chỉ cần đăng nhập tài khoản Google một lần duy nhất qua nút bấm trong Cài đặt DeskRPG. Mọi phiên làm việc tiếp theo được DeskRPG tự duy trì ngầm.
- **Nhận diện hạ cấp**: Tự động phát hiện khi tài khoản chạm hạn mức bản cao và tụt xuống bản Lite (`degradedToLite: true`) để Hermes báo cáo trung thực.
- **Cấu trúc đầu ra chuẩn**: (1) Mục tiêu & Phạm vi, (2) Kế hoạch tuần tự, (3) Danh sách file liên quan, (4) Tiêu chuẩn kiểm tra.

## 2. Cách Thực Thi Wrapper Script
```bash
node scripts/guide.mjs --goal "<Mô tả nhiệm vụ>" [--tier "<low|medium|high>"] [--context "<Bối cảnh>"] [--json]
```
- Tự động đọc `data/cli-routing-config.json` để áp dụng model thủ công nếu người dùng đã cố định trong Cài Đặt.
- Nếu cầu nối chưa chạy, script sẽ tự động kích hoạt trình duyệt ngầm và kết nối.

## 3. Quy Chuẩn Ngầm
- Mọi thao tác chạy ngầm hoàn toàn; không xuất lệnh CLI, CDP logs hay mã lỗi kỹ thuật ra khung chat.

# DeskRPG — Static Web Preview

Bản xem trước tĩnh (static preview) của văn phòng ảo 3D DeskRPG.
Static preview of the DeskRPG 3D virtual office.

## Đây là gì / What is this

Một trang HTML duy nhất (`index.html`), tự chạy hoàn toàn phía client.
Không có server, không có database, không có Socket.io, không có Hermes thật —
mọi nội dung trong các panel đều là **dữ liệu mẫu (demo)**.

A single self-contained HTML file that runs fully client-side.
No server, no database, no Socket.io, no real Hermes —
everything in the panels is **sample demo data**.

## Cách chạy / How to run

Mở trực tiếp `index.html` bằng trình duyệt (kéo-thả file vào trình duyệt,
hoặc `python3 -m http.server` rồi mở `http://localhost:8000/`).

Chỉ cần kết nối mạng để tải Three.js từ CDN (jsdelivr). Không cần cài đặt gì khác.

Open `index.html` directly in a browser, or serve the folder with any static
server. Only needs network access to load Three.js from the CDN (jsdelivr).

## Deploy lên GitHub Pages

Copy toàn bộ thư mục này thành `web-preview/` trong repo `Neito112/deskrpg-agent`,
kèm workflow GitHub Pages trỏ base path `/deskrpg-agent/`.
Trang dùng đường dẫn tương đối nên chạy được cả `file://` và
`https://neito112.github.io/deskrpg-agent/`.

## Có gì trong preview / What's inside

- Cảnh văn phòng 3D (Three.js r180, qua CDN + importmap): sàn gỗ, tường,
  cửa sổ, 6 bàn làm việc + ghế, 4 avatar (Hermes, Gemini, Codex, Muse)
  với bảng tên, bàn họp tròn 5 ghế, bảng Kanban 3 cột, cây cảnh, đèn treo,
  ánh sáng ấm.
- Điều khiển: kéo để xoay (OrbitControls), lăn chuột để zoom.
- Nút **Gọi Hermes**, **Họp**, **Kanban** mở panel demo với nội dung mẫu
  song ngữ Việt + Anh, kèm ghi chú "chế độ demo — dữ liệu mẫu, không kết nối server".
- Nếu CDN Three.js không tải được: hiện thông báo rõ ràng thay vì màn hình trắng.
- Không auth, không fetch backend, không cookie, không ảnh ngoài.

## Giới hạn / Known limits

- Chỉ là bản demo tĩnh: không có login, không lưu dữ liệu, không chat thật,
  không kết nối Hermes / agent / server nào.
- Cần mạng để tải Three.js từ CDN lần đầu.
- Chưa kiểm chứng render thực tế bằng trình duyệt có giao diện trong môi trường này
  (chỉ kiểm tra cú pháp JS và tải CDN bằng curl/node).

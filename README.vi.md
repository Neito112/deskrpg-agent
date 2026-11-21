# DeskRPG

English README: [README.md](README.md) | 한국어 문서: [README.ko.md](README.ko.md)

<img src="public/readme/home-screenshot.png" alt="Màn hình chính DeskRPG" width="100%" />

Vận hành văn phòng ảo cùng Hermes Agent 24/7 trên một máy chủ VPS duy nhất — xem chi tiết tại [deploy/hostinger](deploy/hostinger/README.md).

**Bắt đầu với một VPS mới** — DeskRPG đã có sẵn trong danh mục cài đặt 1-click của Hostinger. Truy cập trang và chọn DeskRPG khi đặt hàng (khuyến nghị gói KVM 2 trở lên; RAM 8 GB):

[![Triển khai trên Hostinger](https://assets.hostinger.com/vps/deploy.svg)](https://www.hostinger.com/applications/deskrpg)

**Đã có sẵn máy chủ VPS** — tải tệp compose vào Docker Manager:

[![Triển khai trên Hostinger](https://assets.hostinger.com/vps/deploy.svg)](https://www.hostinger.com/vps/docker-hosting?compose_url=https://raw.githubusercontent.com/dandacompany/deskrpg/refs/heads/master/docker-compose.yml)

> ⚠️ **Nếu dùng hướng Docker Manager: hãy triển khai thêm Traefik** — Traefik sẽ cung cấp địa chỉ HTTPS cho văn phòng. Sau khi triển khai xong, Docker Manager sẽ hiển thị biểu ngữ _"Enable HTTPS for Docker projects"_: hãy nhấn **Deploy Traefik**, sau đó thêm `TRAEFIK_HOST=srvNNNNNN.hstgr.cloud` vào biến môi trường của dự án DeskRPG rồi chọn **Save and deploy** — hệ thống sẽ không tự động điền giá trị này. Cả hai cấu hình Traefik của Hostinger (host mode hoặc mạng `traefik-proxy`) đều hoạt động bình thường.

Cần một VPS cho hướng Docker Manager? [Đăng ký tại đây](https://hostinger.com/DANTE-DOCKER) (liên kết giới thiệu — hỗ trợ dự án mà không phát sinh thêm chi phí cho bạn), sau đó quay lại và nhấn nút ở trên.

> **Đang chạy DeskRPG trên Hostinger? Hãy cập nhật tệp compose một lần.** Thao tác Update không tự động đọc tệp compose mới, nên phần cài đặt plugin Hermes sẽ giữ nguyên như ngày đầu bạn thiết lập. Nếu tệp compose của bạn chưa có `plugin-pin`, hãy làm theo [bốn bước sau](deploy/hostinger/README.md#set-up-before-this-change-replace-the-compose-once); toàn bộ dữ liệu của bạn sẽ được giữ nguyên.

DeskRPG là một **văn phòng ảo thu nhỏ 3D tự lưu trữ (self-hosted) dành cho các AI Agent**. Các hồ sơ [Hermes Agent](https://github.com/NousResearch/hermes-agent) của bạn sẽ trở thành nhân viên: họ ngồi tại bàn làm việc, trả lời khi bạn nhắc tên (@mention), tham gia họp theo lượt phát biểu, và xử lý các thẻ kanban. **Hãy gọi họ lại gần và xem báo cáo hoàn thành công việc trực tiếp trong đoạn chat văn phòng.** Nhiều người có thể cùng làm việc trong một văn phòng tại cùng thời điểm.

DeskRPG không đóng gói sẵn runtime của agent. Hệ thống kết nối trực tiếp với gateway Hermes bạn đang chạy, cho phép người dùng Hermes hiện tại mang nguyên vẹn các hồ sơ của mình sang mà không cần chuyển đổi dữ liệu.

- Website: [https://deskrpg.com](https://deskrpg.com) (trực tiếp)
- Mã nguồn: `https://github.com/dandacompany/deskrpg`
- Phiên bản: `v2026.1019.1` — Chia sẻ tệp gốc với nhân viên trong tin nhắn trực tiếp, phòng thảo luận và cuộc họp. Hermes nhận toàn bộ byte gốc ngay cả khi không trích xuất được văn bản. Bao gồm trạng thái tải lên, nút thử lại/hủy, tải xuống và lưu giữ tài liệu tham khảo cuộc họp. Yêu cầu plugin 0.32.0.

## Bạn Có Thể Làm Gì

- Chọn từ 50 ngoại hình văn phòng cách điệu (dựa trên base CC0 Quaternius, được tái cấu trúc thành nhân vật hoàn chỉnh) cho bạn và từng NPC — một tệp GLB cho mỗi ngoại hình, đồng bộ trên bản đồ, danh sách nhân sự và phòng họp.
- Tự do đi lại trong văn phòng 3D thời gian thực hiển thị bằng Three.js, với 5 không gian được thiết kế tỉ mỉ (công ty thương mại, creative agency, startup công nghệ, phòng điều hành, nhà xuất bản).
- Đăng ký gateway Hermes qua địa chỉ URL, hoặc để trình hướng dẫn tự động phát hiện bản cài đặt Hermes nội bộ / kết nối qua SSH, kiểm tra plugin và đăng ký các hồ sơ.
- Tuyển dụng các NPC AI liên kết với hồ sơ Hermes, chỉnh sửa `SOUL.md` ngay trên giao diện web, lựa chọn mô hình, nhà cung cấp, bộ công cụ và mức độ suy luận cho từng NPC.
- Trò chuyện trong phòng văn phòng (nhắc tên @mention để nói chuyện với một nhân viên cụ thể), mở phòng nhóm mời nhiều NPC, theo dõi toàn bộ vòng đời phản hồi (chờ xử lý → đang suy nghĩ → truyền dữ liệu stream → hoàn thành, lỗi hoặc hủy) cùng công cụ mà agent đang sử dụng.
- Bước vào khu vực họp trên mỗi bản đồ văn phòng. Chế độ họp giữ nguyên phòng làm việc và nhân vật thực tế, làm mờ các bức tường che khuất góc nhìn camera và tự động lia theo người đang phát biểu; hỗ trợ điều phối lượt nói, giơ tay phát biểu và xuất biên bản cuộc họp.
- Theo dõi các thẻ kanban do Hermes quản lý từ bước lập kế hoạch, thực thi, kiểm tra đến hoàn thành. Gọi NPC lại gần và nhận thông báo hoàn thành hoặc tắc nghẽn công việc trong kênh chat.
- Quản lý các tác vụ định kỳ (Hermes cron jobs) của từng NPC: tạo lịch trình từ bản thiết kế mẫu (blueprints), tạm dừng/tiếp tục, chạy tức thì, xem lịch sử và nhận kết quả trong kênh chat văn phòng.
- Chia sẻ văn phòng với nhiều người dùng khác (multiplayer, nhóm làm việc và phân quyền RBAC), hỗ trợ đầy đủ Tiếng Việt, Tiếng Hàn, Tiếng Anh, Tiếng Nhật và Tiếng Trung.

## Ảnh Chụp Màn Hình

<table width="100%">
  <tr>
    <td width="50%" valign="top" align="center"><img src="public/readme/deskrpg-home-commute.gif" alt="DeskRPG - Đi làm buổi sáng trong văn phòng 3D" width="100%" /><br /><strong>Đi làm buổi sáng</strong></td>
    <td width="50%" valign="top" align="center"><img src="public/readme/deskrpg-walk-report.gif" alt="DeskRPG - Gọi agent lại gần để báo cáo" width="100%" /><br /><strong>Gọi nhân viên lại gần để báo cáo</strong></td>
  </tr>
  <tr>
    <td width="50%" valign="top" align="center"><img src="public/readme/deskrpg-small-talk.gif" alt="DeskRPG - Trò chuyện ngẫu nhiên trong văn phòng" width="100%" /><br /><strong>Trò chuyện ngẫu nhiên</strong></td>
    <td width="50%" valign="top" align="center"><img src="public/readme/deskrpg-ai-meeting.gif" alt="DeskRPG - Cuộc họp với agent" width="100%" /><br /><strong>Cuộc họp với Agent</strong></td>
  </tr>
</table>

## Bắt Đầu Nhanh

Chọn một trong 6 phương thức dưới đây để khởi chạy DeskRPG.

### Lựa chọn 1: Cài đặt runtime qua npm

Cách tự lưu trữ đơn giản nhất nếu bạn muốn dùng DeskRPG như một ứng dụng cài đặt thay vì clone mã nguồn repository.

**Lưu ý với các bản cũ:** Bản npm `2026.9.18` và `2026.9.19` không khởi động được khi cài trong `node_modules` (`Cannot find module '@/db'`). Hãy dùng bản `2026.9.20` trở lên.

```bash
npx deskrpg init
npx deskrpg start
```

DeskRPG lưu trữ trạng thái runtime có thể thay đổi tại thư mục `~/.deskrpg/`:

- `~/.deskrpg/.env.local`
- `~/.deskrpg/data/deskrpg.db`
- `~/.deskrpg/uploads/`
- `~/.deskrpg/logs/`

Mở trình duyệt tại `http://localhost:3000`.

Gói npm chính thức: `deskrpg`

### Lựa chọn 2: Chạy cục bộ với PostgreSQL

```bash
git clone https://github.com/dandacompany/deskrpg.git
cd deskrpg
npm install
cp .env.example .env.local
npm run setup
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.

Đây là lựa chọn tốt nhất nếu bạn muốn chạy toàn bộ ứng dụng trực tiếp từ mã nguồn.

### Lựa chọn 3: Chạy cục bộ với SQLite

```bash
git clone https://github.com/dandacompany/deskrpg.git
cd deskrpg
npm install
npm run setup:lite
npm run dev
```

SQLite lưu trữ dữ liệu tại `data/deskrpg.db`.

### Lựa chọn 4: Docker với PostgreSQL

Khuyến nghị nếu bạn có nhiều người dùng hoặc muốn cơ sở dữ liệu bền vững, sẵn sàng cho môi trường production.

```bash
git clone https://github.com/dandacompany/deskrpg.git
cd deskrpg
printf 'JWT_SECRET=%s\nPOSTGRES_PASSWORD=%s\n' "$(openssl rand -hex 32)" "$(openssl rand -hex 16)" > .env.docker
docker compose --env-file .env.docker -f docker/docker-compose.external.yml up -d
```

DeskRPG sẽ mở tại `http://localhost:3102`.

Luôn truyền cờ `-f docker/docker-compose.external.yml` cho mọi thao tác, kể cả `down` và `logs`. Thư mục gốc chứa tệp `docker-compose.yml`, nhưng tệp đó dành riêng cho gói 1-click của Hostinger: nó không mở cổng HTTP ra ngoài và đặt mặc định `COOKIE_SECURE=true`.

Các image công khai được lưu trữ trên GHCR: `ghcr.io/dandacompany/deskrpg`. Bản mặc định của Compose là `latest`; để cố định phiên bản, đặt `DESKRPG_IMAGE=ghcr.io/dandacompany/deskrpg:<release tag>` trong `.env.docker`.

### Lựa chọn 5: Docker với SQLite

Khuyến nghị nếu bạn muốn thiết lập một máy đơn giản và nhanh gọn nhất.

```bash
git clone https://github.com/dandacompany/deskrpg.git
cd deskrpg
printf 'JWT_SECRET=%s\n' "$(openssl rand -hex 32)" > .env.lite
docker compose --env-file .env.lite -f docker/docker-compose.lite.yml up -d
```

DeskRPG sẽ mở tại `http://localhost:3102`.

Dùng SQLite nếu bạn muốn trải nghiệm nhanh. Dùng PostgreSQL nếu bạn muốn vận hành lâu dài và ổn định.

### Lựa chọn 6: Docker cùng với Hermes trên máy tính cá nhân

Chạy cả văn phòng ảo và gateway Hermes cùng nhau trên một máy tính cá nhân — không cần VPS, không cần chứng chỉ HTTPS. Các cổng chỉ gắn vào `127.0.0.1`.

```bash
git clone https://github.com/dandacompany/deskrpg.git
cd deskrpg
printf 'HERMES_API_KEY=%s\n' "$(openssl rand -hex 32)" > .env.hermes
echo 'OPENROUTER_API_KEY=<khoá của bạn>' >> .env.hermes   # hoặc OPENAI_API_KEY / ANTHROPIC_API_KEY
docker compose --env-file .env.hermes -f docker/docker-compose.hermes.yml up -d
```

Mở `http://localhost:3102`, sau đó thêm gateway với URL `http://hermes:8642` và token là giá trị của `HERMES_API_KEY`. Plugin DeskRPG sẽ được tự động cài đặt và kích hoạt sẵn. Cần cung cấp API key của mô hình để gateway có thể khởi động. Đặt `HERMES_DASHBOARD_PASSWORD` nếu bạn muốn mở thêm bảng điều khiển Hermes tại `http://localhost:9119`.

Để cập nhật plugin sau này, hãy tạo lại dịch vụ Hermes:

```bash
docker compose --env-file .env.hermes -f docker/docker-compose.hermes.yml up -d --force-recreate hermes
```

### Biến môi trường

Các biến môi trường quan trọng:

- `JWT_SECRET`
- `POSTGRES_PASSWORD` (khi dùng Docker với PostgreSQL)
- `DESKRPG_LOCAL_DISCOVERY_ENABLED` (tùy chọn; cho phép gateway loopback đọc `~/.hermes/profiles` trên máy chủ — mặc định tắt)
- `DESKRPG_HOST_SETUP_ENABLED` (tùy chọn; trình hướng dẫn thiết lập gateway nội bộ/SSH mở cho `system_admin` theo mặc định — đặt `0` để tắt)
- `DESKRPG_FEEDBACK_URL` (tùy chọn; nơi gửi khảo sát và báo cáo lỗi riêng tư — đặt chuỗi rỗng để tắt cả hai)

Với môi trường production, hãy luôn thiết lập một `JWT_SECRET` ngẫu nhiên và bảo mật.

URL và token của gateway không cấu hình qua biến môi trường. Chúng được đăng ký trực tiếp trong ứng dụng tại trang `Gateway của tôi`, sau đó gán vào kênh tại `Cài đặt -> Cài đặt kênh -> Kết nối AI`.

## Cập Nhật DeskRPG

Thực hiện cập nhật trên máy tính hoặc máy chủ đang chạy DeskRPG. Hãy sao lưu cơ sở dữ liệu, các tệp tải lên và tệp cấu hình trước khi cập nhật.

### Hostinger Docker Manager

1. Mở **hPanel → VPS → Docker Manager**.
2. Tại dự án DeskRPG của bạn, chọn **⋮ → Update**.
3. Chờ quá trình triển khai hoàn tất, sau đó tải lại tab DeskRPG trên trình duyệt.

### npm / npx

Với cài đặt npm toàn cục:

```bash
deskrpg stop
deskrpg update
deskrpg start
```

Nếu dùng `npx`, hãy dừng máy chủ hiện tại trước (`npx deskrpg stop` hoặc Ctrl+C), sau đó chạy:

```bash
npx deskrpg@latest start
```

### Docker Compose

Tại thư mục cài đặt, tải image mới và tạo lại các dịch vụ:

```bash
docker compose pull
docker compose up -d
```

Nếu dùng thiết lập cục bộ Docker + Hermes, hãy tạo lại service hermes để cập nhật plugin:

```bash
docker compose --env-file .env.hermes -f docker/docker-compose.hermes.yml up -d --force-recreate hermes
```

### Kiểm tra sau khi cập nhật

Tải lại trang trình duyệt và mở **Gateway của tôi → Kiểm tra kết nối**. Nếu bạn chạy Hermes độc lập, hãy cập nhật plugin theo hướng dẫn bên dưới và khởi động lại gateway. Tính năng đính kèm tệp gốc trong phiên bản này yêu cầu plugin **0.32.0**.

## Kết Nối Hermes

Tất cả AI NPC, tự động hóa tác vụ và cuộc họp AI đều hoạt động qua gateway Hermes.

DeskRPG không đóng gói sẵn runtime của agent. Hãy tự vận hành máy chủ API [Hermes Agent](https://github.com/NousResearch/hermes-agent) — trên cùng một máy hoặc trên máy chủ từ xa — và ghi nhận 2 thông số sau:

- URL cơ sở mà nó lắng nghe (ví dụ: `http://127.0.0.1:8642`)
- **Khóa của chủ sở hữu bộ lắng nghe (listener owner key)** — chính là `API_SERVER_KEY` của hồ sơ sở hữu bộ lắng nghe.

Cấu hình Hermes có phạm vi toàn máy nhưng xác thực theo từng hồ sơ (profile). Hãy cung cấp cho DeskRPG khóa của chủ sở hữu, không phải khóa của hồ sơ phụ: bảng kanban, cron và luồng sự kiện nằm trên các route không có tiền tố và Hermes chỉ xác thực bằng khóa của chủ sở hữu.

**1. Đăng ký gateway**

Mở `Gateway của tôi` từ menu góc trên bên phải và chọn `Gateway mới`:

- `Tên hiển thị` — tên bất kỳ để bạn dễ nhận biết
- `URL Gateway Hermes` — ví dụ `http://127.0.0.1:8642`
- `Mã xác thực (Token)` — khóa chủ sở hữu (`API_SERVER_KEY`) của gateway đó

Lưu lại, sau đó chạy kiểm tra kết nối.

**2. Thêm các hồ sơ Hermes**

Một gateway có thể phục vụ nhiều hồ sơ agent, và mỗi hồ sơ có khóa riêng. Hãy thêm chúng trên cùng trang này — đây là các hồ sơ thực tế mà NPC sẽ liên kết.

**3. Gán gateway vào kênh**

Vào một kênh bất kỳ, mở `Cài đặt -> Cài đặt kênh -> Kết nối AI`, chọn gateway đã lưu, kiểm tra và nhấn lưu. Biểu tượng trên thanh tiêu đề sẽ đổi thành `AI Đã kết nối`.

**4. Cài đặt plugin cho kanban và cron**

Trò chuyện thông thường hoạt động không cần plugin. Tuy nhiên, bảng kanban, luồng sự kiện và cron yêu cầu [`deskrpg-hermes-plugin`](https://github.com/dandacompany/deskrpg-hermes-plugin) trên máy chủ gateway:

```bash
hermes plugins install https://github.com/dandacompany/deskrpg-hermes-plugin --ref 45caa875f2059152188eca515778e8af2a9c08ae
hermes plugins enable deskrpg
# khởi động lại gateway — các route mới chỉ được gắn khi gateway khởi động
```

Lệnh `enable` là bắt buộc: nếu không kích hoạt, mọi route plugin sẽ trả về mã lỗi 404 dù việc cài đặt thành công.

### Nâng cấp plugin đã cài đặt

Chạy lại lệnh `install` trên plugin đã có sẽ báo lỗi "already exists" và bản cũ vẫn tiếp tục chạy. Hãy thay thế theo đúng thứ tự sau:

```bash
hermes plugins disable deskrpg
hermes plugins install https://github.com/dandacompany/deskrpg-hermes-plugin --ref 45caa875f2059152188eca515778e8af2a9c08ae --force
hermes plugins enable deskrpg
hermes gateway restart
```

Kiểm tra kết quả với `hermes plugins list`: `deskrpg` cần ở trạng thái `enabled` với phiên bản 0.32.0.

Giờ đây bạn đã có thể tuyển dụng các NPC. Mỗi NPC liên kết với một hồ sơ Hermes tại thời điểm tuyển và bạn có thể liên kết lại sau đó mà không cần sa thải nhân vật.

## Cách DeskRPG Vận Hành

### 1. Nhân Vật

- Mọi người dùng tham gia dưới dạng một nhân vật 3D.
- Lựa chọn từ 50 ngoại hình nhân vật hoàn chỉnh định dạng GLB, đồng bộ trên toàn bộ bản đồ, danh sách thành viên và phòng họp.
- Tạo nhân vật là bước bắt buộc trước khi vào kênh.

### 2. Kênh Làm Việc (Channels)

- Kênh là không gian văn phòng chung.
- Các kênh có thể ở chế độ công khai hoặc giới hạn tùy thuộc vào quyền truy cập và nhóm.
- Bản đồ kênh được tạo từ các mẫu bản đồ có sẵn.

### 3. AI NPC

- NPC sinh sống và làm việc bên trong các kênh.
- Mỗi NPC liên kết với một hồ sơ Hermes và có thể liên kết lại bất cứ lúc nào.
- Các cuộc trò chuyện 1-1 được lưu trữ theo từng nhân vật, tồn tại qua các lần khởi động lại máy chủ.
- NPC có thể được gọi lại gần, điều về vị trí ban đầu, chỉnh sửa, đặt lại hoặc sa thải từ menu trong ứng dụng.

### 4. Kanban và Báo Cáo

- Giao các thẻ kanban cho các hồ sơ Hermes trong kênh; Hermes sở hữu các thẻ và trực tiếp thực thi.
- Theo dõi các thẻ qua từng giai đoạn: lập kế hoạch, đang thực hiện, bị tắc nghẽn, kiểm tra và hoàn thành.
- Các thẻ cấp cao hoàn thành hoặc bị tắc nghẽn sẽ gửi thông báo có cấu trúc vào kênh chat văn phòng kèm liên kết mở thẻ.
- Gọi NPC lại gần thông qua menu để thảo luận về công việc ngay cạnh nhân vật của bạn.

### 5. Cuộc Họp

- Mọi bản đồ văn phòng đều có khu vực họp. Chế độ họp sẽ phóng to và cố định góc nhìn vào khu vực đó trên bản đồ thực tế.
- Các bức tường chắn giữa camera và người tham gia sẽ tự động mờ đi, camera tự động hướng theo người đang phát biểu.
- Các cuộc họp AI nằm trong phạm vi kênh và được điều phối qua gateway Hermes của kênh.
- Biên bản cuộc họp được lưu trữ và có thể xem trực tiếp từ thanh tiêu đề.

### 6. Lịch Trình (Cron)

- Tạo và quản lý các tác vụ cron Hermes cho từng NPC.
- Tạm dừng, tiếp tục hoặc chạy ngay lập tức, xem lịch sử chạy và tạo lịch trình thường gặp từ các bản thiết kế mẫu.
- Kết quả chạy hoàn thành sẽ gửi thông báo có cấu trúc vào phòng văn phòng bắt nguồn lịch trình.

## Dữ Liệu DeskRPG Gửi Đi

DeskRPG không gửi bất kỳ thông tin nào về văn phòng, nhân sự hay các cuộc trò chuyện của bạn. Chỉ có hai thông tin tùy chọn có thể rời khỏi trình duyệt của bạn:

- **Khảo sát sử dụng.** Sau khoảng 30 phút trên bản đồ, một khảo sát ngắn sẽ xuất hiện (tối đa một lần mỗi 30 ngày). Không có dữ liệu nào được gửi đi cho đến khi bạn nhấn **Gửi**; chọn **Không hỏi lại** sẽ tắt hoàn toàn khảo sát trên trình duyệt đó. Khảo sát chỉ chứa câu trả lời của bạn, phiên bản ứng dụng, ngôn ngữ giao diện và một mã ID cài đặt ngẫu nhiên để lọc trùng.
- **Báo cáo lỗi riêng tư.** Từ **Menu → Báo cáo lỗi**, bạn có thể chọn mở issue công khai trên GitHub hoặc gửi báo cáo riêng tư. Báo cáo riêng tư gửi nội dung bạn nhập, thông tin liên hệ tùy chọn, cùng phiên bản, trình duyệt, độ phân giải màn hình và các dòng lỗi gần nhất — tất cả đều được hiển thị trước khi gửi và bạn có thể bỏ chọn từng mục.

Cả hai dữ liệu này được gửi tới `https://feedback.deskrpg.com`, do nhà duy trì DeskRPG vận hành. Máy chủ chỉ lưu trữ bản băm ngẫu nhiên có muối (salted hash) của địa chỉ IP để giới hạn tần suất, tuyệt đối không lưu địa chỉ IP thực. Đặt `DESKRPG_FEEDBACK_URL=` (chuỗi rỗng) trên máy chủ để tắt hoàn toàn tính năng này.

Bản đồ cũng truy vấn GitHub API để lấy số lượt đánh giá sao (star count) và bản phát hành mới nhất qua máy chủ DeskRPG của bạn để hiển thị chấm thông báo phiên bản mới. Không có mã định danh nào được gửi đi.

## Giấy Phép và Ghi Nhận

- Giấy phép dự án: [LICENSE.md](LICENSE.md) — các nhà cung cấp dịch vụ lưu trữ có thể cung cấp trình cài đặt 1-click lên máy chủ do khách hàng quản lý theo điều khoản "Infrastructure Provider Permission"; việc tự vận hành DeskRPG như một dịch vụ quản lý (managed service) cho người khác không được phép.
- Giấy phép của bên thứ ba: [public/third-party-licenses.html](public/third-party-licenses.html)

## Hỗ Trợ

- YouTube: [@dante-labs](https://youtube.com/@dante-labs)
- Email: `dante@dante-labs.com`
- Buy Me a Coffee: `https://buymeacoffee.com/dante.labs`

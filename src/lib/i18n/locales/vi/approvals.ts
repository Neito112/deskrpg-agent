const approvals: Record<string, string> = {
  "approvalPolicy.title": "{name} · Chính sách chạy tự động",
  "approvalPolicy.open": "Chính sách chạy",
  "approvalPolicy.intro":
    "Các tác vụ cron và thẻ kanban chạy mà không có người theo dõi trực tiếp. Quyết định tại đây việc chặn hay cho phép khi gặp lệnh nguy hiểm.",
  "approvalPolicy.readOnly": "Chỉ chủ sở hữu gateway mới có thể thay đổi",
  "approvalPolicy.sharedWarning":
    "Cũng áp dụng cho {n} kênh khác đã tuyển dụng nhân viên này",
  "approvalPolicy.workerPropagationOff":
    "Hiện tại bạn sẽ không nhận được thông báo khi một lệnh bị chặn. Nhấn [Bật] trên màn hình kết nối để khắc phục.",
  "approvalPolicy.cron.title": "Lệnh nguy hiểm trong tác vụ cron",
  "approvalPolicy.cron.hint": "Khi một tác vụ lên lịch cố gắng chạy một lệnh nguy hiểm",
  "approvalPolicy.single.title": "Lệnh nguy hiểm trong kanban và chạy một lần",
  "approvalPolicy.single.hint":
    "Khi thẻ kanban hoặc tác vụ chạy một lần cố gắng chạy một lệnh nguy hiểm",
  "approvalPolicy.mode.deny": "Chặn",
  "approvalPolicy.mode.approve": "Cho phép",
  "approvalPolicy.approveConfirm":
    "Tất cả các lệnh nguy hiểm sẽ chạy mà không cần phê duyệt. Chỉ mở những lệnh cần thiết qua danh sách cho phép (allowlist) sẽ an toàn hơn.",
  "approvalPolicy.approveConfirmSubmit": "Chuyển sang cho phép",
  "approvalPolicy.cancel": "Hủy",
  "approvalPolicy.allowlist.title": "Danh sách cho phép (Allowlist)",
  "approvalPolicy.allowlist.hint":
    "Các quy tắc hoặc mẫu lệnh được liệt kê ở đây sẽ chạy ngay cả khi đang bật chế độ chặn",
  "approvalPolicy.allowlist.empty": "Danh sách cho phép đang trống",
  "approvalPolicy.allowlist.placeholder": "Tên quy tắc hoặc mẫu lệnh",
  "approvalPolicy.allowlist.add": "Thêm",
  "approvalPolicy.allowlist.remove": "Xóa khỏi danh sách cho phép",
  "approvalPolicy.appliesNext":
    "Tác vụ cron và thẻ kanban sẽ áp dụng từ lần chạy tiếp theo; cuộc trò chuyện chỉ áp dụng sau khi khởi động lại gateway. Phê duyệt trực tiếp trong trò chuyện sẽ chờ {seconds} giây.",
  "approvalPolicy.loading": "Đang tải…",
  "approvalPolicy.upgradeRequired": "Chính sách chạy yêu cầu plugin phiên bản {version} trở lên",
  "approvalPolicy.gatewayDisconnected": "Gateway đã mất kết nối. Hãy kết nối lại và mở lại trang này",
  "approvalPolicy.error.load": "Không thể tải chính sách chạy",
  "approvalPolicy.error.action": "Không thể áp dụng thay đổi. Vui lòng thử lại sau giây lát",
  "approvalPolicy.error.forbidden": "Chỉ chủ sở hữu gateway mới có thể thay đổi",
  "approvalPolicy.error.invalidEntry": "Phải là một dòng đơn từ 1–200 ký tự",

  "approvals.card.title": "{npc} muốn chạy lệnh này",
  "approvals.kind.command": "Thực thi lệnh",
  "approvals.kind.mcp": "Gọi công cụ MCP",
  "approvals.card.remaining": "Còn lại {time}",
  "approvals.choice.once": "Cho phép một lần",
  "approvals.choice.session": "Cho phép trong lượt phản hồi này",
  "approvals.choice.deny": "Từ chối",
  "approvals.deciding": "Đang gửi…",
  "approvals.summary.pending": "Đang tóm tắt…",
  "approvals.original.show": "Xem nguyên văn Hermes",
  "approvals.repeat": "Yêu cầu thứ {count} trong cuộc trò chuyện này",
  "approvals.repeat.last": "Lần trước: {status}",
  "approvals.status.pending": "Đang chờ quyết định",
  "approvals.status.approved_once": "Đã cho phép một lần",
  "approvals.status.approved_session": "Đã cho phép trong lượt phản hồi này",
  "approvals.status.denied": "Đã từ chối",
  "approvals.status.expired": "Đã hết thời gian — Hermes đã từ chối yêu cầu",
  "approvals.status.failed": "Không thể chuyển giao quyết định",
  "approvals.pending": "{npc} đang chờ phê duyệt từ {approver}",
  "approvals.roomBadge": "{n} đang chờ phê duyệt",
};

export default approvals;

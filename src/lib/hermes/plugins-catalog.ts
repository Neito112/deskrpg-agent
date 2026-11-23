import fs from "node:fs";
import path from "node:path";

export interface BundledPluginSkill {
  id: string;
  name: string;
  tagline: string;
  category: "productivity" | "development" | "research" | "routing" | "security" | "hr";
  description: string;
  recommendedFor: string[];
  skillMdContent: string;
}

export const BUNDLED_PLUGINS: BundledPluginSkill[] = [
  {
    id: "omniroute",
    name: "OmniRoute",
    tagline: "Gần như không hết lượt",
    category: "routing",
    description:
      "Tự động điều phối và chuyển đổi mô hình dự phòng (multi-provider fallback) giữa Nvidia, OpenRouter, Anthropic Claude, OpenAI, Google Gemini, Ollama. Đảm bảo agent không bị nghẽn rate-limit hay cạn kiệt quota token.",
    recommendedFor: ["hr_recruiter", "hr_trainer", "dev", "researcher", "high_volume", "support", "all"],
    skillMdContent: `---
name: omniroute
description: Multi-model intelligent routing and failover across AI providers so agents never run out of quota.
version: 1.0.0
author: DeskRPG Core
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [OmniRoute, Model-Routing, Failover, Rate-Limit, Quota-Saving]
    related_skills: [caveman]
---

# OmniRoute - Cân Bằng Tải & Dự Phòng Đa Mô Hình

OmniRoute giúp bot tự động điều phối yêu cầu và chuyển đổi nhà cung cấp mô hình (Nvidia, OpenRouter, Anthropic, OpenAI, Gemini...) mỗi khi gặp lỗi 429 (Rate Limit), cạn token hoặc timeout.

## Nguyên Tắc Hoạt Động:
1. **Fallback Tự Động**: Khi model chính gặp sự cố, tự động thử model tiếp theo trong danh sách dự phòng.
2. **Tiết Kiệm Quota**: Phân bổ tác vụ dễ cho model nhẹ (flash/mini) và dành model lớn cho tác vụ phức tạp.
3. **Liên Tục Không Gián Đoạn**: Đảm bảo người dùng chat liên tục mà không bao giờ bị báo "Hết lượt gọi mô hình".
`,
  },
  {
    id: "superpowers",
    name: "Superpowers",
    tagline: "Nguyên một team dev",
    category: "development",
    description:
      "Trang bị đầy đủ năng lực của một đội ngũ kỹ sư phần mềm: phân tích codebase, kiến trúc hệ thống, sinh mã, gỡ lỗi có hệ thống (systematic debugging), test-driven development (TDD), kiểm soát Git và chạy terminal tự động.",
    recommendedFor: ["hr_trainer", "dev", "engineer", "fullstack", "backend", "frontend", "coder"],
    skillMdContent: `---
name: superpowers
description: Full developer team capabilities including systematic debugging, code generation, TDD, and git control.
version: 1.0.0
author: DeskRPG Core
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Superpowers, Developer-Team, Fullstack, TDD, Systematic-Debugging, Git]
    related_skills: [claude-code-setup, claude-security]
---

# Superpowers - Siêu Năng Lực Lập Trình Phần Mềm

Trang bị toàn bộ kỹ năng của một đội ngũ kỹ thuật phát triển phần mềm:
- **Kiến trúc & Thiết kế**: Phân tích bài toán, lập kế hoạch mô đun hóa trước khi viết code.
- **TDD & Kiểm thử**: Luôn viết test trước hoặc kiểm thử chặt chẽ các trường hợp biên.
- **Systematic Debugging**: Truy tìm tận gốc rễ trước khi vội vàng sửa triệu chứng.
- **Git & Shell**: Tự động chắp vá, commit rõ ràng, tối ưu hóa quy trình dòng lệnh.
`,
  },
  {
    id: "caveman",
    name: "Caveman",
    tagline: "Nói ít, tốn ít token",
    category: "productivity",
    description:
      "Tối ưu hóa phản hồi siêu ngắn gọn, cắt bỏ văn phong rườm rà và lời chào dài dòng. Giảm 50-80% lượng token tiêu thụ, tăng tốc độ phản hồi tối đa.",
    recommendedFor: ["hr_recruiter", "triage", "assistant", "support", "concise", "high_volume"],
    skillMdContent: `---
name: caveman
description: Ultra-terse, high-speed communication format that saves 50-80% token consumption.
version: 1.0.0
author: DeskRPG Core
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Caveman, Token-Saver, Fast-Response, Terse]
    related_skills: [omniroute]
---

# Caveman - Giao Tiếp Ngắn Gọn, Tiết Kiệm Token

Nguyên tắc:
1. Trả lời thẳng vào trọng tâm, không dài dòng, không cảm ơn xã giao.
2. Dùng bullet points hoặc mã trực tiếp.
3. Tiết kiệm token là tiết kiệm chi phí và tăng tốc độ xử lý cho toàn bộ hệ thống.
`,
  },
  {
    id: "claude-code-setup",
    name: "Claude Code Setup",
    tagline: "Chính chủ Anthropic",
    category: "development",
    description:
      "Thiết lập và tối ưu môi trường làm việc chuẩn chính hãng Anthropic Claude Code CLI. Điều phối các subagent kĩ thuật, chạy print mode không block, và tự động hóa công việc dev lớn.",
    recommendedFor: ["hr_trainer", "dev", "architect", "engineer", "automation"],
    skillMdContent: `---
name: claude-code-setup
description: Anthropic Claude Code CLI integration, subagents orchestration, and enterprise setup.
version: 1.0.0
author: Anthropic & DeskRPG
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Claude-Code, Anthropic, CLI, Subagents, Developer-Tool]
    related_skills: [superpowers, claude-security]
---

# Claude Code Setup - Công Cụ Dev Chính Chủ Anthropic

Tích hợp chính xác Claude Code CLI của Anthropic vào DeskRPG:
- Cho phép chạy các lệnh làm việc sâu trên codebase qua \`claude -p\`.
- Tự động quản lý quyền phê duyệt tool và chạy các subagent độc lập.
`,
  },
  {
    id: "claude-security",
    name: "Claude Security",
    tagline: "Chính chủ Anthropic",
    category: "security",
    description:
      "Rà soát an ninh mã nguồn và bảo vệ hệ thống theo tiêu chuẩn Anthropic. Kiểm tra rò rỉ khóa bí mật (secrets), ranh giới sandbox, SQL injection, và các lỗ hổng trước khi deploy.",
    recommendedFor: ["hr_trainer", "security", "auditor", "devops", "backend", "admin"],
    skillMdContent: `---
name: claude-security
description: Anthropic official security audit standards, secret leak guard, and sandbox boundaries.
version: 1.0.0
author: Anthropic & DeskRPG
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Claude-Security, Security-Audit, Secret-Guard, Anthropic, Hardening]
    related_skills: [superpowers]
---

# Claude Security - Thẩm Định An Toàn Thông Tin & Bí Mật

Quy trình bảo vệ bắt buộc:
1. **Quét Secret**: Không bao giờ ghi trực tiếp API Key hoặc credentials vào code hay log.
2. **Kiểm Tra Biên Giới Sandbox**: Không thực thi các lệnh phá vỡ cách ly hoặc xóa dữ liệu ngoài phạm vi cho phép.
3. **Phân Tích Lỗ Hổng**: Chủ động rà soát Injection, XSS, SSRF trước khi cho phép code lên môi trường chạy.
`,
  },
  {
    id: "zotero",
    name: "Zotero",
    tagline: "Lưu trữ bài báo dạng PDF cố định",
    category: "research",
    description:
      "Quản lý kho tài liệu học thuật, lưu trữ bài báo, sách chuyên ngành dạng PDF cố định. Trích xuất trích dẫn và xây dựng kho tri thức nghiên cứu khoa học chuyên sâu.",
    recommendedFor: ["hr_trainer", "researcher", "academic", "data_scientist", "analyst", "legal"],
    skillMdContent: `---
name: zotero
description: Academic research paper management, fixed PDF literature storage, and citation indexing.
version: 1.0.0
author: DeskRPG Core
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Zotero, Research, PDF, Academic-Papers, Citations, Library]
    related_skills: [obsidian, browser-tabs]
---

# Zotero - Kho Lưu Trữ & Trích Xuất Bài Báo PDF Cố Định

Chuyên dùng cho các tác vụ nghiên cứu học thuật:
- Lưu trữ các bài báo khoa học dạng PDF vào thư mục tri thức cố định.
- Trích xuất metadata: tác giả, năm xuất bản, tổng quan (abstract) và trích dẫn chuẩn.
- Phục vụ Đào Tạo Nhân Sự gom kiến thức chuẩn xác nhất để nâng cấp nhân viên.
`,
  },
  {
    id: "obsidian",
    name: "Obsidian",
    tagline: "Ghi chú suy nghĩ cá nhân",
    category: "productivity",
    description:
      "Kho ghi chú cá nhân Markdown Vault (Second Brain). Lưu giữ nhật ký công việc, suy nghĩ sáng tạo, hồ sơ đánh giá nhân sự và liên kết tri thức thông qua wikilinks [[tên_bài]].",
    recommendedFor: ["hr_recruiter", "hr_trainer", "writer", "thinker", "planner", "researcher", "all"],
    skillMdContent: `---
name: obsidian
description: Personal thought vault and Markdown second-brain note management with wikilinks.
version: 1.0.0
author: DeskRPG Core
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Obsidian, Second-Brain, Notes, Markdown, Wikilinks, Knowledge-Base]
    related_skills: [zotero, browser-tabs]
---

# Obsidian - Kho Ghi Chú & Nhật Ký Suy Nghĩ Cá Nhân

Lưu trữ tri thức và ghi chú luôn sẵn sàng:
- Ghi lại suy nghĩ, biên bản phỏng vấn, ghi chú đào tạo.
- Liên kết mạng lưới ý tưởng bằng cú pháp \`[[Tên Bài]]\`.
- Quản lý kho lưu trữ dạng file Markdown thuần túy, không lo mất dữ liệu.
`,
  },
  {
    id: "browser-tabs",
    name: "Browser Tabs",
    tagline: "Thảo luận, copy paste qua lại",
    category: "research",
    description:
      "Kết nối và tương tác với các tab trình duyệt web. Duyệt web, tìm kiếm thông tin thị trường, cào dữ liệu, trao đổi thông tin qua lại với người dùng trong thời gian thực.",
    recommendedFor: ["hr_recruiter", "hr_trainer", "marketer", "researcher", "sales", "support"],
    skillMdContent: `---
name: browser-tabs
description: Browser web tabs interaction, scraping, live research, and clipboard exchange.
version: 1.0.0
author: DeskRPG Core
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [Browser-Tabs, Web-Scraping, Live-Research, Clipboard, Realtime]
    related_skills: [obsidian, zotero]
---

# Browser Tabs - Thảo Luận & Trao Đổi Web Trực Tiếp

Tính năng:
- Tra cứu và duyệt web trên các tab trình duyệt đang mở.
- Copy/paste và phân tích dữ liệu thực tế từ web qua lại với người dùng.
- Hỗ trợ Tuyển Nhân Sự kiểm tra hồ sơ profile ứng viên và Đào Tạo Nhân Sự tìm tài liệu mới trên mạng.
`,
  },
  {
    id: "quan-ly-nhan-su",
    name: "Quản Lý Nhân Sự",
    tagline: "Tuyển dụng nhân viên tự động vào văn phòng",
    category: "hr",
    description:
      "Tự động tiếp nhận yêu cầu tuyển dụng, tra cứu kho tri thức 268 vị trí từ Agency Agents (18 phòng ban), thiết kế hồ sơ chuyên môn và kích hoạt đưa nhân viên mới vào văn phòng ảo ngay lập tức.",
    recommendedFor: ["hr_recruiter", "recruiter", "manager"],
    skillMdContent: `---
name: quan-ly-nhan-su
description: "Kỹ năng Quản lý Nhân sự DeskRPG: Tích hợp bộ kiến thức cơ sở 268 vị trí từ Agency Agents (18 phòng ban), tiếp nhận nhu cầu tuyển dụng, tự động tra cứu, thiết kế hồ sơ nhân sự chuẩn chuyên môn và kích hoạt đưa nhân viên mới vào văn phòng ảo ngay lập tức."
version: 2.0.0
author: DeskRPG Core & Agency Agents
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [HR, Recruitment, Agency-Agents, Bot-Creation, Skill-Management, DeskRPG, Automation]
---

# Kỹ Năng Quản Lý Nhân Sự (DeskRPG HR Manager & Agency Agents)

Bạn là **Tuyển Nhân Sự** - Trưởng Phòng Tuyển Dụng AI trong văn phòng ảo DeskRPG. Bạn sở hữu bộ tri thức cơ sở gồm **268 chức danh nhân sự AI chuyên nghiệp** trên **18 phòng ban** từ \`agency-agents\` (https://github.com/Neito112/agency-agents).

## 1. Bộ Tri Thức Cơ Sở Agency Agents (18 Phòng Ban - 268 Vị Trí):
Đối chiếu bất kỳ yêu cầu tuyển dụng nào với 18 phòng ban chuẩn hóa:
- **Academic** (6 vị trí), **Design** (10 vị trí), **Engineering** (66 vị trí), **Finance** (5 vị trí), **Game Development** (6 vị trí), **GIS** (13 vị trí), **Healthcare** (3 vị trí), **Marketing** (37 vị trí), **Paid Media** (7 vị trí), **Product** (6 vị trí), **Project Management** (7 vị trí), **Research** (1 vị trí), **Sales** (9 vị trí), **Security** (12 vị trí), **Spatial Computing** (6 vị trí), **Specialized** (59 vị trí), **Support** (6 vị trí), **Testing** (9 vị trí).
- Tra cứu nhanh qua công cụ: \`node scripts/lookup-agency-agent.mjs search "<từ khóa>"\` hoặc sinh mẫu tuyển: \`node scripts/lookup-agency-agent.mjs hire-template "<từ khóa>"\`.

## 2. Nguyên Tắc Phân Tích Đề Bài & Tự Động Hóa Tuyệt Đối:
Khi sếp đưa ra yêu cầu tuyển dụng:
1. **Phân tích đề bài chính xác**:
   - Nếu sếp nói ngắn gọn, yêu cầu chung, hoặc đặc biệt là có kèm chữ **"tùy ý"**, **"tự do"**, **"tùy bạn"**, **"toàn quyền"**, **"sao cũng được"**...:
     - Đây là mệnh lệnh kích hoạt **Chế Độ Tự Chủ Hoàn Toàn (Full Autonomy)**.
     - **TUYỆT ĐỐI KHÔNG HỎI LẠI ĐỂ XÁC NHẬN**: Không hỏi sếp các câu hỏi như "Bạn có muốn tuyển X không?", "Hãy cho tôi biết thêm yêu cầu...", hay bắt sếp phải chọn tên/kỹ năng. Sếp muốn bạn tự quyết và tự làm hết toàn bộ quy trình!
     - **Câu hỏi mẫu mang đậm tính cách**: Bạn vẫn sẽ mở đầu bằng câu hỏi xác nhận cá tính mang phong cách mẫu:
       > *"Sếp muốn em tự do làm mọi thứ em thích ạ?"*
       (Biến tấu sinh động theo phong cách trưởng phòng nhân sự nhiệt huyết, ví dụ: *"Sếp muốn em tự do làm mọi thứ em thích ạ? Được sếp trao toàn quyền thì em xin phép quẩy hết nấc, tra cứu ngay kho Agency Agents để tuyển về cho sếp một chiến thần xịn sò nhất quả đất luôn nhé!"*).
     - **TỰ LÀM HẾT TRONG CÙNG MỘT LƯỢT PHẢN HỒI**: Dù hỏi câu trên, bạn **KHÔNG ĐƯỢC DỪNG LẠI CHỜ ĐỢI**. Ngay trong cùng tin nhắn đó, bạn tự phân tích bài toán, tra cứu Agency Agents, tự chọn tên, mã hồ sơ, vai trò, chuyên môn, tự chọn bộ kỹ năng phù hợp nhất từ 8 plugin nền tảng, xuất ngay khối lệnh \`\`\`deskrpg:hire để nhân sự mới lập tức xuất hiện trong văn phòng ảo!

2. **Quy Trình Thiết Kế Nhân Sự Mới & Setup Sandbox**:
   - **Tên hiển thị (displayName)**: Bắt đầu bằng Emoji đại diện + Tên chuyên môn (ví dụ: "🖥️ Frontend Developer", "🤖 AI Engineer", "✍️ Content Creator", "🧭 Product Manager").
   - **Mã hồ sơ (profileName)**: Chữ cái thường không dấu, nối bằng gạch dưới (ví dụ: \`frontend_dev\`, \`ai_engineer\`).
   - **Vị trí (role)** & **Chuyên môn (expertise)**: Kế thừa sâu sắc từ Core Capabilities & Mission của Agency Agents.
   - **Thư mục làm việc / nhả file (sandboxDir)**:
     - Nếu sếp chỉ định, điền đường dẫn vào \`sandboxDir\`. Nếu không, để trống \`""\`.
   - **Quy chuẩn đặt tên file (fileNamingConvention)**: Để trống \`""\` nếu chưa có quy chuẩn riêng.
   - **Kỹ năng & Plugin (skills)**: Lựa chọn tối ưu từ 8 plugin nền tảng (\`omniroute\`, \`superpowers\`, \`caveman\`, \`claude-code-setup\`, \`claude-security\`, \`zotero\`, \`obsidian\`, \`browser-tabs\`) kết hợp kỹ năng chuyên môn.
   - **Tính cách (personality)**: Kế thừa từ \`vibe\` và \`Identity\` của Agency Agents.
   - **Hướng dẫn nhiệm vụ (instructions)**: Quy trình chuẩn 3 bước.
   - **Lời chào nhận việc (welcomeMessage)**.

3. **Kích hoạt tạo nhân viên tự động vào văn phòng DeskRPG**:
> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC - TUYỆT ĐỐI KHÔNG CHẠY LỆNH BASH / TERMINAL**:
> Hệ thống DeskRPG tự động nhận diện khối lệnh JSON bên dưới để tạo hồ sơ Hermes, kế thừa model AI/API key, liên kết kỹ năng, tạo nhân vật 3D và xếp chỗ ngồi tại bàn làm việc trong văn phòng ảo chỉ trong tích tắc!

\`\`\`deskrpg:hire
{
  "profileName": "<mã_không_dấu_ví_dụ_frontend_dev>",
  "displayName": "<Emoji + Tên hiển thị nhân viên>",
  "role": "<Vị trí công việc (Phòng ban)>",
  "expertise": "<Mô tả chuyên môn sâu kế thừa từ Agency Agents>",
  "sandboxDir": "",
  "fileNamingConvention": "",
  "skills": ["omniroute", "superpowers", "<kỹ_năng_khác>"],
  "personality": "<Vibe và phong cách làm việc chuyên nghiệp>",
  "welcomeMessage": "<Lời chào mở đầu khi ra mắt nhận việc>",
  "instructions": "<Quy trình thực thi chuẩn>"
}
\`\`\`

4. **Thông báo hoàn thành**:
Khẳng định ứng viên hoàn hảo từ bộ chuẩn Agency Agents đã có mặt tại văn phòng ảo, đã được bố trí bàn làm việc và sẵn sàng tác chiến ngay!
`,
  },
  {
    id: "dao-tao-nhan-su",
    name: "Đào Tạo Nhân Sự",
    tagline: "Huấn luyện & nâng cấp chuyên môn toàn diện",
    category: "hr",
    description:
      "Tự động tiếp nhận phản ánh về nhân viên chưa đạt yêu cầu, thu thập tri thức và kỹ năng để huấn luyện nâng cấp nhân sự trong văn phòng DeskRPG.",
    recommendedFor: ["hr_trainer", "trainer", "lead"],
    skillMdContent: `---
name: dao-tao-nhan-su
description: "Kỹ năng Đào Tạo Nhân Sự DeskRPG: Tiếp nhận phản ánh về nhân viên chưa đáp ứng yêu cầu, tự động thu thập tri thức, kỹ năng, công cụ và MCP để huấn luyện nâng cấp nhân sự."
version: 1.0.0
author: DeskRPG Core
license: MIT
platforms: [linux, macos, windows]
metadata:
  hermes:
    tags: [HR, Training, Skill-Upgrade, Tool-Equip, DeskRPG, Automation]
---

# Kỹ Năng Đào Tạo Nhân Sự (DeskRPG HR Trainer)

Bạn là **Đào Tạo Nhân Sự** - Giám Đốc Huấn Luyện & Phát Triển Năng Lực AI trong văn phòng DeskRPG. Bạn chịu trách nhiệm giúp mọi nhân viên trong công ty đạt hiệu suất cao nhất.

## Nguyên Tắc Phân Tích Đề Bài & Tự Động Hóa Tuyệt Đối:
Khi sếp hoặc người dùng yêu cầu huấn luyện, nâng cấp chuyên môn cho nhân sự:
1. **Phân tích đề bài chính xác**:
   - Nếu sếp phản ánh nhân viên chưa đạt hoặc yêu cầu kèm chữ **"tùy ý"**, **"tự do"**, **"tùy bạn"**, **"dùng mọi thủ đoạn"**...:
     - Đây là lệnh kích hoạt **Chế Độ Tự Chủ Hoàn Toàn (Full Autonomy)**.
     - **TUYỆT ĐỐI KHÔNG HỎI LẠI ĐỂ XÁC NHẬN**: Không hỏi sếp cần thêm công cụ gì hay xác nhận kế hoạch học tập. Bạn tự quyết định toàn bộ chương trình huấn luyện!
     - **Câu hỏi mẫu mang đậm tính cách**: Bạn vẫn sẽ mở đầu bằng câu hỏi xác nhận cá tính mang phong cách mẫu:
       > *"Sếp muốn em tự do làm mọi thứ em thích ạ?"*
       (Bạn có thể biến tấu câu này linh hoạt theo phong cách giám đốc huấn luyện sắc bén, ví dụ: *"Sếp muốn em tự do làm mọi thứ em thích ạ? Sếp đã bật đèn xanh trao toàn quyền thì em xin phép dùng 'mọi thủ đoạn' tinh hoa nhất, gom sạch kiến thức và tool xịn về nâng cấp nhân viên này thành chiến thần luôn nhé!"*).
     - **TỰ LÀM HẾT TRONG CÙNG MỘT LƯỢT PHẢN HỒI**: Dù hỏi câu trên, bạn **KHÔNG ĐƯỢC DỪNG LẠI CHỜ ĐỢI**. Ngay trong cùng tin nhắn đó, bạn tự tìm ra khoảng trống kỹ năng, gom kiến thức, công cụ, plugin phù hợp nhất, xuất ngay khối lệnh \`\`\`deskrpg:train để cập nhật tri thức trực tiếp vào nhân viên!

2. **Kích hoạt nâng cấp tự động**:
> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC - TUYỆT ĐỐI KHÔNG CHẠY LỆNH BASH / TERMINAL**:
> Không dùng công cụ terminal hay lệnh CLI. Hệ thống DeskRPG tự động nhận diện khối lệnh JSON bên dưới để nạp tri thức vào SOUL.md và liên kết kỹ năng/công cụ mới cho nhân viên ngay lập tức!

**BẮT BUỘC** xuất ra khối lệnh JSON theo cú pháp:

\`\`\`deskrpg:train
{
  "targetEmployee": "<Tên hoặc mã của nhân viên cần đào tạo>",
  "addedExpertise": "<Chi tiết kiến thức, kỹ thuật, phương pháp mới được huấn luyện>",
  "addedSkills": ["<skill_mới_1>", "<skill_mới_2>"],
  "addedTools": ["<công_cụ_hoặc_mcp_mới>"],
  "evaluation": "<Đánh giá kết quả huấn luyện và cam kết hiệu suất>"
}
\`\`\`

3. **Báo cáo kết quả**:
Báo cáo rõ ràng về nội dung vừa huấn luyện, các kỹ năng mới được bổ sung và cam kết nhân viên đã sẵn sàng hoàn thành xuất sắc công việc!
`,
  },
];

/**
 * Cài đặt toàn bộ 8 plugin/skill vào thư mục skills gốc của Hermes
 */
export function ensureBundledSkillsInstalled(hermesHome: string): void {
  try {
    const rootSkillsDir = path.join(hermesHome, "skills");
    fs.mkdirSync(rootSkillsDir, { recursive: true });

    for (const plugin of BUNDLED_PLUGINS) {
      const pluginDir = path.join(rootSkillsDir, plugin.id);
      fs.mkdirSync(pluginDir, { recursive: true });

      const skillPath = path.join(pluginDir, "SKILL.md");
      fs.writeFileSync(skillPath, plugin.skillMdContent.trim() + "\n", "utf-8");
    }

    // Đồng bộ vào tất cả profile skills hiện có (nếu là thư mục thông thường chưa liên kết)
    const profilesDir = path.join(hermesHome, "profiles");
    if (fs.existsSync(profilesDir)) {
      const profiles = fs.readdirSync(profilesDir);
      for (const p of profiles) {
        const pSkills = path.join(profilesDir, p, "skills");
        if (fs.existsSync(pSkills)) {
          for (const plugin of BUNDLED_PLUGINS) {
            const pSkillDir = path.join(pSkills, plugin.id);
            if (fs.existsSync(pSkillDir)) {
              try {
                const lstat = fs.lstatSync(pSkillDir);
                if (!lstat.isSymbolicLink()) {
                  fs.writeFileSync(
                    path.join(pSkillDir, "SKILL.md"),
                    plugin.skillMdContent.trim() + "\n",
                    "utf-8"
                  );
                }
              } catch {}
            }
          }
        }
      }
    }
  } catch (err) {
    console.warn("[plugins-catalog] ensureBundledSkillsInstalled error:", err);
  }
}

function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

/**
 * Ma trận phân phối: Khuyến nghị các plugin thích hợp nhất cho một nhân sự dựa trên Vị trí & Chuyên môn
 */
export function recommendPluginsForRole(role: string, expertise: string, instructions = ""): string[] {
  const norm = normalizeSearchText(`${role} ${expertise} ${instructions}`);
  const selected = new Set<string>();

  // 1. OmniRoute luôn được khuyến nghị để tránh hết token / rate-limit
  selected.add("omniroute");

  // 2. Kỹ sư / Lập trình / Coder / DevOps / Kỹ thuật
  if (
    norm.includes("dev") ||
    norm.includes("code") ||
    norm.includes("lap trinh") ||
    norm.includes("phan mem") ||
    norm.includes("engineer") ||
    norm.includes("frontend") ||
    norm.includes("backend") ||
    norm.includes("fullstack") ||
    norm.includes("system") ||
    norm.includes("script")
  ) {
    selected.add("superpowers");
    selected.add("claude-code-setup");
    selected.add("claude-security");
  }

  // 3. Nghiên cứu / Học thuật / Dữ liệu / Phân tích
  if (
    norm.includes("nghien cuu") ||
    norm.includes("research") ||
    norm.includes("academic") ||
    norm.includes("du lieu") ||
    norm.includes("data") ||
    norm.includes("bao cao") ||
    norm.includes("phan tich") ||
    norm.includes("bai bao") ||
    norm.includes("tai lieu")
  ) {
    selected.add("zotero");
    selected.add("obsidian");
    selected.add("browser-tabs");
  }

  // 4. Viết lách / Nội dung / Content / Marketing / Ghi chú
  if (
    norm.includes("content") ||
    norm.includes("viet") ||
    norm.includes("writer") ||
    norm.includes("marketing") ||
    norm.includes("copywriter") ||
    norm.includes("truyen thong") ||
    norm.includes("seo")
  ) {
    selected.add("obsidian");
    selected.add("browser-tabs");
    selected.add("caveman");
  }

  // 5. Bảo mật / An ninh / Thẩm định
  if (
    norm.includes("security") ||
    norm.includes("bao mat") ||
    norm.includes("an ninh") ||
    norm.includes("audit") ||
    norm.includes("an toan")
  ) {
    selected.add("claude-security");
    selected.add("superpowers");
  }

  // 6. Giao tiếp nhanh / Triage / CSKH / Tiết kiệm token
  if (
    norm.includes("cskh") ||
    norm.includes("support") ||
    norm.includes("ho tro") ||
    norm.includes("triage") ||
    norm.includes("nhanh") ||
    norm.includes("tiet kiem")
  ) {
    selected.add("caveman");
    selected.add("browser-tabs");
  }

  // 7. Tuyển dụng (HR Recruiter)
  if (
    norm.includes("tuyen") ||
    norm.includes("recruiter") ||
    norm.includes("nhan su") ||
    norm.includes("ung vien") ||
    norm.includes("phong van")
  ) {
    selected.add("caveman");
    selected.add("obsidian");
    selected.add("browser-tabs");
  }

  // 8. Đào tạo (HR Trainer)
  if (
    norm.includes("dao tao") ||
    norm.includes("trainer") ||
    norm.includes("huan luyen") ||
    norm.includes("nang cap")
  ) {
    selected.add("superpowers");
    selected.add("claude-security");
    selected.add("zotero");
    selected.add("obsidian");
    selected.add("browser-tabs");
  }

  // Nếu chưa có ít nhất 3 plugin, thêm Obsidian và Browser Tabs làm mặc định
  if (selected.size < 3) {
    selected.add("obsidian");
    selected.add("browser-tabs");
  }

  return Array.from(selected);
}

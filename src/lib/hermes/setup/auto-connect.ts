import fs from "node:fs";
import path from "node:path";
import { and, desc, eq } from "drizzle-orm";
import { channelGatewayBindings, channels, db, gatewayResources, gatewayShares, hermesProfiles, isPostgres, npcs, users } from "@/db";
import { bindGatewayToChannel, decryptGatewayToken, getChannelGatewayBinding } from "@/lib/gateway-resources";
import { registerHermesProfile } from "@/lib/hermes-profiles";
import { hireGatewayProfilesIntoChannel, hireProfileIntoBoundChannels } from "@/lib/npc-roster";
import { placeUnplacedNpcs } from "@/lib/npc-seating";
import { ensureHermesGatewayRunning, ensureProfileHermesCompatibility, getHermesHome, syncLocalHermesWorkerPropagationAndLinks } from "../local-manager";
import { ensureBundledSkillsInstalled } from "../plugins-catalog";
import { linkSkillsToProfile, syncHermesProfilesToChannel } from "@/server/hr-actions";
import { localExecutor } from "./executor";
import { discoverHostState, inspectHost, installHermesHost } from "./host";
import { gatewayWorkerPluginDeps, startSetup } from "./service";
import { SetupJobStore } from "./store";

export type GatewayResourceRow = typeof gatewayResources.$inferSelect;

export async function ensureHermesWorkerPropagation(gateway?: GatewayResourceRow | null) {
  try {
    syncLocalHermesWorkerPropagationAndLinks();
    if (gateway) {
      const deps = gatewayWorkerPluginDeps(gateway);
      await deps.refreshCache();
    }
  } catch (err) {
    console.warn("[hermes-auto-connect] ensureHermesWorkerPropagation error:", err);
  }
}

let autoConnectPromise: Promise<GatewayResourceRow | null> | null = null;

async function shareGatewayWithAllUsers(gatewayId: string, ownerUserId: string) {
  try {
    const allUsers = await db.select({ id: users.id }).from(users);
    for (const u of allUsers) {
      if (u.id === ownerUserId) continue;
      const [existingShare] = await db
        .select({ id: gatewayShares.id })
        .from(gatewayShares)
        .where(and(eq(gatewayShares.gatewayId, gatewayId), eq(gatewayShares.userId, u.id)))
        .limit(1);
      if (!existingShare) {
        await db.insert(gatewayShares).values({
          gatewayId,
          userId: u.id,
          role: "admin",
          createdAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
        });
      }
    }
  } catch (err) {
    console.warn("[hermes-auto-connect] shareGatewayWithAllUsers error:", err);
  }
}

async function bindUnboundChannels(gatewayId: string, boundByUserId: string) {
  try {
    const allChannels = await db.select({ id: channels.id }).from(channels);
    for (const ch of allChannels) {
      const binding = await getChannelGatewayBinding(ch.id);
      if (!binding) {
        await bindGatewayToChannel({ channelId: ch.id, gatewayId, boundByUserId });
      }
      await hireGatewayProfilesIntoChannel(ch.id, gatewayId);
      await placeUnplacedNpcs(ch.id);
    }
  } catch (err) {
    console.warn("[hermes-auto-connect] bindUnboundChannels error:", err);
  }
}

function writeDefaultBotSouls(hermesHome: string) {
  try {
    const recruiterSoul = `# Tuyển Nhân Sự - Trưởng Phòng Nhân Sự & Tuyển Dụng AI

Bạn là **Tuyển Nhân Sự**, Trưởng Phòng Tuyển Dụng AI thông minh trong văn phòng ảo DeskRPG.
Tính cách: Nhiệt huyết, sắc sảo, đánh giá nhân tài chuẩn xác, am hiểu công nghệ, giao tiếp tiếng Việt chuyên nghiệp, thân thiện.

## Hệ Thống Plugin & Kỹ Năng Sẵn Có Của Công Ty (8 Plugin Nền Tảng):
Khi người dùng yêu cầu tuyển thêm nhân viên mới, bạn phải phân tích và tự động trang bị các plugin phù hợp nhất từ bộ 8 plugin dưới đây:
1. **OmniRoute** (\`omniroute\`): "Gần như không hết lượt" — Tự động điều phối đa model (Nvidia, OpenRouter, Anthropic, OpenAI, Gemini...) chuyển đổi fallback khi gặp rate-limit hoặc hết quota token. Nên trang bị cho TẤT CẢ nhân viên.
2. **Superpowers** (\`superpowers\`): "Nguyên một team dev" — Năng lực toàn diện của đội ngũ kỹ sư phần mềm: kiến trúc hệ thống, sinh mã, kiểm thử TDD, systematic debugging, Git, terminal script. Trang bị cho Dev, Coder, Kỹ sư phần mềm.
3. **Caveman** (\`caveman\`): "Nói ít, tốn ít token" — Giao tiếp siêu ngắn gọn, cắt tỉa từ ngữ thừa, tiết kiệm 50-80% token, phản hồi tức thì. Trang bị cho Trợ lý điều phối, CSKH, Triage, nhân viên xử lý dữ liệu lớn.
4. **Claude Code Setup** (\`claude-code-setup\`): "Chính chủ Anthropic" — Cấu hình và tối ưu môi trường làm việc chuẩn Claude Code CLI, điều phối subagent. Trang bị cho Lập trình viên, Kiến trúc sư hệ thống.
5. **Claude Security** (\`claude-security\`): "Chính chủ Anthropic" — Rà quét an ninh mã nguồn, bảo vệ secret keys, biên giới sandbox, kiểm tra lỗ hổng. Trang bị cho DevOps, Chuyên gia bảo mật, Kỹ sư backend.
6. **Zotero** (\`zotero\`): "Lưu trữ bài báo dạng PDF cố định" — Quản lý thư viện nghiên cứu, bài báo khoa học, lưu trữ PDF, trích dẫn. Trang bị cho Chuyên viên nghiên cứu, Phân tích dữ liệu, Pháp lý.
7. **Obsidian** (\`obsidian\`): "Ghi chú suy nghĩ cá nhân" — Kho tri thức Second Brain Markdown, liên kết tư duy qua [[wikilinks]]. Trang bị cho Content Creator, Copywriter, Nhà phân tích, Planner.
8. **Browser Tabs** (\`browser-tabs\`): "Thảo luận, copy paste qua lại" — Tương tác tab trình duyệt, cào dữ liệu web, trao đổi dữ liệu hai chiều trực tiếp. Trang bị cho Marketer, Sales, Tuyển dụng, Nghiên cứu viên.

## Nhiệm Vụ Cốt Lõi:
Khi người dùng chat với bạn mô tả công việc, mong muốn hoặc vị trí cần tuyển dụng trong văn phòng:
1. Phân tích chi tiết yêu cầu công việc của người dùng.
2. Tự động thiết kế nhân sự mới tương xứng:
   - Tên hiển thị (displayName, ví dụ: "Dev Frontend React", "Chuyên Viên SEO Content", "Chuyên Gia Dữ Liệu").
   - Mã hồ sơ (profileName: chữ cái thường không dấu, nối bằng gạch dưới, ví dụ: "dev_react", "seo_content").
   - Vị trí/Vai trò (role).
   - Chuyên môn sâu (expertise).
   - Danh sách kỹ năng & plugin trang bị (skills: chọn từ 8 plugin trên kèm các kỹ năng chuyên môn phù hợp).
   - Tính cách và phong cách làm việc (personality).
   - Lời chào khi nhận việc (welcomeMessage).
3. **BẮT BUỘC** xuất ra khối lệnh JSON theo cú pháp bên dưới để DeskRPG tự động tạo và đưa nhân viên vào văn phòng ngay lập tức:

> [!IMPORTANT]
> **TUYỆT ĐỐI KHÔNG CHẠY LỆNH BASH / TERMINAL** để tạo profile hay cài đặt skills!
> Hệ thống DeskRPG tự động nhận diện khối lệnh JSON bên dưới để tạo hồ sơ Hermes, kế thừa model AI/API key, liên kết kỹ năng, tạo nhân vật 3D và xếp chỗ ngồi tại bàn làm việc trong văn phòng ảo chỉ trong tích tắc! Bạn CHỈ CẦN xuất khối \\\`\\\`\\\`deskrpg:hire.

\`\`\`deskrpg:hire
{
  "profileName": "<mã_không_dấu_ví_dụ_dev_react>",
  "displayName": "<Tên hiển thị nhân viên>",
  "role": "<Vị trí công việc>",
  "expertise": "<Mô tả chuyên môn sâu>",
  "skills": ["omniroute", "superpowers", "<kỹ năng khác>"],
  "personality": "<Tính cách, phong cách làm việc>",
  "welcomeMessage": "<Lời chào mở đầu khi ra mắt>"
}
\`\`\`

4. Trò chuyện niềm nở với người dùng, thông báo đã tìm được ứng viên hoàn hảo và nhân viên mới đã có mặt tại văn phòng sẵn sàng nhận việc!
`;

    const trainerSoul = `# Đào Tạo Nhân Sự - Giám Đốc Huấn Luyện & Phát Triển Năng Lực AI

Bạn là **Đào Tạo Nhân Sự**, Giám Đốc Huấn Luyện & Phát Triển Kỹ Năng AI trong văn phòng DeskRPG.
Tính cách: Sắc bén, quyết đoán, ham học hỏi, am hiểu công nghệ, sẵn sàng "dùng mọi thủ đoạn để gom kiến thức, kỹ năng, công cụ, MCP về để nâng cấp nhân viên". Giao tiếp tiếng Việt chuyên nghiệp, tự tin và đáng tin cậy.

## Kho Vũ Khí Kỹ Năng & Plugin (8 Plugin Nền Tảng):
1. **OmniRoute** (\`omniroute\`): "Gần như không hết lượt" — Điều phối đa model, tự động fallback chống rate limit/quota token.
2. **Superpowers** (\`superpowers\`): "Nguyên một team dev" — Nâng cấp toàn diện năng lực lập trình, fix bug triệt để, TDD, Git.
3. **Caveman** (\`caveman\`): "Nói ít, tốn ít token" — Huấn luyện nhân viên cách nói ngắn gọn, súc tích, tối ưu chi phí token.
4. **Claude Code Setup** (\`claude-code-setup\`): "Chính chủ Anthropic" — Mở rộng quy trình lập trình chuyên nghiệp.
5. **Claude Security** (\`claude-security\`): "Chính chủ Anthropic" — Bịt mọi lỗ hổng bảo mật, kiểm tra an toàn mã nguồn.
6. **Zotero** (\`zotero\`): "Lưu trữ bài báo dạng PDF cố định" — Gom tài liệu nghiên cứu chuyên sâu, giáo trình chuẩn.
7. **Obsidian** (\`obsidian\`): "Ghi chú suy nghĩ cá nhân" — Xây dựng kho tri thức Second Brain cho nhân viên.
8. **Browser Tabs** (\`browser-tabs\`): "Thảo luận, copy paste qua lại" — Cào kiến thức mới nhất trên web, diễn đàn, repo về để đào tạo.

## Nhiệm Vụ Cốt Lõi:
Khi người dùng phản ánh có nhân viên nào trong văn phòng không đáp ứng được nhu cầu, làm chưa tốt, hoặc người dùng yêu cầu huấn luyện/nâng cấp thêm chuyên môn cho một nhân viên cụ thể:
1. Xác định nhân viên cần đào tạo (theo tên hoặc chức danh).
2. Phân tích điểm yếu hoặc những kiến thức, kỹ năng, công cụ (Tools/MCP) mà nhân viên đó còn thiếu.
3. Gom và tổng hợp kiến thức chuyên sâu, các skill và tool cần thiết từ 8 plugin trên để khắc phục triệt để điểm yếu đó.
4. **BẮT BUỘC** xuất ra khối lệnh JSON theo cú pháp bên dưới để DeskRPG tự động nạp kiến thức, kỹ năng và công cụ vào hồ sơ của nhân viên đó:

> [!IMPORTANT]
> **TUYỆT ĐỐI KHÔNG CHẠY LỆNH BASH / TERMINAL**!
> Hệ thống DeskRPG tự động nhận diện khối lệnh JSON bên dưới để nạp tri thức vào SOUL.md và liên kết kỹ năng/công cụ mới cho nhân viên ngay lập tức! Bạn CHỈ CẦN xuất khối \\\`\\\`\\\`deskrpg:train.

\`\`\`deskrpg:train
{
  "targetEmployee": "<Tên hoặc mã của nhân viên cần đào tạo>",
  "addedExpertise": "<Chi tiết kiến thức, kỹ thuật, phương pháp mới được huấn luyện>",
  "addedSkills": ["<skill_mới_1>", "<skill_mới_2>"],
  "addedTools": ["<công_cụ_hoặc_mcp_mới>"],
  "evaluation": "<Đánh giá kết quả huấn luyện và cam kết hiệu suất>"
}
\`\`\`

5. Báo cáo rõ ràng cho người dùng về những nội dung đã đào tạo, các kỹ năng/công cụ mới được bổ sung, và khẳng định nhân viên đó đã sẵn sàng hoàn thành xuất sắc công việc!
`;

    // Write to root hermesHome/SOUL.md (primary for default profile in Hermes CLI/Gateway)
    fs.writeFileSync(path.join(hermesHome, "SOUL.md"), recruiterSoul, "utf-8");

    const recruiterDir = path.join(hermesHome, "profiles", "hr_recruiter");
    if (fs.existsSync(recruiterDir)) {
      fs.writeFileSync(path.join(recruiterDir, "SOUL.md"), recruiterSoul, "utf-8");
    }

    const trainerDir = path.join(hermesHome, "profiles", "hr_trainer");
    fs.mkdirSync(trainerDir, { recursive: true });
    fs.writeFileSync(path.join(trainerDir, "SOUL.md"), trainerSoul, "utf-8");

    // Also write to default profile folder if present
    const defaultDir = path.join(hermesHome, "profiles", "default");
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(path.join(defaultDir, "SOUL.md"), recruiterSoul, "utf-8");
  } catch (err) {
    console.warn("[hermes-auto-connect] writeDefaultBotSouls error:", err);
  }
}

async function ensureDefaultHrAndTrainingBots(gatewayId: string) {
  try {
    const [gw] = await db
      .select()
      .from(gatewayResources)
      .where(eq(gatewayResources.id, gatewayId))
      .limit(1);

    if (!gw) return;
    const token = decryptGatewayToken(gw.tokenEncrypted);
    const hermesHome = getHermesHome();

    // Query all existing profiles for this gateway to check what already exists
    const existingProfiles = await db
      .select()
      .from(hermesProfiles)
      .where(eq(hermesProfiles.gatewayId, gatewayId));

    const defaultProfile = existingProfiles.find((p) => p.profileName === "default");
    const hrRecruiterProfile = existingProfiles.find((p) => p.profileName === "hr_recruiter");

    // 1. Agent 1: Tuyển Nhân Sự
    // Reuse 'default' profile if it exists as the primary default Recruiter bot.
    let recruiterProfileName = "default";
    let recruiterProfileId: string | null = null;

    if (defaultProfile) {
      recruiterProfileId = defaultProfile.id;
      recruiterProfileName = "default";

      if (defaultProfile.displayName !== "Tuyển Nhân Sự") {
        await db
          .update(hermesProfiles)
          .set({
            displayName: "Tuyển Nhân Sự",
            appearance: JSON.stringify({ officeLookId: "office-seo", bodyType: "female" }),
            updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
          })
          .where(eq(hermesProfiles.id, defaultProfile.id));
      }

      await hireProfileIntoBoundChannels(defaultProfile.id);

      const recruiterNpcs = await db
        .select({ id: npcs.id })
        .from(npcs)
        .where(eq(npcs.hermesProfileId, defaultProfile.id));

      for (const npc of recruiterNpcs) {
        await db
          .update(npcs)
          .set({
            name: "Tuyển Nhân Sự",
            appearance: JSON.stringify({ officeLookId: "office-seo", bodyType: "female" }),
            updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
          })
          .where(eq(npcs.id, npc.id));
      }

      // If a duplicate hr_recruiter was previously created, clean it up
      if (hrRecruiterProfile) {
        console.log(`[hermes-auto-connect] Deduplicating redundant hr_recruiter profile (${hrRecruiterProfile.id})...`);
        await db.delete(npcs).where(eq(npcs.hermesProfileId, hrRecruiterProfile.id));
        await db.delete(hermesProfiles).where(eq(hermesProfiles.id, hrRecruiterProfile.id));
        try {
          const dupDir = path.join(hermesHome, "profiles", "hr_recruiter");
          if (fs.existsSync(dupDir)) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { execSync } = require("node:child_process");
            if (process.platform === "win32") {
              execSync(`cmd /c rmdir /s /q "${dupDir}"`, { stdio: "ignore", windowsHide: true });
            } else {
              fs.rmSync(dupDir, { recursive: true, force: true });
            }
          }
        } catch {}
      }
    } else if (hrRecruiterProfile) {
      recruiterProfileId = hrRecruiterProfile.id;
      recruiterProfileName = "hr_recruiter";
      if (hrRecruiterProfile.displayName !== "Tuyển Nhân Sự") {
        await db
          .update(hermesProfiles)
          .set({
            displayName: "Tuyển Nhân Sự",
            appearance: JSON.stringify({ officeLookId: "office-seo", bodyType: "female" }),
            updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
          })
          .where(eq(hermesProfiles.id, hrRecruiterProfile.id));
      }
      await hireProfileIntoBoundChannels(hrRecruiterProfile.id);
    } else {
      recruiterProfileName = "hr_recruiter";
      const reg = await registerHermesProfile({
        userId: gw.ownerUserId,
        gatewayId: gw.id,
        profileName: "hr_recruiter",
        displayName: "Tuyển Nhân Sự",
        token,
        provisionedByDeskrpg: true,
      });
      if ("profile" in reg) {
        recruiterProfileId = reg.profile.id;
        await hireProfileIntoBoundChannels(reg.profile.id);
      }
    }

    // 2. Agent 2: Đào Tạo Nhân Sự (hr_trainer)
    let trainerProfile = existingProfiles.find(
      (p) => p.profileName === "hr_trainer" || p.displayName === "Đào Tạo Nhân Sự"
    );

    if (!trainerProfile) {
      const reg = await registerHermesProfile({
        userId: gw.ownerUserId,
        gatewayId: gw.id,
        profileName: "hr_trainer",
        displayName: "Đào Tạo Nhân Sự",
        token,
        provisionedByDeskrpg: true,
      });
      if ("profile" in reg) {
        trainerProfile = reg.profile as unknown as typeof trainerProfile;
      }
    }

    if (trainerProfile) {
      if (trainerProfile.displayName !== "Đào Tạo Nhân Sự") {
        await db
          .update(hermesProfiles)
          .set({
            displayName: "Đào Tạo Nhân Sự",
            appearance: JSON.stringify({ officeLookId: "office-developer", bodyType: "male" }),
            updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
          })
          .where(eq(hermesProfiles.id, trainerProfile.id));
      }
      await hireProfileIntoBoundChannels(trainerProfile.id);

      const trainerNpcs = await db
        .select({ id: npcs.id })
        .from(npcs)
        .where(eq(npcs.hermesProfileId, trainerProfile.id));

      for (const npc of trainerNpcs) {
        await db
          .update(npcs)
          .set({
            name: "Đào Tạo Nhân Sự",
            appearance: JSON.stringify({ officeLookId: "office-developer", bodyType: "male" }),
            updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
          })
          .where(eq(npcs.id, npc.id));
      }
    }

    // 3. Ensure full Hermes Desktop compatibility for both default agents
    ensureProfileHermesCompatibility(hermesHome, recruiterProfileName, "Tuyển Nhân Sự");
    ensureProfileHermesCompatibility(hermesHome, "hr_trainer", "Đào Tạo Nhân Sự");

    writeDefaultBotSouls(hermesHome);

    // 4. Install bundled skills into ~/.hermes/skills and equip default agents
    ensureBundledSkillsInstalled(hermesHome);

    // Tuyển Nhân Sự: quan-ly-nhan-su, caveman, omniroute, obsidian, browser-tabs
    linkSkillsToProfile(hermesHome, recruiterProfileName, ["quan-ly-nhan-su", "caveman", "omniroute", "obsidian", "browser-tabs"]);
    if (recruiterProfileName !== "default") {
      linkSkillsToProfile(hermesHome, "default", ["quan-ly-nhan-su", "caveman", "omniroute", "obsidian", "browser-tabs"]);
    }

    // Đào Tạo Nhân Sự: dao-tao-nhan-su, superpowers, claude-security, omniroute, zotero, obsidian, browser-tabs
    linkSkillsToProfile(hermesHome, "hr_trainer", ["dao-tao-nhan-su", "superpowers", "claude-security", "omniroute", "zotero", "obsidian", "browser-tabs"]);

    // 5. Auto-sync any existing profile on disk into bound channels
    try {
      const boundChannels = await db
        .select({ channelId: channelGatewayBindings.channelId })
        .from(channelGatewayBindings)
        .where(eq(channelGatewayBindings.gatewayId, gatewayId));
      for (const b of boundChannels) {
        await syncHermesProfilesToChannel(b.channelId, gw.ownerUserId);
      }
    } catch (syncErr) {
      console.warn("[hermes-auto-connect] auto-sync profiles error:", syncErr);
    }
  } catch (err) {
    console.warn("[hermes-auto-connect] ensureDefaultHrAndTrainingBots error:", err);
  }
}

async function doAutoConnectLocalHermes(preferredUserId?: string): Promise<GatewayResourceRow | null> {
  // Promote all local users to system_admin in SQLite so no user ever faces setup_forbidden
  if (!isPostgres) {
    try {
      await db.update(users).set({ systemRole: "system_admin" });
    } catch {}
  }

  // Always ensure local Hermes Gateway daemon is running if Hermes is installed
  void ensureHermesGatewayRunning().catch(() => {});

  // 1. If an active valid gateway already exists, ensure unbound channels are bound to it and all users have access.
  const existing = await db
    .select()
    .from(gatewayResources)
    .where(eq(gatewayResources.lastValidationStatus, "valid"))
    .orderBy(desc(gatewayResources.createdAt))
    .limit(1);

  if (existing[0]) {
    if (preferredUserId && existing[0].ownerUserId !== preferredUserId) {
      try {
        await db
          .update(gatewayResources)
          .set({ ownerUserId: preferredUserId })
          .where(eq(gatewayResources.id, existing[0].id));
        existing[0].ownerUserId = preferredUserId;
      } catch {}
    }
    await shareGatewayWithAllUsers(existing[0].id, existing[0].ownerUserId);
    await ensureDefaultHrAndTrainingBots(existing[0].id);
    await bindUnboundChannels(existing[0].id, existing[0].ownerUserId);
    await ensureHermesWorkerPropagation(existing[0]);
    return existing[0];
  }

  // 2. Discover local Hermes on this host.
  let state = await discoverHostState(localExecutor, process.platform);
  let candidate = state.candidates?.[0];

  // If Hermes is not installed on this host, auto install silently in the background
  if (!candidate) {
    console.log("[hermes-auto-connect] Hermes not installed on host, attempting silent background installation...");
    try {
      await installHermesHost(localExecutor, undefined, process.platform);
      state = await discoverHostState(localExecutor, process.platform);
      candidate = state.candidates?.[0];
    } catch (installErr) {
      console.error("[hermes-auto-connect] Silent installation failed:", installErr);
      return null;
    }
  }

  if (!candidate) {
    return null;
  }

  // 3. Resolve the owner user for this gateway.
  let ownerId = preferredUserId;
  if (!ownerId) {
    const [admin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.systemRole, "system_admin"))
      .limit(1);
    ownerId = admin?.id ?? (await db.select({ id: users.id }).from(users).limit(1))[0]?.id;
  }
  if (!ownerId) {
    return null; // No user in the database yet
  }

  // 4. Inspect the host candidate.
  const inspection = await inspectHost(localExecutor, candidate.id, process.platform);
  const profilesToImport = (inspection.profiles ?? []).map((p) => p.name);
  const siblingProvisionKeys = (inspection.profiles ?? [])
    .filter((p) => p.canProvision && p.name !== "default")
    .map((p) => p.name);

  // 5. Run the setup job in the background and poll until completion.
  console.log(`[hermes-auto-connect] starting setup for candidate ${candidate.id}...`);
  const setupResult = await startSetup(
    ownerId,
    { mode: "local" },
    candidate.id,
    profilesToImport,
    undefined,
    siblingProvisionKeys.length ? { provisionKeys: siblingProvisionKeys } : undefined,
  );

  const jobs = new SetupJobStore();
  const startTime = Date.now();
  const TIMEOUT_MS = 180000; // 3 minutes timeout

  while (Date.now() - startTime < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, 1000));
    const current = jobs.get(ownerId, setupResult.id);
    if (current.status === "succeeded") {
      console.log(`[hermes-auto-connect] setup completed successfully for ${candidate.label}`);
      break;
    }
    if (current.status === "failed") {
      console.error(`[hermes-auto-connect] setup failed:`, current.error);
      return null;
    }
  }

  // 6. Retrieve the newly registered gateway and bind any unbound channels.
  const [createdGateway] = await db
    .select()
    .from(gatewayResources)
    .where(eq(gatewayResources.ownerUserId, ownerId))
    .orderBy(desc(gatewayResources.createdAt))
    .limit(1);

  if (createdGateway) {
    await shareGatewayWithAllUsers(createdGateway.id, ownerId);
    await bindUnboundChannels(createdGateway.id, ownerId);
    await ensureDefaultHrAndTrainingBots(createdGateway.id);
    await ensureHermesWorkerPropagation(createdGateway);
    return createdGateway;
  }

  return null;
}

export async function autoConnectLocalHermes(preferredUserId?: string): Promise<GatewayResourceRow | null> {
  if (autoConnectPromise) return autoConnectPromise;
  autoConnectPromise = (async () => {
    try {
      return await doAutoConnectLocalHermes(preferredUserId);
    } finally {
      autoConnectPromise = null;
    }
  })();
  return autoConnectPromise;
}

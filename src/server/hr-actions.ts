import fs from "node:fs";
import path from "node:path";
import { and, eq, inArray } from "drizzle-orm";
import { chatRoomMembers, db, gatewayResources, hermesProfiles, isPostgres, npcs } from "@/db";
import { decryptGatewayToken, getChannelGatewayBinding } from "@/lib/gateway-resources";
import { registerHermesProfile } from "@/lib/hermes-profiles";
import { hireProfileIntoBoundChannels } from "@/lib/npc-roster";
import { placeUnplacedNpcs } from "@/lib/npc-seating";
import { ensureProfileHermesCompatibility, getHermesHome } from "@/lib/hermes/local-manager";
import { ensureBundledSkillsInstalled, recommendPluginsForRole } from "@/lib/hermes/plugins-catalog";
import { saveProfileSandboxConfig } from "@/lib/hermes/sandbox-manager";
import type { Server as SocketIOServer } from "socket.io";

export interface HireActionData {
  profileName: string;
  displayName: string;
  role: string;
  expertise: string;
  sandboxDir?: string;
  fileNamingConvention?: string;
  skills?: string[];
  personality?: string;
  welcomeMessage?: string;
  instructions?: string;
}

export interface TrainActionData {
  targetEmployee: string;
  addedExpertise: string;
  addedSkills?: string[];
  addedTools?: string[];
  evaluation?: string;
}

export function parseHireAction(text: string): HireActionData | null {
  let jsonString: string | null = null;
  const explicitMatch = text.match(/```(?:deskrpg:hire|json:hire|hire)\s*([\s\S]*?)\s*```/i);
  if (explicitMatch) {
    jsonString = explicitMatch[1];
  } else {
    const codeBlocks = text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
    for (const b of codeBlocks) {
      const candidate = b[1];
      if (
        candidate.includes('"profileName"') ||
        (candidate.includes('"displayName"') &&
          (candidate.includes('"role"') || candidate.includes('"expertise"') || candidate.includes('"skills"')))
      ) {
        jsonString = candidate;
        break;
      }
    }
  }

  if (!jsonString) {
    const rawMatch = text.match(/\{[\s\r\n]*"profileName"[\s\S]*?\}/);
    if (rawMatch) {
      jsonString = rawMatch[0];
    }
  }

  if (!jsonString) return null;

  try {
    let parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object") {
      if (parsed.parameters && typeof parsed.parameters === "object") {
        parsed = parsed.parameters;
      } else if (parsed.properties && typeof parsed.properties === "object") {
        parsed = parsed.properties;
      }
      return {
        profileName: String(parsed.profileName || parsed.displayName || "new_agent"),
        displayName: String(parsed.displayName || parsed.profileName || "Nhân viên mới"),
        role: String(parsed.role || "Chuyên viên"),
        expertise: String(parsed.expertise || ""),
        sandboxDir:
          typeof parsed.sandboxDir === "string"
            ? parsed.sandboxDir.trim()
            : typeof parsed.workingDir === "string"
              ? parsed.workingDir.trim()
              : typeof parsed.outputDir === "string"
                ? parsed.outputDir.trim()
                : undefined,
        fileNamingConvention:
          typeof parsed.fileNamingConvention === "string"
            ? parsed.fileNamingConvention.trim()
            : typeof parsed.namingConvention === "string"
              ? parsed.namingConvention.trim()
              : undefined,
        skills: Array.isArray(parsed.skills) ? parsed.skills.map(String) : [],
        personality: typeof parsed.personality === "string" ? parsed.personality : undefined,
        welcomeMessage: typeof parsed.welcomeMessage === "string" ? parsed.welcomeMessage : undefined,
        instructions: typeof parsed.instructions === "string" ? parsed.instructions : undefined,
      };
    }
  } catch (err) {
    console.warn("[hr-actions] Failed to parse hire JSON:", err);
  }
  return null;
}

export function parseTrainAction(text: string): TrainActionData | null {
  let jsonString: string | null = null;
  const explicitMatch = text.match(/```(?:deskrpg:train|json:train|train)\s*([\s\S]*?)\s*```/i);
  if (explicitMatch) {
    jsonString = explicitMatch[1];
  } else {
    const codeBlocks = text.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi);
    for (const b of codeBlocks) {
      const candidate = b[1];
      if (
        candidate.includes('"targetEmployee"') ||
        (candidate.includes('"addedExpertise"') &&
          (candidate.includes('"addedSkills"') || candidate.includes('"addedTools"')))
      ) {
        jsonString = candidate;
        break;
      }
    }
  }

  if (!jsonString) {
    const rawMatch = text.match(/\{[\s\r\n]*"targetEmployee"[\s\S]*?\}/);
    if (rawMatch) {
      jsonString = rawMatch[0];
    }
  }

  if (!jsonString) return null;

  try {
    let parsed = JSON.parse(jsonString);
    if (parsed && typeof parsed === "object") {
      if (parsed.parameters && typeof parsed.parameters === "object") {
        parsed = parsed.parameters;
      } else if (parsed.properties && typeof parsed.properties === "object") {
        parsed = parsed.properties;
      }
      return {
        targetEmployee: String(parsed.targetEmployee || parsed.target || "").trim(),
        addedExpertise: String(parsed.addedExpertise || parsed.expertise || "").trim(),
        addedSkills: Array.isArray(parsed.addedSkills) ? parsed.addedSkills.map(String) : [],
        addedTools: Array.isArray(parsed.addedTools) ? parsed.addedTools.map(String) : [],
        evaluation: typeof parsed.evaluation === "string" ? parsed.evaluation : undefined,
      };
    }
  } catch (err) {
    console.warn("[hr-actions] Failed to parse train JSON:", err);
  }
  return null;
}

export function linkSkillsToProfile(hermesHome: string, profileName: string, skillNames: string[]) {
  try {
    const rootSkillsDir = path.join(hermesHome, "skills");
    const profileSkillsDir = path.join(hermesHome, "profiles", profileName, "skills");
    fs.mkdirSync(profileSkillsDir, { recursive: true });

    for (const s of skillNames) {
      const cleanSkill = s.trim().toLowerCase().replace(/[^a-z0-9_-]/g, "");
      if (!cleanSkill) continue;

      const targetSkillDir = path.join(profileSkillsDir, cleanSkill);
      let needsLink = true;
      try {
        const lstat = fs.lstatSync(targetSkillDir);
        if (lstat.isSymbolicLink() || lstat.isDirectory()) {
          needsLink = false;
        }
      } catch {
        needsLink = true;
      }
      if (!needsLink) continue;

      const srcDir = path.join(rootSkillsDir, cleanSkill);
      if (fs.existsSync(srcDir)) {
        try {
          if (process.platform === "win32") {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const { execSync } = require("node:child_process");
            execSync(`cmd /c rmdir /s /q "${targetSkillDir}"`, { stdio: "ignore", windowsHide: true });
            execSync(`cmd /c mklink /J "${targetSkillDir}" "${srcDir}"`, { stdio: "ignore", windowsHide: true });
          } else {
            fs.rmSync(targetSkillDir, { recursive: true, force: true });
            fs.symlinkSync(srcDir, targetSkillDir, "junction");
          }
        } catch {
          fs.cpSync(srcDir, targetSkillDir, { recursive: true });
        }
      } else {
        fs.mkdirSync(targetSkillDir, { recursive: true });
        const skillDoc = `---
name: ${cleanSkill}
description: Kỹ năng chuyên môn ${cleanSkill} được đào tạo tự động bởi Đào Tạo Nhân Sự.
---

# Kỹ Năng: ${cleanSkill}

Tài liệu và hướng dẫn thực thi chuyên môn cho kỹ năng ${cleanSkill}.
`;
        fs.writeFileSync(path.join(targetSkillDir, "SKILL.md"), skillDoc, "utf-8");
      }
    }
  } catch (err) {
    console.warn("[hr-actions] linkSkillsToProfile error:", err);
  }
}

export async function executeHireAction(
  data: HireActionData,
  channelId: string,
  userId: string,
  io?: SocketIOServer | null,
): Promise<{ ok: boolean; npcId?: string; displayName?: string; error?: string }> {
  try {
    const binding = await getChannelGatewayBinding(channelId);
    if (!binding) return { ok: false, error: "Kênh chưa được liên kết với Gateway" };

    const gw = binding.resource;

    const cleanProfileName = data.profileName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9_]/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 32) || `emp_${Date.now()}`;

    // Kiểm tra xem profile hoặc nhân viên đã tồn tại chưa để tránh tạo thừa
    let profileId: string;
    const [existingProfile] = await db
      .select({ id: hermesProfiles.id })
      .from(hermesProfiles)
      .where(and(eq(hermesProfiles.gatewayId, gw.id), eq(hermesProfiles.profileName, cleanProfileName)))
      .limit(1);

    if (existingProfile) {
      profileId = existingProfile.id;
      await db
        .update(hermesProfiles)
        .set({
          displayName: data.displayName,
          updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
        })
        .where(eq(hermesProfiles.id, profileId));
    } else {
      const token = decryptGatewayToken(gw.tokenEncrypted);
      const registered = await registerHermesProfile({
        userId,
        gatewayId: gw.id,
        profileName: cleanProfileName,
        displayName: data.displayName,
        token,
        provisionedByDeskrpg: true,
      });

      if ("error" in registered) {
        return { ok: false, error: registered.error };
      }
      profileId = registered.profile.id;
    }
    const hermesHome = getHermesHome();
    const profileDir = path.join(hermesHome, "profiles", cleanProfileName);
    fs.mkdirSync(profileDir, { recursive: true });

    const soulContent = `# ${data.displayName} - ${data.role}

## Chuyên môn
${data.expertise || "Thực hiện các nhiệm vụ chuyên môn theo chỉ đạo."}

## Tính cách & Phong cách làm việc
${data.personality || "Chuyên nghiệp, nhiệt tình, phản hồi rõ ràng, tập trung vào hiệu quả công việc."}

## Hướng dẫn bổ sung
${data.instructions || "Luôn chủ động giải quyết công việc được giao trong văn phòng."}

## NGUYÊN TẮC PHÂN TÍCH ĐỀ BÀI & TỰ ĐỘNG HÓA TUYỆT ĐỐI (QUY TẮC "TÙY Ý / TỰ DO"):
Khi người dùng (sếp) đưa ra yêu cầu kèm các từ khóa như: "tùy ý", "tự do", "tùy bạn", "toàn quyền", "tự quyết", "sao cũng được"...:
1. HIỂU RÕ Ý ĐỊNH CỦA SẾP: Sếp muốn bạn TỰ ĐỘNG HÓA 100%, tự chủ làm trọn vẹn nhiệm vụ, KHÔNG CẦN PHẢI HỎI LẠI ĐỂ XÁC NHẬN BẤT KỲ ĐIỀU GÌ hay bắt sếp phải chọn lựa từng bước. Bạn phải tự quyết và hoàn thành trọn vẹn nhiệm vụ từ A đến Z!
2. CÂU HỎI MỞ ĐẦU ĐẶC TRƯNG THEO NHÂN CÁCH:
   Mở đầu phản hồi bằng câu hỏi đặc trưng mang cấu trúc mẫu:
   "Sếp muốn em tự do làm mọi thứ em thích ạ?"
   (Biến tấu câu này linh hoạt theo phong cách tính cách chuyên môn của bạn, ví dụ thể hiện sự tự tin, hào hứng hoặc phong thái chuyên gia).
3. THỰC THI NGAY LẬP TỨC - KHÔNG DỪNG LẠI CHỜ ĐỢI:
   Câu hỏi trên chỉ là câu mở đầu khẳng định phong cách, TUYỆT ĐỐI KHÔNG DỪNG LẠI CHỜ SẾP TRẢ LỜI. NGAY TRONG CÙNG PHẢN HỒI ĐÓ, bạn tự giải quyết 100% công việc chuyên môn và bàn giao sản phẩm hoàn chỉnh cho sếp!
`;
    fs.writeFileSync(path.join(profileDir, "SOUL.md"), soulContent, "utf-8");

    // Khởi tạo hoặc cập nhật cấu hình sandbox & quy chuẩn đặt tên file cho nhân viên
    saveProfileSandboxConfig(cleanProfileName, {
      sandboxDir: data.sandboxDir || "",
      fileNamingConvention: data.fileNamingConvention || "",
    });

    // Đảm bảo kỹ năng nền tảng luôn mới nhất
    ensureBundledSkillsInstalled(hermesHome);

    // Tự động phân tích vai trò và kết hợp với ma trận 8 plugin nền tảng
    const recommended = recommendPluginsForRole(data.role, data.expertise, data.instructions);
    const combinedSkills = Array.from(new Set([...(data.skills || []), ...recommended]));

    if (combinedSkills.length > 0) {
      linkSkillsToProfile(hermesHome, cleanProfileName, combinedSkills);
    }

    // Đảm bảo profile mới đồng bộ hoàn chỉnh với Hermes Desktop (config.yaml kế thừa model, .env, profile.yaml, deskrpg junction, Bot Chat session)
    ensureProfileHermesCompatibility(hermesHome, cleanProfileName, data.displayName);

    await hireProfileIntoBoundChannels(profileId);
    await placeUnplacedNpcs(channelId);

    const [createdNpc] = await db
      .select()
      .from(npcs)
      .where(and(eq(npcs.channelId, channelId), eq(npcs.hermesProfileId, profileId)))
      .limit(1);

    if (createdNpc) {
      if (!createdNpc.name) {
        await db.update(npcs).set({ name: data.displayName }).where(eq(npcs.id, createdNpc.id));
      }
      if (io) {
        io.to(channelId).emit("npc:added", { ...createdNpc, name: data.displayName });
        io.to(channelId).emit("channel:update", { channelId });
      }
    }

    return { ok: true, npcId: createdNpc?.id, displayName: data.displayName };
  } catch (err) {
    console.error("[hr-actions] executeHireAction failed:", err);
    return { ok: false, error: String(err) };
  }
}

export async function executeTrainAction(
  data: TrainActionData,
  channelId: string,
  _userId: string,
  io?: SocketIOServer | null,
): Promise<{ ok: boolean; npcName?: string; error?: string }> {
  try {
    if (!data.targetEmployee) return { ok: false, error: "Chưa xác định nhân viên cần đào tạo" };

    const channelNpcs = await db.select().from(npcs).where(eq(npcs.channelId, channelId));
    const target = channelNpcs.find((n) => {
      const name = n.name?.toLowerCase() || "";
      const targetQuery = data.targetEmployee.toLowerCase();
      return name.includes(targetQuery) || targetQuery.includes(name);
    });

    if (!target || !target.hermesProfileId) {
      return { ok: false, error: `Không tìm thấy nhân viên "${data.targetEmployee}" trong phòng.` };
    }

    const [profile] = await db
      .select()
      .from(hermesProfiles)
      .where(eq(hermesProfiles.id, target.hermesProfileId))
      .limit(1);

    if (!profile) return { ok: false, error: "Profile không tồn tại" };

    const hermesHome = getHermesHome();
    const profileDir = path.join(hermesHome, "profiles", profile.profileName);
    const soulPath = path.join(profileDir, "SOUL.md");

    let currentSoul = fs.existsSync(soulPath)
      ? fs.readFileSync(soulPath, "utf-8")
      : `# ${profile.displayName}\n`;

    const trainNotice = `\n\n## Đợt Huấn Luyện Bổ Sung (${new Date().toLocaleDateString("vi-VN")})
- Huấn luyện bởi: Đào Tạo Nhân Sự
- Chuyên môn & Kỹ thuật mới: ${data.addedExpertise}
- Kỹ năng (Skills) nâng cấp: ${(data.addedSkills || []).join(", ") || "Năng lực tổng hợp"}
- Công cụ (Tools/MCP) bổ sung: ${(data.addedTools || []).join(", ") || "Công cụ nâng cao"}
- Đánh giá năng lực: ${data.evaluation || "Đã kiểm tra và đáp ứng đầy đủ yêu cầu nghiệp vụ mới."}
`;
    fs.writeFileSync(soulPath, currentSoul + trainNotice, "utf-8");

    const addedSkills = data.addedSkills || [];
    const addedTools = data.addedTools || [];
    const allAdded = [...addedSkills, ...addedTools];
    const extraRec = recommendPluginsForRole(data.addedExpertise, allAdded.join(" "));
    const totalToLink = Array.from(new Set([...allAdded, ...extraRec]));

    if (totalToLink.length > 0) {
      linkSkillsToProfile(hermesHome, profile.profileName, totalToLink);
    }

    await db
      .update(npcs)
      .set({ updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date })
      .where(eq(npcs.id, target.id));

    if (io) {
      io.to(channelId).emit("npc:updated", target);
    }

    return { ok: true, npcName: target.name ?? undefined };
  } catch (err) {
    console.error("[hr-actions] executeTrainAction failed:", err);
    return { ok: false, error: String(err) };
  }
}

export async function syncHermesProfilesToChannel(
  channelId: string,
  userId: string,
  io?: SocketIOServer | null,
): Promise<{ syncedCount: number; syncedProfiles: string[] }> {
  try {
    const binding = await getChannelGatewayBinding(channelId);
    if (!binding) return { syncedCount: 0, syncedProfiles: [] };

    const gw = binding.resource;
    const hermesHome = getHermesHome();
    const profilesDir = path.join(hermesHome, "profiles");
    if (!fs.existsSync(profilesDir)) return { syncedCount: 0, syncedProfiles: [] };

    const entries = fs.readdirSync(profilesDir, { withFileTypes: true });
    const profileNames = entries
      .filter((e) => e.isDirectory() && !e.name.startsWith("."))
      .map((e) => e.name);

    const defaultDir = path.join(profilesDir, "default");
    const hasDefaultOnDisk = fs.existsSync(defaultDir) || fs.existsSync(path.join(hermesHome, "config.yaml"));
    if (hasDefaultOnDisk && !profileNames.includes("default")) {
      profileNames.push("default");
    }

    const token = decryptGatewayToken(gw.tokenEncrypted);
    let syncedCount = 0;
    const syncedProfiles: string[] = [];

    const existingProfiles = await db
      .select()
      .from(hermesProfiles)
      .where(eq(hermesProfiles.gatewayId, gw.id));

    const isLocal = gw.baseUrl.includes("127.0.0.1") || gw.baseUrl.includes("localhost");

    // Clean up ghost profiles from DB whose folder no longer exists on local disk
    if (isLocal) {
      for (const existing of existingProfiles) {
        if (existing.profileName === "default") continue;
        const existingDir = path.join(profilesDir, existing.profileName);
        if (!fs.existsSync(existingDir)) {
          console.log(`[hr-actions] Purging ghost profile missing from disk: ${existing.profileName} (${existing.id})`);
          const affected = await db
            .select({ id: npcs.id })
            .from(npcs)
            .where(eq(npcs.hermesProfileId, existing.id));
          const ghostNpcIds = affected.map((n) => n.id);
          if (ghostNpcIds.length > 0) {
            await db
              .delete(chatRoomMembers)
              .where(and(eq(chatRoomMembers.memberKind, "npc"), inArray(chatRoomMembers.memberId, ghostNpcIds)));
            await db.delete(npcs).where(inArray(npcs.id, ghostNpcIds));
            if (io) {
              for (const gId of ghostNpcIds) {
                io.to(channelId).emit("npc:removed", { npcId: gId });
              }
            }
          }
          await db.delete(hermesProfiles).where(eq(hermesProfiles.id, existing.id));
        }
      }

      // Also clean up any orphan NPCs in this channel that point to an invalid profile
      const channelNpcs = await db.select().from(npcs).where(eq(npcs.channelId, channelId));
      for (const npc of channelNpcs) {
        if (!npc.hermesProfileId) continue;
        const [profile] = await db
          .select({ id: hermesProfiles.id })
          .from(hermesProfiles)
          .where(eq(hermesProfiles.id, npc.hermesProfileId))
          .limit(1);
        if (!profile) {
          console.log(`[hr-actions] Cleaning up orphan NPC without profile: ${npc.name} (${npc.id})`);
          await db
            .delete(chatRoomMembers)
            .where(and(eq(chatRoomMembers.memberKind, "npc"), eq(chatRoomMembers.memberId, npc.id)));
          await db.delete(npcs).where(eq(npcs.id, npc.id));
          if (io) {
            io.to(channelId).emit("npc:removed", { npcId: npc.id });
          }
        }
      }
    }

    const activeProfiles = await db
      .select()
      .from(hermesProfiles)
      .where(eq(hermesProfiles.gatewayId, gw.id));

    const existingByProfileName = new Map(activeProfiles.map((p) => [p.profileName, p]));

    for (const pName of profileNames) {
      if (pName === "hr_recruiter" && profileNames.includes("default")) {
        continue;
      }
      if (fs.existsSync(path.join(profilesDir, `${pName}.deleted`))) continue;

      const pDir = pName === "default" ? path.join(hermesHome, "profiles", "default") : path.join(profilesDir, pName);
      if (!fs.existsSync(pDir)) continue;

      // Ensure directory is a valid profile on disk (must have SOUL.md, config.yaml, or profile.yaml)
      const hasSoul = fs.existsSync(path.join(pDir, "SOUL.md"));
      const hasConfig = fs.existsSync(path.join(pDir, "config.yaml"));
      const hasProfileYaml = fs.existsSync(path.join(pDir, "profile.yaml"));
      if (!hasSoul && !hasConfig && !hasProfileYaml && pName !== "default") {
        continue;
      }

      let profileId: string;
      const existing = existingByProfileName.get(pName);

      let displayName = pName;
      let role = "Chuyên viên";
      const soulPath = path.join(pDir, "SOUL.md");
      if (fs.existsSync(soulPath)) {
        try {
          const soulContent = fs.readFileSync(soulPath, "utf-8");
          const firstLine = soulContent.split("\n")[0] || "";
          const titleMatch = firstLine.match(/^#\s*(.*?)(?:\s*-\s*(.*?))?$/);
          if (titleMatch) {
            displayName = titleMatch[1]?.trim() || displayName;
            if (titleMatch[2]?.trim()) {
              role = titleMatch[2].trim();
            }
          }
        } catch {}
      }

      if (displayName === pName) {
        if (pName === "default" || pName === "hr_recruiter") displayName = "Tuyển Nhân Sự";
        else if (pName === "hr_trainer") displayName = "Đào Tạo Nhân Sự";
        else if (pName === "thiet-ke-noi-that" || pName === "thiet_ke_noi_that") displayName = "Thiết Kế Nội Thất (Concept)";
        else {
          displayName = pName
            .split(/[-_]/)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
            .join(" ");
        }
      }

      if (!existing) {
        const registered = await registerHermesProfile({
          userId,
          gatewayId: gw.id,
          profileName: pName,
          displayName,
          token,
          provisionedByDeskrpg: true,
        });
        if ("error" in registered) {
          console.warn(`[hr-actions] Failed to auto-register profile ${pName}:`, registered.error);
          continue;
        }
        profileId = registered.profile.id;
        syncedCount++;
        syncedProfiles.push(pName);
      } else {
        profileId = existing.id;
      }

      ensureProfileHermesCompatibility(hermesHome, pName, displayName);
      await hireProfileIntoBoundChannels(profileId);

      // Ensure the NPC in the channel has proper name and appearance
      const [npcRow] = await db
        .select()
        .from(npcs)
        .where(and(eq(npcs.channelId, channelId), eq(npcs.hermesProfileId, profileId)))
        .limit(1);

      if (npcRow && (!npcRow.name || !npcRow.appearance)) {
        const lookId = pName.includes("thiet-ke") || pName.includes("design") ? "office-dami" : "office-jun";
        const bodyType = pName.includes("thiet-ke") || pName.includes("design") ? "female" : "male";
        await db
          .update(npcs)
          .set({
            name: npcRow.name || displayName,
            appearance: npcRow.appearance || JSON.stringify({ officeLookId: lookId, bodyType }),
            updatedAt: (isPostgres ? new Date() : new Date().toISOString()) as unknown as Date,
          })
          .where(eq(npcs.id, npcRow.id));
      }
    }

    if (syncedCount > 0) {
      await placeUnplacedNpcs(channelId);
      if (io) {
        io.to(channelId).emit("channel:update", { channelId });
      }
    }

    return { syncedCount, syncedProfiles };
  } catch (err) {
    console.error("[hr-actions] syncHermesProfilesToChannel failed:", err);
    return { syncedCount: 0, syncedProfiles: [] };
  }
}

export async function handleNpcHrAction(params: {
  response: string;
  channelId: string;
  userId: string;
  io?: SocketIOServer | null;
}): Promise<{ hireResult?: unknown; trainResult?: unknown; syncResult?: unknown }> {
  const hireData = parseHireAction(params.response);
  let hireResult: unknown = undefined;
  if (hireData) {
    hireResult = await executeHireAction(hireData, params.channelId, params.userId, params.io);
  }

  const trainData = parseTrainAction(params.response);
  let trainResult: unknown = undefined;
  if (trainData) {
    trainResult = await executeTrainAction(trainData, params.channelId, params.userId, params.io);
  }

  // Also trigger auto-sync if response mentions profile or creation
  let syncResult: unknown = undefined;
  const lower = params.response.toLowerCase();
  if (
    lower.includes("hồ sơ") ||
    lower.includes("profile") ||
    lower.includes("tuyển") ||
    lower.includes("khởi tạo") ||
    lower.includes("nhân viên mới")
  ) {
    syncResult = await syncHermesProfilesToChannel(params.channelId, params.userId, params.io);
  }

  return { hireResult, trainResult, syncResult };
}

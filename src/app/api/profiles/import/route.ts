import { NextRequest, NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  channels,
  characters,
  chatMessages,
  db,
  gatewayResources,
  hermesProfiles,
  isPostgres,
  npcs,
} from "@/db";

export async function POST(req: NextRequest) {
  try {
    let payload: any;
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      if (!file || typeof file === "string") {
        return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
      }
      const text = await (file as Blob).text();
      payload = JSON.parse(text);
    } else {
      payload = await req.json();
    }

    if (!payload || payload.format !== "deskrpg-bot-backup") {
      return NextResponse.json(
        { error: "Tệp tin không đúng định dạng sao lưu của DeskRPG (deskrpg-bot-backup)" },
        { status: 400 },
      );
    }

    const { profile: pData, npc: nData, chatHistory = [], hermesDiskConfig } = payload;
    if (!pData || !pData.profileName) {
      return NextResponse.json({ error: "Thông tin profile không hợp lệ" }, { status: 400 });
    }

    const profileName = pData.profileName;

    // 1. Resolve Gateway
    const [gateway] = await db
      .select()
      .from(gatewayResources)
      .where(eq(gatewayResources.lastValidationStatus, "valid"))
      .orderBy(desc(gatewayResources.createdAt))
      .limit(1);

    if (!gateway) {
      return NextResponse.json(
        { error: "Không tìm thấy Gateway nào khả dụng trong hệ thống" },
        { status: 400 },
      );
    }

    const gatewayId = gateway.id;

    // 2. Resolve Channel
    const [channel] = await db.select().from(channels).limit(1);
    if (!channel) {
      return NextResponse.json(
        { error: "Không tìm thấy văn phòng (channel) nào để bố trí nhân vật" },
        { status: 400 },
      );
    }

    // 3. Resolve Character
    const [character] = await db.select().from(characters).limit(1);
    const characterId = character?.id || "default-user";

    // 4. Upsert Hermes Profile
    const [existingProfile] = await db
      .select()
      .from(hermesProfiles)
      .where(
        and(eq(hermesProfiles.gatewayId, gatewayId), eq(hermesProfiles.profileName, profileName)),
      )
      .limit(1);

    let profileId: string;
    const nowIso = new Date().toISOString();

    if (existingProfile) {
      profileId = existingProfile.id;
      await db
        .update(hermesProfiles)
        .set({
          displayName: pData.displayName ?? existingProfile.displayName,
          description: pData.description ?? existingProfile.description,
          appearance: pData.appearance ?? existingProfile.appearance,
          updatedAt: (isPostgres ? new Date() : nowIso) as unknown as Date,
        })
        .where(eq(hermesProfiles.id, profileId));
    } else {
      profileId = crypto.randomUUID();
      await db.insert(hermesProfiles).values({
        id: profileId,
        gatewayId,
        profileName,
        tokenEncrypted: "imported_profile_token",
        displayName: pData.displayName || profileName,
        description: pData.description || null,
        appearance: typeof pData.appearance === "object" ? JSON.stringify(pData.appearance) : (pData.appearance || null),
        provisionedByDeskrpg: (isPostgres ? false : 0) as unknown as boolean,
        createdAt: (isPostgres ? new Date() : nowIso) as unknown as Date,
        updatedAt: (isPostgres ? new Date() : nowIso) as unknown as Date,
      });
    }

    // 5. Upsert NPC
    const [existingNpc] = await db
      .select()
      .from(npcs)
      .where(eq(npcs.hermesProfileId, profileId))
      .limit(1);

    let npcId: string;
    if (existingNpc) {
      npcId = existingNpc.id;
      await db
        .update(npcs)
        .set({
          name: nData?.name ?? existingNpc.name,
          positionX: nData?.positionX ?? existingNpc.positionX,
          positionY: nData?.positionY ?? existingNpc.positionY,
          direction: nData?.direction ?? existingNpc.direction,
          appearance: nData?.appearance ?? existingNpc.appearance,
          agentConfig: nData?.agentConfig ?? existingNpc.agentConfig,
          active: (isPostgres ? true : 1) as unknown as boolean,
          updatedAt: (isPostgres ? new Date() : nowIso) as unknown as Date,
        })
        .where(eq(npcs.id, npcId));
    } else {
      npcId = crypto.randomUUID();
      await db.insert(npcs).values({
        id: npcId,
        channelId: channel.id,
        name: nData?.name || pData.displayName || profileName,
        positionX: nData?.positionX ?? 10,
        positionY: nData?.positionY ?? 10,
        direction: nData?.direction || "down",
        appearance: nData?.appearance || pData.appearance || null,
        adapterType: "hermes",
        adapterConfig: nData?.adapterConfig || null,
        hermesProfileId: profileId,
        agentConfig: nData?.agentConfig || null,
        active: (isPostgres ? true : 1) as unknown as boolean,
        createdAt: (isPostgres ? new Date() : nowIso) as unknown as Date,
        updatedAt: (isPostgres ? new Date() : nowIso) as unknown as Date,
      });
    }

    // 6. Restore local Hermes disk config & memories if present
    if (hermesDiskConfig) {
      try {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
        const hermesRoot = path.join(localAppData, "hermes");
        const profileDir =
          profileName === "default"
            ? hermesRoot
            : path.join(hermesRoot, "profiles", profileName);

        if (!fs.existsSync(profileDir)) {
          fs.mkdirSync(profileDir, { recursive: true });
        }

        if (hermesDiskConfig.configYaml) {
          fs.writeFileSync(path.join(profileDir, "config.yaml"), hermesDiskConfig.configYaml, "utf8");
        }
        if (hermesDiskConfig.profileYaml) {
          fs.writeFileSync(path.join(profileDir, "profile.yaml"), hermesDiskConfig.profileYaml, "utf8");
        }
        if (hermesDiskConfig.memories && typeof hermesDiskConfig.memories === "object") {
          const memDir = path.join(profileDir, "memories");
          if (!fs.existsSync(memDir)) {
            fs.mkdirSync(memDir, { recursive: true });
          }
          for (const [fname, content] of Object.entries(hermesDiskConfig.memories)) {
            if (typeof content === "string") {
              fs.writeFileSync(path.join(memDir, fname), content, "utf8");
              if (fname === "SOUL.md") {
                fs.writeFileSync(path.join(profileDir, "SOUL.md"), content, "utf8");
              }
            }
          }
        }

        // Restore sandbox configuration if present
        const sBox = payload.sandboxConfig || hermesDiskConfig.sandboxConfig;
        if (sBox && typeof sBox === "object") {
          try {
            fs.writeFileSync(
              path.join(profileDir, "sandbox.json"),
              JSON.stringify(sBox, null, 2),
              "utf8"
            );
          } catch {}
        }
      } catch (diskErr) {
        console.warn("[profile-import] Could not restore disk files:", diskErr);
      }
    }

    // 7. Restore Chat History Messages
    let importedMessages = 0;
    if (Array.isArray(chatHistory) && chatHistory.length > 0) {
      // Clear existing messages for this NPC to prevent duplicates if user is re-importing
      await db.delete(chatMessages).where(eq(chatMessages.npcId, npcId));

      for (const msg of chatHistory) {
        if (!msg.content) continue;
        await db.insert(chatMessages).values({
          id: crypto.randomUUID(),
          characterId,
          npcId,
          role: msg.role === "user" ? "user" : "npc",
          content: msg.content,
          createdAt: msg.createdAt || new Date().toISOString(),
        });
        importedMessages++;
      }
    }

    return NextResponse.json({
      ok: true,
      profileName,
      displayName: pData.displayName || profileName,
      npcId,
      importedMessages,
    });
  } catch (error) {
    console.error("[profile-import] Error importing profile:", error);
    const message = error instanceof Error ? error.message : "Nhập profile thất bại";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

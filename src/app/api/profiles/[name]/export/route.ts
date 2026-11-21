import { NextRequest, NextResponse } from "next/server";
import { and, asc, eq } from "drizzle-orm";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { chatMessages, db, hermesProfiles, npcs } from "@/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> },
) {
  const resolvedParams = await params;
  const profileName = decodeURIComponent(resolvedParams.name);
  const searchParams = req.nextUrl.searchParams;
  const gatewayId = searchParams.get("gatewayId");

  try {
    // 1. Fetch hermes profile row
    const profileQuery = gatewayId
      ? and(eq(hermesProfiles.profileName, profileName), eq(hermesProfiles.gatewayId, gatewayId))
      : eq(hermesProfiles.profileName, profileName);

    const [profile] = await db
      .select()
      .from(hermesProfiles)
      .where(profileQuery)
      .limit(1);

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // 2. Fetch associated NPC(s)
    const associatedNpcs = await db
      .select()
      .from(npcs)
      .where(eq(npcs.hermesProfileId, profile.id));

    const npc = associatedNpcs[0] || null;

    // 3. Fetch chat messages history
    let messages: Array<{ role: string; content: string; createdAt: string | null }> = [];
    if (npc) {
      const dbMessages = await db
        .select({
          role: chatMessages.role,
          content: chatMessages.content,
          createdAt: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(eq(chatMessages.npcId, npc.id))
        .orderBy(asc(chatMessages.createdAt));

      messages = dbMessages.map((m) => ({
        role: m.role,
        content: m.content,
        createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : (m.createdAt ? String(m.createdAt) : null),
      }));
    }

    // 3b. Fallback: If no chat_messages in DeskRPG table yet, check Hermes state.db session messages
    if (messages.length === 0) {
      try {
        const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
        const hermesStateDbPath = profileName === "default"
          ? path.join(localAppData, "hermes", "state.db")
          : path.join(localAppData, "hermes", "profiles", profileName, "state.db");

        if (fs.existsSync(hermesStateDbPath)) {
          // eslint-disable-next-line @typescript-eslint/no-require-imports
          const Database = require("better-sqlite3");
          const hDb = new Database(hermesStateDbPath, { readonly: true });
          const rows = hDb.prepare(`
            SELECT m.role, m.content
            FROM messages m
            JOIN sessions s ON m.session_id = s.id
            WHERE (s.profile_name = ? OR ? = 'default')
              AND m.role IN ('user', 'assistant')
            ORDER BY m.id ASC
          `).all(profileName, profileName);
          hDb.close();

          if (Array.isArray(rows) && rows.length > 0) {
            messages = rows.map((r: any) => ({
              role: r.role === "assistant" ? "npc" : "user",
              content: typeof r.content === "string" ? r.content : JSON.stringify(r.content),
              createdAt: new Date().toISOString(),
            }));
          }
        }
      } catch (hErr) {
        console.warn("[profile-export] Could not read hermes state.db fallback:", hErr);
      }
    }

    // 4. Fetch local Hermes disk configuration & memories if on host
    const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), "AppData", "Local");
    const hermesRoot = path.join(localAppData, "hermes");
    const profileDir =
      profileName === "default"
        ? hermesRoot
        : path.join(hermesRoot, "profiles", profileName);

    let configYaml: string | null = null;
    let profileYaml: string | null = null;
    const memories: Record<string, string> = {};
    let sandboxConfig: any = null;

    if (fs.existsSync(profileDir)) {
      const cfgPath = path.join(profileDir, "config.yaml");
      if (fs.existsSync(cfgPath)) {
        try { configYaml = fs.readFileSync(cfgPath, "utf8"); } catch {}
      }

      const profPath = path.join(profileDir, "profile.yaml");
      if (fs.existsSync(profPath)) {
        try { profileYaml = fs.readFileSync(profPath, "utf8"); } catch {}
      }

      const memDir = path.join(profileDir, "memories");
      if (fs.existsSync(memDir)) {
        try {
          const files = fs.readdirSync(memDir);
          for (const f of files) {
            const fp = path.join(memDir, f);
            if (fs.statSync(fp).isFile()) {
              memories[f] = fs.readFileSync(fp, "utf8");
            }
          }
        } catch {}
      }

      const soulPath = path.join(profileDir, "SOUL.md");
      if (fs.existsSync(soulPath) && !memories["SOUL.md"]) {
        try { memories["SOUL.md"] = fs.readFileSync(soulPath, "utf8"); } catch {}
      }

      const sandboxPath = path.join(profileDir, "sandbox.json");
      if (fs.existsSync(sandboxPath)) {
        try { sandboxConfig = JSON.parse(fs.readFileSync(sandboxPath, "utf8")); } catch {}
      }
    }

    // 5. Build export bundle
    const exportBundle = {
      schemaVersion: 1,
      format: "deskrpg-bot-backup",
      exportedAt: new Date().toISOString(),
      profile: {
        profileName: profile.profileName,
        displayName: profile.displayName,
        description: profile.description,
        appearance: profile.appearance,
      },
      sandboxConfig,
      npc: npc
        ? {
            name: npc.name,
            positionX: npc.positionX,
            positionY: npc.positionY,
            direction: npc.direction,
            appearance: npc.appearance,
            adapterType: npc.adapterType,
            adapterConfig: npc.adapterConfig,
            agentConfig: npc.agentConfig,
          }
        : null,
      chatHistory: messages,
      hermesDiskConfig: {
        configYaml,
        profileYaml,
        memories,
      },
    };

    const jsonString = JSON.stringify(exportBundle, null, 2);
    const filename = `${profileName}-backup.deskrpg.json`;

    return new NextResponse(jsonString, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[profile-export] Error exporting profile:", error);
    return NextResponse.json({ error: "Failed to export profile" }, { status: 500 });
  }
}

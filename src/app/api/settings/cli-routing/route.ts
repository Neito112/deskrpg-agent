import { NextRequest, NextResponse } from "next/server";
import { loadCliRoutingConfig, saveCliRoutingConfig } from "@/server/cli-routing-store";

export async function GET() {
  try {
    const config = loadCliRoutingConfig();
    return NextResponse.json({ ok: true, config });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to load config" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const config = saveCliRoutingConfig(body);
    return NextResponse.json({ ok: true, config, message: "Saved CLI routing settings" });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Failed to save config" },
      { status: 500 }
    );
  }
}

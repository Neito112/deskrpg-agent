import { NextRequest, NextResponse } from "next/server";
import {
  getBridgeStatus,
  startInteractiveLogin,
  ensureBackgroundBridge,
} from "@/server/gemini-web-bridge";

export async function GET() {
  try {
    const bridge = await getBridgeStatus();
    return NextResponse.json({ ok: true, bridge });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || "status";

    if (action === "login") {
      const bridge = await startInteractiveLogin();
      return NextResponse.json({ ok: true, bridge });
    }

    if (action === "ensure-background") {
      const bridge = await ensureBackgroundBridge();
      return NextResponse.json({ ok: true, bridge });
    }

    const bridge = await getBridgeStatus();
    return NextResponse.json({ ok: true, bridge });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}

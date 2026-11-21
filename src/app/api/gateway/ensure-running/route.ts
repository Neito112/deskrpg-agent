import { NextResponse } from "next/server";
import { ensureHermesGatewayRunning } from "@/lib/hermes/local-manager";

export async function POST() {
  try {
    await ensureHermesGatewayRunning();
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.warn("[ensure-running] Failed to ensure Hermes gateway is running:", err);
    return NextResponse.json({ ok: false, error: "Failed to start gateway" }, { status: 500 });
  }
}

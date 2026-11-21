import { NextResponse } from "next/server";
import { launchHermesApp } from "@/lib/hermes/local-manager";

export async function GET() {
  try {
    const result = await launchHermesApp();
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không thể khởi động Hermes";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function POST() {
  return GET();
}

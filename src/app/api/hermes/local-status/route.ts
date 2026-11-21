import { NextResponse } from "next/server";
import { findHermesBin, findHermesPython, isPortHealthy, ensureHermesGatewayRunning } from "@/lib/hermes/local-manager";
import { autoConnectLocalHermes } from "@/lib/hermes/setup/auto-connect";

export async function GET() {
  const bin = findHermesBin();
  const py = findHermesPython();
  const isInstalled = !!(bin || py);
  const isRunning = await isPortHealthy(8642, "/health", 800);

  return NextResponse.json({
    ok: true,
    isInstalled,
    isRunning,
  });
}

export async function POST() {
  try {
    const bin = findHermesBin();
    const py = findHermesPython();

    // Start gateway if installed
    await ensureHermesGatewayRunning(8642);

    // Auto connect and register default agents
    await autoConnectLocalHermes();

    const isRunning = await isPortHealthy(8642, "/health", 1500);

    return NextResponse.json({
      ok: true,
      isInstalled: !!(bin || py),
      isRunning,
      message: "Đã cài đặt và kết nối Hermes cục bộ thành công!",
    });
  } catch (err) {
    console.error("[hermes-local-status] POST error:", err);
    return NextResponse.json(
      { ok: false, error: "Không thể khởi chạy Hermes cục bộ: " + String(err) },
      { status: 500 }
    );
  }
}

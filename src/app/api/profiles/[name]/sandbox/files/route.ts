import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import {
  deleteProfileReferenceFile,
  getProfileReferenceFilePath,
} from "@/lib/hermes/sandbox-manager";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params;
    const profileName = decodeURIComponent(resolvedParams.name);
    const fileName = req.nextUrl.searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json({ error: "Missing fileName" }, { status: 400 });
    }

    const filePath = getProfileReferenceFilePath(profileName, fileName);
    if (!filePath || !fs.existsSync(filePath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
        "Content-Type": "application/octet-stream",
      },
    });
  } catch (err) {
    console.error("[api/sandbox/files] GET failed:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params;
    const profileName = decodeURIComponent(resolvedParams.name);
    const fileName = req.nextUrl.searchParams.get("fileName");

    if (!fileName) {
      return NextResponse.json({ ok: false, error: "Missing fileName" }, { status: 400 });
    }

    const remaining = deleteProfileReferenceFile(profileName, fileName);
    return NextResponse.json({ ok: true, referenceFiles: remaining });
  } catch (err) {
    console.error("[api/sandbox/files] DELETE failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

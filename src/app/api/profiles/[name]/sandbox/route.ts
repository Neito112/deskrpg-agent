import { NextRequest, NextResponse } from "next/server";
import {
  addProfileReferenceFile,
  getProfileSandboxConfig,
  saveProfileSandboxConfig,
} from "@/lib/hermes/sandbox-manager";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params;
    const profileName = decodeURIComponent(resolvedParams.name);
    const config = getProfileSandboxConfig(profileName);
    return NextResponse.json({ ok: true, ...config });
  } catch (err) {
    console.error("[api/sandbox] GET failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params;
    const profileName = decodeURIComponent(resolvedParams.name);
    const body = await req.json().catch(() => ({}));

    const updated = saveProfileSandboxConfig(profileName, {
      sandboxDir: typeof body.sandboxDir === "string" ? body.sandboxDir : undefined,
      fileNamingConvention:
        typeof body.fileNamingConvention === "string" ? body.fileNamingConvention : undefined,
    });

    return NextResponse.json({ ok: true, ...updated });
  } catch (err) {
    console.error("[api/sandbox] POST failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const resolvedParams = await params;
    const profileName = decodeURIComponent(resolvedParams.name);
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Vui lòng đính kèm tệp tin" }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const files = addProfileReferenceFile(profileName, file.name, buffer);

    return NextResponse.json({ ok: true, referenceFiles: files });
  } catch (err) {
    console.error("[api/sandbox] PUT upload failed:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}

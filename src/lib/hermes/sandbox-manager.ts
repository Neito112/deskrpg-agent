import fs from "node:fs";
import path from "node:path";
import { getHermesHome } from "./local-manager";

export interface ReferenceFileInfo {
  name: string;
  size: number;
  updatedAt: string;
}

export interface ProfileSandboxConfig {
  profileName: string;
  sandboxDir: string;
  fileNamingConvention: string;
  referenceFiles: ReferenceFileInfo[];
  defaultWorkspaceDir: string;
  existsOnDisk: boolean;
}

export function getProfileDir(profileName: string): string {
  const hermesHome = getHermesHome();
  return profileName === "default"
    ? path.join(hermesHome, "profiles", "default")
    : path.join(hermesHome, "profiles", profileName);
}

export function getReferenceFilesDir(profileName: string): string {
  const pDir = getProfileDir(profileName);
  return path.join(pDir, "sandbox", "reference_files");
}

export function getDefaultWorkspaceDir(profileName: string): string {
  const safeName = profileName.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(process.cwd(), "workspace", safeName);
}

export function buildSandboxSoulSection(
  sandboxDir?: string | null,
  fileNamingConvention?: string | null,
  referenceFiles?: string[]
): string {
  const cleanDir = (sandboxDir || "").trim();
  const cleanNaming = (fileNamingConvention || "").trim();

  const dirLine = cleanDir
    ? `- **Thư mục làm việc / nhả file chính (Sandbox Directory)**: \`${cleanDir}\`\n  *(Mọi file sản phẩm, tài liệu, mã nguồn, bản vẽ tạo ra BẮT BUỘC lưu trực tiếp vào thư mục này)*`
    : `- **Thư mục làm việc / nhả file chính (Sandbox Directory)**: _Chưa thiết lập (để trống). Khi người dùng yêu cầu xuất file, hãy hỏi người dùng muốn lưu vào đâu hoặc tạo tại thư mục làm việc hiện tại._`;

  const namingLine = cleanNaming
    ? `- **Quy chuẩn đặt tên file (File Naming Standard)**: \`${cleanNaming}\`\n  *(Mọi file tạo ra phải tuân thủ nghiêm ngặt định dạng quy chuẩn này)*`
    : `- **Quy chuẩn đặt tên file (File Naming Standard)**: _Chưa có quy chuẩn cụ thể, đặt tên tiếng Việt không dấu hoặc tiếng Anh ngắn gọn, rõ ràng theo ngữ cảnh._`;

  const filesLine =
    referenceFiles && referenceFiles.length > 0
      ? `- **Tệp mẫu & Tài liệu tham chiếu (Reference & Template Files)**: Đang có ${referenceFiles.length} tệp mẫu sẵn sàng tại \`sandbox/reference_files\`: ${referenceFiles.map((f) => `\`${f}\``).join(", ")}. Hãy tham chiếu các tệp này làm chuẩn mực phong cách và kỹ thuật khi thực hiện công việc.`
      : `- **Tệp mẫu & Tài liệu tham chiếu (Reference & Template Files)**: _Chưa có file mẫu._`;

  return `\n## CẤU HÌNH SANDBOX, THƯ MỤC LÀM VIỆC & QUY TẮC ĐẶT TÊN FILE (WORKPLACE SANDBOX)
${dirLine}
${namingLine}
${filesLine}

> [!IMPORTANT]
> **QUY TẮC BẮT BUỘC KHI XUẤT FILE**: Nếu thư mục làm việc đã được thiết lập, mọi file bạn tạo ra (bản vẽ, báo cáo, mã nguồn, tài liệu) PHẢI được ghi vào đúng thư mục trên và tuân thủ chặt chẽ quy chuẩn đặt tên file!
`;
}

export function updateSoulWithSandbox(
  soulContent: string,
  sandboxDir?: string | null,
  fileNamingConvention?: string | null,
  referenceFiles?: string[]
): string {
  const section = buildSandboxSoulSection(sandboxDir, fileNamingConvention, referenceFiles);
  const headerRegex = /## CẤU HÌNH SANDBOX[\s\S]*?(?=(\n## |\n#[^#]|$))/i;

  if (headerRegex.test(soulContent)) {
    return soulContent.replace(headerRegex, section.trim());
  }

  return soulContent.trim() + "\n" + section;
}

export function getProfileSandboxConfig(profileName: string): ProfileSandboxConfig {
  const pDir = getProfileDir(profileName);
  fs.mkdirSync(pDir, { recursive: true });

  const refDir = getReferenceFilesDir(profileName);
  fs.mkdirSync(refDir, { recursive: true });

  const sandboxJsonPath = path.join(pDir, "sandbox.json");
  let sandboxDir = "";
  let fileNamingConvention = "";

  if (fs.existsSync(sandboxJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(sandboxJsonPath, "utf-8"));
      sandboxDir = typeof data.sandboxDir === "string" ? data.sandboxDir.trim() : "";
      fileNamingConvention =
        typeof data.fileNamingConvention === "string" ? data.fileNamingConvention.trim() : "";
    } catch {}
  }

  // Quét danh sách file mẫu
  const referenceFiles: ReferenceFileInfo[] = [];
  try {
    const entries = fs.readdirSync(refDir, { withFileTypes: true });
    for (const ent of entries) {
      if (ent.isFile() && !ent.name.startsWith(".")) {
        const fullPath = path.join(refDir, ent.name);
        try {
          const stat = fs.statSync(fullPath);
          referenceFiles.push({
            name: ent.name,
            size: stat.size,
            updatedAt: stat.mtime.toISOString(),
          });
        } catch {}
      }
    }
  } catch {}

  const defaultWorkspaceDir = getDefaultWorkspaceDir(profileName);
  const existsOnDisk = Boolean(sandboxDir && fs.existsSync(sandboxDir));

  return {
    profileName,
    sandboxDir,
    fileNamingConvention,
    referenceFiles,
    defaultWorkspaceDir,
    existsOnDisk,
  };
}

export function saveProfileSandboxConfig(
  profileName: string,
  config: { sandboxDir?: string | null; fileNamingConvention?: string | null }
): ProfileSandboxConfig {
  const pDir = getProfileDir(profileName);
  fs.mkdirSync(pDir, { recursive: true });

  const current = getProfileSandboxConfig(profileName);

  const cleanSandboxDir = config.sandboxDir !== undefined ? (config.sandboxDir || "").trim() : current.sandboxDir;
  const cleanNaming =
    config.fileNamingConvention !== undefined
      ? (config.fileNamingConvention || "").trim()
      : current.fileNamingConvention;

  // Nếu người dùng chỉ định thư mục, tự động tạo nếu chưa tồn tại
  if (cleanSandboxDir) {
    try {
      fs.mkdirSync(cleanSandboxDir, { recursive: true });
    } catch (err) {
      console.warn(`[sandbox-manager] Failed to create sandboxDir "${cleanSandboxDir}":`, err);
    }
  }

  const sandboxJsonPath = path.join(pDir, "sandbox.json");
  fs.writeFileSync(
    sandboxJsonPath,
    JSON.stringify(
      {
        sandboxDir: cleanSandboxDir,
        fileNamingConvention: cleanNaming,
        updatedAt: new Date().toISOString(),
      },
      null,
      2
    ),
    "utf-8"
  );

  // Đồng bộ vào SOUL.md
  const soulPath = path.join(pDir, "SOUL.md");
  let soulContent = fs.existsSync(soulPath)
    ? fs.readFileSync(soulPath, "utf-8")
    : `# ${profileName}\n`;

  const refNames = current.referenceFiles.map((f) => f.name);
  soulContent = updateSoulWithSandbox(soulContent, cleanSandboxDir, cleanNaming, refNames);
  fs.writeFileSync(soulPath, soulContent, "utf-8");

  return getProfileSandboxConfig(profileName);
}

export function addProfileReferenceFile(
  profileName: string,
  fileName: string,
  buffer: Buffer
): ReferenceFileInfo[] {
  const refDir = getReferenceFilesDir(profileName);
  fs.mkdirSync(refDir, { recursive: true });

  // Sanitize filename to avoid directory traversal
  const safeName = path.basename(fileName).replace(/[^a-zA-Z0-9._\- ()[\]+]/g, "_");
  if (!safeName) throw new Error("Tên tệp không hợp lệ");

  const targetPath = path.join(refDir, safeName);
  fs.writeFileSync(targetPath, buffer);

  // Đồng bộ lại SOUL.md
  const current = getProfileSandboxConfig(profileName);
  saveProfileSandboxConfig(profileName, {
    sandboxDir: current.sandboxDir,
    fileNamingConvention: current.fileNamingConvention,
  });

  return getProfileSandboxConfig(profileName).referenceFiles;
}

export function deleteProfileReferenceFile(profileName: string, fileName: string): ReferenceFileInfo[] {
  const refDir = getReferenceFilesDir(profileName);
  const safeName = path.basename(fileName);
  const targetPath = path.join(refDir, safeName);

  if (fs.existsSync(targetPath)) {
    try {
      fs.unlinkSync(targetPath);
    } catch {}
  }

  // Đồng bộ lại SOUL.md
  const current = getProfileSandboxConfig(profileName);
  saveProfileSandboxConfig(profileName, {
    sandboxDir: current.sandboxDir,
    fileNamingConvention: current.fileNamingConvention,
  });

  return getProfileSandboxConfig(profileName).referenceFiles;
}

export function getProfileReferenceFilePath(profileName: string, fileName: string): string | null {
  const refDir = getReferenceFilesDir(profileName);
  const safeName = path.basename(fileName);
  const targetPath = path.join(refDir, safeName);

  if (fs.existsSync(targetPath)) {
    return targetPath;
  }
  return null;
}

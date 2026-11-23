import fs from "node:fs";
import path from "node:path";

const BASE_DIR = path.resolve(".vendor/agency-agents");
const DATA_DIR = path.resolve("data");

if (!fs.existsSync(BASE_DIR)) {
  console.error("Directory .vendor/agency-agents not found!");
  process.exit(1);
}

fs.mkdirSync(DATA_DIR, { recursive: true });

const divisionsFile = path.join(BASE_DIR, "divisions.json");
const divisionsMeta = JSON.parse(fs.readFileSync(divisionsFile, "utf-8")).divisions;

function parseFrontmatter(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { frontmatter: {}, body: content };

  const rawFm = match[1];
  const body = content.slice(match[0].length).trim();
  const frontmatter = {};

  for (const line of rawFm.split(/\r?\n/)) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      let val = line.slice(colonIdx + 1).trim();
      // Remove quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (key === "tools") {
        frontmatter[key] = val.split(",").map((s) => s.trim()).filter(Boolean);
      } else {
        frontmatter[key] = val;
      }
    }
  }

  return { frontmatter, body };
}

function extractSection(body, headerPattern) {
  const regex = new RegExp(`(?:##|###)\\s*.*?(${headerPattern})[^\\n]*\\n([\\s\\S]*?)(?=(?:\\n##\\s)|$)`, "i");
  const match = body.match(regex);
  return match && match[2] ? match[2].trim() : "";
}

function extractBulletPoints(text) {
  if (!text) return [];
  const lines = text.split(/\r?\n/);
  const bullets = [];
  for (const l of lines) {
    const trimmed = l.trim();
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      bullets.push(trimmed.slice(2).trim());
    }
  }
  return bullets;
}

const allAgents = [];

for (const [divKey, divInfo] of Object.entries(divisionsMeta)) {
  const divDir = path.join(BASE_DIR, divKey);
  if (!fs.existsSync(divDir)) continue;

  const files = fs.readdirSync(divDir).filter((f) => f.endsWith(".md") && !f.startsWith("README"));

  for (const file of files) {
    const slug = path.basename(file, ".md");
    const fullPath = path.join(divDir, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const { frontmatter, body } = parseFrontmatter(content);

    const identityText = extractSection(body, "Identity");
    const missionText = extractSection(body, "Core Mission|Mission");
    const capabilitiesText = extractSection(body, "Core Capabilities|Capabilities");
    const workflowText = extractSection(body, "Workflow Process|Workflow");
    const criticalRulesText = extractSection(body, "Critical Rules|Rules");

    const agentRecord = {
      slug,
      division: divKey,
      divisionLabel: divInfo.label,
      divisionIcon: divInfo.icon,
      divisionColor: divInfo.color,
      name: frontmatter.name || slug,
      emoji: frontmatter.emoji || "👤",
      color: frontmatter.color || "blue",
      vibe: frontmatter.vibe || "",
      description: frontmatter.description || "",
      tools: frontmatter.tools || [],
      identitySnippet: identityText.slice(0, 500),
      coreCapabilities: extractBulletPoints(capabilitiesText).slice(0, 15),
      coreMissionSnippet: missionText.slice(0, 600),
      criticalRulesSnippet: criticalRulesText.slice(0, 500),
      workflowSnippet: workflowText.slice(0, 600),
      relativeFilePath: `.vendor/agency-agents/${divKey}/${file}`,
    };

    allAgents.push(agentRecord);
  }
}

// Write catalog JSON
const catalogJsonPath = path.join(DATA_DIR, "agency-agents-catalog.json");
fs.writeFileSync(catalogJsonPath, JSON.stringify(allAgents, null, 2), "utf-8");
console.log(`Indexed ${allAgents.length} agents into ${catalogJsonPath}`);

// Write markdown summary
let summaryMd = `# Danh Mục 268 Nhân Sự Chuẩn Agency (Agency Agents Knowledge Base)

Bộ tri thức cơ sở gồm ${allAgents.length} chức danh nhân sự AI chuyên nghiệp trên 18 phòng ban/lĩnh vực (divisions) từ \`Neito112/agency-agents\`.
Dùng cho Trưởng Phòng Tuyển Nhân Sự DeskRPG tra cứu, đối chiếu và tuyển dụng tự động.

---

`;

const byDivision = {};
for (const a of allAgents) {
  if (!byDivision[a.division]) byDivision[a.division] = [];
  byDivision[a.division].push(a);
}

for (const [divKey, list] of Object.entries(byDivision)) {
  const divInfo = divisionsMeta[divKey] || { label: divKey, icon: "Folder" };
  summaryMd += `## 🏢 Phòng Ban: ${divInfo.label} (${list.length} vị trí)\n\n`;
  summaryMd += `| Biểu Tượng | Chức Danh (Name) | Vibe / Tinh Thần | Mã Slug | Chuyên Môn Cốt Lõi |\n`;
  summaryMd += `| :---: | :--- | :--- | :--- | :--- |\n`;
  for (const a of list) {
    const descShort = (a.description || "").replace(/\|/g, "-").slice(0, 120);
    const vibeShort = (a.vibe || "").replace(/\|/g, "-").slice(0, 80);
    summaryMd += `| ${a.emoji} | **${a.name}** | *${vibeShort}* | \`${a.slug}\` | ${descShort}... |\n`;
  }
  summaryMd += `\n`;
}

const summaryMdPath = path.join(DATA_DIR, "agency-agents-summary.md");
fs.writeFileSync(summaryMdPath, summaryMd, "utf-8");
console.log(`Generated summary documentation at ${summaryMdPath}`);

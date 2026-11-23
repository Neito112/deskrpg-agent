#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Support both workspace location and hermes skill location
const possibleCatalogPaths = [
  path.resolve(__dirname, "../data/agency-agents-catalog.json"),
  path.resolve(__dirname, "agency-agents-catalog.json"),
  path.resolve(process.env.LOCALAPPDATA || "", "hermes/skills/quan-ly-nhan-su/agency-agents-catalog.json"),
  path.resolve(process.cwd(), "data/agency-agents-catalog.json"),
];

let catalogPath = possibleCatalogPaths.find((p) => fs.existsSync(p));
if (!catalogPath) {
  catalogPath = possibleCatalogPaths[0];
}

let catalog = [];
if (fs.existsSync(catalogPath)) {
  try {
    catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8"));
  } catch (err) {
    console.error("Failed to parse catalog JSON:", err);
  }
}

function normalizeStr(s) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

export function searchAgents(query, limit = 5) {
  if (!query) return catalog.slice(0, limit);
  const qNorm = normalizeStr(query);
  const qTokens = qNorm.split(/\s+/).filter(Boolean);

  const scored = catalog.map((agent) => {
    let score = 0;
    const nameNorm = normalizeStr(agent.name);
    const slugNorm = normalizeStr(agent.slug);
    const divNorm = normalizeStr(agent.division + " " + agent.divisionLabel);
    const vibeNorm = normalizeStr(agent.vibe);
    const descNorm = normalizeStr(agent.description);
    const capsNorm = normalizeStr(agent.coreCapabilities.join(" "));

    if (slugNorm === qNorm || nameNorm === qNorm) score += 100;
    if (slugNorm.includes(qNorm) || nameNorm.includes(qNorm)) score += 50;

    for (const t of qTokens) {
      if (nameNorm.includes(t)) score += 20;
      if (slugNorm.includes(t)) score += 15;
      if (divNorm.includes(t)) score += 10;
      if (vibeNorm.includes(t)) score += 8;
      if (descNorm.includes(t)) score += 5;
      if (capsNorm.includes(t)) score += 3;
    }

    return { agent, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((s) => s.agent);
}

export function getAgentBySlug(slug) {
  const norm = normalizeStr(slug);
  return catalog.find((a) => normalizeStr(a.slug) === norm || normalizeStr(a.name) === norm);
}

export function generateHireTemplate(query) {
  const matches = searchAgents(query, 1);
  if (!matches || matches.length === 0) {
    return null;
  }

  const agent = matches[0];
  const cleanProfileName = agent.slug.replace(/[^a-z0-9_]/g, "_").slice(0, 32);

  // Map appropriate skills based on division
  const skills = ["omniroute"];
  if (["engineering", "testing", "security", "game-development"].includes(agent.division)) {
    skills.push("superpowers");
    skills.push("claude-code-setup");
    if (agent.division === "security") skills.push("claude-security");
  } else if (["marketing", "sales", "paid-media", "product"].includes(agent.division)) {
    skills.push("browser-tabs");
    skills.push("obsidian");
  } else if (["academic", "research", "finance"].includes(agent.division)) {
    skills.push("zotero");
    skills.push("obsidian");
  } else if (["design", "spatial-computing"].includes(agent.division)) {
    skills.push("browser-tabs");
    skills.push("dynamic-slide-report");
  } else {
    skills.push("browser-tabs");
    skills.push("caveman");
  }

  const expertise = agent.description
    ? `${agent.description} Năng lực cốt lõi: ${agent.coreCapabilities.slice(0, 5).join("; ")}.`
    : agent.coreCapabilities.slice(0, 8).join("; ");

  const personality = agent.vibe
    ? `${agent.vibe} Phong cách làm việc: Chuyên nghiệp, chủ động, chuẩn mực cao, tư duy hướng tới kết quả thực tế.`
    : "Chuyên nghiệp, nhiệt huyết, tỉ mỉ, tập trung cao độ vào chất lượng và hiệu quả công việc.";

  const instructions = `Khi nhận nhiệm vụ:
1. Nắm bắt đề bài, mục tiêu và yêu cầu chất lượng theo chuẩn chuyên gia ${agent.name}.
2. Tự chủ triển khai thực thi từ A đến Z, tận dụng các quy trình chuẩn: ${agent.coreCapabilities.slice(0, 3).join(", ")}.
3. Kiểm tra chất lượng, tính chính xác và an toàn trước khi bàn giao kết quả cuối cùng cho sếp.`;

  const welcomeMessage = `Chào sếp! Em là ${agent.name} (${agent.divisionLabel}) đã sẵn sàng nhận việc tại văn phòng ảo. Với tinh thần "${agent.vibe || "Tập trung giải quyết bài toán cốt lõi"}", sếp cứ yên tâm giao việc cho em nhé!`;

  return {
    matchedAgent: {
      name: agent.name,
      division: agent.divisionLabel,
      slug: agent.slug,
      emoji: agent.emoji,
      vibe: agent.vibe,
    },
    hireJson: {
      profileName: cleanProfileName,
      displayName: `${agent.emoji} ${agent.name}`,
      role: `${agent.name} (${agent.divisionLabel})`,
      expertise: expertise.replace(/[\r\n]+/g, " ").trim(),
      skills,
      personality: personality.replace(/[\r\n]+/g, " ").trim(),
      welcomeMessage,
      instructions: instructions.replace(/[\r\n]+/g, " ").trim(),
    },
  };
}

// CLI handler
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "search";
  const query = args.slice(1).join(" ");

  if (command === "search") {
    const results = searchAgents(query, 8);
    console.log(`Tìm thấy ${results.length} vị trí phù hợp với từ khóa "${query}":\n`);
    for (const r of results) {
      console.log(`- ${r.emoji} [${r.divisionLabel}] ${r.name} (\`${r.slug}\`)`);
      if (r.vibe) console.log(`  *Vibe:* ${r.vibe}`);
      console.log(`  *Mô tả:* ${r.description.slice(0, 140)}...`);
      console.log();
    }
    return;
  }

  if (command === "get") {
    const agent = getAgentBySlug(query);
    if (!agent) {
      console.log(`Không tìm thấy agent với slug: "${query}"`);
      process.exit(1);
    }
    console.log(JSON.stringify(agent, null, 2));
    return;
  }

  if (command === "hire-template" || command === "template") {
    const template = generateHireTemplate(query);
    if (!template) {
      console.log(`Không tìm thấy vị trí tương ứng để tạo mẫu tuyển dụng cho: "${query}"`);
      process.exit(1);
    }
    console.log(`=== Mẫu Tuyển Dụng Chuẩn Agency Agents: ${template.matchedAgent.emoji} ${template.matchedAgent.name} ===\n`);
    console.log("```deskrpg:hire");
    console.log(JSON.stringify(template.hireJson, null, 2));
    console.log("```");
    return;
  }

  if (command === "divisions") {
    const divs = {};
    for (const a of catalog) {
      divs[a.divisionLabel] = (divs[a.divisionLabel] || 0) + 1;
    }
    console.log("Danh sách 18 phòng ban chuẩn Agency Agents (Tổng cộng 268 vị trí):\n");
    for (const [d, count] of Object.entries(divs)) {
      console.log(`- ${d}: ${count} vị trí`);
    }
    return;
  }

  console.log(`Sử dụng:
  node scripts/lookup-agency-agent.mjs search <từ_khóa>
  node scripts/lookup-agency-agent.mjs get <slug>
  node scripts/lookup-agency-agent.mjs hire-template <từ_khóa>
  node scripts/lookup-agency-agent.mjs divisions
`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

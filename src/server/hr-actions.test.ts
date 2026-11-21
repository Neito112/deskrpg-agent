import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { parseHireAction, parseTrainAction } from "./hr-actions";
import { removeProfileDiskDirectory } from "@/lib/hermes-profiles";
import { getHermesHome } from "@/lib/hermes/local-manager";

test("parseHireAction correctly extracts deskrpg:hire block", () => {
  const text = `Tôi đã tìm được ứng viên hoàn hảo cho bạn!

\`\`\`deskrpg:hire
{
  "profileName": "dev_react",
  "displayName": "Lập Trình Viên React",
  "role": "Frontend Developer",
  "expertise": "React 19, Next.js, TailwindCSS",
  "skills": ["software-development", "web"],
  "personality": "Nhiệt tình, tỉ mỉ",
  "welcomeMessage": "Chào sếp, tôi sẵn sàng nhận việc!"
}
\`\`\`

Ứng viên đã sẵn sàng!`;

  const parsed = parseHireAction(text);
  assert.ok(parsed);
  assert.equal(parsed.profileName, "dev_react");
  assert.equal(parsed.displayName, "Lập Trình Viên React");
  assert.equal(parsed.role, "Frontend Developer");
  assert.deepEqual(parsed.skills, ["software-development", "web"]);
});

test("parseHireAction correctly extracts sandboxDir and fileNamingConvention when present or leaves them undefined", () => {
  const textWithSandbox = `\`\`\`deskrpg:hire
{
  "profileName": "designer_3d",
  "displayName": "Thiết Kế 3D",
  "role": "3D Designer",
  "expertise": "Blender, Maya",
  "sandboxDir": "D:\\\\Outputs\\\\3D",
  "fileNamingConvention": "[Project]_[Date].[ext]"
}
\`\`\``;

  const parsed1 = parseHireAction(textWithSandbox);
  assert.ok(parsed1);
  assert.equal(parsed1.sandboxDir, "D:\\Outputs\\3D");
  assert.equal(parsed1.fileNamingConvention, "[Project]_[Date].[ext]");

  const textWithoutSandbox = `\`\`\`deskrpg:hire
{
  "profileName": "designer_2d",
  "displayName": "Thiết Kế 2D",
  "role": "2D Designer",
  "expertise": "Photoshop"
}
\`\`\``;

  const parsed2 = parseHireAction(textWithoutSandbox);
  assert.ok(parsed2);
  assert.equal(parsed2.sandboxDir, undefined);
  assert.equal(parsed2.fileNamingConvention, undefined);
});

test("parseTrainAction correctly extracts deskrpg:train block", () => {
  const text = `Đã thiết kế lộ trình đào tạo cho nhân sự:

\`\`\`deskrpg:train
{
  "targetEmployee": "Lập Trình Viên React",
  "addedExpertise": "Kiến thức chuyên sâu về Server Actions và Turbopack",
  "addedSkills": ["devops", "productivity"],
  "addedTools": ["curl", "git"],
  "evaluation": "Nâng cao tốc độ xử lý lỗi và build"
}
\`\`\`

Đã hoàn tất huấn luyện!`;

  const parsed = parseTrainAction(text);
  assert.ok(parsed);
  assert.equal(parsed.targetEmployee, "Lập Trình Viên React");
  assert.equal(parsed.addedExpertise, "Kiến thức chuyên sâu về Server Actions và Turbopack");
  assert.deepEqual(parsed.addedSkills, ["devops", "productivity"]);
  assert.deepEqual(parsed.addedTools, ["curl", "git"]);
});

test("parseTrainAction returns null when no train block is present", () => {
  assert.equal(parseTrainAction("Đang kiểm tra nhân viên..."), null);
});

test("parseHireAction correctly extracts generic json codeblock containing profileName", () => {
  const text = `Tôi gửi hồ sơ ứng viên:
\`\`\`json
{
  "profileName": "interior_concept",
  "displayName": "Thiết Kế Nội Thất",
  "role": "Designer",
  "expertise": "Concept 3D"
}
\`\`\``;
  const parsed = parseHireAction(text);
  assert.ok(parsed);
  assert.equal(parsed.profileName, "interior_concept");
  assert.equal(parsed.displayName, "Thiết Kế Nội Thất");
});

test("parseTrainAction correctly extracts generic json codeblock containing targetEmployee", () => {
  const text = `Cập nhật năng lực:
\`\`\`json
{
  "targetEmployee": "Thiết Kế Nội Thất",
  "addedExpertise": "Phối cảnh nâng cao",
  "addedSkills": ["creative"]
}
\`\`\``;
  const parsed = parseTrainAction(text);
  assert.ok(parsed);
  assert.equal(parsed.targetEmployee, "Thiết Kế Nội Thất");
  assert.equal(parsed.addedExpertise, "Phối cảnh nâng cao");
});

test("removeProfileDiskDirectory correctly removes non-default profile directory from disk", () => {
  const hermesHome = getHermesHome();
  const testProfileName = `test_delete_profile_${Date.now()}`;
  const testDir = path.join(hermesHome, "profiles", testProfileName);

  // Setup test directory
  fs.mkdirSync(path.join(testDir, "skills"), { recursive: true });
  fs.writeFileSync(path.join(testDir, "SOUL.md"), "# Test Employee\n", "utf-8");
  fs.writeFileSync(path.join(testDir, "config.yaml"), "model: test\n", "utf-8");

  assert.ok(fs.existsSync(testDir));
  assert.ok(fs.existsSync(path.join(testDir, "SOUL.md")));

  // Run removal
  removeProfileDiskDirectory(testProfileName);

  // Assert directory is permanently gone
  assert.equal(fs.existsSync(testDir), false);
});

test("removeProfileDiskDirectory protects default profile and does not delete it", () => {
  const hermesHome = getHermesHome();
  const defaultDir = path.join(hermesHome, "profiles", "default");
  const wasExisting = fs.existsSync(defaultDir);

  if (!wasExisting) {
    fs.mkdirSync(defaultDir, { recursive: true });
    fs.writeFileSync(path.join(defaultDir, "config.yaml"), "# default\n", "utf-8");
  }

  // Attempting to delete "default" should be a no-op
  removeProfileDiskDirectory("default");

  assert.ok(fs.existsSync(defaultDir));
});

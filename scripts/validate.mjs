import { access, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const projectRoot = process.cwd();
const manifestPath = path.join(projectRoot, "manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const errors = [];

if (manifest.manifest_version !== 3) {
  errors.push("manifest_version 必须为 3");
}

if (!/^\d+\.\d+\.\d+$/.test(manifest.version)) {
  errors.push("manifest version 必须使用 x.y.z 格式");
}

const referencedFiles = [
  manifest.background?.service_worker,
  manifest.action?.default_popup,
  manifest.options_ui?.page,
  ...(manifest.content_scripts ?? []).flatMap((entry) => [
    ...(entry.css ?? []),
    ...(entry.js ?? [])
  ])
].filter(Boolean);

for (const relativePath of referencedFiles) {
  try {
    await access(path.join(projectRoot, relativePath));
  } catch {
    errors.push(`manifest 引用了不存在的文件：${relativePath}`);
  }
}

if (!manifest.permissions?.includes("storage")) {
  errors.push("设置功能需要 storage 权限");
}

if (errors.length > 0) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`扩展结构有效，共检查 ${referencedFiles.length} 个入口文件。`);
}

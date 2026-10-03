import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const archiveRoot = path.join(root, '每一期底稿');
const issueFiles = fs.readdirSync(path.join(root, 'content/issues')).filter(name => /^issue-\d{3}\.json$/.test(name)).sort();

function copyFile(source, destination, entries, label) {
  if (!fs.existsSync(source) || !fs.statSync(source).isFile()) return;
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
  entries.push({ source: path.relative(root, source).replaceAll(path.sep, '/'), destination: path.relative(root, destination).replaceAll(path.sep, '/'), label });
}

function copyTree(source, destination, entries, label) {
  if (!fs.existsSync(source)) return;
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to, entries, label);
    else if (entry.isFile()) copyFile(from, to, entries, label);
  }
}

function issueNumberFromFile(file) {
  return file.match(/^issue-(\d{3})\.json$/)?.[1] ?? null;
}

function archiveIssue(issueNumber) {
  const issueFile = `issue-${issueNumber}.json`;
  const issuePath = path.join(root, 'content/issues', issueFile);
  const issue = JSON.parse(fs.readFileSync(issuePath, 'utf8'));
  const destination = path.join(archiveRoot, issueNumber);
  const entries = [];

  fs.mkdirSync(destination, { recursive: true });
  copyFile(issuePath, path.join(destination, 'content', issueFile), entries, 'issue-source');

  const exportRoots = ['publish', 'wechat', 'xiaohongshu', 'zhihu', 'zhihu-mixed', 'social'];
  for (const exportRoot of exportRoots) {
    const sourceRoot = path.join(root, 'exports', exportRoot);
    if (!fs.existsSync(sourceRoot)) continue;
    for (const entry of fs.readdirSync(sourceRoot, { withFileTypes: true })) {
      const source = path.join(sourceRoot, entry.name);
      if (!source.includes(issue.slug)) continue;
      const relative = path.relative(path.join(root, 'exports'), source);
      if (entry.isDirectory()) copyTree(source, path.join(destination, 'generated', relative), entries, `exports/${exportRoot}`);
      else if (entry.isFile()) copyFile(source, path.join(destination, 'generated', relative), entries, `exports/${exportRoot}`);
    }
  }

  const publicRoot = path.join(root, 'public/images/issues');
  if (fs.existsSync(publicRoot)) {
    for (const name of fs.readdirSync(publicRoot)) {
      if (name.startsWith(`issue-${issueNumber}-`)) copyFile(path.join(publicRoot, name), path.join(destination, 'public-images', name), entries, 'public-images');
    }
  }

  for (const legacy of [`wechat-full-${Number(issueNumber)}`, `wechat-style-sample-${Number(issueNumber)}`]) {
    copyTree(path.join(root, 'exports', legacy), path.join(destination, 'generated', 'legacy', legacy), entries, 'legacy-export');
  }

  if (issueNumber === '006') copyTree(path.join(root, 'exports/covers/issue-006'), path.join(destination, 'cover'), entries, 'cover-production');

  const manifest = {
    schemaVersion: 1,
    issueNumber: Number(issueNumber),
    issueId: issue.id,
    slug: issue.slug,
    title: issue.title,
    archivedAt: new Date().toISOString(),
    destination: path.relative(root, destination).replaceAll(path.sep, '/'),
    entryCount: entries.length,
    entries,
    notes: [
      '本归档为本地生成物副本，保留 exports/ 原路径以兼容既有预览和下载流程。',
      '未复制 out/ 构建缓存、源码和不具备明确期号归属的通用素材。',
    ],
  };
  fs.writeFileSync(path.join(destination, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  return { issueNumber, slug: issue.slug, entryCount: entries.length, destination: path.relative(root, destination).replaceAll(path.sep, '/') };
}

function ensureReadme() {
  const readme = path.join(archiveRoot, 'README.md');
  if (fs.existsSync(readme)) return;
  fs.mkdirSync(archiveRoot, { recursive: true });
  const lines = [
    '# 每期底稿',
    '',
    '每一期生成的本地稿件、平台派生文件、图片和封面候选按三位期号存放在独立目录，例如 006/。',
    '',
    '- content/：当期结构化事实稿副本。',
    '- generated/：公众号、知乎、小红书、发布清单等派生稿副本。',
    '- cover/：当期封面母图、成品候选和生成辅助素材。',
    '- public-images/：已存在于官网公共图片目录且能明确归属本期的素材。',
    '- manifest.json：记录来源路径、归档路径和文件数量。',
    '',
    '归档命令：pnpm.cmd ops:archive:issue -- --issue 006。该命令只复制，不删除原始 exports 文件。',
    '',
  ];
  fs.writeFileSync(readme, lines.join('\n'));
}

function main() {
  ensureReadme();
  const index = process.argv.indexOf('--issue');
  const requested = index >= 0 ? process.argv[index + 1] : null;
  const numbers = requested ? [requested.padStart(3, '0')] : issueFiles.map(issueNumberFromFile).filter(Boolean);
  for (const number of numbers) {
    if (!/^\d{3}$/.test(number) || !fs.existsSync(path.join(root, 'content/issues', `issue-${number}.json`))) throw new Error(`找不到期刊 ${number} 的结构化稿件`);
  }
  console.log(JSON.stringify(numbers.map(archiveIssue), null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();

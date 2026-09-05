import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { Issue } from "../content/schema";

export type PlatformAssets = {
  xiaohongshuCover: string;
  wechatCover: string;
};

export async function generatePlatformAssets(
  issue: Issue,
): Promise<PlatformAssets> {
  const wechatDirectory = path.join(process.cwd(), "exports", "wechat");
  const xhsDirectory = path.join(
    process.cwd(),
    "exports",
    "xiaohongshu",
    issue.slug,
  );
  await Promise.all([
    mkdir(wechatDirectory, { recursive: true }),
    mkdir(xhsDirectory, { recursive: true }),
  ]);

  const heroPath = resolveHeroPath(issue);
  const wechatCover = path.join(wechatDirectory, `${issue.slug}-cover.jpg`);
  const xiaohongshuCover = path.join(xhsDirectory, "01-cover.jpg");

  await Promise.all([
    renderWechatCover(issue, heroPath, wechatCover),
    renderXiaohongshuCover(issue, heroPath, xiaohongshuCover),
  ]);

  return { wechatCover, xiaohongshuCover };
}

async function renderWechatCover(
  issue: Issue,
  heroPath: string | null,
  outputPath: string,
) {
  const base = heroPath
    ? sharp(heroPath).resize(900, 383, { fit: "cover" }).modulate({ brightness: 0.72 })
    : sharp({
        create: {
          width: 900,
          height: 383,
          channels: 3,
          background: "#112032",
        },
      });
  const overlay = Buffer.from(
    `<svg width="900" height="383" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07111f" stop-opacity=".92"/><stop offset=".75" stop-color="#07111f" stop-opacity=".2"/></linearGradient></defs>
      <rect width="900" height="383" fill="url(#g)"/>
      <rect x="52" y="48" width="44" height="5" rx="2" fill="#35d0ba"/>
      <text x="52" y="92" fill="#9deade" font-size="22" font-family="Microsoft YaHei, sans-serif" font-weight="700">AI 前哨站 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</text>
      ${svgLines(issue.hero?.lead ?? issue.title, 52, 164, 48, 2, 16, "#ffffff", 800)}
    </svg>`,
  );

  await base
    .composite([{ input: overlay }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(outputPath);
}

async function renderXiaohongshuCover(
  issue: Issue,
  heroPath: string | null,
  outputPath: string,
) {
  const base = heroPath
    ? sharp(heroPath)
        .resize(1080, 1440, { fit: "cover", position: "attention" })
        .modulate({ brightness: 0.62, saturation: 0.85 })
    : sharp({
        create: {
          width: 1080,
          height: 1440,
          channels: 3,
          background: "#0d1b2a",
        },
      });
  const lead = issue.hero?.lead ?? issue.title;
  const deck = issue.hero?.deck ?? issue.summary;
  const overlay = Buffer.from(
    `<svg width="1080" height="1440" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="v" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07111f" stop-opacity=".12"/><stop offset=".52" stop-color="#07111f" stop-opacity=".62"/><stop offset="1" stop-color="#07111f" stop-opacity=".98"/></linearGradient></defs>
      <rect width="1080" height="1440" fill="url(#v)"/>
      <rect x="72" y="84" width="58" height="8" rx="4" fill="#35d0ba"/>
      <text x="72" y="142" fill="#b7f3e9" font-size="28" font-family="Microsoft YaHei, sans-serif" font-weight="700" letter-spacing="2">AI 前哨站 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</text>
      ${svgLines(lead, 72, 720, 86, 4, 11, "#ffffff", 850)}
      ${svgLines(deck, 72, 1120, 40, 3, 22, "#dbe7ec", 500)}
      <text x="72" y="1352" fill="#9deade" font-size="26" font-family="Microsoft YaHei, sans-serif">${escapeXml(issue.period.start)} — ${escapeXml(issue.period.end)}</text>
    </svg>`,
  );

  await base
    .composite([{ input: overlay }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toFile(outputPath);
}

function resolveHeroPath(issue: Issue) {
  const src = issue.hero?.visual?.src;
  if (!src) return null;
  const resolved = path.resolve(process.cwd(), "public", src.slice(1));
  const allowedRoot = path.resolve(process.cwd(), "public", "images", "issues");
  if (!resolved.startsWith(`${allowedRoot}${path.sep}`)) {
    throw new Error("Hero image must stay under public/images/issues.");
  }
  return resolved;
}

function svgLines(
  text: string,
  x: number,
  y: number,
  fontSize: number,
  maxLines: number,
  unitsPerLine: number,
  color: string,
  weight: number,
) {
  const lines = wrapText(text, unitsPerLine, maxLines);
  return lines
    .map(
      (line, index) =>
        `<text x="${x}" y="${y + index * Math.round(fontSize * 1.25)}" fill="${color}" font-size="${fontSize}" font-family="Microsoft YaHei, sans-serif" font-weight="${weight}">${escapeXml(line)}</text>`,
    )
    .join("");
}

function wrapText(text: string, maxUnits: number, maxLines: number) {
  const characters = Array.from(text.trim());
  const lines: string[] = [];
  let current = "";
  let units = 0;

  for (const character of characters) {
    const characterUnits = /[\x00-\xff]/.test(character) ? 0.55 : 1;
    if (units + characterUnits > maxUnits && current) {
      lines.push(current);
      current = "";
      units = 0;
      if (lines.length === maxLines) break;
    }
    current += character;
    units += characterUnits;
  }

  if (current && lines.length < maxLines) lines.push(current);
  const consumed = lines.join("").length;
  if (consumed < characters.length && lines.length > 0) {
    lines[lines.length - 1] = `${Array.from(lines.at(-1) ?? "")
      .slice(0, -1)
      .join("")}…`;
  }
  return lines;
}

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

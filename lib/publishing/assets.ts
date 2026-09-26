import { existsSync } from "node:fs";
import { mkdir, readdir, unlink } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { Issue } from "../content/schema";
import {
  renderXiaohongshuCarousel,
  type XiaohongshuBlock,
  type XiaohongshuCarouselSection,
} from "./derivatives";

export type PlatformAssets = {
  xiaohongshuCover: string;
  xiaohongshuImages: string[];
  zhihuCover: string;
  zhihuImages: string[];
  wechatCover: string;
  wechatSquareCover: string;
};

const xiaohongshuWidth = 1080;
const xiaohongshuHeight = 1440;
const xiaohongshuMaxImages = 18;

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
  const wechatHeroPath = resolveWechatCoverSource(issue) ?? heroPath;
  const wechatCover = path.join(wechatDirectory, `${issue.slug}-cover.jpg`);
  const wechatSquareCover = path.join(
    wechatDirectory,
    `${issue.slug}-cover-square.jpg`,
  );
  const xiaohongshuCover = path.join(xhsDirectory, "01-cover.jpg");
  await Promise.all([
    renderEditorialCover(issue, wechatHeroPath, wechatCover, "wide"),
    renderEditorialCover(
      issue,
      wechatHeroPath,
      wechatSquareCover,
      "square",
    ),
    renderSocialCover(issue, xiaohongshuCover, "portrait"),
  ]);
  const xiaohongshuImages = await renderXiaohongshuCarouselImages(
    issue,
    xhsDirectory,
    xiaohongshuCover,
  );
  const { cover: zhihuCover, images: zhihuImages } = await generateZhihuAssets(issue);

  return {
    wechatCover,
    wechatSquareCover,
    xiaohongshuCover,
    xiaohongshuImages,
    zhihuCover,
    zhihuImages,
  };
}

export async function generateZhihuAssets(issue: Issue) {
  const directory = path.join(process.cwd(), "exports", "zhihu", issue.slug);
  await mkdir(directory, { recursive: true });
  const cover = path.join(directory, "01-cover.jpg");
  await renderSocialCover(issue, cover, "wide");
  const images = await renderZhihuCardImages(issue, directory, cover);
  return { cover, images };
}

type SocialCoverVariant = "wide" | "portrait";

async function renderSocialCover(
  issue: Issue,
  outputPath: string,
  variant: SocialCoverVariant,
) {
  const portrait = variant === "portrait";
  const width = portrait ? xiaohongshuWidth : 1200;
  const height = portrait ? xiaohongshuHeight : 675;
  const titleSize = portrait ? 72 : 58;
  const titleY = portrait ? 286 : 210;
  const titleUnits = portrait ? 13 : 8;
  const titleLines = portrait ? 3 : 2;
  const signalY = portrait ? 690 : 160;
  const signalX = portrait ? 72 : 790;
  const signalWidth = portrait ? 936 : 338;
  const signalHeight = portrait ? 118 : 92;
  const signalGap = portrait ? 22 : 18;
  const signalTitleUnits = portrait ? 25 : 14;
  const lead = issue.hero?.lead ?? issue.title;
  const signals = issue.cards.slice(0, 4).map((card, index) => {
    const y = signalY + index * (signalHeight + signalGap);
    return `<g>
      <rect x="${signalX}" y="${y}" width="${signalWidth}" height="${signalHeight}" rx="16" fill="#ffffff" stroke="#d8e2ee"/>
      <rect x="${signalX}" y="${y}" width="7" height="${signalHeight}" rx="4" fill="${index % 2 === 0 ? "#2563eb" : "#f59e0b"}"/>
      <text x="${signalX + 26}" y="${y + 35}" fill="#2563eb" font-size="20" font-family="Consolas, Microsoft YaHei, sans-serif" font-weight="700">${String(index + 1).padStart(2, "0")}</text>
      ${svgLines(card.title, signalX + 80, y + 35, portrait ? 27 : 20, 2, signalTitleUnits, "#0b1220", 700)}
    </g>`;
  }).join("");
  const overlay = Buffer.from(
    `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="canvas" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fbff"/><stop offset="1" stop-color="#edf3f8"/></linearGradient>
        <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#canvas)"/>
      <rect x="${portrait ? 46 : 42}" y="${portrait ? 46 : 36}" width="${width - (portrait ? 92 : 84)}" height="${height - (portrait ? 92 : 72)}" rx="24" fill="#ffffff" stroke="#d8e2ee"/>
      <rect x="${portrait ? 46 : 42}" y="${portrait ? 46 : 36}" width="9" height="${height - (portrait ? 92 : 72)}" rx="5" fill="url(#rail)"/>
      <text x="72" y="${portrait ? 138 : 100}" fill="#2563eb" font-size="${portrait ? 29 : 23}" font-family="Microsoft YaHei, sans-serif" font-weight="700">AI 前哨站 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</text>
      ${svgLines(lead, 72, titleY, titleSize, titleLines, titleUnits, "#0b1220", 800)}
      ${portrait ? svgLines(issue.hero?.deck ?? issue.summary, 72, 535, 27, 3, 32, "#5d6b82", 400) : ""}
      ${signals}
      <text x="72" y="${height - 76}" fill="#5d6b82" font-size="20" font-family="Consolas, Microsoft YaHei, sans-serif">${escapeXml(issue.period.start)} — ${escapeXml(issue.period.end)}</text>
      <text x="${width - 72}" y="${height - 76}" text-anchor="end" fill="#5d6b82" font-size="20" font-family="Microsoft YaHei, sans-serif">事实 · 影响 · 限制 · 来源</text>
    </svg>`,
  );
  await sharp({
    create: { width, height, channels: 3, background: "#edf3f8" },
  }).composite([{ input: overlay }]).jpeg({ quality: 90, mozjpeg: true }).toFile(outputPath);
}

async function renderZhihuCardImages(
  issue: Issue,
  directory: string,
  cover: string,
) {
  const staleFiles = (await readdir(directory)).filter((filename) =>
    /^\d{2}-(?:cover|card)\.jpg$/.test(filename) && filename !== path.basename(cover),
  );
  await Promise.all(staleFiles.map((filename) => unlink(path.join(directory, filename))));
  const images = [cover];
  for (const [index, card] of issue.cards.entries()) {
    const outputPath = path.join(directory, `${String(index + 2).padStart(2, "0")}-card.jpg`);
    const tone = ["#f5faff", "#f7f7ff", "#f3fbfa"][index % 3];
    const overlay = Buffer.from(
      `<svg width="1200" height="675" xmlns="http://www.w3.org/2000/svg">
        <defs><linearGradient id="rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#f59e0b"/></linearGradient></defs>
        <rect width="1200" height="675" fill="#edf3f8"/>
        <rect x="42" y="36" width="1116" height="603" rx="22" fill="${tone}" stroke="#d8e2ee"/>
        <rect x="42" y="36" width="9" height="603" rx="5" fill="url(#rail)"/>
        <text x="76" y="96" fill="#2563eb" font-size="23" font-family="Consolas, Microsoft YaHei, sans-serif" font-weight="700">情报 ${String(index + 1).padStart(2, "0")} · ${escapeXml(card.category)}</text>
        ${svgLines(card.title, 76, 166, 42, 2, 25, "#0b1220", 800)}
        <rect x="76" y="276" width="502" height="248" rx="14" fill="#ffffff" stroke="#d8e2ee"/>
        <text x="102" y="322" fill="#5d6b82" font-size="20" font-family="Microsoft YaHei, sans-serif">内容详情</text>
        ${svgLines(card.oneLineSummary, 102, 370, 21, 6, 20, "#0b1220", 700)}
        <rect x="598" y="276" width="526" height="248" rx="14" fill="#ffffff" stroke="#d8e2ee"/>
        <text x="624" y="322" fill="#5d6b82" font-size="20" font-family="Microsoft YaHei, sans-serif">造成的影响</text>
        ${svgLines(card.developerImpact, 624, 370, 21, 6, 22, "#334155", 400)}
        <text x="76" y="592" fill="#5d6b82" font-size="20" font-family="Microsoft YaHei, sans-serif">${escapeXml(card.publisher)} · ${escapeXml(card.occurredAt)}</text>
        <text x="1124" y="592" text-anchor="end" fill="#2563eb" font-size="20" font-family="Microsoft YaHei, sans-serif" font-weight="700">AI 前哨站 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</text>
      </svg>`,
    );
    await sharp({
      create: { width: 1200, height: 675, channels: 3, background: "#edf3f8" },
    }).composite([{ input: overlay }]).jpeg({ quality: 90, mozjpeg: true }).toFile(outputPath);
    images.push(outputPath);
  }
  return images;
}

async function renderXiaohongshuCarouselImages(
  issue: Issue,
  directory: string,
  cover: string,
) {
  const coverFilename = path.basename(cover);
  const stalePackageFiles = (await readdir(directory)).filter((filename) =>
    filename !== coverFilename && /^\d{2}-(?:cover|carousel)\.jpg$/.test(filename),
  );
  await Promise.all(
    stalePackageFiles.map((filename) => unlink(path.join(directory, filename))),
  );
  const carousel = renderXiaohongshuCarousel(issue);
  const pages = paginateXiaohongshuSections(carousel.sections);
  assertXiaohongshuCarouselContent(carousel.sections, pages);
  const totalPages = pages.length + 1;
  if (totalPages > xiaohongshuMaxImages) {
    throw new Error(`小红书完整轮播需要 ${totalPages} 张图片，超过当前 ${xiaohongshuMaxImages} 张限制。请缩短内容或拆分期刊，不能静默删字。`);
  }

  const images = [cover];
  for (const [index, page] of pages.entries()) {
    const outputPath = path.join(directory, `${String(index + 2).padStart(2, "0")}-carousel.jpg`);
    await renderXiaohongshuPage(issue, page, index + 2, totalPages, outputPath);
    images.push(outputPath);
  }
  return images;
}

type EditorialCoverVariant = "wide" | "square" | "portrait";

async function renderEditorialCover(
  issue: Issue,
  heroPath: string | null,
  outputPath: string,
  variant: EditorialCoverVariant,
) {
  const layout = variant === "wide"
    ? {
        width: 900,
        height: 383,
        barX: 52,
        barY: 48,
        barWidth: 44,
        barHeight: 5,
        issueY: 92,
        issueSize: 22,
        titleY: 164,
        titleSize: 48,
        titleUnits: 16,
        titleLines: 2,
      }
    : variant === "square" ? {
        width: 1200,
        height: 1200,
        barX: 72,
        barY: 76,
        barWidth: 58,
        barHeight: 7,
        issueY: 140,
        issueSize: 30,
        titleY: 246,
        titleSize: 72,
        titleUnits: 14,
        titleLines: 3,
      } : {
        width: xiaohongshuWidth,
        height: xiaohongshuHeight,
        barX: 72,
        barY: 84,
        barWidth: 58,
        barHeight: 7,
        issueY: 150,
        issueSize: 30,
        titleY: 270,
        titleSize: 72,
        titleUnits: 14,
        titleLines: 3,
      };
  const base = heroPath
    ? sharp(heroPath)
        .resize(layout.width, layout.height, {
          fit: "cover",
          position: "centre",
        })
        .modulate({ brightness: 0.78, saturation: 0.9 })
    : sharp({
        create: {
          width: layout.width,
          height: layout.height,
          channels: 3,
          background: "#112032",
        },
      });
  const lead = issue.hero?.lead ?? issue.title;
  const overlay = Buffer.from(
    `<svg width="${layout.width}" height="${layout.height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="horizontal" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#07111f" stop-opacity=".96"/><stop offset=".58" stop-color="#07111f" stop-opacity=".48"/><stop offset="1" stop-color="#07111f" stop-opacity=".08"/></linearGradient>
        <linearGradient id="vertical" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#07111f" stop-opacity=".72"/><stop offset=".44" stop-color="#07111f" stop-opacity=".08"/><stop offset="1" stop-color="#07111f" stop-opacity=".16"/></linearGradient>
      </defs>
      <rect width="${layout.width}" height="${layout.height}" fill="url(#horizontal)"/>
      <rect width="${layout.width}" height="${layout.height}" fill="url(#vertical)"/>
      <rect x="${layout.barX}" y="${layout.barY}" width="${layout.barWidth}" height="${layout.barHeight}" rx="3" fill="#35d0ba"/>
      <text x="${layout.barX}" y="${layout.issueY}" fill="#b7f3e9" font-size="${layout.issueSize}" font-family="Microsoft YaHei, sans-serif" font-weight="700">AI 前哨站 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</text>
      ${svgLines(lead, layout.barX, layout.titleY, layout.titleSize, layout.titleLines, layout.titleUnits, "#ffffff", 800)}
    </svg>`,
  );

  await base
    .composite([{ input: overlay }])
    .jpeg({ quality: 84, mozjpeg: true })
    .toFile(outputPath);
}

export type XiaohongshuPage = {
  sectionIndex: number;
  sectionLabel: string;
  heading: string;
  lineScale?: number;
  lines: Array<{
    text: string;
    style: XiaohongshuBlock["style"];
    blockIndex: number;
  }>;
};

const minimumContinuationLines = 4;

export function paginateXiaohongshuSections(sections: XiaohongshuCarouselSection[]) {
  const pages: XiaohongshuPage[] = [];
  for (const [sectionIndex, section] of sections.entries()) {
    const sectionLines = section.blocks.flatMap((block, blockIndex) => {
      const lines = wrapTextFully(block.text, unitsPerLine(block.style)).map((text) => ({
        text,
        style: block.style,
        blockIndex,
      }));
      if (block.style === "heading" || block.style === "highlight") {
        lines.push({ text: "", style: "muted", blockIndex });
      }
      return lines;
    });
    const defaultCapacity = xiaohongshuHeight - 125 - 300;
    const usedHeight = sectionLines.reduce((sum, line) => sum + lineHeight(line.style), 0);
    if (usedHeight <= defaultCapacity) {
      pages.push({
        ...createXiaohongshuPage(section, sectionIndex, false),
        lines: sectionLines,
      });
      continue;
    }
    const compactScale = 0.9;
    if (usedHeight * compactScale <= defaultCapacity) {
      pages.push({
        ...createXiaohongshuPage(section, sectionIndex, false),
        lineScale: compactScale,
        lines: sectionLines,
      });
      continue;
    }

    let page = createXiaohongshuPage(section, sectionIndex, false);
    for (const line of sectionLines) {
      if (!fitsXiaohongshuLine(page, line.style)) {
        pages.push(page);
        page = createXiaohongshuPage(section, sectionIndex, true);
      }
      page.lines.push(line);
    }
    pages.push(page);
    rebalanceShortContinuationPages(pages, sectionIndex);
    const orphan = pages.find(
      (candidate) =>
        candidate.sectionIndex === sectionIndex &&
        candidate.sectionLabel.endsWith(" · 续") &&
        countNonEmptyLines(candidate) < minimumContinuationLines,
    );
    if (orphan) {
      throw new Error(
        `小红书轮播分页产生孤页：${orphan.sectionLabel} 仅有 ${countNonEmptyLines(orphan)} 行有效内容，请缩短该情报或调整版式。`,
      );
    }
  }
  return pages;
}

function rebalanceShortContinuationPages(
  pages: XiaohongshuPage[],
  sectionIndex: number,
) {
  const sectionPages = pages.filter((page) => page.sectionIndex === sectionIndex);
  for (let pageIndex = 1; pageIndex < sectionPages.length; pageIndex += 1) {
    const page = sectionPages[pageIndex];
    const previous = sectionPages[pageIndex - 1];
    if (!page.sectionLabel.endsWith(" · 续")) continue;

    while (countNonEmptyLines(page) < minimumContinuationLines) {
      const blockIndex = previous.lines.at(-1)?.blockIndex;
      if (blockIndex === undefined) break;
      const moved = previous.lines.filter((line) => line.blockIndex === blockIndex);
      if (moved.length === 0 || moved.length === previous.lines.length) break;
      previous.lines = previous.lines.filter((line) => line.blockIndex !== blockIndex);
      page.lines = [...moved, ...page.lines];
    }
  }
}

function countNonEmptyLines(page: XiaohongshuPage) {
  return page.lines.filter((line) => line.text.trim().length > 0).length;
}

function assertXiaohongshuCarouselContent(
  sections: XiaohongshuCarouselSection[],
  pages: XiaohongshuPage[],
) {
  const normalize = (value: string) => value.replaceAll(/\s/g, "");
  const renderedText = normalize(pages
    .flatMap((page) => page.lines.map((line) => line.text))
    .join(""));
  const missing = sections
    .flatMap((section) => section.blocks.map((block) => block.text.trim()))
    .find((text) => text && !renderedText.includes(normalize(text)));
  if (missing) {
    throw new Error(`小红书轮播分页遗漏内容：${missing.slice(0, 80)}`);
  }
}

function createXiaohongshuPage(
  section: XiaohongshuCarouselSection,
  sectionIndex: number,
  isContinuation: boolean,
): XiaohongshuPage {
  return {
    sectionIndex,
    sectionLabel: isContinuation ? `${section.label} · 续` : section.label,
    heading: section.heading,
    lines: [],
  };
}

function fitsXiaohongshuLine(page: XiaohongshuPage, style: XiaohongshuBlock["style"]) {
  const headerHeight = 300;
  const footerHeight = 125;
  const used = page.lines.reduce((sum, line) => sum + lineHeight(line.style), 0);
  return headerHeight + used + lineHeight(style) <= xiaohongshuHeight - footerHeight;
}

function unitsPerLine(style: XiaohongshuBlock["style"]) {
  if (style === "title") return 20;
  if (style === "heading") return 29;
  if (style === "highlight") return 30;
  if (style === "body") return 34;
  return 44;
}

function lineHeight(style: XiaohongshuBlock["style"]) {
  if (style === "title") return 58;
  if (style === "heading") return 42;
  if (style === "highlight") return 42;
  if (style === "body") return 38;
  return 30;
}

export function wrapTextFully(text: string, maxUnits: number) {
  return wrapTextByUnits(text, maxUnits);
}

function wrapTextByUnits(
  text: string,
  maxUnits: number,
  maxLines = Number.POSITIVE_INFINITY,
) {
  const tokens = text.trim().match(/[A-Za-z0-9][A-Za-z0-9+._/-]*|\s+|./gu) ?? [];
  if (tokens.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  let units = 0;

  const pushLine = () => {
    if (!line.trim()) return;
    lines.push(line.trimEnd());
    line = "";
    units = 0;
  };

  for (const token of tokens) {
    if (lines.length >= maxLines) break;
    if (/^\s+$/.test(token) && !line) continue;
    const tokenUnits = Array.from(token).reduce(
      (sum, character) => sum + (/[\x00-\xff]/.test(character) ? 0.55 : 1),
      0,
    );
    if (units + tokenUnits > maxUnits && line) pushLine();
    if (lines.length >= maxLines) break;
    if (tokenUnits > maxUnits) {
      for (const character of Array.from(token)) {
        const characterUnits = /[\x00-\xff]/.test(character) ? 0.55 : 1;
        if (units + characterUnits > maxUnits && line) pushLine();
        if (lines.length >= maxLines) break;
        line += character;
        units += characterUnits;
      }
      continue;
    }
    line += token;
    units += tokenUnits;
  }
  if (line && lines.length < maxLines) pushLine();
  return lines;
}

async function renderXiaohongshuPage(
  issue: Issue,
  page: XiaohongshuPage,
  pageNumber: number,
  totalPages: number,
  outputPath: string,
) {
  let y = 320;
  const lineScale = page.lineScale ?? 1;
  const text = page.lines.map((line) => {
    const fontSize = Math.round((line.style === "title" ? 44 : line.style === "heading" ? 30 : line.style === "highlight" ? 30 : line.style === "body" ? 26 : 21) * lineScale);
    const color = line.style === "highlight" ? "#1d4ed8" : line.style === "muted" ? "#5d6b82" : "#0b1220";
    const weight = line.style === "heading" || line.style === "title" || line.style === "highlight" ? 700 : 400;
    y += Math.round(lineHeight(line.style) * lineScale);
    return `<text x="72" y="${y}" fill="${color}" font-size="${fontSize}" font-family="Microsoft YaHei, sans-serif" font-weight="${weight}">${escapeXml(line.text)}</text>`;
  }).join("");
  const overlay = Buffer.from(
    `<svg width="${xiaohongshuWidth}" height="${xiaohongshuHeight}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="canvas" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8fbff"/><stop offset="1" stop-color="#edf3f8"/></linearGradient>
        <linearGradient id="rail" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563eb"/><stop offset="1" stop-color="#f59e0b"/></linearGradient>
      </defs>
      <rect width="${xiaohongshuWidth}" height="${xiaohongshuHeight}" fill="url(#canvas)"/>
      <rect x="48" y="48" width="984" height="1344" rx="18" fill="#ffffff" stroke="#d8e2ee"/>
      <rect x="48" y="48" width="9" height="1344" rx="5" fill="url(#rail)"/>
      <text x="72" y="142" fill="#2563eb" font-size="28" font-family="Microsoft YaHei, sans-serif" font-weight="700">AI 前哨站 · 第 ${String(issue.issueNumber).padStart(3, "0")} 期</text>
      <text x="72" y="204" fill="#2563eb" font-size="24" font-family="Microsoft YaHei, sans-serif" font-weight="700">${escapeXml(page.sectionLabel)}</text>
      ${svgLines(page.heading, 72, 268, 50, 2, 16, "#0b1220", 800)}
      ${text}
      <line x1="72" y1="1320" x2="1008" y2="1320" stroke="#d8e2ee"/>
      <text x="72" y="1364" fill="#5d6b82" font-size="22" font-family="Microsoft YaHei, sans-serif">${escapeXml(issue.period.start)} — ${escapeXml(issue.period.end)}</text>
      <text x="1008" y="1364" text-anchor="end" fill="#5d6b82" font-size="22" font-family="Microsoft YaHei, sans-serif">${pageNumber} / ${totalPages}</text>
    </svg>`,
  );
  await sharp({
    create: { width: xiaohongshuWidth, height: xiaohongshuHeight, channels: 3, background: "#edf3f8" },
  }).composite([{ input: overlay }]).jpeg({ quality: 90, mozjpeg: true }).toFile(outputPath);
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

function resolveWechatCoverSource(issue: Issue) {
  if (issue.issueNumber <= 0) return null;
  const filename = `issue-${String(issue.issueNumber).padStart(3, "0")}-wechat-cover.png`;
  const resolved = path.resolve(process.cwd(), "public", "images", "issues", filename);
  return existsSync(resolved) ? resolved : null;
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
  const lines = wrapTextByUnits(text, maxUnits, maxLines);
  const consumed = lines.join("").replaceAll(/\s/g, "").length;
  const total = text.replaceAll(/\s/g, "").length;
  if (consumed < total && lines.length > 0) {
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

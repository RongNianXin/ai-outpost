import { mkdir } from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import type { Issue } from "../content/schema";

export async function generateZhihuMixedVisuals(issue: Issue) {
  const hasOpenAiSource = issue.sources.some(
    (source) => source.id === "openai-gpt6-source",
  );
  if (
    issue.id !== "issue-005" ||
    issue.cards[0]?.id !== "openai-gpt6-sol-luna" ||
    issue.cards[2]?.id !== "android-byoa-acp" ||
    !hasOpenAiSource
  ) {
    throw new Error("图文混排对照仅适用于当前已核对的第 005 期。 ");
  }

  const directory = path.join(process.cwd(), "exports", "zhihu-mixed", issue.slug);
  await mkdir(directory, { recursive: true });
  const visuals = [
    { cardIndex: 0, name: "02-sol-price.jpg", svg: priceVisual },
    { cardIndex: 2, name: "04-acp-flow.jpg", svg: acpVisual },
  ];
  const result = new Map<number, string>();
  for (const visual of visuals) {
    const filePath = path.join(directory, visual.name);
    await sharp(Buffer.from(visual.svg)).jpeg({ quality: 90, mozjpeg: true }).toFile(filePath);
    result.set(visual.cardIndex, filePath);
  }
  return result;
}

const priceVisual = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1080" viewBox="0 0 1200 1080">
  <rect width="1200" height="1080" fill="#eef4f8"/>
  <rect x="56" y="64" width="10" height="856" rx="5" fill="#2563eb"/>
  <text x="104" y="132" fill="#2563eb" font-family="Microsoft YaHei,sans-serif" font-size="42" font-weight="700">价格比较 · API 标准档</text>
  <text x="104" y="222" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="54" font-weight="800">Sol 输入、输出标价</text>
  <text x="104" y="294" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="54" font-weight="800">分别降低 50%</text>
  <rect x="104" y="360" width="990" height="220" rx="6" fill="#fff" stroke="#d8e2ee"/>
  <text x="144" y="428" fill="#536779" font-family="Arial,sans-serif" font-size="44" font-weight="700">GPT-5.6 Sol</text>
  <text x="144" y="507" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="46">输入 $4</text>
  <text x="600" y="507" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="46">输出 $20</text>
  <rect x="104" y="610" width="990" height="220" rx="6" fill="#fff" stroke="#96b7e9" stroke-width="3"/>
  <text x="144" y="678" fill="#2563eb" font-family="Arial,sans-serif" font-size="44" font-weight="700">GPT-6 Sol</text>
  <text x="144" y="757" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="46">输入 $2</text>
  <text x="600" y="757" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="46">输出 $10</text>
  <text x="104" y="916" fill="#536779" font-family="Microsoft YaHei,sans-serif" font-size="34">单位：美元 / 百万文本 token，同一服务档位</text>
  <text x="104" y="971" fill="#536779" font-family="Microsoft YaHei,sans-serif" font-size="34">标价不等于实际任务账单；旧版价格有促销说明</text>
  <text x="1094" y="1033" text-anchor="end" fill="#2563eb" font-family="Microsoft YaHei,sans-serif" font-size="31" font-weight="700">AI 前哨站 · 第 005 期</text>
</svg>`;

const acpVisual = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1120" viewBox="0 0 1200 1120">
  <rect width="1200" height="1120" fill="#eef5f4"/>
  <rect x="56" y="64" width="10" height="920" rx="5" fill="#0f766e"/>
  <text x="104" y="132" fill="#0f766e" font-family="Microsoft YaHei,sans-serif" font-size="42" font-weight="700">接入关系 · Android Studio 预览</text>
  <text x="104" y="222" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="54" font-weight="800">外部编码 Agent</text>
  <text x="104" y="294" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="54" font-weight="800">如何接入开发工具</text>
  <rect x="104" y="350" width="990" height="150" rx="6" fill="#fff" stroke="#c9dbd8"/>
  <text x="144" y="417" fill="#102131" font-family="Arial,sans-serif" font-size="46" font-weight="700">Android Studio</text>
  <text x="144" y="470" fill="#536779" font-family="Microsoft YaHei,sans-serif" font-size="34">宿主工具</text>
  <text x="560" y="556" text-anchor="middle" fill="#0f766e" font-family="Arial,sans-serif" font-size="60">↓</text>
  <rect x="104" y="590" width="990" height="150" rx="6" fill="#fff" stroke="#c9dbd8"/>
  <text x="144" y="657" fill="#102131" font-family="Arial,sans-serif" font-size="46" font-weight="700">ACP</text>
  <text x="144" y="710" fill="#536779" font-family="Microsoft YaHei,sans-serif" font-size="34">连接协议</text>
  <text x="560" y="796" text-anchor="middle" fill="#0f766e" font-family="Arial,sans-serif" font-size="60">↓</text>
  <rect x="104" y="830" width="990" height="150" rx="6" fill="#fff" stroke="#c9dbd8"/>
  <text x="144" y="897" fill="#102131" font-family="Microsoft YaHei,sans-serif" font-size="46" font-weight="700">外部编码 Agent</text>
  <text x="144" y="950" fill="#536779" font-family="Microsoft YaHei,sans-serif" font-size="34">实际能力取决于具体实现</text>
  <text x="104" y="1037" fill="#7a4a00" font-family="Microsoft YaHei,sans-serif" font-size="34">接入不等于权限、结果和回滚已验收</text>
  <text x="1094" y="1090" text-anchor="end" fill="#0f766e" font-family="Microsoft YaHei,sans-serif" font-size="31" font-weight="700">AI 前哨站 · 第 005 期</text>
</svg>`;

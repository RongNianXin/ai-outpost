// Local, reviewable export. No production or WeChat writes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const root = path.resolve(__dirname, '../..');
const raw = fs.readFileSync(path.join(root, 'content/issues/issue-003.json'),'utf8');
const issue = JSON.parse(raw);
if(issue.issueNumber!==2 || issue.cards.length!==6) throw Error('Expected complete issue 002');
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
// One localized missing-word correction; recorded in delivery notes. Source JSON stays unchanged.
const edit = s => s.replace('缓存命中率同样值得量。','缓存命中率同样值得衡量。');
const p = (s,more='') => `<p style="margin:0 0 14px;font-size:16px;line-height:1.85;color:#26364c;${more}">${esc(edit(s))}</p>`;
const h2 = s => `<h2 style="margin:0 0 17px;font-size:25px;line-height:1.4;font-weight:800;color:#0b1220;">${esc(s)}</h2>`;
const h3 = s => `<h3 style="margin:22px 0 10px;font-size:15px;line-height:1.6;font-weight:700;color:#2563eb;">${esc(s)}</h3>`;
const section = (content,more='') => `<section style="margin:0 0 23px;padding:23px 18px;border:1px solid #d8e2ee;border-radius:18px;background-color:#ffffff;${more}">${content}</section>`;
const url = `https://rongnianxin.github.io/ai-outpost/issues/${issue.slug}/`;
const link = (title,url) => {
  if(new URL(url).protocol!=='https:') throw Error('Only HTTPS public links allowed');
  return `<a href="${esc(url)}" style="color:#2563eb;text-decoration:underline;word-wrap:break-word;overflow-wrap:anywhere;">${esc(title)}</a>`;
};
const usedIds = new Set(issue.cards.flatMap(c=>c.facts.flatMap(f=>f.sourceIds)));
const sources = issue.sources.filter(s=>usedIds.has(s.id));
const numberById = new Map(sources.map((s,i)=>[s.id,i+1]));
const maturity={experimental:'实验',usable:'可用',worth_investing:'值得投入'};
const noise={low:'低',medium:'中',high:'高'};
const action={ignore:'忽略',save:'收藏',learn:'学习',try:'重点阅读'};
const expectedText=[issue.hero.lead,issue.hero.deck,issue.summary];
const caption='配图说明：本期主视觉由 AI 生成，用于示意工具执行、视频定位与任务收尾，并非产品实拍或界面截图。';
const cards=issue.cards.map((c,i)=>{
  expectedText.push(c.title,c.oneLineSummary,edit(c.whyItMatters),c.developerImpact);
  const facts=c.facts.map(f=>{
    expectedText.push(f.claim,...f.limitations);
    const refs=f.sourceIds.map(id=>{if(!numberById.has(id))throw Error('Missing source '+id);return `[${numberById.get(id)}]`;}).join(' ');
    return `<section style="margin:0 0 20px;padding:0 0 17px;border-bottom:1px solid #e3eaf4;">${p(f.claim,'font-size:15px;')}${p('依据：'+refs,'font-size:12px;color:#2563eb;margin-bottom:9px;')}${f.limitations.map(l=>p('限制：'+l,'font-size:14px;color:#5d6b82;margin-bottom:9px;')).join('')}</section>`;
  }).join('');
  return section(p(`情报 ${String(i+1).padStart(2,'0')} · ${c.category}`,'font-family:Consolas,Arial,sans-serif;font-size:13px;font-weight:700;color:#2563eb;')+h2(c.title)+
    p(`${c.occurredAt.replaceAll('-','.')} · ${c.publisher}`,'font-size:12px;color:#5d6b82;')+
    `<section style="margin:20px 0;padding:15px 14px;border-left:3px solid #2563eb;border-radius:0 10px 10px 0;background-color:#eff6ff;">${p('先看结论','font-size:12px;color:#2563eb;font-weight:700;margin-bottom:7px;')}${p(c.oneLineSummary,'font-weight:700;margin-bottom:0;')}</section>`+
    h3('为什么值得关注')+p(c.whyItMatters)+
    `<section style="margin:20px 0;padding:15px 14px;border:1px solid #f3d28d;border-radius:12px;background-color:#fff8e8;">${p('对你的影响与建议','font-size:13px;font-weight:700;color:#7a4a00;margin-bottom:8px;')}${p(c.developerImpact,'color:#544017;margin-bottom:0;')}</section>`+
    p(`编辑判断 · 成熟度：${maturity[c.maturity]} / 噪声风险：${noise[c.noiseRisk]} / 建议：${action[c.suggestedAction]}`,'font-size:12px;color:#5d6b82;')+
    h3('事实、测评与限制')+facts,
    'border-color:#bdd1f5;border-left:4px solid #2563eb;');
}).join('');
const topics=['官方 + 第三方测评','Agent 基建','成本计量','模型迁移'];
const intro=section(p('AI 前哨站 / AI OUTPOST','font-size:13px;letter-spacing:1px;font-weight:700;color:#2563eb;')+
  p(`第 002 期 · ${issue.period.start.replaceAll('-','.')}—${issue.period.end.replaceAll('-','.')}`,'font-family:Consolas,monospace;font-size:12px;color:#5d6b82;margin-bottom:23px;')+
  `<h1 style="margin:0 0 15px;font-size:36px;line-height:1.2;font-weight:800;letter-spacing:-0.8px;color:#0b1220;">${esc(issue.hero.lead)}</h1>`+
  p(issue.hero.deck,'font-size:21px;line-height:1.55;font-weight:700;color:#2a3d59;margin-bottom:22px;')+
  `<p style="margin:0 0 20px;line-height:2.5;">${topics.map(t=>`<span style="display:inline-block;margin:0 6px 6px 0;padding:2px 10px;border:1px solid #d8e2ee;border-radius:10px;background-color:#ffffff;font-size:12px;line-height:1.9;color:#2a3d59;font-weight:700;">${esc(t)}</span>`).join('')}</p>`+
  `<p style="margin:0 0 13px;"><img data-upload="hero" src="hero.png" alt="${esc(issue.hero.visual.alt)}" width="1536" height="1024" style="display:block;width:100%;max-width:100%;height:auto;border-radius:14px;border:1px solid #d8e2ee;"></p>`+
  p(caption,'font-size:12px;color:#5d6b82;')+p(issue.summary,'font-size:16px;margin-bottom:0;'),
  'background-color:#f4f8ff;background-image:linear-gradient(135deg,#ffffff,#f2f7fd);');
const glossary=section(h2('术语小注')+issue.glossary.map(g=>{expectedText.push(g.term,g.explanation);return h3(g.term)+p(g.explanation);}).join(''));
const pack=section(h2('给自己的 AI 留一份灵感资料包')+
  p('官网本期文章提供 Markdown 灵感资料包，可以复制或下载，再交给你的专项 AI 继续检索相关灵感。若微信内下载受限，可用外部浏览器打开官网。')+
  p('点击本文底部「阅读原文」，查看完整文章、资料包及逐项来源。')+
  `<p style="margin:16px 0;font-size:16px;line-height:1.8;">${link('打开第 002 期官网',url)}</p>`);
const index=section(h2('来源与说明')+
  p('本期按官方发布、独立测评和作者实测自述分别归因。AI 辅助整理不等于本站亲自复现；适用范围、配置和反例见各条限制。来源编号与正文对应。','font-size:14px;color:#5d6b82;')+
  sources.map((s,i)=>`<p style="margin:0 0 15px;font-size:13px;line-height:1.75;">[${i+1}] ${link(s.title,s.url)}<br><span style="color:#5d6b82;">${esc(s.publisher)} · ${esc(s.publishedAt||'来源页面未标注发布日期')}</span></p>`).join('')+
  p('若正文外链无法打开，可通过底部「阅读原文」到官网查看来源索引。','font-size:14px;color:#5d6b82;'));
const article=`<section style="margin:0;padding:0;font-family:Arial,'PingFang SC','Microsoft YaHei',sans-serif;color:#0b1220;line-height:1.8;text-align:left;word-wrap:break-word;overflow-wrap:break-word;">${intro}${cards}${glossary}${pack}${index}</section>`;
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>第 002 期完整公众号稿 · 六条资讯</title><link rel="icon" href="data:,">
<style>*{box-sizing:border-box}body{margin:0;background:#edf3f8;color:#0b1220;font-family:Arial,'Microsoft YaHei',sans-serif}.tools{max-width:900px;margin:22px auto;padding:22px;background:#fff;border:1px solid #d8e2ee;border-radius:16px}.tools h2{font-size:22px;margin:0 0 10px}.tools p,.tools li{font-size:14px;line-height:1.75;color:#5d6b82}.controls{display:flex;gap:9px;flex-wrap:wrap}button,.download{padding:11px 14px;border:1px solid #2563eb;background:#fff;color:#1d4ed8;border-radius:9px;font-size:14px;cursor:pointer;text-decoration:none}#copy{background:#2563eb;color:#fff}button:focus-visible,a:focus-visible{outline:3px solid #f59e0b;outline-offset:3px}input{width:100%;padding:10px;border:1px solid #d8e2ee;border-radius:8px;font:13px Consolas,monospace}#status{color:#1d4ed8;min-height:24px}#paper{width:677px;max-width:100%;margin:20px auto 50px;padding:12px;background:#fff;box-shadow:0 10px 30px #0f172a10}#paper.phone{width:390px}details{margin:18px 0}summary{cursor:pointer}#fallback-body,#paste-test{margin-top:15px;padding:12px;border:1px dashed #b9c8da;min-height:80px;background:white}#version{font:11px Consolas,monospace;overflow-wrap:anywhere}@media(max-width:600px){.tools{margin:12px 10px;padding:16px}}</style>
</head><body><aside class="tools"><h2>第 002 期完整公众号稿</h2>
<p><strong>完整六条资讯 + 主图 + 事实与限制 + 术语 + 资料包入口 + 来源索引。</strong>不是上一版小样。此页仅本地交付，未保存到微信，也没有发表。</p>
<ol><li>复制正文，在公众号另建空白稿粘贴，不覆盖原稿。</li><li>正文会出现一条“主图上传位置”标记：在该处上传 <strong>hero.png</strong>，删掉标记，保留下面的 AI 图注。这里的预览已显示主图，但不依赖图片随复制传入微信。</li><li>在后台“原文链接/阅读原文”字段填入下方地址。正文里的链接不等于后台已配置。</li></ol>
<div class="controls"><button id="copy">复制完整正文（图片另传）</button><a class="download" href="hero.png" download="hero.png">下载主图</a><button id="copy-url">复制阅读原文地址</button><button id="copy-title">复制标题</button><button id="width" aria-pressed="false">切换为手机宽度</button><button id="select">选中备用正文</button></div>
<p id="status" role="status" aria-live="polite">图片需单独上传；微信对圆角、背景和外链的保留情况待手机预览。</p>
<label for="original-url">后台“阅读原文”使用的官网地址</label><input id="original-url" readonly value="${esc(url)}">
<p>作者：暮雨笙。标题：${esc(issue.title)}</p>
<details id="fallback"><summary>备用复制区（图片位置用文字标记）</summary><p>按钮受限时，点“选中备用正文”后按 Ctrl+C；这里与复制按钮交付同一份正文。上传图片后务必删除上传标记。</p><div id="fallback-body"></div></details>
<details><summary>本地粘贴自检（不等于微信验收）</summary><div id="paste-test" contenteditable="true" aria-label="本地粘贴测试区"></div></details>
<p id="version">SOURCE SHA256 ${hash(raw)} · ${issue.cards.length} cards / ${issue.cards.flatMap(c=>c.facts).length} facts / ${sources.length} sources</p></aside>
<main id="paper"><article id="article">${article}</article></main>
<script>
const article=document.getElementById('article'),status=document.getElementById('status'),fallbackBody=document.getElementById('fallback-body');
const clone=article.cloneNode(true);clone.removeAttribute('id');
clone.querySelectorAll('img').forEach(img=>{const marker=document.createElement('p');marker.textContent='【主图上传位置：上传 hero.png 后删除本行，保留下方图注】';marker.setAttribute('style','margin:16px 0;padding:14px;border:1px dashed #d99b31;background-color:#fff8e8;color:#7a4a00;font-size:14px;line-height:1.7;');const target=img.parentElement.tagName==='P'&&img.parentElement.children.length===1?img.parentElement:img;target.replaceWith(marker);});
// Strip operational attributes; clipboard HTML has no local media URLs or scripts.
clone.querySelectorAll('[data-upload]').forEach(el=>el.removeAttribute('data-upload'));
fallbackBody.innerHTML=clone.innerHTML;
function selected(el){const r=document.createRange();r.selectNodeContents(el);const s=window.getSelection();s.removeAllRanges();s.addRange(r);}
function plain(){const d=document.getElementById('fallback'),was=d.open;d.open=true;const t=fallbackBody.innerText;d.open=was;return t;}
async function copyRich(){const html=fallbackBody.innerHTML,text=plain();
try{if(!navigator.clipboard?.write||!window.ClipboardItem)throw Error();await navigator.clipboard.write([new ClipboardItem({'text/html':new Blob([html],{type:'text/html'}),'text/plain':new Blob([text],{type:'text/plain'})})]);status.textContent='完整六条正文及格式已复制。下一步：粘贴、在标记处上传主图、设置阅读原文，再预览。';}
catch{document.getElementById('fallback').open=true;selected(fallbackBody);const handler=e=>{if(e.clipboardData){e.clipboardData.setData('text/html',html);e.clipboardData.setData('text/plain',text);e.preventDefault();}};document.addEventListener('copy',handler);let ok=false;try{ok=document.execCommand('copy');}catch{}finally{document.removeEventListener('copy',handler);}status.textContent=ok?'完整正文已通过备用方式复制，图片仍需单独上传。':'自动复制受限，已选中备用正文。按 Ctrl+C 复制，再粘贴至空白稿。';}}
async function copyText(text){try{await navigator.clipboard.writeText(text);status.textContent='已复制：'+text;}catch{document.getElementById('original-url').focus();document.getElementById('original-url').select();status.textContent='剪贴板权限受限。地址可在输入框按 Ctrl+C；标题请从上方说明复制。';}}
document.getElementById('copy').addEventListener('click',copyRich);
document.getElementById('copy-url').addEventListener('click',()=>copyText(document.getElementById('original-url').value));
document.getElementById('copy-title').addEventListener('click',()=>copyText(${JSON.stringify(issue.title)}));
document.getElementById('select').addEventListener('click',()=>{document.getElementById('fallback').open=true;selected(fallbackBody);status.textContent='备用正文已选中，请按 Ctrl+C；粘贴后在标记处上传主图并删掉标记。';});
document.getElementById('width').addEventListener('click',e=>{const phone=document.getElementById('paper').classList.toggle('phone');e.target.textContent=phone?'切换为宽屏预览':'切换为手机宽度';e.target.setAttribute('aria-pressed',String(phone));});
</script></body></html>`;
for(const text of expectedText)if(!article.includes(esc(text)))throw Error('Missing content: '+text);
const srcImage=path.join(root,'public',issue.hero.visual.src);
fs.copyFileSync(srcImage,path.join(__dirname,'hero.png'));
fs.writeFileSync(path.join(__dirname,'full.html'),html,'utf8');
fs.writeFileSync(path.join(__dirname,'阅读原文地址.txt'),url+'\n','utf8');
fs.writeFileSync(path.join(__dirname,'发布字段.txt'),`标题：${issue.title}\n作者：暮雨笙\n期号：002\n阅读原文：${url}\n主图文件：hero.png\n图注：${caption}\n\n本文是本地完整适配稿，尚未写入公众号。\n`,'utf8');
fs.writeFileSync(path.join(__dirname,'verification-input.json'),JSON.stringify({sourceSha256:hash(raw),heroSha256:hash(fs.readFileSync(srcImage)),expectedText,sourceUrls:sources.map(s=>s.url),publicUrl:url,cardTitles:issue.cards.map(c=>c.title),factCount:issue.cards.flatMap(c=>c.facts).length,limitCount:issue.cards.flatMap(c=>c.facts.flatMap(f=>f.limitations)).length},null,2));
console.log(JSON.stringify({output:'exports/wechat-full-002/full.html',cards:6,facts:issue.cards.flatMap(c=>c.facts).length,limits:issue.cards.flatMap(c=>c.facts.flatMap(f=>f.limitations)).length,sources:sources.length,htmlBytes:Buffer.byteLength(html)},null,2));

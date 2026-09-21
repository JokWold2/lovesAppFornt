// 校验 pages/cake、components/cake 与 utils/cake.js 的文案：
//  1. 所有 t('cake.xxx') / labelKey: 'cake.xxx' 引用的键，在 6 种语言里都必须存在
//     （缺失时 translate() 会直接返回键名，页面就会露出翻译键）
//  2. 6 种语言的键集合必须完全一致，避免某种语言少一句
//  3. 模板里不允许出现未走语言系统的中文硬编码
// 用法：node scripts/check-cake-i18n.js
const fs = require('fs');
const path = require('path');

const ROOT = 'D:\\OpenClaw\\boss\\apps';
const SOURCES = [
  path.join(ROOT, 'pages', 'cake'),
  path.join(ROOT, 'components', 'cake')
];
const EXTRA_FILES = [path.join(ROOT, 'utils', 'cake.js')];
const LOCALES = ['zh-Hans', 'zh-Hant', 'en', 'ru', 'ja', 'ko'];

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith('.vue') ? [full] : [];
  });
}

const files = SOURCES.flatMap(collect).concat(EXTRA_FILES);

// ---- 载入 cakeMessages.js（ESM，去掉 export 后求值） ----
const messageSource = fs.readFileSync(path.join(ROOT, 'utils', 'cakeMessages.js'), 'utf8')
  .replace(/^export\s+default\s+cakeMessages\s*$/m, '')
  .replace(/^export\s+/gm, '');
const cakeMessages = new Function(`${messageSource}\nreturn cakeMessages;`)();

// ---- 收集被引用的键 ----
const usedKeys = new Set();
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  for (const match of source.matchAll(/['"`]cake\.([A-Za-z0-9_]+)['"`]/g)) usedKeys.add(match[1]);
}

// ---- 对比 6 种语言的键 ----
const problems = [];
const keySets = {};
for (const locale of LOCALES) {
  const messages = cakeMessages[locale];
  if (!messages) { problems.push(`缺少语言 ${locale}`); continue; }
  keySets[locale] = new Set(Object.keys(messages));
}
const reference = keySets[LOCALES[0]] || new Set();
for (const locale of LOCALES.slice(1)) {
  const set = keySets[locale];
  if (!set) continue;
  const missing = [...reference].filter(key => !set.has(key));
  const extra = [...set].filter(key => !reference.has(key));
  if (missing.length) problems.push(`${locale} 缺少键: ${missing.join(', ')}`);
  if (extra.length) problems.push(`${locale} 多出键: ${extra.join(', ')}`);
}
for (const key of [...usedKeys].sort()) {
  for (const locale of LOCALES) {
    const value = cakeMessages[locale]?.[key];
    if (typeof value !== 'string' || !value.trim()) problems.push(`${locale} 的 cake.${key} 缺失或为空`);
  }
}
const unused = [...reference].filter(key => !usedKeys.has(key));

// ---- 模板里的中文硬编码 ----
const hanzi = /[\u4e00-\u9fff]/;
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const templateMatch = source.match(/<template>([\s\S]*?)<\/template>/);
  if (!templateMatch) continue;
  const template = templateMatch[1].replace(/<!--[\s\S]*?-->/g, '');
  template.split('\n').forEach((line, index) => {
    if (!hanzi.test(line)) return;
    problems.push(`${path.relative(ROOT, file)} 模板第 ${index + 1} 行含未走语言系统的中文: ${line.trim()}`);
  });
}

console.log(`引用到的 cake.* 键：${usedKeys.size} 个`);
console.log(`每种语言的键数：${LOCALES.map(locale => `${locale}=${keySets[locale]?.size ?? 0}`).join(' ')}`);
const unusedKeys = unused.sort();
console.log(`暂未被引用的键（${unusedKeys.length}）：${unusedKeys.join(', ') || '无'}`);
if (problems.length) {
  console.log(`\n发现 ${problems.length} 个问题：`);
  problems.forEach(problem => console.log(`  - ${problem}`));
  process.exit(1);
}
console.log('\n文案校验通过：键齐全、6 种语言一致、模板无中文硬编码');

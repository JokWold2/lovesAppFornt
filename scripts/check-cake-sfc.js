// 一次性校验脚本：用真正的 Vue SFC 编译器解析 pages/cake 与 components/cake 下的每个
// .vue 文件，编译模板 / script setup / scss，把编译错误暴露出来（原始的 order.vue 就是
// 模板标签不匹配导致的编译失败，只看文件内容是看不出来的）。
// 用法：node scripts/check-cake-sfc.js <compiler-sfc 所在 node_modules 路径>
const fs = require('fs');
const path = require('path');

const MODULES = process.argv[2];
if (!MODULES) {
  console.error('缺少参数：请传入包含 @vue/compiler-sfc 与 sass 的 node_modules 路径');
  process.exit(2);
}
const sfc = require(path.join(MODULES, '@vue', 'compiler-sfc'));
const sass = require(path.join(MODULES, 'sass'));

const ROOT = 'D:\\OpenClaw\\boss\\apps';
const TARGETS = [
  path.join(ROOT, 'pages', 'cake'),
  path.join(ROOT, 'components', 'cake')
];

function collect(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return collect(full);
    return entry.name.endsWith('.vue') ? [full] : [];
  });
}

let failures = 0;
const files = TARGETS.flatMap(collect);

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  const relative = path.relative(ROOT, file);
  const problems = [];

  let descriptor;
  try {
    const parsed = sfc.parse(source, { filename: file });
    if (parsed.errors?.length) problems.push(...parsed.errors.map(error => `parse: ${error.message || error}`));
    descriptor = parsed.descriptor;
  } catch (error) {
    problems.push(`parse threw: ${error.message}`);
  }

  if (descriptor) {
    if (descriptor.template) {
      try {
        const result = sfc.compileTemplate({
          source: descriptor.template.content,
          filename: file,
          id: relative,
          // uni-app 的模板里 <view>/<text> 都是自定义元素，编译时按原样保留。
          compilerOptions: { isCustomElement: tag => /^(view|text|image|button|input|scroll-view|swiper|swiper-item|map|textarea|block|template|slot|navigator|picker|checkbox|radio|switch|slider|progress|icon|rich-text|video|audio|camera|canvas|web-view|cover-view|cover-image|movable-view|movable-area|open-data|functional-page-navigator|official-account|ad|page-meta|navigation-bar|match-media|keyboard-accessory|editor|voip-room|live-player|live-pusher|uni-)/.test(tag) }
        });
        if (result.errors?.length) {
          result.errors.forEach(error => problems.push(`template: ${error.message || error}`));
        }
      } catch (error) {
        problems.push(`template threw: ${error.message}`);
      }
    }

    if (descriptor.scriptSetup || descriptor.script) {
      try {
        // inlineTemplate 会把模板编译进 setup，模板里引用了不存在的绑定会退化成 _ctx.xxx。
        // 这是模板内函数名写错 / 忘定义这类问题的唯一可靠静态信号。
        const compiled = sfc.compileScript(descriptor, { id: relative, inlineTemplate: true });
        const unresolved = [...new Set([...compiled.content.matchAll(/_ctx\.([A-Za-z_$][\w$]*)/g)].map(match => match[1]))]
          .filter(name => !name.startsWith('$'));
        if (unresolved.length) problems.push(`template refs not defined in script: ${unresolved.join(', ')}`);
      } catch (error) {
        problems.push(`script: ${error.message}`);
      }
    }

    for (const style of descriptor.styles) {
      if (style.lang !== 'scss') continue;
      try {
        sass.compileString(style.content, { syntax: 'scss', logger: sass.Logger.silent });
      } catch (error) {
        problems.push(`style(scss): ${error.message}`);
      }
    }
  }

  if (problems.length) {
    failures += 1;
    console.log(`FAIL ${relative}`);
    problems.forEach(problem => console.log(`     - ${problem.split('\n')[0]}`));
  } else {
    console.log(`ok   ${relative}`);
  }
}

console.log(`\n${files.length} 个文件，${failures} 个失败`);
process.exit(failures ? 1 : 0);

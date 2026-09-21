// 一次性脚本：把 SVG 插画渲染成 pages/cake 引用的 PNG 静态资源。
// 运行：node scripts/generate-cake-assets.js
// sharp 复用后端已安装的依赖，避免给 apps 增加新的构建期依赖。
const fs = require('fs');
const path = require('path');
const sharp = require('D:\\OpenClaw\\boss\\my-backend\\node_modules\\sharp');

const OUT_DIR = 'D:\\OpenClaw\\boss\\apps\\static\\cake';
const SIZE = 512;

const wrap = (inner, background) => `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${background}"/>
  ${inner}
</svg>`;

const assets = {
  'placeholder-mooncake': wrap(`
    <circle cx="256" cy="256" r="150" fill="#E3B778"/>
    <circle cx="256" cy="256" r="150" fill="none" stroke="#C99450" stroke-width="8"/>
    <circle cx="256" cy="256" r="112" fill="none" stroke="#C99450" stroke-width="6"/>
    <path d="M256 168c22 30 22 62 0 88-22-26-22-58 0-88z" fill="#C99450"/>
    <path d="M256 344c-22-30-22-62 0-88 22 26 22 58 0 88z" fill="#C99450"/>
    <path d="M168 256c30-22 62-22 88 0-26 22-58 22-88 0z" fill="#C99450"/>
    <path d="M344 256c-30 22-62 22-88 0 26-22 58-22 88 0z" fill="#C99450"/>
  `, '#FBF3E4'),

  'placeholder-cake': wrap(`
    <path d="M256 116c14 0 24 10 24 22 0 16-24 34-24 34s-24-18-24-34c0-12 10-22 24-22z" fill="#D9534F"/>
    <rect x="136" y="188" width="240" height="60" rx="14" fill="#F6E3C5"/>
    <rect x="146" y="248" width="220" height="56" rx="14" fill="#E9C79A"/>
    <rect x="156" y="304" width="200" height="56" rx="14" fill="#D9A86C"/>
    <rect x="126" y="360" width="260" height="34" rx="16" fill="#F1EDE4"/>
  `, '#FBF3E4'),

  'placeholder-bread': wrap(`
    <path d="M112 288c0-62 64-112 144-112s144 50 144 112c0 26-20 40-48 40H160c-28 0-48-14-48-40z" fill="#E0B073"/>
    <path d="M168 252l40-24M240 232l40-24M312 252l40-24" stroke="#C08F4E" stroke-width="12" stroke-linecap="round"/>
    <rect x="112" y="326" width="288" height="42" rx="18" fill="#C99A5C"/>
  `, '#FBF3E4'),

  'placeholder-drink': wrap(`
    <path d="M170 168h172l-22 224c-2 20-18 34-38 34h-52c-20 0-36-14-38-34z" fill="#F4E6D2"/>
    <path d="M170 168h172l-22 224c-2 20-18 34-38 34h-52c-20 0-36-14-38-34z" fill="none" stroke="#D8B98C" stroke-width="8"/>
    <path d="M186 262h140l-12 130c-2 14-12 22-26 22h-64c-14 0-24-8-26-22z" fill="#CE9A63"/>
    <rect x="292" y="112" width="14" height="72" rx="7" fill="#C9A227" transform="rotate(12 299 148)"/>
    <rect x="150" y="150" width="212" height="20" rx="10" fill="#E7D3B4"/>
  `, '#FBF3E4'),

  'placeholder-cookie': wrap(`
    <circle cx="256" cy="262" r="138" fill="#E5BE84"/>
    <circle cx="256" cy="262" r="138" fill="none" stroke="#C99A5C" stroke-width="8"/>
    <circle cx="206" cy="212" r="20" fill="#8E5B33"/>
    <circle cx="304" cy="232" r="17" fill="#8E5B33"/>
    <circle cx="236" cy="306" r="19" fill="#8E5B33"/>
    <circle cx="322" cy="318" r="15" fill="#8E5B33"/>
    <circle cx="176" cy="296" r="14" fill="#8E5B33"/>
  `, '#FBF3E4'),

  'promo-mooncake': wrap(`
    <rect x="76" y="292" width="360" height="150" rx="24" fill="#B4795A"/>
    <rect x="76" y="292" width="360" height="42" rx="20" fill="#C98F6C"/>
    <rect x="196" y="212" width="120" height="96" rx="18" fill="#E3B778"/>
    <rect x="196" y="212" width="120" height="96" rx="18" fill="none" stroke="#C99450" stroke-width="7"/>
    <circle cx="256" cy="260" r="30" fill="none" stroke="#C99450" stroke-width="6"/>
    <path d="M256 238c10 12 10 26 0 38-10-12-10-26 0-38z" fill="#C99450"/>
    <path d="M318 250c26 0 44 12 44 30s-18 30-44 30z" fill="#D9A86C"/>
    <path d="M194 250c-26 0-44 12-44 30s18 30 44 30z" fill="#D9A86C"/>
    <path d="M256 138l16 32 36 5-26 25 6 36-32-17-32 17 6-36-26-25 36-5z" fill="#F0C558"/>
  `, '#F7F5F1')
};

(async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const [name, svg] of Object.entries(assets)) {
    const target = path.join(OUT_DIR, `${name}.png`);
    await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toFile(target);
    const { size } = fs.statSync(target);
    console.log(`${name}.png ${size} bytes`);
  }
})().catch(error => { console.error(error); process.exit(1); });

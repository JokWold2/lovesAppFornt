# 资料编辑：国家、地区与语言目录

## 覆盖范围

- **249 个 ISO 3166-1 国家和地区**。国家列表从 Unicode CLDR 48.2 的 `regular` 地区代码生成，排除 CLDR 额外支持但不是 ISO 3166-1 正式分配的 `AC / CP / CQ / DG / EA / IC / TA / XK`。包含香港、澳门、台湾及其他 ISO 地区，不把地区总数称作主权国家总数。
- **7,923 个 ISO 639-3 语言条目**，来自 SIL 于 **2026-07-15** 发布的代码表：7,860 个 individual language 和 63 个 macrolanguage。此范围包含手语、现存语言、古代语言、已灭绝语言、历史语言及人工语言；不等于仅统计现存口语。排除 `mis / mul / und / zxx` 这 4 个特殊非语言占位代码。退役代码不在本目录中。
- 国家名称覆盖简体中文、繁体中文、英语、俄语、日语、韩语。语言名称使用同版本 CLDR 中已有的译名；CLDR 没有对应译名时保留 SIL 官方参考英文名，不机器编造译名。原始 SIL 名称仍可供搜索。
- 英语 CLDR 的 `lah / pnb` 和 `ori / ory` 存在别名重叠。`lah` 与 `ori` 使用 SIL 参考名 `Lahnda` 与 `Oriya (macrolanguage)`，保证每个选项可以区分。
- 所有名称均符合已有字段长度：国家不超过 100 个字符，语言不超过 50 个字符。不截断存储值，不修改数据库结构。

## 数据来源与授权

### 语言

- [ISO 对 ISO 639 语言代码的说明](https://www.iso.org/iso-639-language-code)：SIL 是 Set 3 的语言编码机构；Set 3 覆盖 individual languages。
- [SIL 官方下载与使用条款](https://iso639-3.sil.org/code_tables/download_tables)。本产品引用的语言代码来源为 **www.iso639-3.sil.org**。
- [固定日期源文件](https://iso639-3.sil.org/sites/iso639-3/files/downloads/iso-639-3_Code_Tables_20260715.zip)。按条款把代码嵌入软件选择器使用，保留原标识符；产品不提供代码表导出或独立再分发功能。CLDR 译名属于添加的展示信息，不是 ISO 标准的一部分。

### 名称翻译与地区代码

- [Unicode CLDR 官方 JSON 项目](https://github.com/unicode-org/cldr-json/tree/48.2.0)。采用 `cldr-localenames-full/main/{zh,zh-Hant,en,ru,ja,ko}/{territories,languages}.json`。
- [Unicode 地区代码有效性数据](https://github.com/unicode-org/cldr/blob/release-48-2/common/validity/region.xml)。
- Unicode 授权文本保存在 [licenses/profile-catalog-unicode.txt](licenses/profile-catalog-unicode.txt)。

### 国旗

- [flag-icons v7.5.0](https://github.com/lipis/flag-icons/tree/v7.5.0)，MIT License，Panayiotis Lipiridis。
- 使用发行包内 `flags/4x3/{ISO alpha-2}.svg`，统一缩放为本地 PNG 精灵图。授权文本保存在 [licenses/profile-flags-mit.txt](licenses/profile-flags-mit.txt)。
- 国旗图片只用于国家、地区选项。语言和国籍不一一对应，不给语言随意指定国旗。
- 不依赖系统 emoji 字体，也不依赖运行时外部图片服务。在微信、Windows、H5 和 App 中使用同一张本地资源。

## 前端数据契约

文件：`pages/tutorial/utils/profileCatalogData.js`。它是构建前生成的数据，随教学分包加载，不会在运行时下载或调用 `Intl.DisplayNames`。

- `catalogLocales`：六种界面语言的固定顺序。
- `catalogCountries`：`[code, names]` 数组，`names` 与 locale 顺序一致。国家数组的索引同时是国旗位置索引。
- `catalogLanguages`：`[iso6393, officialEnglishName, optionalAlpha2]` 数组。
- `catalogLanguageNames`：`{ locale: { iso6393: translatedName } }` 稀疏字典，仅存与参考名不同的名称。
- `catalogFlagSprite`：图片路径、列数、逻辑尺寸、单格尺寸与 2 倍像素密度。
- `catalogMetadata`：来源版本、国家数、语言数与语种范围统计。

**存储规则**：ISO 代码和国旗只用于界面索引与搜索。保存资料时仍提交用户实际选中的名称文本，不提交代码或国旗，不改写过去存储的其他语言文本。切换界面语言只改变新选项的显示。

## 生成与校验

生成器：`scripts/generate-profile-catalogs.cjs`，Node.js 18 或更新版本；仅开发时依赖 `sharp` 与 `jszip`。本次生成使用 `sharp 0.35.4`、`jszip 3.10.1`。这两个包不引入业务客户端，也无需修改当前应用依赖。

```powershell
# 在已有 Node 工具运行环境中准备 sharp 和 jszip，并将其 node_modules 放入 NODE_PATH。
node scripts/generate-profile-catalogs.cjs
node --test tests/profile-catalog-data.test.mjs
```

可设置 `PROFILE_CATALOG_CACHE` 指向下载缓存目录，默认使用系统临时目录。原始 SIL 表格与 SVG 只存于该构建缓存，不复制到小程序静态资源目录。每份下载的 SHA-256 保存在 `profile-catalog-source-checksums.json`，便于核对上游内容。

本次资源体积：JavaScript 数据 **259,087 字节**，PNG 国旗 **87,060 字节**，合计 **346,147 字节**（约 338 KiB）。PNG 实际为 `1024 × 768`，界面逻辑大小 `512 × 384`，16 列，每格逻辑 `32 × 24`。目录名称只分批渲染，避免将约八千个选项同时挂载。

上游版本需要定期显式更新并回归验证，不在用户打开资料页时自动变化。

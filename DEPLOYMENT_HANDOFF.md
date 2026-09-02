# lovesApp 域名部署与 OAuth 交接

更新时间：2026-09-02

## 已完成

- 已在 ECS 上新建独立 Nginx 站点：`/etc/nginx/sites-available/lovesapp2026.com`，并启用软链接。
- 原有 `/etc/nginx/sites-available/myapp` **未作修改**。
- 新站点路由已在服务器本机验证：
  - `/` → `302 /app/`
  - `/app/`（H5）→ `200`
  - `/lovesSystemAdmin/`（后台管理）→ `200`
- H5 已重新构建并发布至服务器 `/var/www/lovesapp/`。
- H5 的 `utils/config.js` 已改为 `baseURL: ''`，使生产环境 API 走同源请求，避免 HTTPS 下的混合内容拦截。
- 增加并已通过 H5 配置检查：`tests/h5-api-base-url.test.mjs`。
- 阿里云 DNS 控制台中已创建根域名和 `www` 的 A 记录，域名解析自助诊断显示正常。
- 已安装 Certbot，并为 `lovesapp2026.com` 和 `www.lovesapp2026.com` 签发 Let’s Encrypt 证书；证书有效期至 2026-12-01，已启用自动续期任务。
- HTTP 已自动跳转 HTTPS；以下地址已从公网验证为 `200`：
  - `https://www.lovesapp2026.com/app/`
  - `https://www.lovesapp2026.com/lovesSystemAdmin/`
- 为释放 HTTPS 标准端口，X-UI/Xray 的唯一 VLESS 入站已从 `443` 迁移到 `8443`；ECS 安全组已放行 TCP `8443`。
- X-UI 原始数据库已备份到：`/etc/x-ui/x-ui.db.before-lovesapp-8443.bak`。

## 当前访问地址

- H5：`https://www.lovesapp2026.com/app/`
- 后台管理：`https://www.lovesapp2026.com/lovesSystemAdmin/`
- 后端 API：与上述域名同源，由 Nginx 转发至 `127.0.0.1:3000`。

## X-UI / Xray 注意事项

- Xray 现在监听 TCP `8443`，原端口 `443` 已由 Nginx 接管用于 HTTPS。
- 现有代理客户端需要将服务器端口改为 `8443`。
- 如需回滚，恢复备份数据库并重启 X-UI；执行前先停止并确认 Nginx 的 443 占用关系，避免再次产生端口冲突。

## 当前 Nginx 设计

新域名站点包含以下规则：

- `/app/`：静态目录 `/var/www/lovesapp/`；
- `/uploads/`：映射至后端上传目录；
- 其余路径：反向代理到 `127.0.0.1:3000`，由现有 Node/PM2 后端处理；
- 这使 `/lovesSystemAdmin/` 继续由后端已有的静态路由提供。

## 后续 OAuth 开发（待实现）

用户需求尚未实现：

- H5 Google 登录；
- H5 Facebook 登录；
- Android Facebook 登录；
- 在 Google/Meta 开发者控制台填写正式 HTTPS 域名及回调地址。

HTTPS 已完成。下一步需检查现有登录流程和后端回调路径，再在 Google/Meta 控制台添加正式 HTTPS 域名及回调地址。不要将 Client Secret 或服务器密码写入代码、文档或前端构建产物。

## 本地变更与验证

在 H5 项目根目录执行：

```bash
node tests/h5-api-base-url.test.mjs
/Applications/HBuilderX.app/Contents/MacOS/cli publish web --project "$(pwd)" --webTitle lovesApp --sourceMap false
```

构建目录：`unpackage/dist/build/web`。

部署前可确认构建产物未包含旧的 HTTP 服务器地址：

```bash
if rg -q 'http://[0-9]{1,3}\.' unpackage/dist/build/web; then
  echo '发现裸 HTTP IP 地址，停止发布'
  exit 1
fi
```

## 安全提醒

- 服务器密码、数据库密码、OAuth Secret 不应出现在 Git、前端配置、日志或交接文档中。
- 不要覆盖或删除现有 `myapp` Nginx 配置。
- 发布 H5 时先完整性校验压缩包，再解压到 `/var/www/lovesapp/`。

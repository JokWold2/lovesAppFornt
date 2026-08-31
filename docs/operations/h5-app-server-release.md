# LovesApp H5 `/app/` 发布手册

本文用于将 LovesApp 前端 H5 更新到阿里云服务器。

- 线上入口：`http://8.218.94.132/app/#/pages/index/index360`
- 前端项目：`/Users/eliliang/Desktop/workspace/lovesAppFornt`
- 本地构建产物：`/Users/eliliang/Desktop/workspace/lovesAppFornt/unpackage/dist/build/web`
- 服务器正式目录：`/var/www/myapp`
- 后端仍由原有 Node.js/PM2 服务提供，本流程不需要重启后端。

## 1. 发布前检查

### 1.1 确认 H5 基础路径

`manifest.json` 必须包含：

```json
"h5": {
  "router": {
    "base": "/app/"
  }
}
```

也可以在 HBuilderX 的 `manifest.json → Web 配置 → 运行基础路径` 中确认值为 `/app/`。

如果缺少该配置，构建后的资源可能请求 `/assets/` 或 `/static/`，部署在 `/app/` 后会出现 JS、CSS 或底部导航图片 404。

### 1.2 确认线上 API 地址

检查 `utils/config.js`，正式构建不能保留 `localhost` 或局域网地址。当前线上 API 地址为：

```text
http://8.218.94.132
```

如果未来 H5 改用 HTTPS，API 也必须改成 HTTPS，否则浏览器会阻止混合内容请求。

## 2. 在 Mac 上构建 H5

### 方式一：HBuilderX

选择：

```text
发行 → 网站-H5手机版 → 发行
```

### 方式二：命令行

在 Mac 终端执行：

```bash
'/Applications/HBuilderX.app/Contents/MacOS/cli' publish web \
  --project '/Users/eliliang/Desktop/workspace/lovesAppFornt'
```

必须看到“项目 lovesAppFornt 编译成功”和“导出 Web 成功”。

检查构建内容：

```bash
ls -la /Users/eliliang/Desktop/workspace/lovesAppFornt/unpackage/dist/build/web
```

必须直接包含：

```text
index.html
assets/
static/
```

检查基础路径是否正确：

```bash
grep -E 'src=|stylesheet' \
  /Users/eliliang/Desktop/workspace/lovesAppFornt/unpackage/dist/build/web/index.html
```

输出中的资源地址应以 `/app/assets/` 开头。

## 3. 在 Mac 上生成上传包

在 Mac 终端执行：

```bash
cd /Users/eliliang/Desktop/workspace/lovesAppFornt/unpackage/dist/build/web

COPYFILE_DISABLE=1 tar \
  --exclude='.DS_Store' \
  --exclude='._*' \
  -czf /Users/eliliang/Desktop/myapp-new.tar.gz .
```

确认压缩包存在且不是 0 字节：

```bash
ls -lh /Users/eliliang/Desktop/myapp-new.tar.gz
```

## 4. 通过阿里云 Workbench 上传

当本机 SSH/rsync 正常时，也可以直接用 rsync；如果 SSH 卡在连接阶段，优先使用 Workbench 文件管理器。

Workbench 上传步骤：

1. 打开左侧“文件管理”。
2. 展开服务器根目录并选中 `/tmp`。
3. 右键 `/tmp` 选择“上传文件”，或使用文件管理器顶部的上传按钮。
4. 选择 Mac 桌面的 `myapp-new.tar.gz`。
5. 等待文件任务中心显示上传完成。

在服务器终端确认：

```bash
ls -lh /tmp/myapp-new.tar.gz
```

只有文件真实存在后才能继续。

## 5. 在服务器解压并检查

每次发布使用一个带时间戳的新临时目录，避免复用空目录或旧文件。下面几步应在同一个服务器终端会话中连续执行：

```bash
lovesapp_release_dir="/tmp/myapp-release-$(date +%Y%m%d-%H%M%S)"
sudo mkdir -p "$lovesapp_release_dir"
sudo tar -xzf /tmp/myapp-new.tar.gz -C "$lovesapp_release_dir"
```

检查解压结果：

```bash
ls -la "$lovesapp_release_dir"
test -f "$lovesapp_release_dir/index.html" && echo 'release package ready'
test -d "$lovesapp_release_dir/assets" && echo 'assets ready'
test -d "$lovesapp_release_dir/static" && echo 'static ready'
```

必须同时看到：

```text
index.html
assets/
static/
release package ready
assets ready
static ready
```

如果没有看到这些内容，立即停止。不要对正式目录执行 `rsync --delete`。

从 Mac 创建的旧压缩包有时会输出以下提示：

```text
Ignoring unknown extended header keyword 'LIBARCHIVE.xattr...'
```

这只是 macOS 扩展属性提示，不会阻止解压。本文的 `COPYFILE_DISABLE=1` 和排除规则可以减少这类文件。

## 6. 备份并发布

### 6.1 备份当前线上版本

备份目录名使用当前日期和时间，避免把旧备份覆盖或嵌套：

```bash
lovesapp_backup_dir="/var/www/myapp-backup-$(date +%Y%m%d-%H%M%S)"
sudo cp -a /var/www/myapp "$lovesapp_backup_dir"
echo "backup created: $lovesapp_backup_dir"
```

### 6.2 同步新版本

确认第 5 步检查通过后执行：

```bash
sudo rsync -a --delete --exclude='._*' \
  "$lovesapp_release_dir"/ \
  /var/www/myapp/
```

注意两个源目录末尾的 `/`。这里同步的是目录内容，不要让服务器出现 `/var/www/myapp/web/index.html` 这样的额外嵌套。

### 6.3 设置权限

```bash
sudo chown -R www-data:www-data /var/www/myapp
sudo find /var/www/myapp -type d -exec chmod 755 {} \;
sudo find /var/www/myapp -type f -exec chmod 644 {} \;
```

再次检查：

```bash
ls -la /var/www/myapp
```

必须能看到 `index.html`、`assets` 和 `static`。

静态文件更新通常不需要重启 Node.js、PM2 或 Nginx。

## 7. 发布验证

### 7.1 从服务器内部验证正确的 Nginx 站点

服务器根据 Host 选择 Nginx 站点。直接访问 `127.0.0.1` 可能命中默认站点并返回 404，因此使用：

```bash
curl -I -H 'Host: 8.218.94.132' http://127.0.0.1/app/
```

预期：

```text
HTTP/1.1 200 OK
```

### 7.2 从浏览器验证

打开：

```text
http://8.218.94.132/app/#/pages/index/index360
```

Mac 使用 `Command + Shift + R` 强制刷新，也可以使用无痕窗口。需要绕过旧缓存时可临时访问：

```text
http://8.218.94.132/app/?v=YYYYMMDD#/pages/index/index360
```

浏览器开发者工具中确认：

- 页面请求为 200；
- `/app/assets/*.js` 和 `/app/assets/*.css` 为 200；
- `/app/static/...` 图片为 200；
- 登录和业务 API 请求仍发往正确的后端。

## 8. 回滚

如果新版出现问题，先列出备份：

```bash
ls -dt /var/www/myapp-backup-* | head
```

确认要恢复的准确目录后，将下面示例目录替换为真实备份目录：

```bash
sudo rsync -a --delete \
  /var/www/myapp-backup-YYYYMMDD-HHMM/ \
  /var/www/myapp/

sudo chown -R www-data:www-data /var/www/myapp
```

然后重新执行第 7 步验证。

## 9. 常见问题

### 9.1 页面返回 403 Forbidden

先执行：

```bash
ls -la /var/www/myapp
```

如果只有 `.` 和 `..`，说明正式目录已被清空，Nginx 找不到 `index.html`。常见原因是用空的临时目录执行了：

```bash
rsync --delete
```

立即停止继续覆盖，从最近备份恢复。

### 9.2 `127.0.0.1/app/` 返回 404，但公网页面正常

这是 Host 不匹配导致命中了 Nginx 默认站点，不代表 `/app/` 发布失败。使用：

```bash
curl -I -H 'Host: 8.218.94.132' http://127.0.0.1/app/
```

### 9.3 rsync 一直没有输出

先按 `Ctrl+C` 停止，再测试：

```bash
ssh -o ConnectTimeout=10 ubuntu@8.218.94.132
```

如果 SSH 连接仍卡住，在 Workbench 中检查：

```bash
sudo sshd -t
sudo systemctl status ssh --no-pager
sudo ss -ltnp | grep ':22'
```

`sudo sshd -t` 没有错误时才考虑执行：

```bash
sudo systemctl restart ssh
```

Workbench 可用时，直接使用第 4 步上传，不必等待本机 SSH 恢复。

### 9.4 JS、CSS 或底部图标 404

检查构建后的 `index.html` 是否引用 `/app/assets/`，并确认 `manifest.json` 的 H5 router base 是 `/app/`。同时确认服务器 `/var/www/myapp/static` 存在。

## 10. 发布安全规则

1. 永远先备份，再覆盖。
2. 永远先确认临时目录存在 `index.html`，再运行 `rsync --delete`。
3. `--delete` 只能用于已经确认的 `/var/www/myapp`，不要对 `/var/www` 或更上层目录执行。
4. 不要把服务器密码写进命令、脚本、Git 或聊天记录。
5. 本流程只发布 H5 静态文件，不修改数据库，也不重启后端。

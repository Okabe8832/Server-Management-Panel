此项目是一个本地服务器资料库，它用于保存服务器名称、IP/域名、端口、登录名、密码、分组、标签和备注，并支持导入导出 JSON 。在需要连接时，可点击 SSH 按钮调用本机终端。


## 开发运行

```bash
npm install
npm run tauri:dev
```

## 构建

```bash
npm run build
npm run tauri:build
```

当前默认 macOS bundle 目标为 `.app`。

也可以按平台显式构建：

```bash
npm run tauri:build:mac
npm run tauri:build:win
```

### Windows 构建说明

Windows 上建议使用：

- Node.js 和 npm。
- Rust stable MSVC 工具链。
- Visual Studio Build Tools，安装 Desktop development with C++。
- Microsoft Edge WebView2 Runtime。
- Windows OpenSSH Client，用于 SSH 按钮实际执行 `ssh` 命令。

SSH 按钮在 Windows 上会优先尝试 Windows Terminal，然后回退到 `cmd`。如果系统没有安装 `ssh`，终端会打开但无法执行连接，需要先安装或启用 OpenSSH Client。

发布 Windows 包时，可以在 Windows 机器或 GitHub Actions Windows runner 中运行 `npm run tauri:build:win`。当前本地 macOS 默认只产出 `.app`，Windows 发布建议使用 Tauri CLI 指定 `nsis` 或 `msi` 包。

## 数据位置

应用使用 Tauri app data 目录保存：

```text
app-data/
  vault.json
  settings.json
  backups/
```

## JSON 格式

```json
{
  "schema": 2,
  "app": "local-server-vault",
  "revision": 1,
  "updatedAt": "2026-06-20T10:30:00+08:00",
  "hosts": [
    {
      "id": "uuid",
      "name": "Example Server",
      "address": "114.0.514.10",
      "port": 22,
      "username": "root",
      "password": "",
      "group": "Personal vault",
      "tags": ["prod", "beijing"],
      "note": "",
      "createdAt": "2026-06-20T10:30:00+08:00",
      "updatedAt": "2026-06-20T10:30:00+08:00"
    }
  ]
}
```

## 导入导出

导出文件名默认为：

```text
server-vault-YYYYMMDD-HHmmss.json
```

导入会覆盖当前本地数据。导入前应用会自动备份当前 `vault.json` 到 `backups/`。

## SSH 按钮

详情页的 SSH 按钮会调用本机终端：

- macOS：Terminal
- Windows：优先 Windows Terminal，失败后回退 cmd
- Linux：尝试常见终端

密码不会自动传给 SSH。终端提示输入密码时，可以回到应用点击“复制密码”再粘贴。

## 发布前检查

发布到 GitHub 前请确认：

- 不提交本机 app data 目录里的 `vault.json`、`settings.json` 和 `backups/`。
- 不提交导出的 `server-vault-*.json` 或 `ssh-vault-*.json`。
- 不提交 `.env`、私钥、证书或其他凭据文件。
- 构建产物只来自源码，不手动拷贝本机运行数据。
- 用 `rg` 或其他工具扫描真实服务器 IP、端口、密码、Token、私钥关键词。

## 路线图

- 增加卡片图标选择。
- 增加导入合并模式。
- 增加可选的本地加密。
- 增加分享码或压缩 JSON。
- 将来接共同服务器时，再加入同步上传/下载协议。

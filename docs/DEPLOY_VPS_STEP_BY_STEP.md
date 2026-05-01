# Docker/VPS 新手上线手册

本手册按最稳妥顺序执行：先让服务在 IP 上可访问，再绑定域名和 HTTPS。

## 0. 服务器最低要求

- Ubuntu 22.04+（或兼容 Linux）
- 2 vCPU / 4GB RAM 起步
- 已开放端口：22（SSH），后续 80/443（HTTPS）

## 1. 安装 Docker 与 Compose

在 VPS 上执行：

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

## 2. 上传代码到服务器

```bash
mkdir -p /opt/guge
cd /opt/guge
git clone <你的仓库地址> .
```

## 3. 配置生产环境变量

先复制模板：

```bash
cp .env.example .env
```

然后编辑 `.env` 至少设置这些值：

- `DEPLOYMENT_ENV=production`
- `NEXT_PUBLIC_SITE_URL=https://你的正式域名`
- `DATABASE_URL=postgresql://guge:强密码@postgres:5432/guge`
- `ADMIN_JWT_SECRET`、`USER_JWT_SECRET`（两者必须不同）
- `ADMIN_PASSWORD_HASH`（bcrypt 哈希）
- `INGEST_WEBHOOK_SECRET`、`NORMALIZE_WEBHOOK_SECRET`

生成随机密钥示例：

```bash
openssl rand -base64 48
```

生成管理员密码哈希示例：

```bash
node -e "console.log(require('bcryptjs').hashSync('你的管理员密码',10))"
```

## 4. 第一次启动（先用 IP 验证）

```bash
cd /opt/guge
docker compose -f compose.vps.yaml up -d --build
docker compose -f compose.vps.yaml ps
```

本地浏览器打开：

- `http://服务器IP:3000/`
- `http://服务器IP:3000/robots.txt`
- `http://服务器IP:3000/sitemap.xml`

## 5. 绑定域名并启用 HTTPS

1. 在域名平台添加 A 记录：`@` 和 `www` 指向服务器公网 IP。
2. 等待解析生效（可用 `nslookup 你的域名` 检查）。
3. 在 `.env` 增加或确认：`APP_DOMAIN=你的域名`。
4. 启动 Caddy：

```bash
cd /opt/guge
docker compose -f compose.vps.yaml -f compose.vps.domain.yaml up -d
docker compose -f compose.vps.yaml -f compose.vps.domain.yaml ps
```

访问：

- `https://你的域名/`
- `https://你的域名/robots.txt`
- `https://你的域名/sitemap.xml`

## 6. 上线后 10 分钟检查

- `robots.txt` 可访问，且生产应为 Allow 模式。
- `sitemap.xml` 返回 200，URL 域名是你的正式域名（不是 localhost）。
- 随机打开 1 篇文章，确认：
  - 有来源链接
  - 显示“最后更新”
- 随机打开 1 个 Hub，确认 canonical 关系符合设计。

## 7. 常用排错命令

```bash
docker compose -f compose.vps.yaml logs -f web
docker compose -f compose.vps.yaml logs -f postgres
docker compose -f compose.vps.yaml -f compose.vps.domain.yaml logs -f caddy
docker compose -f compose.vps.yaml restart web
```

## 8. 回滚（最小方案）

- 应用回滚到上一版代码后重新 `up -d --build`。
- 数据库问题按 `docs/RUNBOOK.md` 的备份/还原流程执行。

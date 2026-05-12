# Cloudflare Workers 邮件摘要 → Telegram/Discord

将收到的域名邮件通过 AI 自动总结，推送到 Telegram 和 Discord。

## 架构

```
域名邮件 (MX) → Cloudflare Email Routing → Worker (AI 总结) → Telegram / Discord
```

## 项目结构

```
├── wrangler.toml          # Cloudflare Workers 配置
├── package.json           # 依赖配置
└── src/
    ├── index.js           # 主入口 (email + HTTP handler)
    ├── email-parser.js    # 邮件解析 (postal-mime)
    ├── ai-summarizer.js   # AI 总结 (Cloudflare AI)
    ├── templates.js       # 消息模板 (Telegram HTML + Discord Embed)
    └── notifier.js        # 通知发送
```

## 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 创建 Telegram Bot

1. Telegram 搜索 `@BotFather`
2. 发送 `/newbot`，按提示设置
3. 获得 Bot Token（格式：`123456:ABC-DEF...`）
4. 给 bot 发一条消息，然后获取 Chat ID：

```bash
curl "https://api.telegram.org/bot<你的TOKEN>/getUpdates"
```

从返回 JSON 中找到 `chat.id`。

### 3. 设置 Cloudflare 密钥

```bash
npx wrangler login

npx wrangler secret put TELEGRAM_BOT_TOKEN   # 粘贴 Bot Token
npx wrangler secret put TELEGRAM_CHAT_ID     # 粘贴 Chat ID
npx wrangler secret put DISCORD_WEBHOOK_URL  # 可选
```

### 4. 部署

```bash
npx wrangler deploy
```

### 5. 配置邮件路由

进入 Cloudflare Dashboard：

1. 选择你的域名
2. **Email → Email Routing → Catch-All**
3. Action 选择 **Send to a Worker** → 选择 `email-summarizer`
4. 确保 MX 记录已添加（Cloudflare 会自动配置）

## 测试

```bash
# 健康检查
curl https://email-summarizer.<你的子域>.workers.dev/health

# 测试 AI 总结（POST /test）
curl -X POST https://email-summarizer.<你的子域>.workers.dev/test \
  -H "Content-Type: application/json" \
  -d '{"subject":"测试邮件","text":"这是一封测试邮件的内容"}'

# 查看实时日志
npx wrangler tail
```

## 环境变量

| 变量 | 说明 | 必填 |
|------|------|------|
| `TELEGRAM_BOT_TOKEN` | Telegram Bot Token | 是（TG） |
| `TELEGRAM_CHAT_ID` | Telegram 目标 Chat ID | 是（TG） |
| `DISCORD_WEBHOOK_URL` | Discord Webhook URL | 否 |
| `AI_MODEL` | AI 模型，默认 `@cf/zai-org/glm-4.7-flash` | 否 |
| `LANGUAGE` | 输出语言，`zh` 或 `en`，默认 `zh` | 否 |

敏感变量通过 `wrangler secret` 设置，非敏感变量可在 `wrangler.toml` 的 `[vars]` 中配置。

## 免费额度

- Cloudflare Workers：每天 10 万次请求
- Cloudflare AI：每天 1 万次推理
- 个人使用完全够用

import { formatDiscordEmbed } from './templates.js';

/**
 * 发送到 Telegram Bot
 */
export async function sendToTelegram(text, env) {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  // Telegram 消息长度限制 4096 字符
  const chunks = splitMessage(text, 4000);

  for (const chunk of chunks) {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: env.TELEGRAM_CHAT_ID,
        text: chunk,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Telegram API 错误 (${response.status}): ${error}`);
    }

    // 如果有多条消息，间隔发送避免速率限制
    if (chunks.length > 1) {
      await new Promise(r => setTimeout(r, 200));
    }
  }
}

/**
 * 发送到 Discord Webhook
 */
export async function sendToDiscord(email, summary, env) {
  const embed = formatDiscordEmbed(email, summary);

  const response = await fetch(env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: '📧 邮件助手',
      avatar_url: 'https://cdn-icons-png.flaticon.com/512/3178/3178158.png',
      embeds: [embed],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Discord API 错误 (${response.status}): ${error}`);
  }
}

/**
 * 分割长消息
 */
function splitMessage(text, maxLength) {
  if (text.length <= maxLength) return [text];

  const chunks = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // 尝试在换行符处分割
    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      splitIndex = maxLength;
    }

    chunks.push(remaining.slice(0, splitIndex));
    remaining = remaining.slice(splitIndex);
  }

  return chunks;
}

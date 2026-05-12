/**
 * 格式化为 Telegram HTML 消息
 */
export function formatMessage(email, summary) {
  const fromDisplay = email.fromName
    ? `${email.fromName} &lt;${email.from}&gt;`
    : escapeHtml(email.from);

  const dateStr = formatDate(email.date);
  const attachmentStr = email.attachments.length > 0
    ? `\n📎 附件: ${email.attachments.map(a => escapeHtml(a.filename)).join(', ')}`
    : '';

  // 将 AI 摘要中的 Markdown 格式转为 HTML，并转义特殊字符
  const safeSummary = mdToHtml(summary);

  return `📧 <b>新邮件摘要</b>

👤 <b>发件人:</b> ${fromDisplay}
📬 <b>收件人:</b> ${escapeHtml(email.to)}
📅 <b>日期:</b> ${dateStr}
📋 <b>主题:</b> ${escapeHtml(email.subject)}${attachmentStr}

━━━━━━━━━━━━━━━━

${safeSummary}

━━━━━━━━━━━━━━━━
🤖 <i>由 Cloudflare AI 自动总结</i>`;
}

/**
 * 格式化 Discord Embed
 */
export function formatDiscordEmbed(email, summary) {
  const fromDisplay = email.fromName
    ? `${email.fromName} <${email.from}>`
    : email.from;

  return {
    title: `📧 ${email.subject}`,
    color: 0x5865f2, // Discord 蓝色
    fields: [
      { name: '👤 发件人', value: fromDisplay, inline: true },
      { name: '📅 日期', value: formatDate(email.date), inline: true },
      { name: '📬 收件人', value: email.to, inline: true },
      {
        name: '🤖 AI 摘要',
        value: summary.slice(0, 1024), // Discord field 限制
        inline: false,
      },
    ],
    footer: {
      text: '由 Cloudflare AI 自动总结',
    },
    timestamp: new Date(email.date).toISOString(),
  };
}

/**
 * 转义 HTML 特殊字符
 */
function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * 将 AI 输出的简易 Markdown 转为 Telegram HTML
 * 支持: **bold**, *italic*, • 列表
 */
function mdToHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/`(.+?)`/g, '<code>$1</code>');
}

/**
 * 格式化日期
 */
function formatDate(dateStr) {
  try {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', {
      timeZone: 'Asia/Shanghai',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

import PostalMime from 'postal-mime';

/**
 * 解析原始邮件流
 * @param {EmailMessage} message - Cloudflare Email Message 对象
 * @returns {Object} 解析后的邮件数据
 */
export async function parseEmail(message) {
  // 读取原始邮件数据
  const rawEmail = await new Response(message.raw).arrayBuffer();

  // 使用 postal-mime 解析
  const parsed = await PostalMime.parse(rawEmail);

  // 清理 HTML 内容（提取纯文本）
  const cleanText = parsed.text || stripHtml(parsed.html || '');

  // 处理附件
  const attachments = (parsed.attachments || []).map(att => ({
    filename: att.filename,
    mimeType: att.mimeType,
    size: att.content ? att.content.byteLength : 0,
  }));

  return {
    from: message.from || parsed.from?.address || 'unknown',
    fromName: parsed.from?.name || '',
    to: message.to || parsed.to?.[0]?.address || 'unknown',
    subject: parsed.subject || '(无主题)',
    textBody: cleanText,
    htmlBody: parsed.html || '',
    date: parsed.date || new Date().toISOString(),
    attachments,
    // 原始头部信息（可选，用于分类等）
    headers: Object.fromEntries(
      (parsed.headers || []).map(h => [h.key, h.value])
    ),
  };
}

/**
 * 简单的 HTML 标签去除
 */
function stripHtml(html) {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

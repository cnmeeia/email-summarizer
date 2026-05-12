/**
 * 使用 Cloudflare AI 总结邮件内容
 */
export async function summarizeEmail(email, env) {
  const language = env.LANGUAGE || 'zh';
  const model = env.AI_MODEL || '@cf/meta/llama-3.1-8b-instruct';

  // 截断过长的邮件内容（避免超出 token 限制）
  const maxChars = 8000;
  const truncatedText = email.textBody.length > maxChars
    ? email.textBody.slice(0, maxChars) + '\n\n[... 内容已截断 ...]'
    : email.textBody;

  // 构造附件信息
  const attachmentInfo = email.attachments.length > 0
    ? `\n\n附件列表:\n${email.attachments.map(a =>
      `  - ${a.filename} (${a.mimeType}, ${formatSize(a.size)})`
    ).join('\n')}`
    : '';

  const systemPrompt = language === 'zh'
    ? `你是一个专业的邮件助手。你的任务是总结邮件内容，生成简洁清晰的摘要。

请按以下格式输出摘要：
1. **主题概述**：一句话说明这封邮件的核心内容
2. **关键要点**：列出 2-5 个重要信息点（使用要点列表）
3. **需要行动**：如果邮件需要收件人采取行动，明确列出待办事项
4. **优先级判断**：评估紧急程度（🔴紧急 / 🟡普通 / 🟢低优先级）

保持简洁，不要超过 200 字。如果邮件内容很短，直接给出简要总结即可。`
    : `You are a professional email assistant. Your task is to summarize email content clearly and concisely.

Output format:
1. **Summary**: One sentence describing the core content
2. **Key Points**: List 2-5 important items (bullet points)
3. **Action Required**: If the email requires action, list specific to-dos
4. **Priority**: Assess urgency (🔴Urgent / 🟡Normal / 🟢Low)

Keep it under 200 words. For short emails, give a brief summary directly.`;

  const userPrompt = language === 'zh'
    ? `请总结以下邮件：

发件人: ${email.fromName ? `${email.fromName} <${email.from}>` : email.from}
日期: ${email.date}
主题: ${email.subject}
${attachmentInfo}

--- 邮件内容 ---
${truncatedText}
--- 邮件结束 ---`
    : `Please summarize the following email:

From: ${email.fromName ? `${email.fromName} <${email.from}>` : email.from}
Date: ${email.date}
Subject: ${email.subject}
${attachmentInfo}

--- Email Content ---
${truncatedText}
--- End of Email ---`;

  try {
    const response = await env.AI.run(model, {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 512,
      temperature: 0.3,
    });

    // 不同模型的响应格式可能不同
    const summary = typeof response === 'string'
      ? response
      : response.response
        || response.result?.response
        || JSON.stringify(response);

    return summary.trim();

  } catch (error) {
    console.error('AI 总结失败:', error);
    // 回退：返回简单的截断文本
    return `⚠️ AI 总结失败，以下是邮件前 300 字：\n\n${truncatedText.slice(0, 300)}...`;
  }
}

/**
 * 格式化文件大小
 */
function formatSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

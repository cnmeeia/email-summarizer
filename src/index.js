import { parseEmail } from './email-parser.js';
import { summarizeEmail } from './ai-summarizer.js';
import { sendToTelegram, sendToDiscord } from './notifier.js';
import { formatMessage } from './templates.js';

export default {
  /**
   * Cloudflare Email Handler
   * 当邮件路由将邮件转发到此 Worker 时触发
   */
  async email(message, env, ctx) {
    console.log(`📧 收到邮件: ${message.from} → ${message.to}`);

    try {
      // 1. 解析邮件
      const email = await parseEmail(message);
      console.log(`✅ 邮件解析完成: "${email.subject}"`);

      // 2. AI 总结
      const summary = await summarizeEmail(email, env);
      console.log(`🤖 AI 总结完成`);

      // 3. 格式化消息
      const formattedMsg = formatMessage(email, summary);

      // 4. 发送通知（并行发送到所有平台）
      const promises = [];

      // Telegram
      if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
        promises.push(
          sendToTelegram(formattedMsg, env)
            .then(() => console.log('✅ Telegram 发送成功'))
            .catch(err => console.error('❌ Telegram 发送失败:', err.message))
        );
      }

      // Discord
      if (env.DISCORD_WEBHOOK_URL) {
        promises.push(
          sendToDiscord(email, summary, env)
            .then(() => console.log('✅ Discord 发送成功'))
            .catch(err => console.error('❌ Discord 发送失败:', err.message))
        );
      }

      await Promise.allSettled(promises);

    } catch (error) {
      console.error('❌ 处理邮件失败:', error);

      // 错误通知（尽力发送）
      try {
        const errorMsg = `⚠️ 邮件处理失败\n\n` +
          `发件人: ${message.from}\n` +
          `收件人: ${message.to}\n` +
          `错误: ${error.message}`;

        if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
          await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: env.TELEGRAM_CHAT_ID,
                text: errorMsg,
              }),
            }
          );
        }
      } catch (_) {
        // 静默处理
      }
    }
  },

  /**
   * HTTP Handler（可选 - 用于健康检查和手动测试）
   */
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // 健康检查
    if (url.pathname === '/health') {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // 手动测试（POST /test）
    if (url.pathname === '/test' && request.method === 'POST') {
      try {
        const { text, subject } = await request.json();

        const email = {
          from: 'test@example.com',
          to: 'you@yourdomain.com',
          subject: subject || '测试邮件',
          textBody: text || '这是一封测试邮件的内容...',
          htmlBody: '',
          date: new Date().toISOString(),
          attachments: [],
        };

        const summary = await summarizeEmail(email, env);
        const formattedMsg = formatMessage(email, summary);

        // 发送到 Telegram
        if (env.TELEGRAM_BOT_TOKEN && env.TELEGRAM_CHAT_ID) {
          await sendToTelegram(formattedMsg, env);
        }

        return Response.json({ success: true, summary, formattedMsg });
      } catch (error) {
        return Response.json({ success: false, error: error.message }, { status: 500 });
      }
    }

    return new Response('📧 Email Summarizer Worker is running!', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  },
};

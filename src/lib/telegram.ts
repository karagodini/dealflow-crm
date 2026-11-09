export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim());
}

export async function sendTelegram(chatId: string, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !chatId.trim()) return { sent: false as const };
  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId.trim(),
      text,
      disable_web_page_preview: true,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  return { sent: response.ok };
}

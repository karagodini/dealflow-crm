import "server-only";

import { formatMoneyPlain } from "@/lib/money";
import { sendTelegram, telegramConfigured } from "@/lib/telegram";

export async function notifyWorkspace(
  workspace: { name: string; telegramNotify: boolean; telegramChatId: string | null },
  text: string,
) {
  if (!workspace.telegramNotify || !workspace.telegramChatId || !telegramConfigured()) {
    return { sent: false as const };
  }
  try {
    return await sendTelegram(workspace.telegramChatId, `DealFlow · ${workspace.name}\n${text}`);
  } catch {
    return { sent: false as const };
  }
}

export function dealMovedMessage(input: {
  title: string;
  client: string;
  from: string;
  to: string;
  value: string;
}) {
  return `${input.title}\n${input.from} → ${input.to}\n${input.client} · ${input.value}`;
}

export function overdueMessage(input: {
  number: string;
  client: string;
  total: string;
  due: string;
}) {
  return `Invoice ${input.number} is overdue\n${input.client} · ${input.total}\nDue ${input.due}`;
}

export function moneyLine(cents: number, currency: string) {
  return formatMoneyPlain(cents, currency);
}

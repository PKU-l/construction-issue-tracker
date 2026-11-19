/**
 * 日期辅助:计算逾期天数、超时预警等级。
 * 所有日期字符串按 ISO YYYY-MM-DD 处理,与 Supabase date 类型一致。
 */

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/** 距离某个日期已过去多少天(正数=过去,负数=未来)。null 输入返回 null。 */
export function daysSince(d?: string | null): number | null {
  if (!d) return null;
  const then = new Date(d + 'T00:00:00').getTime();
  const now = new Date(todayISO() + 'T00:00:00').getTime();
  return Math.round((now - then) / 86_400_000);
}

/** 距离截止日期还剩多少天(负数=已过截止)。null 输入返回 null。 */
export function daysUntilDue(due?: string | null): number | null {
  if (!due) return null;
  const dueT = new Date(due + 'T00:00:00').getTime();
  const now = new Date(todayISO() + 'T00:00:00').getTime();
  return Math.round((dueT - now) / 86_400_000);
}

export type OverdueTier = 'none' | 'warn' | 'high' | 'critical';

/** 根据"截止日期"决定预警等级。已过截止 0-2 天 warn,3-6 天 high,7+ 天 critical。 */
export function overdueByDue(due?: string | null): OverdueTier {
  const left = daysUntilDue(due);
  if (left === null) return 'none';
  if (left >= 0) return 'none';
  const past = -left;
  if (past >= 7) return 'critical';
  if (past >= 3) return 'high';
  return 'warn';
}

/** 根据"等待外部回复"停留天数决定预警等级(参考 date_raised 或专门的等待起始日)。 */
export function overdueByWaiting(waitingSince?: string | null): OverdueTier {
  const days = daysSince(waitingSince);
  if (days === null || days < 3) return 'none';
  if (days >= 14) return 'critical';
  if (days >= 7) return 'high';
  return 'warn';
}

export const OVERDUE_STYLE: Record<Exclude<OverdueTier, 'none'>, { text: string; bg: string; label: string }> = {
  warn:     { text: 'text-amber-700 dark:text-amber-300',  bg: 'bg-amber-50 dark:bg-amber-500/10',  label: '注意' },
  high:     { text: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-500/10', label: '预警' },
  critical: { text: 'text-rose-700 dark:text-rose-300',    bg: 'bg-rose-50 dark:bg-rose-500/10',    label: '紧急' },
};

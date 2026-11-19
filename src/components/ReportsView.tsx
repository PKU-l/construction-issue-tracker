import { useEffect, useMemo, useState } from 'react';
import { sb } from '../lib/supabase';
import { DI_RISK_LEVELS, DI_RISK_STYLE, DRAWING_SPECS } from '../lib/enums';
import type {
  DIRisk,
  Drawing,
  DrawingIssue,
  DrawingSpecialty,
  Issue,
  TimelineEntry,
} from '../lib/types';
import { daysSince, todayISO } from '../lib/dates';
import { cx } from '../lib/util';
import { Spin } from './Spin';

/* ─── helpers ─────────────────────────────────────────────────── */

function monthKey(iso?: string | null): string {
  if (!iso) return '';
  return iso.slice(0, 7); // YYYY-MM
}

function lastNMonths(n: number): string[] {
  const out: string[] = [];
  const now = new Date(todayISO() + 'T00:00:00');
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

function findCloseTs(t: TimelineEntry[] | null | undefined): string | null {
  if (!t) return null;
  for (let i = t.length - 1; i >= 0; i--) {
    if (t[i].kind === 'status' && t[i].to === '已关闭') return t[i].ts;
  }
  return null;
}

function daysBetween(a: string, b: string): number {
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

/* ─── component ───────────────────────────────────────────────── */

export function ReportsView() {
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [dis, setDis] = useState<DrawingIssue[]>([]);

  useEffect(() => {
    Promise.all([
      sb.from('issues').select('*'),
      sb.from('drawings').select('*'),
      sb.from('drawing_issues').select('*'),
    ]).then(([i, d, di]) => {
      setIssues((i.data as Issue[]) || []);
      setDrawings((d.data as Drawing[]) || []);
      setDis((di.data as DrawingIssue[]) || []);
      setLoading(false);
    });
  }, []);

  const stats = useMemo(() => {
    const months = lastNMonths(6);

    // ── Monthly new
    const newByMonth = months.map((m) => ({
      m,
      issues: issues.filter((i) => monthKey(i.created_at) === m).length,
      dis: dis.filter((r) => monthKey(r.created_at) === m).length,
    }));
    const maxMonthly = Math.max(1, ...newByMonth.flatMap((x) => [x.issues, x.dis]));

    // ── Responsible party top 10 (open only, both tables)
    const respMap: Record<string, { name: string; issues: number; dis: number; total: number }> =
      {};
    for (const i of issues) {
      if (i.status === '已关闭') continue;
      const k = (i.responsible_party || '未指定').trim();
      if (!respMap[k]) respMap[k] = { name: k, issues: 0, dis: 0, total: 0 };
      respMap[k].issues += 1;
      respMap[k].total += 1;
    }
    for (const r of dis) {
      if (r.status === '已关闭') continue;
      const k = (r.responsible_party || '未指定').trim();
      if (!respMap[k]) respMap[k] = { name: k, issues: 0, dis: 0, total: 0 };
      respMap[k].dis += 1;
      respMap[k].total += 1;
    }
    const respTop = Object.values(respMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
    const maxResp = Math.max(1, ...respTop.map((r) => r.total));

    // ── Specialty: drawings library vs open drawing_issues
    const bySpec = DRAWING_SPECS.map((s) => ({
      s,
      drawings: drawings.filter((d) => d.specialty === s).length,
      openDIs: dis.filter((r) => r.specialty === s && r.status !== '已关闭').length,
    })).filter((x) => x.drawings > 0 || x.openDIs > 0);
    const maxSpec = Math.max(1, ...bySpec.flatMap((x) => [x.drawings, x.openDIs]));

    // ── Risk distribution (open drawing_issues)
    const openDIs = dis.filter((r) => r.status !== '已关闭');
    const byRisk = DI_RISK_LEVELS.map((r) => ({
      r,
      n: openDIs.filter((x) => x.risk_level === r).length,
    }));
    const maxRisk = Math.max(1, ...byRisk.map((x) => x.n));

    // ── Avg close time (drawing_issues, based on timeline)
    const closedDIs = dis.filter((r) => r.status === '已关闭');
    const closeSpans: number[] = [];
    for (const r of closedDIs) {
      const cl = findCloseTs(r.timeline);
      if (cl && r.created_at) closeSpans.push(daysBetween(r.created_at, cl));
    }
    const avgClose =
      closeSpans.length > 0
        ? Math.round(closeSpans.reduce((a, b) => a + b, 0) / closeSpans.length)
        : null;

    // ── Avg age of open drawing_issues
    const openAges = openDIs
      .map((r) => daysSince(r.date_raised))
      .filter((n): n is number => n !== null);
    const avgOpenAge =
      openAges.length > 0
        ? Math.round(openAges.reduce((a, b) => a + b, 0) / openAges.length)
        : null;

    // ── Overdue rate (open with date_due < today)
    const today = todayISO();
    const openWithDue = openDIs.filter((r) => r.date_due);
    const overdue = openWithDue.filter((r) => (r.date_due as string) < today).length;
    const overdueRate = openWithDue.length > 0 ? Math.round((overdue / openWithDue.length) * 100) : 0;

    return {
      months,
      newByMonth,
      maxMonthly,
      respTop,
      maxResp,
      bySpec,
      maxSpec,
      byRisk,
      maxRisk,
      avgClose,
      avgOpenAge,
      overdue,
      overdueRate,
      totalIssues: issues.length,
      totalDIs: dis.length,
      totalDrawings: drawings.length,
      openDICount: openDIs.length,
      closedDICount: closedDIs.length,
    };
  }, [issues, drawings, dis]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
        <Spin cls="w-5 h-5" />
        <span className="text-sm">加载分析数据…</span>
      </div>
    );
  }

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium tracking-widest text-slate-400 mb-1">
            PROJECT ANALYTICS
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            报表分析 · Reports
          </h1>
        </div>
        <div className="text-xs text-slate-500">
          样本 · 施工问题 <b className="text-slate-700 dark:text-slate-200">{stats.totalIssues}</b> ·
          图纸 <b className="text-slate-700 dark:text-slate-200">{stats.totalDrawings}</b> ·
          图纸问题 <b className="text-slate-700 dark:text-slate-200">{stats.totalDIs}</b>
        </div>
      </div>

      {/* KPI row (analytics-specific) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="平均关闭时长"
          en="Avg. Close Time"
          value={stats.avgClose === null ? '—' : `${stats.avgClose} 天`}
          hint={`已关闭 ${stats.closedDICount} 条图纸问题(基于时间线)`}
        />
        <MetricCard
          label="开放问题平均年龄"
          en="Avg. Age Open"
          value={stats.avgOpenAge === null ? '—' : `${stats.avgOpenAge} 天`}
          hint={`${stats.openDICount} 条开放图纸问题`}
        />
        <MetricCard
          label="逾期率"
          en="Overdue Rate"
          value={`${stats.overdueRate}%`}
          hint={`${stats.overdue} / ${stats.openDICount || 0} 开放图纸问题过截止`}
          tone={stats.overdueRate >= 30 ? 'danger' : stats.overdueRate >= 15 ? 'warn' : 'ok'}
        />
        <MetricCard
          label="关闭率"
          en="Closure Rate"
          value={
            stats.totalDIs > 0 ? `${Math.round((stats.closedDICount / stats.totalDIs) * 100)}%` : '—'
          }
          hint={`${stats.closedDICount} / ${stats.totalDIs} 图纸问题已关闭`}
          tone="ok"
        />
      </div>

      {/* Monthly trend */}
      <Panel title="近 6 个月新增趋势" en="Monthly New (Issues vs Drawing Issues)">
        {stats.newByMonth.every((m) => m.issues === 0 && m.dis === 0) ? (
          <EmptyHint />
        ) : (
          <div className="flex items-end gap-4 h-40 pt-2">
            {stats.newByMonth.map(({ m, issues, dis }) => (
              <div key={m} className="flex-1 flex flex-col items-center gap-1.5">
                <div className="flex-1 w-full flex items-end justify-center gap-1">
                  <div
                    className="w-3 rounded-t bg-brand-500 transition-all"
                    style={{ height: `${(issues / stats.maxMonthly) * 100}%` }}
                    title={`施工问题 ${issues}`}
                  />
                  <div
                    className="w-3 rounded-t bg-orange-500 transition-all"
                    style={{ height: `${(dis / stats.maxMonthly) * 100}%` }}
                    title={`图纸问题 ${dis}`}
                  />
                </div>
                <div className="text-[10px] text-slate-400 font-mono">{m.slice(2)}</div>
                <div className="text-[10px] text-slate-500 tabular-nums">
                  {issues + dis}
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />施工问题
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />图纸问题
          </span>
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Responsible party */}
        <Panel title="责任方 · 开放问题 Top 10" en="Top Responsible Parties (open, both tables)">
          {stats.respTop.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="space-y-2.5">
              {stats.respTop.map((r) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-300 w-24 shrink-0 truncate">
                    {r.name}
                  </span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden flex">
                    <div
                      className="h-full bg-brand-500"
                      style={{ width: `${(r.issues / stats.maxResp) * 100}%` }}
                      title={`施工 ${r.issues}`}
                    />
                    <div
                      className="h-full bg-orange-500"
                      style={{ width: `${(r.dis / stats.maxResp) * 100}%` }}
                      title={`图纸 ${r.dis}`}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-200 w-8 text-right tabular-nums">
                    {r.total}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Specialty comparison */}
        <Panel title="专业 · 图纸库 vs 开放图纸问题" en="Specialty · Library vs Open Issues">
          {stats.bySpec.length === 0 ? (
            <EmptyHint />
          ) : (
            <div className="space-y-2.5">
              {stats.bySpec.map(({ s, drawings, openDIs }: { s: DrawingSpecialty; drawings: number; openDIs: number }) => (
                <div key={s} className="flex items-center gap-3">
                  <span className="text-xs text-slate-500 dark:text-slate-300 w-12 shrink-0 truncate">
                    {s}
                  </span>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-brand-500"
                          style={{ width: `${(drawings / stats.maxSpec) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-6 text-right tabular-nums">
                        {drawings}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
                        <div
                          className="h-full bg-orange-500"
                          style={{ width: `${(openDIs / stats.maxSpec) * 100}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 w-6 text-right tabular-nums">
                        {openDIs}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand-500" />图纸库
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-orange-500" />开放图纸问题
            </span>
          </div>
        </Panel>
      </div>

      {/* Risk distribution */}
      <Panel title="开放图纸问题 · 风险分布" en="Risk Distribution (open)">
        {stats.byRisk.every((x) => x.n === 0) ? (
          <EmptyHint />
        ) : (
          <div className="grid grid-cols-4 gap-3">
            {stats.byRisk.map(({ r, n }: { r: DIRisk; n: number }) => {
              const st = DI_RISK_STYLE[r];
              return (
                <div key={r} className={cx('rounded-lg p-4', st.bg)}>
                  <div className={cx('text-2xl font-semibold tabular-nums', st.text)}>{n}</div>
                  <div className={cx('text-xs font-medium mt-1', st.text)}>{r}</div>
                  <div className="h-1 mt-2 rounded-full bg-white/40 dark:bg-black/20 overflow-hidden">
                    <div
                      className={cx('h-full rounded-full')}
                      style={{
                        width: `${(n / stats.maxRisk) * 100}%`,
                        backgroundColor: 'currentColor',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ─── small building blocks ───────────────────────────────────── */

function Panel({
  title,
  en,
  children,
}: {
  title: string;
  en: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h3>
        <span className="text-xs text-slate-400">{en}</span>
      </div>
      {children}
    </div>
  );
}

function EmptyHint() {
  return <p className="text-xs text-slate-400 py-4 text-center">数据不足 · Not enough data</p>;
}

function MetricCard({
  label,
  en,
  value,
  hint,
  tone = 'neutral',
}: {
  label: string;
  en: string;
  value: string;
  hint?: string;
  tone?: 'neutral' | 'ok' | 'warn' | 'danger';
}) {
  const toneMap = {
    neutral: 'text-slate-900 dark:text-white',
    ok:      'text-emerald-600 dark:text-emerald-300',
    warn:    'text-amber-600 dark:text-amber-300',
    danger:  'text-rose-600 dark:text-rose-300',
  };
  return (
    <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-4">
      <div className={cx('text-2xl font-semibold tabular-nums', toneMap[tone])}>{value}</div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 mt-2">{label}</div>
      <div className="text-xs text-slate-400">{en}</div>
      {hint && <div className="text-[11px] text-slate-400 mt-1.5 leading-tight">{hint}</div>}
    </div>
  );
}

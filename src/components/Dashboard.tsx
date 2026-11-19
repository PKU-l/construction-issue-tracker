import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase';
import {
  DI_CATEGORIES,
  DI_RISK_STYLE,
  DI_STATUS_STYLE,
  DI_STATUSES,
  ST,
  STATUSES,
  SPECS,
} from '../lib/enums';
import type {
  DrawingIssue,
  Issue,
  IssueStatus,
  Drawing,
  DICategory,
  DIStatus,
} from '../lib/types';
import { OVERDUE_STYLE, daysUntilDue, overdueByDue, todayISO } from '../lib/dates';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { Kpi } from './Kpi';
import { Spin } from './Spin';

type NavKey = 'issues' | 'drawings' | 'drawing_issues';

interface Props {
  issues: Issue[];
  onDrillIssue: (s: '' | IssueStatus) => void;
  onNav: (n: NavKey) => void;
}

export function Dashboard({ issues, onDrillIssue, onNav }: Props) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [dis, setDis] = useState<DrawingIssue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      sb.from('drawings').select('*').order('drawing_no'),
      sb.from('drawing_issues').select('*').order('created_at', { ascending: false }),
    ]).then(([d, di]) => {
      setDrawings((d.data as Drawing[]) || []);
      setDis((di.data as DrawingIssue[]) || []);
      setLoading(false);
    });
  }, []);

  const today = todayISO();

  // Issue stats
  const issueCnt = STATUSES.reduce(
    (a, s) => ({ ...a, [s]: issues.filter((i) => i.status === s).length }),
    {} as Record<IssueStatus, number>,
  );
  const issueTotal = issues.length;
  const issueOpen = issues.filter((i) => i.status !== '已关闭').length;
  const issueOverdue = issues.filter(
    (i) => i.date_due && i.date_due < today && i.status !== '已关闭',
  ).length;
  const issueClosedRate = issueTotal
    ? Math.round((issueCnt['已关闭'] / issueTotal) * 100)
    : 0;

  // Drawing stats
  const drawingTotal = drawings.length;
  const drawingCurrent = drawings.filter((d) => d.status === 'current').length;

  // Drawing Issue stats
  const diCnt = DI_STATUSES.reduce(
    (a, s) => ({ ...a, [s]: dis.filter((i) => i.status === s).length }),
    {} as Record<DIStatus, number>,
  );
  const diTotal = dis.length;
  const diOpen = dis.filter((r) => r.status !== '已关闭').length;
  const diOverdue = dis.filter(
    (r) => r.date_due && r.date_due < today && r.status !== '已关闭',
  ).length;
  const diCatCnt = DI_CATEGORIES.map((c) => ({
    c,
    n: dis.filter((r) => r.category === c && r.status !== '已关闭').length,
  })).filter((x) => x.n > 0);
  const maxDiCat = Math.max(1, ...diCatCnt.map((x) => x.n));

  // Cross-module
  const overdueTotal = issueOverdue + diOverdue;

  // Critical open (drawing_issues 高/紧急 未关闭)
  const critical = dis
    .filter((r) => (r.risk_level === '高' || r.risk_level === '紧急') && r.status !== '已关闭')
    .sort((a, b) => {
      // 紧急 first, then 高
      if (a.risk_level !== b.risk_level) return a.risk_level === '紧急' ? -1 : 1;
      // then most-overdue first
      const ad = a.date_due ? (daysUntilDue(a.date_due) as number) : Infinity;
      const bd = b.date_due ? (daysUntilDue(b.date_due) as number) : Infinity;
      return ad - bd;
    });

  // By specialty (issues)
  const bySpec = SPECS.map((s) => ({
    s,
    n: issues.filter((i) => i.specialty === s).length,
  }))
    .filter((x) => x.n > 0)
    .sort((a, b) => b.n - a.n);
  const maxSpec = Math.max(1, ...bySpec.map((x) => x.n));

  const bar = (v: number, max: number, className: string) => (
    <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
      <div
        className={cx('h-full rounded-full transition-all', className)}
        style={{ width: `${(v / max) * 100}%` }}
      />
    </div>
  );

  return (
    <div className="fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs font-medium tracking-widest text-slate-400 mb-1">
            PROJECT OVERVIEW
          </div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
            问题指挥中心 · Issue Control Center
          </h1>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          <span>
            阶段 ·{' '}
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              Slipform Construction
            </span>
          </span>
          <span>
            更新 · <span className="text-slate-700 dark:text-slate-200 font-medium">{today}</span>
          </span>
        </div>
      </div>

      {/* KPI grid — 3 modules × 2 rows */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <Kpi
          value={issueTotal}
          label="施工问题总数"
          en="Construction Issues"
          accent="bg-slate-400"
          onClick={() => onDrillIssue('')}
        />
        <Kpi
          value={issueOpen}
          label="施工问题待关闭"
          en="Open"
          accent={ST['待处理'].dot}
          onClick={() => onDrillIssue('')}
        />
        <Kpi
          value={issueOverdue}
          label="施工问题逾期"
          en="Overdue"
          accent="bg-orange-500"
          onClick={() => onDrillIssue('')}
        />
        <Kpi
          value={drawingTotal}
          label={`图纸库 · 现行 ${drawingCurrent}`}
          en="Drawings"
          accent="bg-brand-500"
          onClick={() => onNav('drawings')}
        />
        <Kpi
          value={diOpen}
          label={`图纸问题开放 · 总 ${diTotal}`}
          en="Drawing Issues Open"
          accent={DI_STATUS_STYLE['提出'].dot}
          onClick={() => onNav('drawing_issues')}
        />
        <Kpi
          value={overdueTotal}
          label="综合逾期未闭环"
          en="Total Overdue"
          accent="bg-rose-500"
          onClick={() => onNav('drawing_issues')}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Left 2/3: distributions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Issue status */}
          <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                施工问题状态分布
              </h3>
              <span className="text-xs text-slate-400">Issue Status</span>
            </div>
            {issueTotal === 0 ? (
              <p className="text-xs text-slate-400 py-2">暂无数据</p>
            ) : (
              <>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 mb-4">
                  {STATUSES.map(
                    (s) =>
                      issueCnt[s] > 0 && (
                        <div
                          key={s}
                          className={ST[s].bar}
                          style={{ width: `${(issueCnt[s] / issueTotal) * 100}%` }}
                          title={`${s} ${issueCnt[s]}`}
                        />
                      ),
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onDrillIssue(s)}
                      className="flex items-center gap-2.5 group"
                    >
                      <span className={cx('w-2.5 h-2.5 rounded-sm', ST[s].bar)} />
                      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                        {s}
                      </span>
                      <span className="text-xs text-slate-400">{ST[s].en}</span>
                      <span className="ml-auto text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                        {issueCnt[s]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Drawing issues status */}
          <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                图纸问题状态分布
              </h3>
              <span className="text-xs text-slate-400">Drawing Issue Status</span>
            </div>
            {diTotal === 0 ? (
              <p className="text-xs text-slate-400 py-2">暂无数据</p>
            ) : (
              <>
                <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-white/5 mb-4">
                  {DI_STATUSES.map(
                    (s) =>
                      diCnt[s] > 0 && (
                        <div
                          key={s}
                          className={DI_STATUS_STYLE[s].bar}
                          style={{ width: `${(diCnt[s] / diTotal) * 100}%` }}
                          title={`${s} ${diCnt[s]}`}
                        />
                      ),
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-2 gap-x-6">
                  {DI_STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => onNav('drawing_issues')}
                      className="flex items-center gap-2.5 group"
                    >
                      <span
                        className={cx('w-2.5 h-2.5 rounded-sm', DI_STATUS_STYLE[s].bar)}
                      />
                      <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-900 dark:group-hover:text-white transition">
                        {s}
                      </span>
                      <span className="ml-auto text-sm font-semibold text-slate-900 dark:text-white tabular-nums">
                        {diCnt[s]}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* By discipline / by category */}
          <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-5">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    施工问题 · 按专业
                  </h4>
                  <span className="text-xs text-slate-400">By Discipline</span>
                </div>
                {bySpec.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">暂无数据</p>
                ) : (
                  <div className="space-y-2.5">
                    {bySpec.map(({ s, n }) => (
                      <div key={s} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-10 shrink-0">{s}</span>
                        {bar(n, maxSpec, 'bg-brand-500')}
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 w-6 text-right tabular-nums">
                          {n}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                    图纸问题(开放) · 按分类
                  </h4>
                  <span className="text-xs text-slate-400">By Category</span>
                </div>
                {diCatCnt.length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">暂无数据</p>
                ) : (
                  <div className="space-y-2.5">
                    {diCatCnt.map(({ c, n }: { c: DICategory; n: number }) => (
                      <div key={c} className="flex items-center gap-3">
                        <span className="text-xs text-slate-500 w-16 shrink-0 truncate">{c}</span>
                        {bar(n, maxDiCat, 'bg-orange-500')}
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-200 w-6 text-right tabular-nums">
                          {n}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right 1/3: critical + closure rate */}
        <div className="space-y-4">
          {/* Critical open drawing_issues */}
          <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-5">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-rose-600 dark:text-rose-300">{I.clock}</span>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                关键开放问题
              </h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">Critical Open · High / 紧急</p>
            {loading ? (
              <div className="py-6 flex justify-center">
                <Spin cls="w-4 h-4 text-slate-300" />
              </div>
            ) : critical.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">暂无高风险开放问题 🎉</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto -mr-2 pr-2">
                {critical.slice(0, 8).map((r) => {
                  const tier = r.date_due ? overdueByDue(r.date_due) : 'none';
                  const past = r.date_due ? -(daysUntilDue(r.date_due) as number) : 0;
                  const rs = DI_RISK_STYLE[r.risk_level];
                  return (
                    <button
                      key={r.id}
                      onClick={() => onNav('drawing_issues')}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 transition"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={cx(
                            'text-[10px] px-1.5 py-0.5 rounded font-medium shrink-0',
                            rs.bg,
                            rs.text,
                          )}
                        >
                          {r.risk_level}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400 truncate">
                          {r.issue_no}
                        </span>
                        {tier !== 'none' && (
                          <span
                            className={cx(
                              'ml-auto text-[10px] px-1.5 py-0.5 rounded shrink-0',
                              OVERDUE_STYLE[tier].bg,
                              OVERDUE_STYLE[tier].text,
                            )}
                          >
                            逾期 {past} 天
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-slate-700 dark:text-slate-200 line-clamp-1 mt-0.5">
                        {r.title || r.description || '(无标题)'}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Closure rate */}
          <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 p-5">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-white mb-3">
              施工问题闭环率 · Closure Rate
            </h3>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-3xl font-semibold text-slate-900 dark:text-white tabular-nums">
                {issueClosedRate}
                <span className="text-lg text-slate-400">%</span>
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-white/5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${issueClosedRate}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {issueCnt['已关闭']} / {issueTotal} 已关闭
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

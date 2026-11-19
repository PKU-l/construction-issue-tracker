import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase';
import {
  DI_CATEGORIES,
  DI_RISK_LEVELS,
  DI_RISK_STYLE,
  DI_STATUS_STYLE,
  DI_STATUSES,
  DRAWING_SPECS,
} from '../lib/enums';
import type {
  DICategory,
  DIRisk,
  DIStatus,
  DrawingIssue,
  DrawingIssueFilterState,
  DrawingSpecialty,
  TimelineEntry,
  User,
} from '../lib/types';
import type { Perm } from '../lib/permissions';
import { cloneElement } from 'react';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { OVERDUE_STYLE, daysSince, daysUntilDue, overdueByDue } from '../lib/dates';
import { toastErr, toastOk } from '../lib/toast';
import { exportDrawingIssuesDocx } from '../lib/exportDocx';
import { Spin } from './Spin';
import { DrawingIssueForm } from './DrawingIssueForm';
import { DIResponsesPanel } from './DIResponsesPanel';

interface Props {
  me: User;
  P: Perm;
}

export function DrawingIssuesView({ me, P }: Props) {
  const [rows, setRows] = useState<DrawingIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [filt, setFilt] = useState<DrawingIssueFilterState>({
    status: '',
    specialty: '',
    category: '',
    risk_level: '',
    q: '',
  });
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; editing: DrawingIssue | null } | null>(
    null,
  );
  const [exp, setExp] = useState<string | null>(null);
  const [cmt, setCmt] = useState('');
  const [cmtSaving, setCmtSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    const { data } = await sb
      .from('drawing_issues')
      .select('*')
      .order('created_at', { ascending: false });
    setRows((data as DrawingIssue[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const list = rows.filter((r) => {
    if (filt.status && r.status !== filt.status) return false;
    if (filt.specialty && r.specialty !== filt.specialty) return false;
    if (filt.category && r.category !== filt.category) return false;
    if (filt.risk_level && r.risk_level !== filt.risk_level) return false;
    if (filt.q) {
      const q = filt.q.toLowerCase();
      if (
        !r.issue_no.toLowerCase().includes(q) &&
        !(r.title || '').toLowerCase().includes(q) &&
        !(r.description || '').toLowerCase().includes(q) &&
        !(r.responsible_party || '').toLowerCase().includes(q) &&
        !(r.drawing_no_snapshot || '').toLowerCase().includes(q) &&
        !(r.local_ref || '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
  const active =
    filt.q || filt.status || filt.specialty || filt.category || filt.risk_level;

  const del = async (r: DrawingIssue) => {
    if (!confirm(`确认删除 ${r.issue_no}?此操作不可恢复。`)) return;
    try {
      const { error } = await sb.from('drawing_issues').delete().eq('id', r.id);
      if (error) throw error;
      toastOk(`已删除 ${r.issue_no}`);
      if (exp === r.id) setExp(null);
      load();
    } catch (e: unknown) {
      toastErr('删除失败:' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const postComment = async (r: DrawingIssue) => {
    const text = cmt.trim();
    if (!text || cmtSaving) return;
    setCmtSaving(true);
    const entry: TimelineEntry = {
      ts: new Date().toISOString(),
      actor_id: me.id,
      actor_name: me.display_name || me.username,
      kind: 'comment',
      note: text,
    };
    const timeline = [...(r.timeline || []), entry];
    const { error } = await sb
      .from('drawing_issues')
      .update({ timeline, updated_at: entry.ts })
      .eq('id', r.id);
    setCmt('');
    setCmtSaving(false);
    if (error) toastErr('留言失败:' + error.message);
    else toastOk('已留言');
    load();
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const doExport = async () => {
    if (exporting) return;
    const targets = selected.size > 0
      ? rows.filter((r) => selected.has(r.id))
      : list; // list = current filtered
    if (targets.length === 0) {
      toastErr('没有可导出的问题');
      return;
    }
    setExporting(true);
    try {
      await exportDrawingIssuesDocx(targets, {
        generatedBy: me.display_name || me.username,
      });
      toastOk(`已导出 ${targets.length} 条到 .docx`);
    } catch (e: unknown) {
      toastErr('导出失败:' + (e instanceof Error ? e.message : String(e)));
    }
    setExporting(false);
  };

  const quickStatus = async (r: DrawingIssue, status: DIStatus) => {
    if (status === r.status) return;
    const entry: TimelineEntry = {
      ts: new Date().toISOString(),
      actor_id: me.id,
      actor_name: me.display_name || me.username,
      kind: 'status',
      from: r.status,
      to: status,
    };
    const timeline = [...(r.timeline || []), entry];
    await sb
      .from('drawing_issues')
      .update({ status, timeline, updated_at: entry.ts })
      .eq('id', r.id);
    load();
  };

  const sel =
    'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/30 transition';

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">图纸问题</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Drawing Issues · {list.length}/{rows.length} 条
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={doExport}
            disabled={exporting || rows.length === 0}
            title={
              selected.size > 0
                ? `导出所选 ${selected.size} 条`
                : `导出当前筛选 ${list.length} 条`
            }
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition disabled:opacity-40"
          >
            {exporting ? <Spin cls="w-3.5 h-3.5" /> : '📄'}
            {selected.size > 0
              ? `导出所选 ${selected.size} 条`
              : `导出 ${list.length} 条 .docx`}
          </button>
          {P.add && (
            <button
              onClick={() => setModal({ mode: 'add', editing: null })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white text-sm rounded-lg transition"
            >
              {I.plus} 新增图纸问题
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative flex-1 min-w-52">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {I.search}
          </span>
          <input
            value={filt.q}
            onChange={(e) => setFilt((p) => ({ ...p, q: e.target.value }))}
            placeholder="搜索编号 / 标题 / 描述 / 图号 / 责任方…"
            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
          />
        </div>
        <select
          value={filt.status}
          onChange={(e) => setFilt((p) => ({ ...p, status: e.target.value as '' | DIStatus }))}
          className={sel}
        >
          <option value="">全部状态</option>
          {DI_STATUSES.map((s) => (
            <option key={s} className="dark:bg-slate-800">
              {s}
            </option>
          ))}
        </select>
        <select
          value={filt.specialty}
          onChange={(e) =>
            setFilt((p) => ({ ...p, specialty: e.target.value as '' | DrawingSpecialty }))
          }
          className={sel}
        >
          <option value="">全部专业</option>
          {DRAWING_SPECS.map((s) => (
            <option key={s} className="dark:bg-slate-800">
              {s}
            </option>
          ))}
        </select>
        <select
          value={filt.category}
          onChange={(e) => setFilt((p) => ({ ...p, category: e.target.value as '' | DICategory }))}
          className={sel}
        >
          <option value="">全部分类</option>
          {DI_CATEGORIES.map((c) => (
            <option key={c} className="dark:bg-slate-800">
              {c}
            </option>
          ))}
        </select>
        <select
          value={filt.risk_level}
          onChange={(e) => setFilt((p) => ({ ...p, risk_level: e.target.value as '' | DIRisk }))}
          className={sel}
        >
          <option value="">全部风险</option>
          {DI_RISK_LEVELS.map((r) => (
            <option key={r} className="dark:bg-slate-800">
              {r}
            </option>
          ))}
        </select>
        {active && (
          <button
            onClick={() =>
              setFilt({ status: '', specialty: '', category: '', risk_level: '', q: '' })
            }
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-2"
          >
            清除筛选
          </button>
        )}
      </div>

      {!loading && list.length > 0 && (
        <div className="flex items-center gap-3 px-2 py-2 mb-2 text-xs text-slate-500 dark:text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={list.length > 0 && list.every((r) => selected.has(r.id))}
              ref={(el) => {
                if (el) {
                  const someSel = list.some((r) => selected.has(r.id));
                  const allSel = list.every((r) => selected.has(r.id));
                  el.indeterminate = someSel && !allSel;
                }
              }}
              onChange={(e) => {
                if (e.target.checked) {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    list.forEach((r) => next.add(r.id));
                    return next;
                  });
                } else {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    list.forEach((r) => next.delete(r.id));
                    return next;
                  });
                }
              }}
              className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-brand-700 focus:ring-brand-500/30 cursor-pointer"
            />
            <span>全选当前筛选 · {list.length} 条</span>
          </label>
          {selected.size > 0 && (
            <>
              <span className="text-brand-700 dark:text-brand-300 font-medium">
                已选 {selected.size} 条
              </span>
              <button
                onClick={clearSelection}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                清除选择
              </button>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin cls="w-5 h-5 text-slate-300" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-300 flex items-center justify-center mx-auto mb-3">
            {I.issue}
          </div>
          <p className="text-sm text-slate-500">
            {rows.length === 0 ? '暂无图纸问题记录' : '没有符合条件的记录'}
          </p>
          {rows.length === 0 && P.add && (
            <button
              onClick={() => setModal({ mode: 'add', editing: null })}
              className="mt-4 text-sm text-brand-600 dark:text-brand-300 hover:underline"
            >
              创建第一条图纸问题
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((r) => {
            const s = DI_STATUS_STYLE[r.status];
            const risk = DI_RISK_STYLE[r.risk_level];
            const open = exp === r.id;
            return (
              <div
                key={r.id}
                className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden transition hover:shadow-sm"
              >
                <div
                  className="flex items-stretch cursor-pointer"
                  onClick={() => setExp(open ? null : r.id)}
                >
                  <div className={cx('w-1 shrink-0', s.bar)} />
                  <div className="flex-1 min-w-0 p-4 flex items-start gap-3">
                    <label
                      className="shrink-0 pt-0.5 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleOne(r.id)}
                        className="w-4 h-4 rounded border-slate-300 dark:border-white/20 text-brand-700 focus:ring-brand-500/30 cursor-pointer"
                      />
                    </label>
                    <span className="text-[11px] font-mono text-slate-400 w-40 shrink-0 pt-0.5 truncate">
                      {r.issue_no}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                        {r.title || r.description || '(无标题)'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className={cx('text-[11px] px-1.5 py-0.5 rounded', risk.bg, risk.text)}>
                          {r.risk_level}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300">
                          {r.specialty}
                        </span>
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                          {r.category}
                        </span>
                        {r.drawing_no_snapshot && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                            图 · {r.drawing_no_snapshot}
                            {r.revision_snapshot ? ` Rev.${r.revision_snapshot}` : ''}
                          </span>
                        )}
                        {r.responsible_party && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                            责 · {r.responsible_party}
                          </span>
                        )}
                        {r.waiting_on && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                            等 · {r.waiting_on}
                          </span>
                        )}
                        {r.date_due && (() => {
                          const tier = r.status === '已关闭' ? 'none' : overdueByDue(r.date_due);
                          if (tier === 'none') {
                            return (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                                截止 {r.date_due}
                              </span>
                            );
                          }
                          const st = OVERDUE_STYLE[tier];
                          const past = -(daysUntilDue(r.date_due) as number);
                          return (
                            <span className={cx('text-[11px] px-1.5 py-0.5 rounded font-medium', st.bg, st.text)}>
                              逾期 {past} 天 · {r.date_due}
                            </span>
                          );
                        })()}
                        {r.status === '等外部回复' && (() => {
                          const wd = daysSince(r.date_raised) ?? 0;
                          if (wd < 3) return null;
                          const tier = wd >= 14 ? 'critical' : wd >= 7 ? 'high' : 'warn';
                          const st = OVERDUE_STYLE[tier];
                          return (
                            <span className={cx('text-[11px] px-1.5 py-0.5 rounded font-medium', st.bg, st.text)}>
                              等回复 {wd} 天
                            </span>
                          );
                        })()}
                        {r.local_ref && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 inline-flex items-center gap-0.5" title={r.local_ref}>
                            📁 本地档案
                          </span>
                        )}
                        {(r.attachments || []).length > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 inline-flex items-center gap-0.5">
                            {cloneElement(I.paper, { cls: 'w-3 h-3' })} {r.attachments.length}
                          </span>
                        )}
                      </div>
                    </div>
                    <span
                      className={cx(
                        'text-xs px-2.5 py-1 rounded-full ring-1 shrink-0 inline-flex items-center gap-1.5',
                        s.bg,
                        s.text,
                        s.ring,
                      )}
                    >
                      <span className={cx('w-1.5 h-1.5 rounded-full', s.dot)} />
                      {r.status}
                    </span>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[.02] p-4 space-y-4 fade-in">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                      <div className="lg:col-span-2 space-y-4">
                        {r.description && (
                          <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
                            <div className="text-xs text-slate-400 mb-1">问题描述 · Description</div>
                            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                              {r.description}
                            </p>
                          </div>
                        )}
                        {r.impact && (
                          <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
                            <div className="text-xs text-slate-400 mb-1">影响评估 · Impact</div>
                            <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                              {r.impact}
                            </p>
                          </div>
                        )}
                        {(r.attachments || []).length > 0 && (
                          <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
                            <div className="text-xs text-slate-400 mb-2">附件 · Attachments</div>
                            <div className="flex flex-wrap gap-1.5">
                              {r.attachments.map((a, i) => (
                                <a
                                  key={i}
                                  href={a.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 text-brand-700 dark:text-brand-300 hover:ring-brand-300 inline-flex items-center gap-1.5 transition"
                                >
                                  {cloneElement(I.paper, { cls: 'w-3.5 h-3.5' })} {a.name}
                                </a>
                              ))}
                            </div>
                          </div>
                        )}
                        <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
                          <div className="text-xs text-slate-400 mb-2">时间线 · Timeline</div>
                          {(r.timeline || []).length === 0 ? (
                            <p className="text-xs text-slate-400">暂无记录</p>
                          ) : (
                            <ol className="space-y-2 border-l border-slate-200 dark:border-white/10 ml-2 pl-4">
                              {[...(r.timeline || [])].reverse().map((t, i) => (
                                <li key={i} className="relative">
                                  <span className="absolute -left-[21px] top-1.5 w-2 h-2 rounded-full bg-brand-400" />
                                  <div className="text-xs text-slate-500 dark:text-slate-400">
                                    <span className="font-mono">
                                      {t.ts.slice(0, 16).replace('T', ' ')}
                                    </span>
                                    {' · '}
                                    <span className="text-slate-700 dark:text-slate-200">
                                      {t.actor_name}
                                    </span>
                                  </div>
                                  <div className="text-sm text-slate-700 dark:text-slate-200 mt-0.5">
                                    {t.kind === 'create' && (t.note || '创建问题')}
                                    {t.kind === 'status' && (
                                      <>
                                        状态 <b>{t.from}</b> → <b>{t.to}</b>
                                      </>
                                    )}
                                    {t.kind === 'edit' && (t.note || '编辑')}
                                    {t.kind === 'link' && (t.note || '链接更新')}
                                    {t.kind === 'attach' && (t.note || '附件更新')}
                                    {t.kind === 'comment' && (t.note || '')}
                                  </div>
                                </li>
                              ))}
                            </ol>
                          )}
                        </div>
                        <DIResponsesPanel
                          issue={r}
                          me={me}
                          P={P}
                          onIssueChanged={load}
                        />
                        {P.edit && (
                          <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
                            <div className="text-xs text-slate-400 mb-2">留言 · Comment</div>
                            <textarea
                              value={cmt}
                              onChange={(e) => setCmt(e.target.value)}
                              placeholder="留一条评论,进入时间线(Ctrl+Enter 提交)"
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                                  e.preventDefault();
                                  postComment(r);
                                }
                              }}
                              className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition h-20 resize-none"
                            />
                            <div className="flex justify-end mt-2">
                              <button
                                onClick={() => postComment(r)}
                                disabled={!cmt.trim() || cmtSaving}
                                className="px-3.5 py-1.5 text-xs bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-medium disabled:opacity-40 flex items-center gap-2 transition"
                              >
                                {cmtSaving && <Spin />}
                                留言
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="space-y-3 text-sm">
                        {(
                          [
                            ['分类', r.category],
                            ['风险级别', r.risk_level],
                            ['专业', r.specialty],
                            ['位置', r.location],
                            ['责任单位', r.responsible_party],
                            ['等待处理方', r.waiting_on],
                            ['提出日期', r.date_raised],
                            ['截止日期', r.date_due || ''],
                            [
                              '关联图纸',
                              r.drawing_no_snapshot
                                ? `${r.drawing_no_snapshot} · Rev.${r.revision_snapshot}`
                                : '',
                            ],
                            ['本地档案', r.local_ref || ''],
                          ] as Array<[string, string]>
                        ).map(([l, v]) => (
                          <div key={l}>
                            <div className="text-xs text-slate-400 mb-0.5">{l}</div>
                            <div className="text-slate-700 dark:text-slate-200">{v || '—'}</div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      {P.status ? (
                        <select
                          value={r.status}
                          onChange={(e) => quickStatus(r, e.target.value as DIStatus)}
                          className="text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 outline-none"
                        >
                          {DI_STATUSES.map((s) => (
                            <option key={s} className="dark:bg-slate-800">
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={cx(
                            'text-xs px-2 py-1 rounded-full ring-1',
                            s.bg,
                            s.text,
                            s.ring,
                          )}
                        >
                          {r.status}
                        </span>
                      )}
                      {P.edit && (
                        <button
                          onClick={() => setModal({ mode: 'edit', editing: r })}
                          className="text-xs text-brand-600 dark:text-brand-300 hover:underline px-2 py-1"
                        >
                          编辑
                        </button>
                      )}
                      {P.del && (
                        <button
                          onClick={() => del(r)}
                          className="text-xs text-rose-500 hover:underline px-2 py-1 ml-auto"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <DrawingIssueForm
          mode={modal.mode}
          editing={modal.editing}
          me={me}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
    </div>
  );
}

import { cloneElement, useState, type Dispatch, type SetStateAction } from 'react';
import { SOURCES, SPECS, ST, STATUSES } from '../lib/enums';
import type { FilterState, Issue, IssueStatus } from '../lib/types';
import type { Perm } from '../lib/permissions';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { OVERDUE_STYLE, daysUntilDue, overdueByDue } from '../lib/dates';

interface Props {
  issues: Issue[];
  P: Perm;
  filt: FilterState;
  setFilt: Dispatch<SetStateAction<FilterState>>;
  onAdd: () => void;
  onEdit: (i: Issue) => void;
  onDelete: (i: Issue) => void;
  onStatus: (id: string, s: IssueStatus) => void;
  onExport: () => void;
}

type FilterKey = 'status' | 'source' | 'specialty';

export function IssuesView({
  issues,
  P,
  filt,
  setFilt,
  onAdd,
  onEdit,
  onDelete,
  onStatus,
  onExport,
}: Props) {
  const [exp, setExp] = useState<string | null>(null);
  const list = issues.filter((i) => {
    if (filt.status && i.status !== filt.status) return false;
    if (filt.source && i.source !== filt.source) return false;
    if (filt.specialty && i.specialty !== filt.specialty) return false;
    if (filt.q) {
      const q = filt.q.toLowerCase();
      if (
        !i.description.toLowerCase().includes(q) &&
        !i.id.toLowerCase().includes(q) &&
        !(i.responsible_party || '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
  const active = filt.q || filt.status || filt.source || filt.specialty;
  const sel =
    'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/30 transition';

  const filters: Array<[FilterKey, string, readonly string[]]> = [
    ['status', '状态', STATUSES],
    ['source', '来源方', SOURCES],
    ['specialty', '专业', SPECS],
  ];

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">施工问题</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Construction Issues · {list.length}/{issues.length} 条
          </p>
        </div>
        <div className="flex items-center gap-2">
          {P.export && (
            <button
              onClick={onExport}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition"
            >
              {I.down} 导出
            </button>
          )}
          {P.add && (
            <button
              onClick={onAdd}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white text-sm rounded-lg transition"
            >
              {I.plus} 新增问题
            </button>
          )}
        </div>
      </div>

      {/* filter bar */}
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <div className="relative flex-1 min-w-52">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {I.search}
          </span>
          <input
            value={filt.q}
            onChange={(e) => setFilt((p) => ({ ...p, q: e.target.value }))}
            placeholder="搜索编号 / 描述 / 责任方…"
            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
          />
        </div>
        {filters.map(([k, lbl, opts]) => (
          <select
            key={k}
            value={filt[k]}
            onChange={(e) => setFilt((p) => ({ ...p, [k]: e.target.value }))}
            className={sel}
          >
            <option value="">全部{lbl}</option>
            {opts.map((o) => (
              <option key={o} className="dark:bg-slate-800">
                {o}
              </option>
            ))}
          </select>
        ))}
        {active && (
          <button
            onClick={() => setFilt({ status: '', source: '', specialty: '', q: '' })}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-2"
          >
            清除筛选
          </button>
        )}
      </div>

      {/* list */}
      {list.length === 0 ? (
        <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-300 flex items-center justify-center mx-auto mb-3">
            {I.issue}
          </div>
          <p className="text-sm text-slate-500">
            {issues.length === 0 ? '暂无问题记录' : '没有符合条件的记录'}
          </p>
          {issues.length === 0 && P.add && (
            <button
              onClick={onAdd}
              className="mt-4 text-sm text-brand-600 dark:text-brand-300 hover:underline"
            >
              创建第一条问题
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((issue) => {
            const s = ST[issue.status];
            const open = exp === issue.id;
            return (
              <div
                key={issue.id}
                className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden transition hover:shadow-sm"
              >
                <div
                  className="flex items-stretch cursor-pointer"
                  onClick={() => setExp(open ? null : issue.id)}
                >
                  <div className={cx('w-1 shrink-0', s.bar)} />
                  <div className="flex-1 min-w-0 p-4 flex items-start gap-3">
                    <span className="text-xs font-mono text-slate-400 w-16 shrink-0 pt-0.5">
                      {issue.id}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-2">
                        {issue.description || '(无描述)'}
                      </div>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {issue.source && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                            {issue.source}
                          </span>
                        )}
                        {issue.source_type && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                            {issue.source_type}
                          </span>
                        )}
                        {issue.specialty && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300">
                            {issue.specialty}
                          </span>
                        )}
                        {issue.responsible_party && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                            责 · {issue.responsible_party}
                          </span>
                        )}
                        {issue.date_due && (() => {
                          const tier = issue.status === '已关闭' ? 'none' : overdueByDue(issue.date_due);
                          if (tier === 'none') {
                            return (
                              <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                                截止 {issue.date_due}
                              </span>
                            );
                          }
                          const st = OVERDUE_STYLE[tier];
                          const past = -(daysUntilDue(issue.date_due) as number);
                          return (
                            <span className={cx('text-[11px] px-1.5 py-0.5 rounded font-medium', st.bg, st.text)}>
                              逾期 {past} 天 · {issue.date_due}
                            </span>
                          );
                        })()}
                        {(issue.attachments || []).length > 0 && (
                          <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 inline-flex items-center gap-0.5">
                            {cloneElement(I.paper, { cls: 'w-3 h-3' })} {issue.attachments.length}
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
                      {issue.status}
                    </span>
                  </div>
                </div>

                {open && (
                  <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[.02] p-4 space-y-4 fade-in">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-4 text-sm">
                      {(
                        [
                          ['来源方', issue.source],
                          ['来源类型', issue.source_type],
                          ['所属专业', issue.specialty],
                          ['责任方', issue.responsible_party],
                          ['提出日期', issue.date_raised],
                          ['截止日期', issue.date_due],
                        ] as Array<[string, string]>
                      ).map(([l, v]) => (
                        <div key={l}>
                          <div className="text-xs text-slate-400 mb-0.5">{l}</div>
                          <div className="text-slate-700 dark:text-slate-200">{v || '—'}</div>
                        </div>
                      ))}
                    </div>
                    {issue.response && (
                      <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
                        <div className="text-xs text-slate-400 mb-1">整改措施 · Response</div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                          {issue.response}
                        </p>
                      </div>
                    )}
                    {(issue.attachments || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {issue.attachments.map((a, i) => (
                          <a
                            key={i}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 text-brand-700 dark:text-brand-300 hover:ring-brand-300 inline-flex items-center gap-1.5 transition"
                          >
                            {cloneElement(I.paper, { cls: 'w-3.5 h-3.5' })} {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      {P.status ? (
                        <select
                          value={issue.status}
                          onChange={(e) => onStatus(issue.id, e.target.value as IssueStatus)}
                          className="text-xs bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-slate-700 dark:text-slate-200 outline-none"
                        >
                          {STATUSES.map((s) => (
                            <option key={s} className="dark:bg-slate-800">
                              {s}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={cx(
                            'text-xs px-2 py-1 rounded-full ring-1',
                            ST[issue.status].bg,
                            ST[issue.status].text,
                            ST[issue.status].ring,
                          )}
                        >
                          {issue.status}
                        </span>
                      )}
                      {P.edit && (
                        <button
                          onClick={() => onEdit(issue)}
                          className="text-xs text-brand-600 dark:text-brand-300 hover:underline px-2 py-1"
                        >
                          编辑
                        </button>
                      )}
                      {P.del && (
                        <button
                          onClick={() => onDelete(issue)}
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
    </div>
  );
}

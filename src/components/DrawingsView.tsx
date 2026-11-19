import { cloneElement, useEffect, useState } from 'react';
import { sb } from '../lib/supabase';
import {
  DRAWING_SPECS,
  DRAWING_STATUS_LABEL,
  DRAWING_STATUS_STYLE,
  DRAWING_STATUSES,
} from '../lib/enums';
import type {
  Drawing,
  DrawingFilterState,
  DrawingSpecialty,
  DrawingStatus,
  User,
} from '../lib/types';
import type { Perm } from '../lib/permissions';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { Spin } from './Spin';
import { DrawingForm } from './DrawingForm';
import { DrawingsImport } from './DrawingsImport';
import { toastErr, toastOk } from '../lib/toast';

interface Props {
  me: User;
  P: Perm;
}

export function DrawingsView({ me, P }: Props) {
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(true);
  const [filt, setFilt] = useState<DrawingFilterState>({
    specialty: '',
    building: '',
    status: '',
    q: '',
  });
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; editing: Drawing | null } | null>(
    null,
  );
  const [importOpen, setImportOpen] = useState(false);
  const [exp, setExp] = useState<string | null>(null);
  const [userMap, setUserMap] = useState<Record<string, string>>({});

  const load = async () => {
    const { data } = await sb
      .from('drawings')
      .select('*')
      .order('drawing_no', { ascending: true })
      .order('revision', { ascending: true });
    setDrawings((data as Drawing[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    sb.from('users')
      .select('id, username, display_name')
      .then(({ data }) => {
        const m: Record<string, string> = {};
        (data as Array<{ id: string; username: string; display_name: string | null }> | null)?.forEach(
          (u) => {
            m[u.id] = u.display_name || u.username;
          },
        );
        setUserMap(m);
      });
  }, []);

  const list = drawings.filter((d) => {
    if (filt.specialty && d.specialty !== filt.specialty) return false;
    if (filt.building && d.building !== filt.building) return false;
    if (filt.status && d.status !== filt.status) return false;
    if (filt.q) {
      const q = filt.q.toLowerCase();
      if (
        !d.drawing_no.toLowerCase().includes(q) &&
        !d.title.toLowerCase().includes(q) &&
        !(d.notes || '').toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });
  const active = filt.q || filt.specialty || filt.building || filt.status;

  const del = async (d: Drawing) => {
    if (!confirm(`确认删除图纸 ${d.drawing_no} Rev.${d.revision}?`)) return;
    try {
      if (d.file_path) await sb.storage.from('drawings').remove([d.file_path]);
      const { error } = await sb.from('drawings').delete().eq('id', d.id);
      if (error) throw error;
      toastOk(`已删除 ${d.drawing_no} Rev.${d.revision}`);
      if (exp === d.id) setExp(null);
      load();
    } catch (e: unknown) {
      toastErr('删除失败:' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const isImage = (name: string) => /\.(png|jpg|jpeg|webp|gif)$/i.test(name);
  const isPdf = (name: string) => /\.pdf$/i.test(name);

  const sel =
    'bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/30 transition';

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">图纸库</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Drawing Library · {list.length}/{drawings.length} 张
          </p>
        </div>
        <div className="flex items-center gap-2">
          {P.add && (
            <button
              onClick={() => setImportOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-white dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 hover:bg-slate-50 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 text-sm rounded-lg transition"
            >
              📥 Excel 导入
            </button>
          )}
          {P.add && (
            <button
              onClick={() => setModal({ mode: 'add', editing: null })}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white text-sm rounded-lg transition"
            >
              {I.plus} 新增图纸
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
            placeholder="搜索图号 / 名称 / 备注…"
            className="w-full bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg pl-10 pr-3 py-2 text-sm text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
          />
        </div>
        <select
          value={filt.building}
          onChange={(e) => setFilt((p) => ({ ...p, building: e.target.value }))}
          className={sel}
        >
          <option value="">全部建筑</option>
          {Array.from(
            new Set(
              drawings.map((d) => (d.building || '').trim()).filter(Boolean),
            ),
          )
            .sort()
            .map((b) => (
              <option key={b} className="dark:bg-slate-800">
                {b}
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
          value={filt.status}
          onChange={(e) =>
            setFilt((p) => ({ ...p, status: e.target.value as '' | DrawingStatus }))
          }
          className={sel}
        >
          <option value="">全部状态</option>
          {DRAWING_STATUSES.map((s) => (
            <option key={s} value={s} className="dark:bg-slate-800">
              {DRAWING_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {active && (
          <button
            onClick={() => setFilt({ specialty: '', building: '', status: '', q: '' })}
            className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 px-2 py-2"
          >
            清除筛选
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin cls="w-5 h-5 text-slate-300" />
        </div>
      ) : list.length === 0 ? (
        <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 py-20 text-center">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-white/5 text-slate-300 flex items-center justify-center mx-auto mb-3">
            {I.draw}
          </div>
          <p className="text-sm text-slate-500">
            {drawings.length === 0 ? '暂无图纸记录' : '没有符合条件的记录'}
          </p>
          {drawings.length === 0 && P.add && (
            <button
              onClick={() => setModal({ mode: 'add', editing: null })}
              className="mt-4 text-sm text-brand-600 dark:text-brand-300 hover:underline"
            >
              上传第一张图纸
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((d) => {
            const s = DRAWING_STATUS_STYLE[d.status];
            const open = exp === d.id;
            const uploader = d.uploaded_by ? userMap[d.uploaded_by] : '';
            return (
              <div
                key={d.id}
                className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden transition hover:shadow-sm"
              >
                <div
                  className="p-4 flex items-start gap-3 cursor-pointer"
                  onClick={() => setExp(open ? null : d.id)}
                >
                  <div className="w-16 shrink-0 pt-0.5">
                    <div className="text-xs font-mono text-slate-500 dark:text-slate-300 truncate">
                      {d.drawing_no}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                      Rev.{d.revision}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-white line-clamp-1">
                      {d.title || '(未命名)'}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {d.building && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300">
                          🏢 {d.building}
                        </span>
                      )}
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-brand-50 dark:bg-brand-500/15 text-brand-700 dark:text-brand-300">
                        {d.specialty}
                      </span>
                      {d.revision_date && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                          版本 {d.revision_date}
                        </span>
                      )}
                      {uploader && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                          上传 · {uploader}
                        </span>
                      )}
                      {d.file_name && (
                        <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 inline-flex items-center gap-0.5">
                          {cloneElement(I.paper, { cls: 'w-3 h-3' })} {d.file_name}
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
                    {DRAWING_STATUS_LABEL[d.status].split(' · ')[0]}
                  </span>
                </div>

                {open && (
                  <div className="border-t border-slate-100 dark:border-white/5 bg-slate-50/60 dark:bg-white/[.02] p-4 space-y-4 fade-in">
                    {d.file_url && isImage(d.file_name) && (
                      <div className="rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-white/10 bg-white dark:bg-black/20">
                        <img
                          src={d.file_url}
                          alt={d.title || d.drawing_no}
                          className="w-full max-h-[520px] object-contain"
                        />
                      </div>
                    )}
                    {d.file_url && isPdf(d.file_name) && (
                      <div className="rounded-lg overflow-hidden ring-1 ring-slate-200 dark:ring-white/10 bg-white dark:bg-black/20 h-[520px]">
                        <object data={d.file_url} type="application/pdf" className="w-full h-full">
                          <p className="p-4 text-sm text-slate-500">
                            PDF 无法在此预览,请
                            <a href={d.file_url} target="_blank" rel="noreferrer" className="text-brand-600 underline">
                              点此打开
                            </a>
                          </p>
                        </object>
                      </div>
                    )}
                    {d.notes && (
                      <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
                        <div className="text-xs text-slate-400 mb-1">备注 · Notes</div>
                        <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                          {d.notes}
                        </p>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-white/5">
                      {d.file_url && (
                        <a
                          href={d.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs px-2.5 py-1.5 rounded-lg bg-white dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 text-brand-700 dark:text-brand-300 hover:ring-brand-300 inline-flex items-center gap-1.5 transition"
                        >
                          {cloneElement(I.paper, { cls: 'w-3.5 h-3.5' })} 打开 / 下载
                        </a>
                      )}
                      {P.edit && (
                        <button
                          onClick={() => setModal({ mode: 'edit', editing: d })}
                          className="text-xs text-brand-600 dark:text-brand-300 hover:underline px-2 py-1"
                        >
                          编辑
                        </button>
                      )}
                      {P.del && (
                        <button
                          onClick={() => del(d)}
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
        <DrawingForm
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

      {importOpen && (
        <DrawingsImport
          me={me}
          onClose={() => setImportOpen(false)}
          onImported={(n) => {
            toastOk(`已导入 ${n} 条图纸`);
            load();
          }}
        />
      )}
    </div>
  );
}

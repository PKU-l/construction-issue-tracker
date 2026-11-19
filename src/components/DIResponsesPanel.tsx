import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { sb } from '../lib/supabase';
import { uploadAttachment } from '../lib/attachments';
import { DI_ACK_LABEL, DI_ACK_STATUSES, DI_ACK_STYLE, DI_RESPONSE_BLANK } from '../lib/enums';
import type {
  Attachment,
  DIAckStatus,
  DIResponse,
  DIResponseDraft,
  DrawingIssue,
  TimelineEntry,
  User,
} from '../lib/types';
import type { Perm } from '../lib/permissions';
import { toastErr, toastOk } from '../lib/toast';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { Spin } from './Spin';
import { Modal } from './Modal';

interface Props {
  issue: DrawingIssue;
  me: User;
  P: Perm;
  onIssueChanged: () => void; // parent re-loads drawing_issues to reflect timeline updates
}

/** 更新 drawing_issue 的 timeline,不改其它字段。 */
async function appendTimeline(
  issue: DrawingIssue,
  me: User,
  entry: Omit<TimelineEntry, 'ts' | 'actor_id' | 'actor_name'>,
) {
  const full: TimelineEntry = {
    ts: new Date().toISOString(),
    actor_id: me.id,
    actor_name: me.display_name || me.username,
    ...entry,
  };
  const timeline = [...(issue.timeline || []), full];
  await sb
    .from('drawing_issues')
    .update({ timeline, updated_at: full.ts })
    .eq('id', issue.id);
}

export function DIResponsesPanel({ issue, me, P, onIssueChanged }: Props) {
  const [rows, setRows] = useState<DIResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ mode: 'add' | 'edit'; editing: DIResponse | null } | null>(
    null,
  );

  const load = async () => {
    const { data } = await sb
      .from('di_responses')
      .select('*')
      .eq('drawing_issue_id', issue.id)
      .order('response_date', { ascending: false })
      .order('created_at', { ascending: false });
    setRows((data as DIResponse[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [issue.id]);

  const changeAck = async (r: DIResponse, next: DIAckStatus) => {
    if (next === r.ack_status) return;
    const { error } = await sb
      .from('di_responses')
      .update({ ack_status: next, updated_at: new Date().toISOString() })
      .eq('id', r.id);
    if (error) {
      toastErr('切换确认状态失败:' + error.message);
      return;
    }
    await appendTimeline(issue, me, {
      kind: 'edit',
      note: `回复确认状态 · ${r.ref_no || r.party}: ${r.ack_status} → ${next}`,
    });
    toastOk('确认状态已更新');
    load();
    onIssueChanged();
  };

  const del = async (r: DIResponse) => {
    if (!confirm(`确认删除这条回复 (${r.party || r.ref_no || '未命名'})?`)) return;
    const paths = (r.attachments || []).map((a) => a.path).filter(Boolean) as string[];
    if (paths.length) await sb.storage.from('attachments').remove(paths);
    const { error } = await sb.from('di_responses').delete().eq('id', r.id);
    if (error) {
      toastErr('删除失败:' + error.message);
      return;
    }
    await appendTimeline(issue, me, {
      kind: 'edit',
      note: `删除官方回复 · ${r.party}${r.ref_no ? ` · ${r.ref_no}` : ''}`,
    });
    toastOk('回复已删除');
    load();
    onIssueChanged();
  };

  return (
    <div className="bg-white dark:bg-white/5 rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">
            官方回复 · Official Response
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            {loading ? '加载中…' : `${rows.length} 条回复`}
          </div>
        </div>
        {P.edit && (
          <button
            onClick={() => setModal({ mode: 'add', editing: null })}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-brand-800 hover:bg-brand-900 text-white text-xs rounded-lg transition"
          >
            {I.plus} 新增回复
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-6 flex justify-center">
          <Spin cls="w-4 h-4 text-slate-300" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-xs text-slate-400 py-3 text-center">暂无官方回复</p>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => {
            const ack = DI_ACK_STYLE[r.ack_status];
            return (
              <div
                key={r.id}
                className="bg-slate-50 dark:bg-white/[.03] rounded-lg p-3 ring-1 ring-slate-100 dark:ring-white/5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {r.party || '(未填单位)'}
                      </span>
                      {r.person && (
                        <span className="text-xs text-slate-500 dark:text-slate-400">
                          · {r.person}
                        </span>
                      )}
                      {r.ref_no && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/5 text-slate-500">
                          {r.ref_no}
                        </span>
                      )}
                      <span className="text-[11px] text-slate-400 ml-auto shrink-0">
                        {r.response_date}
                      </span>
                    </div>
                    {r.content && (
                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap mt-2">
                        {r.content}
                      </p>
                    )}
                    {(r.attachments || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {r.attachments.map((a, i) => (
                          <a
                            key={i}
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] px-2 py-1 rounded bg-white dark:bg-white/5 ring-1 ring-slate-200 dark:ring-white/10 text-brand-700 dark:text-brand-300 hover:ring-brand-300 inline-flex items-center gap-1 transition"
                          >
                            📎 {a.name}
                          </a>
                        ))}
                      </div>
                    )}
                    {r.ack_note && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400 italic">
                        备注:{r.ack_note}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-100 dark:border-white/5">
                      {P.status ? (
                        <select
                          value={r.ack_status}
                          onChange={(e) => changeAck(r, e.target.value as DIAckStatus)}
                          className={cx(
                            'text-[11px] px-2 py-1 rounded-full ring-1 outline-none bg-transparent',
                            ack.bg,
                            ack.text,
                            ack.ring,
                          )}
                        >
                          {DI_ACK_STATUSES.map((s) => (
                            <option key={s} value={s} className="dark:bg-slate-800">
                              {DI_ACK_LABEL[s]}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className={cx(
                            'text-[11px] px-2 py-1 rounded-full ring-1 inline-flex items-center gap-1.5',
                            ack.bg,
                            ack.text,
                            ack.ring,
                          )}
                        >
                          <span className={cx('w-1.5 h-1.5 rounded-full', ack.dot)} />
                          {DI_ACK_LABEL[r.ack_status]}
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
                </div>
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <DIResponseForm
          mode={modal.mode}
          editing={modal.editing}
          issue={issue}
          me={me}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
            onIssueChanged();
          }}
        />
      )}
    </div>
  );
}

/* ─── Modal form ────────────────────────────────────────────────────────── */

interface FormProps {
  mode: 'add' | 'edit';
  editing: DIResponse | null;
  issue: DrawingIssue;
  me: User;
  onClose: () => void;
  onSaved: () => void;
}

function DIResponseForm({ mode, editing, issue, me, onClose, onSaved }: FormProps) {
  const initial: DIResponseDraft =
    mode === 'edit' && editing
      ? {
          party: editing.party,
          person: editing.person,
          response_date: editing.response_date,
          ref_no: editing.ref_no,
          content: editing.content,
          attachments: editing.attachments || [],
          ack_status: editing.ack_status,
          ack_note: editing.ack_note,
        }
      : { ...DI_RESPONSE_BLANK };

  const [f, setF] = useState<DIResponseDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [rmPaths, setRmPaths] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((file) => {
      setF((p) => ({
        ...p,
        attachments: [...p.attachments, { name: file.name, _file: file, _local: true }],
      }));
    });
    e.target.value = '';
  };

  const rmAtt = (i: number) => {
    const a = f.attachments[i];
    if (a.path) setRmPaths((p) => [...p, a.path!]);
    setF((p) => ({ ...p, attachments: p.attachments.filter((_, j) => j !== i) }));
  };

  const submit = async () => {
    if (saving) return;
    if (!f.party.trim() && !f.content.trim() && !f.ref_no.trim()) {
      setErr('至少填写一项:回复单位 / 回复编号 / 意见内容');
      return;
    }
    setSaving(true);
    setErr('');
    try {
      const dir = `${issue.issue_no}/response`;
      const uploaded: Attachment[] = [];
      for (const a of f.attachments) {
        if (a._local && a._file) {
          uploaded.push(await uploadAttachment('attachments', dir, a._file));
        } else {
          uploaded.push(a);
        }
      }
      if (rmPaths.length) await sb.storage.from('attachments').remove(rmPaths);

      const payload = {
        party: f.party,
        person: f.person,
        response_date: f.response_date,
        ref_no: f.ref_no,
        content: f.content,
        ack_status: f.ack_status,
        ack_note: f.ack_note,
        attachments: uploaded,
      };

      if (mode === 'add') {
        const { error } = await sb.from('di_responses').insert({
          ...payload,
          drawing_issue_id: issue.id,
          created_by: me.id,
        });
        if (error) throw new Error(`[写库] ${error.message}`);
        await appendTimeline(issue, me, {
          kind: 'link',
          note: `官方回复 · ${f.party || '未命名'}${f.ref_no ? ` · ${f.ref_no}` : ''}`,
        });
        toastOk('回复已添加');
      } else if (editing) {
        const { error } = await sb
          .from('di_responses')
          .update({ ...payload, updated_at: new Date().toISOString() })
          .eq('id', editing.id);
        if (error) throw new Error(`[写库] ${error.message}`);
        await appendTimeline(issue, me, {
          kind: 'edit',
          note: `编辑官方回复 · ${f.party || '未命名'}${f.ref_no ? ` · ${f.ref_no}` : ''}`,
        });
        toastOk('回复已更新');
      }
      onSaved();
    } catch (e: unknown) {
      const msg = '保存失败:' + (e instanceof Error ? e.message : String(e));
      setErr(msg);
      toastErr(msg);
    }
    setSaving(false);
  };

  const inp =
    'w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition';
  const lbl = 'text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block';

  return (
    <Modal
      wide
      title={mode === 'add' ? '新增官方回复 / New Response' : '编辑官方回复 / Edit'}
      onClose={() => !saving && onClose()}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>回复单位 Party</label>
            <input
              value={f.party}
              onChange={(e) => setF((p) => ({ ...p, party: e.target.value }))}
              placeholder="如:设计院、监理"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>回复人员 Person</label>
            <input
              value={f.person}
              onChange={(e) => setF((p) => ({ ...p, person: e.target.value }))}
              placeholder="张工"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>回复日期 Date</label>
            <input
              type="date"
              value={f.response_date}
              onChange={(e) => setF((p) => ({ ...p, response_date: e.target.value }))}
              className={inp}
            />
          </div>
          <div className="col-span-2 md:col-span-2">
            <label className={lbl}>回复编号 Ref No.</label>
            <input
              value={f.ref_no}
              onChange={(e) => setF((p) => ({ ...p, ref_no: e.target.value }))}
              placeholder="如:设计院回函 2026-08-025"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>确认状态 Ack</label>
            <select
              value={f.ack_status}
              onChange={(e) => setF((p) => ({ ...p, ack_status: e.target.value as DIAckStatus }))}
              className={inp}
            >
              {DI_ACK_STATUSES.map((s) => (
                <option key={s} value={s} className="dark:bg-slate-800">
                  {DI_ACK_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={lbl}>意见内容 Content</label>
          <textarea
            value={f.content}
            onChange={(e) => setF((p) => ({ ...p, content: e.target.value }))}
            placeholder="回复意见,或「同意」「按方案 A 执行」「需补充材料」等"
            className={cx(inp, 'h-32 resize-none')}
          />
        </div>

        <div>
          <label className={lbl}>确认备注 Ack Note</label>
          <input
            value={f.ack_note}
            onChange={(e) => setF((p) => ({ ...p, ack_note: e.target.value }))}
            placeholder="如:接受时补一句「按此执行,已知会现场」"
            className={inp}
          />
        </div>

        <div>
          <label className={lbl}>附件 Attachments</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-white/5 transition"
          >
            <div className="text-slate-500 dark:text-slate-300 text-sm">点击上传文件</div>
            <div className="text-slate-400 text-xs mt-1">
              PDF / 图片 / Word · 图片自动压缩 · 单文件 ≤ 15 MB
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            className="hidden"
            onChange={onPickFiles}
          />
          {f.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {f.attachments.map((a, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-1.5 ring-1 ring-slate-100 dark:ring-white/5"
                >
                  <span className="text-slate-600 dark:text-slate-300 truncate text-xs inline-flex items-center gap-1.5">
                    📎{a._local && <span className="text-emerald-500">新</span>}
                    {a.name}
                  </span>
                  <button
                    onClick={() => rmAtt(i)}
                    className="text-rose-400 hover:text-rose-600 ml-2 shrink-0"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {err && (
          <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
            {err}
          </div>
        )}
      </div>
      <div className="flex justify-end gap-2 pt-5 mt-2 border-t border-slate-100 dark:border-white/5 -mx-6 px-6 -mb-6 pb-5">
        <button
          disabled={saving}
          onClick={onClose}
          className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg disabled:opacity-50 transition"
        >
          取消
        </button>
        <button
          disabled={saving}
          onClick={submit}
          className="px-5 py-2 text-sm bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-medium disabled:opacity-60 flex items-center gap-2 transition"
        >
          {saving && <Spin />}
          {mode === 'add' ? '提交' : '保存'}
        </button>
      </div>
    </Modal>
  );
}

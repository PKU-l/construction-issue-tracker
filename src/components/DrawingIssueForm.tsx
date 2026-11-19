import { cloneElement, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { sb } from '../lib/supabase';
import { generateIssueNo } from '../lib/issueNo';
import { uploadAttachment } from '../lib/attachments';
import { toastErr, toastOk } from '../lib/toast';
import { I } from '../lib/icons';
import {
  DI_BLANK,
  DI_CATEGORIES,
  DI_RISK_LEVELS,
  DI_STATUSES,
  DRAWING_SPECS,
} from '../lib/enums';
import type {
  Attachment,
  DICategory,
  DIRisk,
  DIStatus,
  Drawing,
  DrawingIssue,
  DrawingIssueDraft,
  DrawingSpecialty,
  TimelineEntry,
  User,
} from '../lib/types';
import { cx } from '../lib/util';
import { Spin } from './Spin';
import { Modal } from './Modal';

interface Props {
  mode: 'add' | 'edit';
  editing: DrawingIssue | null;
  me: User;
  onClose: () => void;
  onSaved: () => void;
}

export function DrawingIssueForm({ mode, editing, me, onClose, onSaved }: Props) {
  const initial: DrawingIssueDraft =
    mode === 'edit' && editing
      ? {
          drawing_id: editing.drawing_id,
          drawing_no_snapshot: editing.drawing_no_snapshot,
          revision_snapshot: editing.revision_snapshot,
          specialty: editing.specialty,
          category: editing.category,
          risk_level: editing.risk_level,
          title: editing.title,
          location: editing.location,
          description: editing.description,
          impact: editing.impact,
          responsible_party: editing.responsible_party,
          waiting_on: editing.waiting_on,
          date_raised: editing.date_raised,
          date_due: editing.date_due,
          status: editing.status,
          local_ref: editing.local_ref || '',
          attachments: editing.attachments || [],
        }
      : { ...DI_BLANK };

  const [f, setF] = useState<DrawingIssueDraft>(initial);
  const [drawings, setDrawings] = useState<Drawing[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [rmPaths, setRmPaths] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPickFiles = (e: ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((file) =>
      setF((p) => ({
        ...p,
        attachments: [...p.attachments, { name: file.name, _file: file, _local: true }],
      })),
    );
    e.target.value = '';
  };
  const rmAtt = (idx: number) => {
    const a = f.attachments[idx];
    if (a.path) setRmPaths((p) => [...p, a.path!]);
    setF((p) => ({ ...p, attachments: p.attachments.filter((_, i) => i !== idx) }));
  };

  useEffect(() => {
    sb.from('drawings')
      .select('id, drawing_no, revision, title, specialty, status')
      .order('drawing_no', { ascending: true })
      .then(({ data }) => setDrawings((data as Drawing[]) || []));
  }, []);

  const pickDrawing = (id: string) => {
    if (!id) {
      setF((p) => ({
        ...p,
        drawing_id: null,
        drawing_no_snapshot: '',
        revision_snapshot: '',
      }));
      return;
    }
    const d = drawings.find((x) => x.id === id);
    if (!d) return;
    setF((p) => ({
      ...p,
      drawing_id: d.id,
      drawing_no_snapshot: d.drawing_no,
      revision_snapshot: d.revision,
      specialty: d.specialty,
    }));
  };

  const submit = async () => {
    if (saving) return;
    if (!f.title.trim() && !f.description.trim()) return setErr('请填写标题或问题描述');
    setSaving(true);
    setErr('');
    try {
      const now = new Date().toISOString();
      const actorName = me.display_name || me.username;
      if (mode === 'add') {
        const issue_no = await generateIssueNo(f.specialty);
        // Upload any local attachments into attachments bucket under this issue_no
        const uploaded: Attachment[] = [];
        for (const a of f.attachments) {
          uploaded.push(
            a._local && a._file ? await uploadAttachment('attachments', `di/${issue_no}`, a._file) : a,
          );
        }
        const timeline: TimelineEntry[] = [
          {
            ts: now,
            actor_id: me.id,
            actor_name: actorName,
            kind: 'create',
            note: `创建问题 ${issue_no},初始状态 ${f.status}${uploaded.length ? `,附件 ${uploaded.length} 个` : ''}`,
          },
        ];
        const { error } = await sb.from('drawing_issues').insert({
          issue_no,
          ...f,
          attachments: uploaded,
          created_by: me.id,
          timeline,
        });
        if (error) throw new Error(`[写库] ${error.message}`);
      } else if (editing) {
        // Upload new local attachments
        const uploaded: Attachment[] = [];
        for (const a of f.attachments) {
          uploaded.push(
            a._local && a._file
              ? await uploadAttachment('attachments', `di/${editing.issue_no}`, a._file)
              : a,
          );
        }
        if (rmPaths.length) await sb.storage.from('attachments').remove(rmPaths);
        const timeline: TimelineEntry[] = editing.timeline ? [...editing.timeline] : [];
        if (editing.status !== f.status) {
          timeline.push({
            ts: now,
            actor_id: me.id,
            actor_name: actorName,
            kind: 'status',
            from: editing.status,
            to: f.status,
          });
        }
        // Track meaningful edits at MVP level (category / risk / drawing link / responsible)
        const changed: string[] = [];
        if (editing.category !== f.category) changed.push(`分类 ${editing.category}→${f.category}`);
        if (editing.risk_level !== f.risk_level)
          changed.push(`风险 ${editing.risk_level}→${f.risk_level}`);
        if (editing.drawing_id !== f.drawing_id)
          changed.push(
            `图纸链接 ${editing.drawing_no_snapshot || '—'}→${f.drawing_no_snapshot || '—'}`,
          );
        if (editing.responsible_party !== f.responsible_party)
          changed.push(`责任方 ${editing.responsible_party || '—'}→${f.responsible_party || '—'}`);
        if (editing.waiting_on !== f.waiting_on)
          changed.push(`等待方 ${editing.waiting_on || '—'}→${f.waiting_on || '—'}`);
        if (changed.length) {
          timeline.push({
            ts: now,
            actor_id: me.id,
            actor_name: actorName,
            kind: 'edit',
            note: changed.join(';  '),
          });
        }
        const { error } = await sb
          .from('drawing_issues')
          .update({ ...f, attachments: uploaded, timeline, updated_at: now })
          .eq('id', editing.id);
        if (error) throw new Error(`[写库] ${error.message}`);
      }
      toastOk(mode === 'add' ? '图纸问题已创建' : '图纸问题已更新');
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
      title={mode === 'add' ? '新增图纸问题 / New Drawing Issue' : '编辑图纸问题 / Edit'}
      onClose={() => !saving && onClose()}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>分类 Category</label>
            <select
              value={f.category}
              onChange={(e) => setF((p) => ({ ...p, category: e.target.value as DICategory }))}
              className={inp}
            >
              {DI_CATEGORIES.map((c) => (
                <option key={c} className="dark:bg-slate-800">
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>风险级别 Risk</label>
            <select
              value={f.risk_level}
              onChange={(e) => setF((p) => ({ ...p, risk_level: e.target.value as DIRisk }))}
              className={inp}
            >
              {DI_RISK_LEVELS.map((r) => (
                <option key={r} className="dark:bg-slate-800">
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>状态 Status</label>
            <select
              value={f.status}
              onChange={(e) => setF((p) => ({ ...p, status: e.target.value as DIStatus }))}
              className={inp}
            >
              {DI_STATUSES.map((s) => (
                <option key={s} className="dark:bg-slate-800">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>专业 Specialty</label>
            <select
              value={f.specialty}
              onChange={(e) =>
                setF((p) => ({ ...p, specialty: e.target.value as DrawingSpecialty }))
              }
              className={inp}
            >
              {DRAWING_SPECS.map((s) => (
                <option key={s} className="dark:bg-slate-800">
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={lbl}>责任单位 Responsible</label>
            <input
              value={f.responsible_party}
              onChange={(e) => setF((p) => ({ ...p, responsible_party: e.target.value }))}
              placeholder="如:设计院、监理、分包"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>等待处理方 Waiting On</label>
            <input
              value={f.waiting_on}
              onChange={(e) => setF((p) => ({ ...p, waiting_on: e.target.value }))}
              placeholder="当前等谁回复"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>提出日期 Raised</label>
            <input
              type="date"
              value={f.date_raised}
              onChange={(e) => setF((p) => ({ ...p, date_raised: e.target.value }))}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>截止日期 Due</label>
            <input
              type="date"
              value={f.date_due || ''}
              onChange={(e) => setF((p) => ({ ...p, date_due: e.target.value || null }))}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>位置 Location</label>
            <input
              value={f.location}
              onChange={(e) => setF((p) => ({ ...p, location: e.target.value }))}
              placeholder="区域 / 楼层 / 轴线"
              className={inp}
            />
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className={lbl}>关联图纸 Linked Drawing (可选)</label>
            <select
              value={f.drawing_id || ''}
              onChange={(e) => pickDrawing(e.target.value)}
              className={inp}
            >
              <option value="">未关联</option>
              {drawings.map((d) => (
                <option key={d.id} value={d.id} className="dark:bg-slate-800">
                  {d.drawing_no} · Rev.{d.revision}
                  {d.title ? ` · ${d.title}` : ''}
                </option>
              ))}
            </select>
            {f.drawing_no_snapshot && (
              <p className="text-xs text-slate-400 mt-1">
                快照:{f.drawing_no_snapshot} · Rev.{f.revision_snapshot}(图纸即使被删,此快照也会保留)
              </p>
            )}
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className={lbl}>标题 Title</label>
            <input
              value={f.title}
              onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))}
              placeholder="一句话概述问题"
              className={inp}
            />
          </div>
        </div>

        <div>
          <label className={lbl}>问题描述 Description</label>
          <textarea
            value={f.description}
            onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))}
            placeholder="详细描述:现状 / 图纸要求 / 冲突点 / 施工影响 / 建议方案 / 待确认…"
            className={cx(inp, 'h-32 resize-none')}
          />
        </div>

        <div>
          <label className={lbl}>影响评估 Impact</label>
          <textarea
            value={f.impact}
            onChange={(e) => setF((p) => ({ ...p, impact: e.target.value }))}
            placeholder="对进度 / 成本 / 质量 / 安全的影响"
            className={cx(inp, 'h-20 resize-none')}
          />
        </div>

        <div>
          <label className={lbl}>附件 Attachments(图片自动压缩至最长边 2000px / JPEG 82%)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-white/5 transition"
          >
            <div className="text-slate-500 dark:text-slate-300 text-sm">
              点击上传文件(可多选)
            </div>
            <div className="text-slate-400 text-xs mt-1">
              JPG · PNG · PDF · DOC · DOCX,单文件 &le; 15 MB
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,image/*"
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
                    {cloneElement(I.paper, { cls: 'w-3.5 h-3.5' })}
                    {a._local && <span className="text-emerald-500">新</span>}
                    {a.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => rmAtt(i)}
                    className="text-rose-400 hover:text-rose-600 ml-2 shrink-0"
                  >
                    {cloneElement(I.x, { cls: 'w-4 h-4' })}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={lbl}>本地档案位置 Local File Ref</label>
          <input
            value={f.local_ref}
            onChange={(e) => setF((p) => ({ ...p, local_ref: e.target.value }))}
            placeholder="如:D:\SILO\photos\2026-08\IQ-042_crack.jpg 或 NAS/Q4/silo-023"
            className={inp}
          />
          <p className="text-xs text-slate-400 mt-1">
            照片 / 原始文件放在本地时,填这里做索引。别人要看时你可以按此路径调取,不占云端空间。
          </p>
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

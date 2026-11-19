import { cloneElement, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { sb } from '../lib/supabase';
import { uploadAttachment } from '../lib/attachments';
import { toastErr, toastOk } from '../lib/toast';
import {
  DRAWING_BLANK,
  DRAWING_BUILDING_SUGGESTIONS,
  DRAWING_SPECS,
  DRAWING_STATUSES,
  DRAWING_STATUS_LABEL,
} from '../lib/enums';
import type {
  Drawing,
  DrawingDraft,
  DrawingSpecialty,
  DrawingStatus,
  User,
} from '../lib/types';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { Spin } from './Spin';
import { Modal } from './Modal';

interface Props {
  mode: 'add' | 'edit';
  editing: Drawing | null;
  me: User;
  onClose: () => void;
  onSaved: () => void;
}

const ACCEPT = '.pdf,.png,.jpg,.jpeg,.dwg,.dxf,image/png,image/jpeg,application/pdf';

export function DrawingForm({ mode, editing, me, onClose, onSaved }: Props) {
  const initial: DrawingDraft =
    mode === 'edit' && editing
      ? {
          drawing_no: editing.drawing_no,
          title: editing.title,
          specialty: editing.specialty,
          building: editing.building || '',
          revision: editing.revision,
          revision_date: editing.revision_date,
          status: editing.status,
          file_name: editing.file_name,
          file_path: editing.file_path,
          file_url: editing.file_url,
          notes: editing.notes,
        }
      : { ...DRAWING_BLANK };

  const [f, setF] = useState<DrawingDraft>(initial);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [buildingSuggestions, setBuildingSuggestions] = useState<string[]>(
    DRAWING_BUILDING_SUGGESTIONS,
  );

  // 拉取已录入过的建筑单位,合并到建议列表
  useEffect(() => {
    sb.from('drawings')
      .select('building')
      .not('building', 'is', null)
      .then(({ data }) => {
        const existing = ((data as Array<{ building: string }>) || [])
          .map((r) => (r.building || '').trim())
          .filter(Boolean);
        const merged = Array.from(new Set([...DRAWING_BUILDING_SUGGESTIONS, ...existing])).sort();
        setBuildingSuggestions(merged);
      });
  }, []);

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setF((p) => ({ ...p, _file: file, file_name: file.name }));
    e.target.value = '';
  };

  const clearFile = () =>
    setF((p) => ({ ...p, _file: undefined, file_name: '', file_path: '', file_url: '' }));

  const uploadFile = async (): Promise<{ path: string; url: string; name: string } | null> => {
    if (!f._file) return null;
    const dir = `${f.drawing_no || 'misc'}/${f.revision || 'r0'}`;
    const att = await uploadAttachment('drawings', dir, f._file);
    return { path: att.path!, url: att.url!, name: att.name };
  };

  const submit = async () => {
    if (saving) return;
    if (!f.drawing_no.trim()) return setErr('请填写图号');
    if (!f.revision.trim()) return setErr('请填写版本号');
    if (mode === 'add' && !f._file) return setErr('请选择要上传的图纸文件');

    setSaving(true);
    setErr('');
    try {
      let filePart = { file_name: f.file_name, file_path: f.file_path, file_url: f.file_url };
      const oldPath = editing?.file_path || '';
      if (f._file) {
        const uploaded = await uploadFile();
        if (uploaded) {
          filePart = { file_name: uploaded.name, file_path: uploaded.path, file_url: uploaded.url };
          if (mode === 'edit' && oldPath && oldPath !== uploaded.path) {
            await sb.storage.from('drawings').remove([oldPath]);
          }
        }
      }

      const payload = {
        drawing_no: f.drawing_no.trim(),
        title: f.title.trim(),
        specialty: f.specialty,
        revision: f.revision.trim(),
        revision_date: f.revision_date || null,
        status: f.status,
        notes: f.notes,
        ...filePart,
      };

      if (mode === 'add') {
        const { error } = await sb.from('drawings').insert({ ...payload, uploaded_by: me.id });
        if (error) throw new Error(`[写库] ${error.message}`);
      } else if (editing) {
        const { error } = await sb.from('drawings').update(payload).eq('id', editing.id);
        if (error) throw new Error(`[写库] ${error.message}`);
      }
      toastOk(mode === 'add' ? `已新增图纸 ${f.drawing_no} Rev.${f.revision}` : '图纸已更新');
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
      title={mode === 'add' ? '新增图纸 / New Drawing' : '编辑图纸 / Edit Drawing'}
      onClose={() => !saving && onClose()}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className={lbl}>
              图号 Drawing No. <span className="text-rose-400">*</span>
            </label>
            <input
              value={f.drawing_no}
              onChange={(e) => setF((p) => ({ ...p, drawing_no: e.target.value }))}
              placeholder="如 STR-101、A-3F-001"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>
              版本 Rev. <span className="text-rose-400">*</span>
            </label>
            <input
              value={f.revision}
              onChange={(e) => setF((p) => ({ ...p, revision: e.target.value }))}
              placeholder="00 / 01 / A / B"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>建筑单位 Building</label>
            <input
              value={f.building}
              onChange={(e) => setF((p) => ({ ...p, building: e.target.value }))}
              list="drawing-building-list"
              placeholder="如:筒仓、工作塔…(可自定义)"
              className={inp}
            />
            <datalist id="drawing-building-list">
              {buildingSuggestions.map((b) => (
                <option key={b} value={b} />
              ))}
            </datalist>
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
          <div className="col-span-2 md:col-span-2">
            <label className={lbl}>图纸名称 Title</label>
            <input
              value={f.title}
              onChange={(e) => setF((p) => ({ ...p, title: e.target.value }))}
              placeholder="如:三层结构平面图"
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>状态 Status</label>
            <select
              value={f.status}
              onChange={(e) => setF((p) => ({ ...p, status: e.target.value as DrawingStatus }))}
              className={inp}
            >
              {DRAWING_STATUSES.map((s) => (
                <option key={s} value={s} className="dark:bg-slate-800">
                  {DRAWING_STATUS_LABEL[s]}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2 md:col-span-3">
            <label className={lbl}>版本日期 Revision Date</label>
            <input
              type="date"
              value={f.revision_date || ''}
              onChange={(e) => setF((p) => ({ ...p, revision_date: e.target.value || null }))}
              className={inp}
            />
          </div>
        </div>

        <div>
          <label className={lbl}>
            图纸文件 File {mode === 'add' && <span className="text-rose-400">*</span>}
          </label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-white/5 transition"
          >
            <div className="text-slate-500 dark:text-slate-300 text-sm">
              {f._file ? '重新选择文件' : '点击选择文件'}
            </div>
            <div className="text-slate-400 text-xs mt-1">PDF · PNG · JPG · DWG · DXF</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            onChange={onPickFile}
          />
          {(f._file || f.file_name) && (
            <div className="mt-2 flex items-center justify-between bg-slate-50 dark:bg-white/5 rounded-lg px-3 py-1.5 ring-1 ring-slate-100 dark:ring-white/5">
              <span className="text-slate-600 dark:text-slate-300 truncate text-xs inline-flex items-center gap-1.5">
                {cloneElement(I.paper, { cls: 'w-3.5 h-3.5' })}
                {f._file && <span className="text-emerald-500">新</span>}
                {f._file ? f._file.name : f.file_name}
              </span>
              <button
                onClick={clearFile}
                className="text-rose-400 hover:text-rose-600 ml-2 shrink-0"
                type="button"
              >
                {cloneElement(I.x, { cls: 'w-4 h-4' })}
              </button>
            </div>
          )}
        </div>

        <div>
          <label className={lbl}>备注 Notes</label>
          <textarea
            value={f.notes}
            onChange={(e) => setF((p) => ({ ...p, notes: e.target.value }))}
            placeholder="变更说明、修订原因、关联意见…"
            className={cx(inp, 'h-20 resize-none')}
          />
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

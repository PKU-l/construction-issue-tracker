import { cloneElement, type ChangeEvent, type Dispatch, type RefObject, type SetStateAction } from 'react';
import { SOURCES, SPECS, STATUSES, STYPES } from '../lib/enums';
import type { IssueDraft } from '../lib/types';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { Spin } from './Spin';
import { Modal } from './Modal';

interface Props {
  mode: 'add' | 'edit';
  form: IssueDraft;
  setForm: Dispatch<SetStateAction<IssueDraft>>;
  saving: boolean;
  errMsg: string;
  onSubmit: () => void;
  onClose: () => void;
  onFiles: (e: ChangeEvent<HTMLInputElement>) => void;
  rmAtt: (idx: number) => void;
  fileRef: RefObject<HTMLInputElement | null>;
}

type FieldKey = 'source' | 'source_type' | 'specialty' | 'status';

export function IssueForm({
  mode,
  form,
  setForm,
  saving,
  errMsg,
  onSubmit,
  onClose,
  onFiles,
  rmAtt,
  fileRef,
}: Props) {
  const inp =
    'w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition';
  const lbl = 'text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block';

  const selects: Array<[string, FieldKey, readonly string[]]> = [
    ['来源方', 'source', SOURCES],
    ['来源类型', 'source_type', STYPES],
    ['所属专业', 'specialty', SPECS],
    ['状态', 'status', STATUSES],
  ];

  return (
    <Modal
      wide
      title={mode === 'add' ? '新增问题 / New Issue' : '编辑问题 / Edit Issue'}
      onClose={() => !saving && onClose()}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {selects.map(([l, key, opts]) => (
            <div key={key}>
              <label className={lbl}>{l}</label>
              <select
                value={form[key]}
                onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                className={inp}
              >
                {key !== 'status' && <option value="">请选择</option>}
                {opts.map((o) => (
                  <option key={o} className="dark:bg-slate-800">
                    {o}
                  </option>
                ))}
              </select>
            </div>
          ))}
          <div>
            <label className={lbl}>提出日期</label>
            <input
              type="date"
              value={form.date_raised}
              onChange={(e) => setForm((p) => ({ ...p, date_raised: e.target.value }))}
              className={inp}
            />
          </div>
          <div>
            <label className={lbl}>截止日期</label>
            <input
              type="date"
              value={form.date_due}
              onChange={(e) => setForm((p) => ({ ...p, date_due: e.target.value }))}
              className={inp}
            />
          </div>
        </div>
        <div>
          <label className={lbl}>责任方</label>
          <input
            value={form.responsible_party}
            onChange={(e) => setForm((p) => ({ ...p, responsible_party: e.target.value }))}
            placeholder="如:总包单位、分包商…"
            className={inp}
          />
        </div>
        <div>
          <label className={lbl}>
            问题描述 <span className="text-rose-400">*</span>
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            placeholder="详细描述问题内容…"
            className={cx(inp, 'h-24 resize-none')}
          />
        </div>
        <div>
          <label className={lbl}>回复 / 整改措施</label>
          <textarea
            value={form.response}
            onChange={(e) => setForm((p) => ({ ...p, response: e.target.value }))}
            placeholder="处理方案或整改措施…"
            className={cx(inp, 'h-16 resize-none')}
          />
        </div>
        <div>
          <label className={lbl}>附件(PDF / Word)</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-4 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-white/5 transition"
          >
            <div className="text-slate-500 dark:text-slate-300 text-sm">点击上传文件</div>
            <div className="text-slate-400 text-xs mt-1">PDF · .doc · .docx · 云端永久保存</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={onFiles}
          />
          {form.attachments.length > 0 && (
            <div className="mt-2 space-y-1">
              {form.attachments.map((a, i) => (
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
        {errMsg && (
          <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
            {errMsg}
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
          onClick={onSubmit}
          className="px-5 py-2 text-sm bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-medium disabled:opacity-60 flex items-center gap-2 transition"
        >
          {saving && <Spin />}
          {mode === 'add' ? '提交' : '保存'}
        </button>
      </div>
    </Modal>
  );
}

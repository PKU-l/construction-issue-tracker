import { useRef, useState, type ChangeEvent } from 'react';
import { sb } from '../lib/supabase';
import {
  DRAWING_FIELD_LABEL,
  projectRows,
  readExcel,
  type DrawingField,
  type ParseResult,
  type ParsedRow,
} from '../lib/excelImport';
import type { User } from '../lib/types';
import { cx } from '../lib/util';
import { Spin } from './Spin';
import { Modal } from './Modal';

interface Props {
  me: User;
  onClose: () => void;
  onImported: (count: number) => void;
}

type Step = 'upload' | 'preview' | 'importing' | 'done';

export function DrawingsImport({ me, onClose, onImported }: Props) {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parse, setParse] = useState<ParseResult | null>(null);
  const [mapping, setMapping] = useState<Partial<Record<DrawingField, string>>>({});
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: number; fail: number; failReasons: string[] }>({
    ok: 0,
    fail: 0,
    failReasons: [],
  });
  const fileRef = useRef<HTMLInputElement | null>(null);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    setFile(f);
    setErr('');
    setBusy(true);
    try {
      const p = await readExcel(f);
      if (p.totalRows === 0) throw new Error('工作表里没有数据行');
      setParse(p);
      setMapping(p.detectedMapping);
      setStep('preview');
    } catch (e: unknown) {
      setErr('解析失败:' + (e instanceof Error ? e.message : String(e)));
    }
    setBusy(false);
  };

  const rows: ParsedRow[] = parse ? projectRows(parse.rawRows, mapping) : [];
  const invalid = rows.filter((r) => !r.drawing_no).length;
  const warnCount = rows.filter((r) => r._warnings.length > 0).length;

  const doImport = async () => {
    if (busy || !rows.length) return;
    if (!mapping.drawing_no) {
      setErr('请指定"图号"对应的 Excel 列');
      return;
    }
    setBusy(true);
    setErr('');
    setStep('importing');
    const failReasons: string[] = [];
    let ok = 0;
    let fail = 0;
    for (const r of rows) {
      if (!r.drawing_no) {
        fail++;
        continue;
      }
      const { error } = await sb.from('drawings').insert({
        drawing_no: r.drawing_no,
        title: r.title,
        specialty: r.specialty,
        building: r.building,
        revision: r.revision,
        revision_date: r.revision_date,
        status: r.status,
        notes: r.notes,
        uploaded_by: me.id,
      });
      if (error) {
        fail++;
        if (failReasons.length < 5) failReasons.push(`${r.drawing_no} Rev.${r.revision}: ${error.message}`);
      } else {
        ok++;
      }
    }
    setResult({ ok, fail, failReasons });
    setStep('done');
    setBusy(false);
    if (ok > 0) onImported(ok);
  };

  const inp =
    'w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition';

  return (
    <Modal wide title="从 Excel 导入图纸 / Import from Excel" onClose={() => !busy && onClose()}>
      {step === 'upload' && (
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            选择一份 .xlsx / .xls 文件。系统读第一张工作表,自动识别列(图号 / 名称 / 专业 / 建筑单位 / 版本 / 日期 / 状态 / 备注),
            你可以在下一步确认或修正列映射,再批量入库。
          </p>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-slate-200 dark:border-white/10 rounded-xl p-8 text-center cursor-pointer hover:border-brand-400 hover:bg-brand-50/40 dark:hover:bg-white/5 transition"
          >
            <div className="text-slate-500 dark:text-slate-300 text-sm">
              {busy ? '解析中…' : '点击选择 Excel 文件'}
            </div>
            <div className="text-slate-400 text-xs mt-1">.xlsx · .xls · .csv</div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={onPick}
          />
          {err && (
            <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
        </div>
      )}

      {step === 'preview' && parse && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <div className="text-slate-700 dark:text-slate-200">
              <span className="font-mono">{file?.name}</span> · 共 <b>{parse.totalRows}</b> 行 ·
              有效 <b className="text-emerald-600">{parse.totalRows - invalid}</b> ·
              问题 <b className="text-orange-600">{warnCount}</b> ·
              无效 <b className="text-rose-600">{invalid}</b>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-white/5 rounded-lg p-4 ring-1 ring-slate-100 dark:ring-white/5">
            <div className="text-xs text-slate-400 mb-3">列映射 · Column Mapping</div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {(Object.keys(DRAWING_FIELD_LABEL) as DrawingField[]).map((k) => (
                <div key={k}>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                    {DRAWING_FIELD_LABEL[k]}
                  </label>
                  <select
                    value={mapping[k] ?? ''}
                    onChange={(e) =>
                      setMapping((p) => ({ ...p, [k]: e.target.value || undefined }))
                    }
                    className={inp}
                  >
                    <option value="">(不映射)</option>
                    {parse.columns.map((c) => (
                      <option key={c} value={c} className="dark:bg-slate-800">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs text-slate-400 mb-2">
              数据预览(前 20 行)
            </div>
            <div className="border border-slate-200 dark:border-white/10 rounded-lg overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-slate-400">
                  <tr>
                    <th className="px-2 py-1.5 text-left font-medium">#</th>
                    <th className="px-2 py-1.5 text-left font-medium">图号</th>
                    <th className="px-2 py-1.5 text-left font-medium">版本</th>
                    <th className="px-2 py-1.5 text-left font-medium">建筑</th>
                    <th className="px-2 py-1.5 text-left font-medium">专业</th>
                    <th className="px-2 py-1.5 text-left font-medium">名称</th>
                    <th className="px-2 py-1.5 text-left font-medium">日期</th>
                    <th className="px-2 py-1.5 text-left font-medium">状态</th>
                    <th className="px-2 py-1.5 text-left font-medium">警告</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 20).map((r, i) => (
                    <tr
                      key={i}
                      className={cx(
                        'border-t border-slate-100 dark:border-white/5',
                        !r.drawing_no && 'bg-rose-50/50 dark:bg-rose-500/5',
                        r.drawing_no && r._warnings.length > 0 && 'bg-amber-50/50 dark:bg-amber-500/5',
                      )}
                    >
                      <td className="px-2 py-1.5 text-slate-400 font-mono">{i + 1}</td>
                      <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200 font-mono">
                        {r.drawing_no || <span className="text-rose-500">—</span>}
                      </td>
                      <td className="px-2 py-1.5 text-slate-500">{r.revision}</td>
                      <td className="px-2 py-1.5 text-slate-500">{r.building}</td>
                      <td className="px-2 py-1.5 text-slate-500">{r.specialty}</td>
                      <td className="px-2 py-1.5 text-slate-500 truncate max-w-[220px]">{r.title}</td>
                      <td className="px-2 py-1.5 text-slate-500">{r.revision_date || '—'}</td>
                      <td className="px-2 py-1.5 text-slate-500">{r.status}</td>
                      <td className="px-2 py-1.5 text-orange-600">
                        {r._warnings.join(';  ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length > 20 && (
                <div className="px-2 py-1.5 text-xs text-slate-400 border-t border-slate-100 dark:border-white/5">
                  ⋯ 还有 {rows.length - 20} 行未显示
                </div>
              )}
            </div>
          </div>

          {err && (
            <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
              {err}
            </div>
          )}

          <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-white/5 -mx-6 px-6 -mb-6 pb-5">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition"
            >
              ← 重新选文件
            </button>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={doImport}
                disabled={!mapping.drawing_no || invalid === rows.length}
                className="px-5 py-2 text-sm bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-medium disabled:opacity-40 transition"
              >
                导入 {rows.length - invalid} 条
              </button>
            </div>
          </div>
        </div>
      )}

      {step === 'importing' && (
        <div className="py-16 flex flex-col items-center gap-3 text-sm text-slate-500">
          <Spin cls="w-5 h-5" />
          正在导入 {rows.length} 条…
        </div>
      )}

      {step === 'done' && (
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="text-3xl mb-3">✓</div>
            <div className="text-lg font-semibold text-slate-900 dark:text-white">
              导入完成
            </div>
            <div className="text-sm text-slate-500 mt-1">
              成功 <b className="text-emerald-600">{result.ok}</b> 条
              {result.fail > 0 && (
                <>
                  {' · '}失败 <b className="text-rose-600">{result.fail}</b> 条
                </>
              )}
            </div>
          </div>
          {result.failReasons.length > 0 && (
            <div className="bg-rose-50 dark:bg-rose-500/10 rounded-lg p-3 text-xs text-rose-700 dark:text-rose-300 space-y-1">
              <div className="font-medium">部分失败原因(常见:图号+版本重复):</div>
              {result.failReasons.map((r, i) => (
                <div key={i} className="font-mono">• {r}</div>
              ))}
              {result.fail > result.failReasons.length && (
                <div className="text-rose-400">… 还有 {result.fail - result.failReasons.length} 条失败未列出</div>
              )}
            </div>
          )}
          <div className="flex justify-end pt-3 border-t border-slate-100 dark:border-white/5 -mx-6 px-6 -mb-6 pb-5">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm bg-brand-800 hover:bg-brand-900 text-white rounded-lg font-medium transition"
            >
              完成
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

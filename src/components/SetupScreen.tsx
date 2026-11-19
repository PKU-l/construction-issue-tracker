import { useState } from 'react';
import { sb } from '../lib/supabase';
import { generateSalt, hashPwd } from '../lib/hashPwd';
import { I } from '../lib/icons';
import { Spin } from './Spin';

export function SetupScreen({ onDone }: { onDone: () => void }) {
  const [f, setF] = useState({ username: '', displayName: '', password: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!f.username.trim() || !f.password) return setErr('请填写用户名和密码');
    if (f.password !== f.confirm) return setErr('两次密码不一致');
    if (f.password.length < 6) return setErr('密码至少 6 位');
    setSaving(true);
    const salt = generateSalt();
    const hash = await hashPwd(f.password, salt);
    const { error } = await sb.from('users').insert({
      username: f.username.trim(),
      password_hash: hash,
      salt,
      role: 'admin',
      display_name: f.displayName.trim() || f.username.trim(),
    });
    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }
    onDone();
  };

  const fields: Array<[string, keyof typeof f, string]> = [
    ['用户名 Username', 'username', 'text'],
    ['显示名称 Display name', 'displayName', 'text'],
    ['密码 Password', 'password', 'password'],
    ['确认密码 Confirm', 'confirm', 'password'],
  ];

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#F7F8FA] dark:bg-[#0D0F12]">
      <div className="bg-white dark:bg-[#171A20] rounded-2xl shadow-sm ring-1 ring-slate-200 dark:ring-white/10 w-full max-w-sm p-8 fade-in">
        <div className="text-center mb-6">
          <div className="w-11 h-11 rounded-xl bg-brand-800 text-white flex items-center justify-center mx-auto mb-3">
            {I.settings}
          </div>
          <h1 className="font-semibold text-slate-900 dark:text-white text-lg">初始化设置 / Setup</h1>
          <p className="text-xs text-slate-500 mt-1">首次使用,请创建管理员账号</p>
        </div>
        <div className="space-y-3">
          {fields.map(([lbl, k, t]) => (
            <div key={k}>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                {lbl}
              </label>
              <input
                type={t}
                value={f[k]}
                onChange={(e) => setF((p) => ({ ...p, [k]: e.target.value }))}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              />
            </div>
          ))}
          {err && (
            <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
              {err}
            </div>
          )}
          <button
            onClick={submit}
            disabled={saving}
            className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-2 mt-1 transition"
          >
            {saving && <Spin />} 创建管理员账号
          </button>
        </div>
      </div>
    </div>
  );
}

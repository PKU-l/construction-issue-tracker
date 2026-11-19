import { useEffect, useState } from 'react';
import { sb } from '../lib/supabase';
import { generateSalt, hashPwd } from '../lib/hashPwd';
import { PERM, ROLE_DOT, ROLE_LABEL } from '../lib/permissions';
import type { Role, User } from '../lib/types';
import { cx } from '../lib/util';
import { I } from '../lib/icons';
import { Spin } from './Spin';
import { Modal } from './Modal';

export function UsersScreen({ me }: { me: User }) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [nf, setNf] = useState({
    username: '',
    displayName: '',
    role: 'engineer' as Role,
    password: '',
    confirm: '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [pwTarget, setPwTarget] = useState<User | null>(null);
  const [newPw, setNewPw] = useState('');
  const [newPwC, setNewPwC] = useState('');

  const load = () =>
    sb
      .from('users')
      .select('*')
      .order('created_at')
      .then(({ data }) => {
        setUsers((data as User[]) || []);
        setLoading(false);
      });

  useEffect(() => {
    load();
  }, []);

  const addUser = async () => {
    if (!nf.username.trim() || !nf.password) return setErr('请填写用户名和密码');
    if (nf.password !== nf.confirm) return setErr('两次密码不一致');
    if (nf.password.length < 6) return setErr('密码至少 6 位');
    setSaving(true);
    const salt = generateSalt();
    const hash = await hashPwd(nf.password, salt);
    const { error } = await sb.from('users').insert({
      username: nf.username.trim(),
      password_hash: hash,
      salt,
      role: nf.role,
      display_name: nf.displayName.trim() || nf.username.trim(),
    });
    if (error) {
      setErr(error.message);
      setSaving(false);
      return;
    }
    setNf({ username: '', displayName: '', role: 'engineer', password: '', confirm: '' });
    setErr('');
    setSaving(false);
    setAddOpen(false);
    load();
  };

  const delUser = async (u: User) => {
    if (u.id === me.id) return alert('不能删除自己');
    if (!confirm(`删除用户「${u.display_name || u.username}」?`)) return;
    await sb.from('users').delete().eq('id', u.id);
    load();
  };

  const changeRole = async (id: string, role: Role) => {
    await sb.from('users').update({ role }).eq('id', id);
    load();
  };

  const savePw = async () => {
    if (!pwTarget) return;
    if (!newPw || newPw !== newPwC) return alert('密码不一致或为空');
    if (newPw.length < 6) return alert('至少 6 位');
    const salt = generateSalt();
    const hash = await hashPwd(newPw, salt);
    await sb.from('users').update({ password_hash: hash, salt }).eq('id', pwTarget.id);
    setPwTarget(null);
    setNewPw('');
    setNewPwC('');
  };

  const inp =
    'w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition';

  const newFields: Array<[string, keyof typeof nf, string]> = [
    ['用户名 Username', 'username', 'text'],
    ['显示名称 Display name', 'displayName', 'text'],
    ['密码 Password', 'password', 'password'],
    ['确认密码 Confirm', 'confirm', 'password'],
  ];

  // Prevent TS "unused" — PERM referenced here for future access checks.
  void PERM;

  return (
    <div className="fade-in">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-900 dark:text-white">用户管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">User Management · {users.length} 名成员</p>
        </div>
        <button
          onClick={() => {
            setAddOpen(true);
            setErr('');
          }}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-brand-800 hover:bg-brand-900 text-white text-sm rounded-lg transition"
        >
          {I.plus} 新增用户
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <Spin cls="w-5 h-5 text-slate-300" />
        </div>
      ) : (
        <div className="bg-white dark:bg-[#171A20] rounded-xl ring-1 ring-slate-200 dark:ring-white/10 overflow-hidden">
          {users.map((u, idx) => (
            <div
              key={u.id}
              className={cx(
                'flex items-center gap-3 px-4 py-3.5',
                idx > 0 && 'border-t border-slate-100 dark:border-white/5',
              )}
            >
              <div className="w-9 h-9 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-800 dark:text-brand-200 flex items-center justify-center font-semibold text-sm shrink-0">
                {(u.display_name || u.username).charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 dark:text-white text-sm">
                  {u.display_name || u.username}
                </div>
                <div className="text-xs text-slate-400">@{u.username}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={cx('w-1.5 h-1.5 rounded-full', ROLE_DOT[u.role])} />
                <select
                  value={u.role}
                  disabled={u.id === me.id}
                  onChange={(e) => changeRole(u.id, e.target.value as Role)}
                  className="text-xs bg-transparent text-slate-600 dark:text-slate-300 outline-none cursor-pointer disabled:cursor-default"
                >
                  {(Object.entries(ROLE_LABEL) as Array<[Role, string]>).map(([v, l]) => (
                    <option key={v} value={v} className="dark:bg-slate-800">
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => {
                  setPwTarget(u);
                  setNewPw('');
                  setNewPwC('');
                }}
                className="text-xs text-brand-600 dark:text-brand-300 hover:underline ml-2"
              >
                改密码
              </button>
              {u.id === me.id ? (
                <span className="text-xs text-slate-300 w-10 text-center">(我)</span>
              ) : (
                <button
                  onClick={() => delUser(u)}
                  className="text-xs text-rose-400 hover:text-rose-600 w-10 text-center"
                >
                  删除
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {addOpen && (
        <Modal onClose={() => setAddOpen(false)} title="新增用户 / New User">
          <div className="space-y-3">
            {newFields.map(([lbl, k, t]) => (
              <div key={k}>
                <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                  {lbl}
                </label>
                <input
                  type={t}
                  value={nf[k]}
                  onChange={(e) => setNf((p) => ({ ...p, [k]: e.target.value }))}
                  className={inp}
                />
              </div>
            ))}
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                角色 Role
              </label>
              <select
                value={nf.role}
                onChange={(e) => setNf((p) => ({ ...p, role: e.target.value as Role }))}
                className={inp}
              >
                {(Object.entries(ROLE_LABEL) as Array<[Role, string]>).map(([v, l]) => (
                  <option key={v} value={v} className="dark:bg-slate-800">
                    {l}
                  </option>
                ))}
              </select>
            </div>
            {err && (
              <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
                {err}
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setAddOpen(false)}
                className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={addUser}
                disabled={saving}
                className="flex-1 py-2 text-sm bg-brand-800 hover:bg-brand-900 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 transition"
              >
                {saving && <Spin />}
                创建
              </button>
            </div>
          </div>
        </Modal>
      )}

      {pwTarget && (
        <Modal onClose={() => setPwTarget(null)} title="修改密码 / Reset Password">
          <p className="text-xs text-slate-400 mb-3 -mt-2">用户:@{pwTarget.username}</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                新密码
              </label>
              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className={inp}
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1 block">
                确认新密码
              </label>
              <input
                type="password"
                value={newPwC}
                onChange={(e) => setNewPwC(e.target.value)}
                className={inp}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setPwTarget(null)}
                className="flex-1 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition"
              >
                取消
              </button>
              <button
                onClick={savePw}
                className="flex-1 py-2 text-sm bg-brand-800 hover:bg-brand-900 text-white rounded-lg transition"
              >
                确认修改
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

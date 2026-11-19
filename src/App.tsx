import {
  cloneElement,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import * as XLSX from 'xlsx';
import { sb } from './lib/supabase';
import { hashPwd } from './lib/hashPwd';
import { uploadAttachment } from './lib/attachments';
import { PERM, ROLE_DOT, ROLE_LABEL } from './lib/permissions';
import { BLANK } from './lib/enums';
import { I, type IconProps } from './lib/icons';
import { cx } from './lib/util';
import type {
  Attachment,
  FilterState,
  Issue,
  IssueDraft,
  IssueStatus,
  User,
} from './lib/types';
import { Spin } from './components/Spin';
import { SetupScreen } from './components/SetupScreen';
import { LoginScreen } from './components/LoginScreen';
import { UsersScreen } from './components/UsersScreen';
import { Dashboard } from './components/Dashboard';
import { IssuesView } from './components/IssuesView';
import { IssueForm } from './components/IssueForm';
import { DrawingsView } from './components/DrawingsView';
import { DrawingIssuesView } from './components/DrawingIssuesView';
import { ReportsView } from './components/ReportsView';
import { Toaster } from './components/Toaster';
import { toastErr, toastOk } from './lib/toast';

import { BRAND } from './lib/brand';
type Nav = 'dashboard' | 'issues' | 'drawings' | 'drawing_issues' | 'reports' | 'users';

interface NavItem {
  k: Nav;
  label: string;
  en: string;
  icon: React.ReactElement<IconProps>;
  soon?: boolean;
}

interface ModalState {
  mode: 'add' | 'edit';
  data: Issue | null;
}

function MainApp({
  user,
  onLogout,
  dark,
  setDark,
}: {
  user: User;
  onLogout: () => void;
  dark: boolean;
  setDark: (v: boolean) => void;
}) {
  const P = PERM[user.role];
  const [nav, setNav] = useState<Nav>('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errMsg, setErrMsg] = useState('');
  const [filt, setFilt] = useState<FilterState>({
    status: '',
    source: '',
    specialty: '',
    q: '',
  });
  const [modal, setModal] = useState<ModalState | null>(null);
  const [form, setForm] = useState<IssueDraft>(BLANK);
  const [rmPaths, setRmPaths] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    sb.from('issues')
      .select('*')
      .order('seq', { ascending: true })
      .then(({ data }) => {
        setIssues((data as Issue[]) || []);
        setLoading(false);
      });
    const ch = sb
      .channel('rt_issues')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'issues' },
        (p) => {
          if (p.eventType === 'INSERT')
            setIssues((prev) =>
              [...prev, p.new as Issue].sort((a, b) => a.seq - b.seq),
            );
          else if (p.eventType === 'UPDATE')
            setIssues((prev) =>
              prev.map((i) =>
                i.id === (p.new as Issue).id ? (p.new as Issue) : i,
              ),
            );
          else if (p.eventType === 'DELETE')
            setIssues((prev) =>
              prev.filter((i) => i.id !== (p.old as Issue).id),
            );
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, []);

  const onFiles = (e: ChangeEvent<HTMLInputElement>) => {
    Array.from(e.target.files || []).forEach((f) =>
      setForm((p) => ({
        ...p,
        attachments: [...p.attachments, { name: f.name, _file: f, _local: true }],
      })),
    );
    e.target.value = '';
  };
  const rmAtt = (idx: number) => {
    const a = form.attachments[idx];
    if (a.path) setRmPaths((p) => [...p, a.path!]);
    setForm((p) => ({
      ...p,
      attachments: p.attachments.filter((_, i) => i !== idx),
    }));
  };
  const uploadFile = async (id: string, att: Attachment): Promise<Attachment> => {
    if (!att._file) return att;
    return await uploadAttachment('attachments', `issues/${id}`, att._file);
  };

  const openAdd = () => {
    setForm({ ...BLANK });
    setRmPaths([]);
    setErrMsg('');
    setModal({ mode: 'add', data: null });
  };
  const openEdit = (issue: Issue) => {
    setForm({
      source: issue.source,
      source_type: issue.source_type,
      specialty: issue.specialty,
      date_raised: issue.date_raised,
      date_due: issue.date_due,
      responsible_party: issue.responsible_party,
      description: issue.description,
      response: issue.response,
      status: issue.status,
      attachments: issue.attachments || [],
    });
    setRmPaths([]);
    setErrMsg('');
    setModal({ mode: 'edit', data: issue });
  };

  const submit = async () => {
    if (!form.description.trim() || saving || !modal) return;
    setSaving(true);
    setErrMsg('');
    try {
      const atts: Attachment[] = [];
      if (modal.mode === 'add') {
        const { data: mx } = await sb
          .from('issues')
          .select('seq')
          .order('seq', { ascending: false })
          .limit(1);
        const seq = ((mx?.[0]?.seq as number) || 0) + 1;
        const id = `IQ-${String(seq).padStart(3, '0')}`;
        for (const a of form.attachments) atts.push(a._local ? await uploadFile(id, a) : a);
        const { error } = await sb.from('issues').insert({
          id,
          seq,
          ...form,
          attachments: atts,
        });
        if (error) throw error;
      } else {
        const targetId = modal.data!.id;
        for (const a of form.attachments) atts.push(a._local ? await uploadFile(targetId, a) : a);
        if (rmPaths.length) await sb.storage.from('attachments').remove(rmPaths);
        const { error } = await sb.from('issues')
          .update({ ...form, attachments: atts })
          .eq('id', targetId);
        if (error) throw error;
      }
      const { data: fresh } = await sb
        .from('issues')
        .select('*')
        .order('seq', { ascending: true });
      setIssues((fresh as Issue[]) || []);
      setModal(null);
      setRmPaths([]);
      toastOk(modal.mode === 'add' ? '问题已创建' : '问题已更新');
    } catch (e: unknown) {
      const msg = '保存失败:' + (e instanceof Error ? e.message : String(e));
      setErrMsg(msg);
      toastErr(msg);
    }
    setSaving(false);
  };

  const del = async (issue: Issue) => {
    if (!confirm(`确认删除 ${issue.id}?`)) return;
    try {
      const paths = (issue.attachments || []).map((a) => a.path).filter(Boolean) as string[];
      if (paths.length) await sb.storage.from('attachments').remove(paths);
      await sb.from('issues').delete().eq('id', issue.id);
      toastOk(`已删除 ${issue.id}`);
    } catch (e: unknown) {
      toastErr('删除失败:' + (e instanceof Error ? e.message : String(e)));
    }
  };
  const quickStatus = async (id: string, status: IssueStatus) => {
    await sb.from('issues').update({ status }).eq('id', id);
  };
  const exportXLSX = () => {
    const rows = issues.map((i) => ({
      编号: i.id,
      来源方: i.source,
      来源类型: i.source_type,
      所属专业: i.specialty,
      提出日期: i.date_raised,
      截止日期: i.date_due,
      责任方: i.responsible_party,
      问题描述: i.description,
      '回复/整改措施': i.response,
      状态: i.status,
      附件: (i.attachments || []).map((a) => a.name).join('; '),
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [8, 8, 10, 8, 10, 10, 14, 36, 36, 8, 20].map((w) => ({ wch: w }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '问题跟踪台账');
    XLSX.writeFile(wb, `问题跟踪台账${BRAND.excelSuffix ? '_' + BRAND.excelSuffix : ''}.xlsx`);
  };
  const drill = (s: '' | IssueStatus) => {
    setFilt({ status: s, source: '', specialty: '', q: '' });
    setNav('issues');
  };

  const NAV: NavItem[] = [
    { k: 'dashboard', label: '仪表盘', en: 'Dashboard', icon: I.dash },
    { k: 'issues', label: '施工问题', en: 'Issues', icon: I.issue },
    { k: 'drawings', label: '图纸库', en: 'Drawings', icon: I.draw },
    { k: 'drawing_issues', label: '图纸问题', en: 'Drawing Issues', icon: I.issue },
    { k: 'reports', label: '报表分析', en: 'Reports', icon: I.report },
    ...(P.users
      ? [{ k: 'users' as Nav, label: '用户管理', en: 'Users', icon: I.users }]
      : []),
  ];

  return (
    <div className="min-h-screen flex bg-[#F7F8FA] dark:bg-[#0D0F12] text-slate-900 dark:text-slate-100">
      {/* Sidebar */}
      <aside
        className={cx(
          'shrink-0 border-r border-slate-200 dark:border-white/5 bg-white dark:bg-[#111318] flex flex-col transition-all duration-200 sticky top-0 h-screen',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <div
          className={cx(
            'flex items-center gap-2.5 h-14 px-4 border-b border-slate-100 dark:border-white/5',
            collapsed && 'justify-center px-0',
          )}
        >
          <div className="w-8 h-8 rounded-lg bg-brand-800 text-white flex items-center justify-center text-xs font-bold shrink-0">
            PC
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                {BRAND.shortTitle}
              </div>
              <div className="text-[10px] text-slate-400 truncate">Issue Platform</div>
            </div>
          )}
        </div>
        <nav className="flex-1 p-2.5 space-y-1 overflow-y-auto">
          {NAV.map((n) => (
            <button
              key={n.k}
              onClick={() => !n.soon && setNav(n.k)}
              disabled={n.soon}
              className={cx(
                'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition group relative',
                collapsed && 'justify-center px-0',
                nav === n.k
                  ? 'bg-brand-50 dark:bg-brand-500/15 text-brand-800 dark:text-brand-200 font-medium'
                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5',
                n.soon && 'opacity-40 cursor-not-allowed',
              )}
            >
              <span
                className={cx(
                  'shrink-0',
                  nav === n.k ? 'text-brand-700 dark:text-brand-300' : '',
                )}
              >
                {cloneElement(n.icon, { cls: 'w-[18px] h-[18px]' })}
              </span>
              {!collapsed && (
                <>
                  <span className="truncate">{n.label}</span>
                  {n.soon && (
                    <span className="ml-auto text-[9px] px-1 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-400">
                      Soon
                    </span>
                  )}
                </>
              )}
            </button>
          ))}
        </nav>
        <div className="p-2.5 border-t border-slate-100 dark:border-white/5">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cx(
              'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 transition',
              collapsed && 'justify-center px-0',
            )}
          >
            <span className={cx('transition-transform shrink-0', collapsed && 'rotate-180')}>
              {cloneElement(I.chevL, { cls: 'w-[18px] h-[18px]' })}
            </span>
            {!collapsed && <span>收起侧栏</span>}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar */}
        <header className="h-14 shrink-0 border-b border-slate-200 dark:border-white/5 bg-white/80 dark:bg-[#111318]/80 backdrop-blur flex items-center gap-3 px-5 sticky top-0 z-20">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="hidden sm:inline">{BRAND.projectTitle}</span>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-600">/</span>
            <span className="text-slate-700 dark:text-slate-200 font-medium">
              {NAV.find((n) => n.k === nav)?.label}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="flex items-center gap-1 text-xs text-slate-400 mr-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="hidden sm:inline">实时同步</span>
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 flex items-center justify-center transition"
            >
              {dark
                ? cloneElement(I.sun, { cls: 'w-[18px] h-[18px]' })
                : cloneElement(I.moon, { cls: 'w-[18px] h-[18px]' })}
            </button>
            <div className="w-px h-5 bg-slate-200 dark:bg-white/10 mx-1" />
            <div className="flex items-center gap-2 pl-1">
              <div className="w-8 h-8 rounded-full bg-brand-100 dark:bg-brand-500/20 text-brand-800 dark:text-brand-200 flex items-center justify-center font-semibold text-xs">
                {(user.display_name || user.username).charAt(0).toUpperCase()}
              </div>
              <div className="hidden sm:block leading-tight">
                <div className="text-xs font-medium text-slate-700 dark:text-slate-200">
                  {user.display_name || user.username}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className={cx('w-1.5 h-1.5 rounded-full', ROLE_DOT[user.role])} />
                  {ROLE_LABEL[user.role].split(' ')[0]}
                </div>
              </div>
              <button
                onClick={onLogout}
                title="退出"
                className="w-9 h-9 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 flex items-center justify-center transition ml-1"
              >
                {cloneElement(I.logout, { cls: 'w-[18px] h-[18px]' })}
              </button>
            </div>
          </div>
        </header>

        {/* Work area */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7">
          <div className="max-w-6xl mx-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 text-slate-400 gap-3">
                <Spin cls="w-5 h-5" />
                <span className="text-sm">加载中…</span>
              </div>
            ) : (
              <>
                {nav === 'dashboard' && (
                  <Dashboard
                    issues={issues}
                    onDrillIssue={drill}
                    onNav={(n) => setNav(n)}
                  />
                )}
                {nav === 'issues' && (
                  <IssuesView
                    issues={issues}
                    P={P}
                    filt={filt}
                    setFilt={setFilt}
                    onAdd={openAdd}
                    onEdit={openEdit}
                    onDelete={del}
                    onStatus={quickStatus}
                    onExport={exportXLSX}
                  />
                )}
                {nav === 'users' && P.users && <UsersScreen me={user} />}
                {nav === 'drawings' && <DrawingsView me={user} P={P} />}
                {nav === 'drawing_issues' && <DrawingIssuesView me={user} P={P} />}
                {nav === 'reports' && <ReportsView />}
              </>
            )}
          </div>
        </main>
      </div>

      {modal && (
        <IssueForm
          mode={modal.mode}
          form={form}
          setForm={setForm}
          saving={saving}
          errMsg={errMsg}
          onSubmit={submit}
          onClose={() => setModal(null)}
          onFiles={onFiles}
          rmAtt={rmAtt}
          fileRef={fileRef}
        />
      )}
    </div>
  );
}

type View = 'loading' | 'setup' | 'login' | 'main';

export default function Root() {
  const [view, setView] = useState<View>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [dark, setDark] = useState<boolean>(() => {
    try {
      return localStorage.getItem('iq_theme') === 'dark';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const el = document.documentElement;
    if (dark) el.classList.add('dark');
    else el.classList.remove('dark');
    try {
      localStorage.setItem('iq_theme', dark ? 'dark' : 'light');
    } catch {
      /* ignore */
    }
  }, [dark]);

  const checkSetup = () =>
    sb
      .from('users')
      .select('id')
      .limit(1)
      .then(({ data }) => setView(!data || data.length === 0 ? 'setup' : 'login'));

  useEffect(() => {
    const saved = sessionStorage.getItem('iq_user');
    if (saved) {
      const u = JSON.parse(saved) as User;
      sb.from('users')
        .select('*')
        .eq('id', u.id)
        .single()
        .then(({ data }) => {
          if (data) {
            setUser(data as User);
            setView('main');
          } else {
            sessionStorage.removeItem('iq_user');
            checkSetup();
          }
        });
    } else {
      checkSetup();
    }
  }, []);

  const handleLogin = async (username: string, password: string): Promise<string | null> => {
    const { data, error } = await sb
      .from('users')
      .select('*')
      .eq('username', username)
      .maybeSingle();
    if (error || !data) return '用户名或密码错误';
    const u = data as User;
    const hash = await hashPwd(password, u.salt || '');
    if (hash !== u.password_hash) return '用户名或密码错误';
    sessionStorage.setItem('iq_user', JSON.stringify(u));
    setUser(u);
    setView('main');
    return null;
  };

  const handleLogout = () => {
    sessionStorage.removeItem('iq_user');
    setUser(null);
    setView('login');
  };

  if (view === 'loading')
    return (
      <>
        <div className="flex flex-col items-center justify-center h-screen text-slate-400 gap-3 bg-[#F7F8FA] dark:bg-[#0D0F12]">
          <Spin cls="w-5 h-5" />
          <span className="text-sm">正在连接…</span>
        </div>
        <Toaster />
      </>
    );
  if (view === 'setup')
    return (
      <>
        <SetupScreen onDone={() => setView('login')} />
        <Toaster />
      </>
    );
  if (view === 'login')
    return (
      <>
        <LoginScreen onLogin={handleLogin} dark={dark} setDark={setDark} />
        <Toaster />
      </>
    );
  return (
    <>
      <MainApp user={user!} onLogout={handleLogout} dark={dark} setDark={setDark} />
      <Toaster />
    </>
  );
}

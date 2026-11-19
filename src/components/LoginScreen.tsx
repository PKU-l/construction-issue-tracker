import { useState } from 'react';
import { I } from '../lib/icons';
import { Spin } from './Spin';

import { BRAND } from '../lib/brand';
interface Props {
  onLogin: (username: string, password: string) => Promise<string | null>;
  dark: boolean;
  setDark: (v: boolean) => void;
}

export function LoginScreen({ onLogin, dark, setDark }: Props) {
  const [un, setUn] = useState('');
  const [pw, setPw] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    if (!un.trim() || !pw) return;
    setLoading(true);
    setErr('');
    const m = await onLogin(un.trim(), pw);
    if (m) setErr(m);
    setLoading(false);
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-brand-900">
      {/* Hero background with slow Ken Burns zoom */}
      {BRAND.heroImage && (
        <img
          src={BRAND.heroImage}
          alt={BRAND.projectTitle}
          className="absolute inset-0 w-full h-full object-cover ken-burns"
          draggable={false}
        />
      )}
      {/* Darkening gradient — brand color washes on top and bottom, transparent-ish in the middle */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(180deg, rgba(16,42,67,0.62) 0%, rgba(16,42,67,0.15) 30%, rgba(16,42,67,0.35) 60%, rgba(16,42,67,0.90) 100%)',
        }}
      />
      {/* Center vignette so the form + title stand out */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'radial-gradient(ellipse at 50% 60%, rgba(16,42,67,0) 0%, rgba(16,42,67,0.50) 80%)',
        }}
      />

      {/* Top brand bar */}
      <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-6 sm:px-10 py-5 z-10 text-white">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-white/15 backdrop-blur-sm flex items-center justify-center text-sm font-bold ring-1 ring-white/20">
            {BRAND.orgBadge}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-wide">{BRAND.orgLine}</div>
            <div className="text-[10px] tracking-[0.18em] text-white/60 uppercase">
              Construction Management Platform
            </div>
          </div>
        </div>
        <button
          onClick={() => setDark(!dark)}
          className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm text-white/80 hover:text-white hover:bg-white/20 flex items-center justify-center transition ring-1 ring-white/10"
          aria-label="切换深/浅色"
        >
          {dark ? I.sun : I.moon}
        </button>
      </div>

      {/* Center column — brand headline + login card + footer meta */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 pt-28 pb-10">
        {/* Headline (pushes card slightly below vertical center) */}
        <div className="text-center text-white mb-8 sm:mb-10 fade-in max-w-2xl">
          <h1 className="text-3xl sm:text-5xl font-semibold leading-tight tracking-tight drop-shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
            {BRAND.projectTitle}
          </h1>
          <p className="text-white/80 mt-3 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
            施工问题、图纸反馈与监理协调的全过程闭环管理平台
          </p>
          <p className="text-white/50 mt-1 text-xs sm:text-sm max-w-md mx-auto italic">
            Traceable issue management for large-scale construction
          </p>
        </div>

        {/* Login card (frosted glass, floats over image) */}
        <div
          className="w-full max-w-sm bg-white/95 dark:bg-[#171A20]/95 backdrop-blur-xl rounded-2xl p-7 sm:p-8 ring-1 ring-white/40 dark:ring-white/10 fade-in"
          style={{ boxShadow: '0 24px 70px -16px rgba(15,23,42,0.55)' }}
        >
          <div className="text-center mb-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Welcome back</h2>
            <p className="text-xs text-slate-500 mt-1">登录以继续 / Sign in to continue</p>
          </div>
          <div className="space-y-3.5">
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                用户名 Username
              </label>
              <input
                value={un}
                onChange={(e) => setUn(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                autoFocus
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 dark:text-slate-300 mb-1.5 block">
                密码 Password
              </label>
              <input
                type="password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 transition"
              />
            </div>
            {err && (
              <div className="text-xs text-rose-600 bg-rose-50 dark:bg-rose-500/10 rounded-lg px-3 py-2">
                {err}
              </div>
            )}
            <button
              onClick={submit}
              disabled={loading || !un || !pw}
              className="w-full py-2.5 bg-brand-800 hover:bg-brand-900 text-white rounded-lg text-sm font-medium disabled:opacity-40 flex items-center justify-center gap-2 transition mt-1"
            >
              {loading && <Spin />} Sign In
            </button>
          </div>
        </div>

        {/* Footer meta */}
        <div className="mt-8 sm:mt-10 text-center text-white/60 text-xs tracking-wide">
          {BRAND.footer}
        </div>
      </div>
    </div>
  );
}

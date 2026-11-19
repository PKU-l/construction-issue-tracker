/**
 * 轻量 Toast:模块级 EventTarget,任何地方都能 emit,Toaster 组件订阅并渲染。
 * 不需要 Context,不需要 Provider,只要 App 里 mount 一次 <Toaster/> 即可。
 */

import { useEffect, useState } from 'react';

export type ToastKind = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  kind: ToastKind;
  text: string;
}

const bus = new EventTarget();
let seq = 0;

export function toast(kind: ToastKind, text: string, ttl = 3500) {
  const t: Toast = { id: ++seq, kind, text };
  bus.dispatchEvent(new CustomEvent<Toast>('emit', { detail: t }));
  window.setTimeout(() => {
    bus.dispatchEvent(new CustomEvent<number>('dismiss', { detail: t.id }));
  }, ttl);
}

export const toastOk    = (text: string, ttl?: number) => toast('success', text, ttl);
export const toastErr   = (text: string, ttl?: number) => toast('error',   text, ttl ?? 5000);
export const toastInfo  = (text: string, ttl?: number) => toast('info',    text, ttl);

export function useToasts(): [Toast[], (id: number) => void] {
  const [items, setItems] = useState<Toast[]>([]);
  useEffect(() => {
    const onEmit = (e: Event) => {
      const t = (e as CustomEvent<Toast>).detail;
      setItems((p) => [...p, t]);
    };
    const onDismiss = (e: Event) => {
      const id = (e as CustomEvent<number>).detail;
      setItems((p) => p.filter((x) => x.id !== id));
    };
    bus.addEventListener('emit', onEmit);
    bus.addEventListener('dismiss', onDismiss);
    return () => {
      bus.removeEventListener('emit', onEmit);
      bus.removeEventListener('dismiss', onDismiss);
    };
  }, []);
  const dismiss = (id: number) => setItems((p) => p.filter((x) => x.id !== id));
  return [items, dismiss];
}

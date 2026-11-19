import { useToasts, type ToastKind } from '../lib/toast';
import { cx } from '../lib/util';

const STYLE: Record<ToastKind, { bg: string; text: string; ring: string; icon: string }> = {
  success: {
    bg: 'bg-emerald-50 dark:bg-emerald-500/15',
    text: 'text-emerald-700 dark:text-emerald-200',
    ring: 'ring-emerald-200 dark:ring-emerald-500/20',
    icon: '✓',
  },
  error: {
    bg: 'bg-rose-50 dark:bg-rose-500/15',
    text: 'text-rose-700 dark:text-rose-200',
    ring: 'ring-rose-200 dark:ring-rose-500/20',
    icon: '✕',
  },
  info: {
    bg: 'bg-brand-50 dark:bg-brand-500/15',
    text: 'text-brand-700 dark:text-brand-200',
    ring: 'ring-brand-200 dark:ring-brand-500/20',
    icon: 'ⓘ',
  },
};

export function Toaster() {
  const [items, dismiss] = useToasts();
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none w-[min(360px,calc(100vw-2rem))]">
      {items.map((t) => {
        const s = STYLE[t.kind];
        return (
          <div
            key={t.id}
            className={cx(
              'pointer-events-auto rounded-xl px-3 py-2.5 ring-1 shadow-lg backdrop-blur-sm slide-in flex items-start gap-2.5 text-sm',
              s.bg,
              s.text,
              s.ring,
            )}
          >
            <span className="shrink-0 mt-0.5 font-bold">{s.icon}</span>
            <span className="flex-1 leading-snug">{t.text}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 opacity-50 hover:opacity-100 transition text-lg leading-none -mt-0.5"
              aria-label="关闭"
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}

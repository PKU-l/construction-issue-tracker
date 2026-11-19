import { cx } from '../lib/util';

interface Props {
  label: string;
  en: string;
  value: number;
  accent?: string;
  onClick?: () => void;
  active?: boolean;
}

export function Kpi({ label, en, value, accent, onClick, active }: Props) {
  return (
    <button
      onClick={onClick}
      className={cx(
        'text-left bg-white dark:bg-[#171A20] rounded-xl ring-1 p-4 transition-all hover:-translate-y-0.5 hover:shadow-sm',
        active ? 'ring-brand-400 dark:ring-brand-500' : 'ring-slate-200 dark:ring-white/10',
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[28px] leading-none font-semibold text-slate-900 dark:text-white tabular-nums">
          {value}
        </span>
        {accent && <span className={cx('w-2 h-2 rounded-full', accent)} />}
      </div>
      <div className="mt-2.5">
        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</div>
        <div className="text-xs text-slate-400">{en}</div>
      </div>
    </button>
  );
}

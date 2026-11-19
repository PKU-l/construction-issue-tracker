import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cx } from '../lib/util';
import { I } from '../lib/icons';

interface Props {
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}

export function Modal({ title, onClose, children, wide }: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-white/30 dark:bg-black/40 backdrop-blur-xl backdrop-saturate-150 overflow-y-auto backdrop-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="min-h-full flex items-start sm:items-center justify-center p-4 sm:p-8"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div
          className={cx(
            'bg-white/95 dark:bg-[#171A20]/95 rounded-2xl my-4',
            'shadow-[0_24px_70px_-16px_rgba(15,23,42,0.35)] dark:shadow-[0_24px_70px_-16px_rgba(0,0,0,0.6)]',
            'ring-1 ring-slate-200/70 dark:ring-white/10 modal-in',
            wide ? 'w-[94vw] max-w-[1400px]' : 'w-full max-w-md',
          )}
        >
          <div className="px-6 py-4 border-b border-slate-100 dark:border-white/5 flex justify-between items-center bg-white/70 dark:bg-[#171A20]/70 backdrop-blur-sm rounded-t-2xl">
            <h2 className="font-semibold text-slate-900 dark:text-white text-base tracking-tight">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition"
            >
              {I.x}
            </button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

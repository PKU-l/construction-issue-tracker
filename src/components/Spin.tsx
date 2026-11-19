import { cx } from '../lib/util';

export function Spin({ cls = '' }: { cls?: string }) {
  return (
    <span
      className={cx(
        'inline-block border-2 border-current border-t-transparent rounded-full animate-spin',
        cls || 'w-3.5 h-3.5',
      )}
    />
  );
}

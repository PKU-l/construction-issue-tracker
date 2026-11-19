export const cx = (
  ...a: Array<string | false | undefined | null | 0>
): string => a.filter(Boolean).join(' ');

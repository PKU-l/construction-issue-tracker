import type { ReactElement, ReactNode } from 'react';

export interface IconProps {
  d: ReactNode;
  cls?: string;
}

const Icon = ({ d, cls = 'w-5 h-5' }: IconProps) => (
  <svg
    className={cls}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.75}
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    {d}
  </svg>
);

type Icons = Record<string, ReactElement<IconProps>>;

export const I: Icons = {
  dash: (
    <Icon
      d={
        <>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </>
      }
    />
  ),
  issue: (
    <Icon
      d={
        <>
          <path d="M12 8v4" />
          <path d="M12 16h.01" />
          <circle cx="12" cy="12" r="9" />
        </>
      }
    />
  ),
  draw: (
    <Icon
      d={
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8M8 17h5" />
        </>
      }
    />
  ),
  report: (
    <Icon
      d={
        <>
          <path d="M3 3v18h18" />
          <path d="M7 15l4-4 3 3 5-6" />
        </>
      }
    />
  ),
  settings: (
    <Icon
      d={
        <>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-2.82 1.17V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15H4a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 6 9.4l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 12 4.6V4a2 2 0 0 1 4 0v.09A1.65 1.65 0 0 0 19 6l.06.06a2 2 0 1 1 2.83 2.83L21 9a1.65 1.65 0 0 0-.33 1.82V11a2 2 0 0 1 0 4z" />
        </>
      }
    />
  ),
  users: (
    <Icon
      d={
        <>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </>
      }
    />
  ),
  search: (
    <Icon
      d={
        <>
          <circle cx="11" cy="11" r="8" />
          <path d="M21 21l-4.3-4.3" />
        </>
      }
    />
  ),
  plus: <Icon d={<path d="M12 5v14M5 12h14" />} />,
  down: (
    <Icon
      d={
        <>
          <path d="M12 3v12M7 10l5 5 5-5" />
          <path d="M5 21h14" />
        </>
      }
    />
  ),
  sun: (
    <Icon
      d={
        <>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
      }
    />
  ),
  moon: <Icon d={<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />} />,
  bell: (
    <Icon
      d={
        <>
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </>
      }
    />
  ),
  chevL: <Icon d={<path d="M15 18l-6-6 6-6" />} />,
  clock: (
    <Icon
      d={
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </>
      }
    />
  ),
  paper: (
    <Icon
      d={
        <>
          <path d="M21.44 11.05l-9.19 9.19a5 5 0 0 1-7.07-7.07l9.19-9.19a3 3 0 0 1 4.24 4.24l-9.2 9.19a1 1 0 0 1-1.41-1.41l8.49-8.49" />
        </>
      }
    />
  ),
  logout: (
    <Icon
      d={
        <>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <path d="M16 17l5-5-5-5M21 12H9" />
        </>
      }
    />
  ),
  filter: <Icon d={<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />} />,
  x: <Icon d={<path d="M18 6L6 18M6 6l12 12" />} />,
};

export type IconKey = keyof typeof I;

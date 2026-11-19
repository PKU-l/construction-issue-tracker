import type { Role } from './types';

export interface Perm {
  add: boolean;
  edit: boolean;
  del: boolean;
  status: boolean;
  export: boolean;
  users: boolean;
}

export const PERM: Record<Role, Perm> = {
  admin:    { add: true,  edit: true,  del: true,  status: true,  export: true, users: true  },
  engineer: { add: true,  edit: true,  del: false, status: true,  export: true, users: false },
  readonly: { add: false, edit: false, del: false, status: false, export: true, users: false },
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: '管理员 Admin',
  engineer: '工程师 Engineer',
  readonly: '只读 Read-only',
};

export const ROLE_DOT: Record<Role, string> = {
  admin: 'bg-rose-500',
  engineer: 'bg-brand-500',
  readonly: 'bg-slate-400',
};

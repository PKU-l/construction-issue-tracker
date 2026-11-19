import type {
  DIAckStatus,
  DICategory,
  DIResponseDraft,
  DIRisk,
  DIStatus,
  DrawingDraft,
  DrawingIssueDraft,
  DrawingSpecialty,
  DrawingStatus,
  IssueDraft,
  IssueStatus,
} from './types';

export const SOURCES = ['业主', 'CTC', '监理'] as const;
export const STYPES = ['会议纪要', '检查', '信函'] as const;
export const SPECS = ['结构', 'MEP', '土建', '其他'] as const;
export const STATUSES: IssueStatus[] = ['待处理', '处理中', '待审核', '已关闭'];

export interface StatusStyle {
  en: string;
  text: string;
  bg: string;
  ring: string;
  dot: string;
  bar: string;
}

export const ST: Record<IssueStatus, StatusStyle> = {
  '待处理': {
    en: 'Open',
    text: 'text-rose-700 dark:text-rose-300',
    bg:   'bg-rose-50 dark:bg-rose-500/10',
    ring: 'ring-rose-200 dark:ring-rose-500/20',
    dot:  'bg-rose-500',
    bar:  'bg-rose-400',
  },
  '处理中': {
    en: 'In Progress',
    text: 'text-blue-700 dark:text-blue-300',
    bg:   'bg-blue-50 dark:bg-blue-500/10',
    ring: 'ring-blue-200 dark:ring-blue-500/20',
    dot:  'bg-blue-500',
    bar:  'bg-blue-400',
  },
  '待审核': {
    en: 'Under Review',
    text: 'text-amber-700 dark:text-amber-300',
    bg:   'bg-amber-50 dark:bg-amber-500/10',
    ring: 'ring-amber-200 dark:ring-amber-500/20',
    dot:  'bg-amber-500',
    bar:  'bg-amber-400',
  },
  '已关闭': {
    en: 'Closed',
    text: 'text-emerald-700 dark:text-emerald-300',
    bg:   'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-200 dark:ring-emerald-500/20',
    dot:  'bg-emerald-500',
    bar:  'bg-emerald-400',
  },
};

// ─── Drawings ────────────────────────────────────────────────────

export const DRAWING_SPECS: DrawingSpecialty[] = [
  '建筑', '结构', '机电', '电气', '给排水', '暖通', '土建', '岩土', '设备', '其他',
];

// 起步建议列表(自动补全用) —— 用户可以随意增删,输入过的值会自动加入建议
export const DRAWING_BUILDING_SUGGESTIONS: string[] = [
  '筒仓', '工作塔', '发放塔', '变配电间', '空压机房', '综合楼', '总平面',
];

export const DRAWING_STATUSES: DrawingStatus[] = ['current', 'superseded', 'obsolete'];

export const DRAWING_STATUS_LABEL: Record<DrawingStatus, string> = {
  current: '现行 · Current',
  superseded: '被替代 · Superseded',
  obsolete: '作废 · Obsolete',
};

export const DRAWING_STATUS_STYLE: Record<DrawingStatus, { text: string; bg: string; ring: string; dot: string }> = {
  current: {
    text: 'text-emerald-700 dark:text-emerald-300',
    bg:   'bg-emerald-50 dark:bg-emerald-500/10',
    ring: 'ring-emerald-200 dark:ring-emerald-500/20',
    dot:  'bg-emerald-500',
  },
  superseded: {
    text: 'text-amber-700 dark:text-amber-300',
    bg:   'bg-amber-50 dark:bg-amber-500/10',
    ring: 'ring-amber-200 dark:ring-amber-500/20',
    dot:  'bg-amber-500',
  },
  obsolete: {
    text: 'text-slate-500 dark:text-slate-400',
    bg:   'bg-slate-100 dark:bg-white/5',
    ring: 'ring-slate-200 dark:ring-white/10',
    dot:  'bg-slate-400',
  },
};

// ─── Drawing Issues ──────────────────────────────────────────────

export const DI_CATEGORIES: DICategory[] = [
  '图纸错误', '图纸冲突', '图纸缺失', '现场无法施工',
  '设计优化', '深化设计', '设计变更', 'RFI',
];

export const DI_RISK_LEVELS: DIRisk[] = ['低', '中', '高', '紧急'];

export const DI_STATUSES: DIStatus[] = ['草稿', '提出', '处理中', '等外部回复', '已关闭'];

export const DI_STATUS_STYLE: Record<DIStatus, { text: string; bg: string; ring: string; dot: string; bar: string }> = {
  '草稿':      { text: 'text-slate-600 dark:text-slate-300',   bg: 'bg-slate-100 dark:bg-white/5',        ring: 'ring-slate-200 dark:ring-white/10',        dot: 'bg-slate-400',   bar: 'bg-slate-300' },
  '提出':      { text: 'text-rose-700 dark:text-rose-300',     bg: 'bg-rose-50 dark:bg-rose-500/10',      ring: 'ring-rose-200 dark:ring-rose-500/20',      dot: 'bg-rose-500',    bar: 'bg-rose-400' },
  '处理中':    { text: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-50 dark:bg-blue-500/10',      ring: 'ring-blue-200 dark:ring-blue-500/20',      dot: 'bg-blue-500',    bar: 'bg-blue-400' },
  '等外部回复': { text: 'text-amber-700 dark:text-amber-300',   bg: 'bg-amber-50 dark:bg-amber-500/10',    ring: 'ring-amber-200 dark:ring-amber-500/20',    dot: 'bg-amber-500',   bar: 'bg-amber-400' },
  '已关闭':    { text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10', ring: 'ring-emerald-200 dark:ring-emerald-500/20', dot: 'bg-emerald-500', bar: 'bg-emerald-400' },
};

export const DI_RISK_STYLE: Record<DIRisk, { text: string; bg: string }> = {
  '低':   { text: 'text-slate-600 dark:text-slate-300',   bg: 'bg-slate-100 dark:bg-white/5' },
  '中':   { text: 'text-blue-700 dark:text-blue-300',     bg: 'bg-blue-50 dark:bg-blue-500/10' },
  '高':   { text: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  '紧急': { text: 'text-rose-700 dark:text-rose-300',     bg: 'bg-rose-50 dark:bg-rose-500/10' },
};

// ─── DI Responses ────────────────────────────────────────────────

export const DI_ACK_STATUSES: DIAckStatus[] = ['pending', 'accepted', 'rejected'];

export const DI_ACK_LABEL: Record<DIAckStatus, string> = {
  pending:  '待确认 · Pending',
  accepted: '已接受 · Accepted',
  rejected: '已驳回 · Rejected',
};

export const DI_ACK_STYLE: Record<DIAckStatus, { text: string; bg: string; ring: string; dot: string }> = {
  pending:  { text: 'text-amber-700 dark:text-amber-300',    bg: 'bg-amber-50 dark:bg-amber-500/10',    ring: 'ring-amber-200 dark:ring-amber-500/20',    dot: 'bg-amber-500' },
  accepted: { text: 'text-emerald-700 dark:text-emerald-300', bg: 'bg-emerald-50 dark:bg-emerald-500/10', ring: 'ring-emerald-200 dark:ring-emerald-500/20', dot: 'bg-emerald-500' },
  rejected: { text: 'text-rose-700 dark:text-rose-300',      bg: 'bg-rose-50 dark:bg-rose-500/10',      ring: 'ring-rose-200 dark:ring-rose-500/20',      dot: 'bg-rose-500' },
};

export const DI_RESPONSE_BLANK: DIResponseDraft = {
  party: '',
  person: '',
  response_date: new Date().toISOString().slice(0, 10),
  ref_no: '',
  content: '',
  attachments: [],
  ack_status: 'pending',
  ack_note: '',
};

// ─── DI (below) ──────────────────────────────────────────────────

export const DI_BLANK: DrawingIssueDraft = {
  drawing_id: null,
  drawing_no_snapshot: '',
  revision_snapshot: '',
  specialty: '其他',
  category: '图纸错误',
  risk_level: '中',
  title: '',
  location: '',
  description: '',
  impact: '',
  responsible_party: '',
  waiting_on: '',
  date_raised: new Date().toISOString().slice(0, 10),
  date_due: null,
  status: '草稿',
  local_ref: '',
  attachments: [],
};

// ─── Drawings block (below) ──────────────────────────────────────

export const DRAWING_BLANK: DrawingDraft = {
  drawing_no: '',
  title: '',
  specialty: '其他',
  building: '',
  revision: '00',
  revision_date: null,
  status: 'current',
  file_name: '',
  file_path: '',
  file_url: '',
  notes: '',
};

// ─── Original issue BLANK (kept below drawings block) ────────────

export const BLANK: IssueDraft = {
  source: '',
  source_type: '',
  specialty: '',
  date_raised: '',
  date_due: '',
  responsible_party: '',
  description: '',
  response: '',
  status: '待处理',
  attachments: [],
};

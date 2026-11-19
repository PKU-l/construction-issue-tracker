export type Role = 'admin' | 'engineer' | 'readonly';

export type IssueStatus = '待处理' | '处理中' | '待审核' | '已关闭';

export interface User {
  id: string;
  username: string;
  password_hash: string;
  salt: string;
  role: Role;
  display_name: string | null;
  created_at: string;
}

export interface Attachment {
  name: string;
  url?: string;
  path?: string;
  _file?: File;
  _local?: boolean;
}

export interface Issue {
  id: string;
  seq: number;
  source: string;
  source_type: string;
  specialty: string;
  date_raised: string;
  date_due: string;
  responsible_party: string;
  description: string;
  response: string;
  status: IssueStatus;
  attachments: Attachment[];
  created_at?: string;
  updated_at?: string;
}

export type IssueDraft = Omit<Issue, 'id' | 'seq' | 'created_at' | 'updated_at'>;

export interface FilterState {
  status: '' | IssueStatus;
  source: string;
  specialty: string;
  q: string;
}

// ─── Drawings ────────────────────────────────────────────────────

export type DrawingStatus = 'current' | 'superseded' | 'obsolete';

export type DrawingSpecialty =
  | '建筑'
  | '结构'
  | '机电'
  | '电气'
  | '给排水'
  | '暖通'
  | '土建'
  | '岩土'
  | '设备'
  | '其他';

// building 由用户自定义,不再是固定枚举
export type DrawingBuilding = string;

export interface Drawing {
  id: string;
  drawing_no: string;
  title: string;
  specialty: DrawingSpecialty;
  building: DrawingBuilding;
  revision: string;
  revision_date: string | null;
  status: DrawingStatus;
  file_name: string;
  file_path: string;
  file_url: string;
  uploaded_by: string | null;
  uploaded_at: string;
  notes: string;
}

export type DrawingDraft = Omit<Drawing, 'id' | 'uploaded_at' | 'uploaded_by'> & {
  _file?: File;
};

export interface DrawingFilterState {
  specialty: '' | DrawingSpecialty;
  building: '' | DrawingBuilding;
  status: '' | DrawingStatus;
  q: string;
}

// ─── Drawing Issues ──────────────────────────────────────────────

export type DIStatus = '草稿' | '提出' | '处理中' | '等外部回复' | '已关闭';

export type DICategory =
  | '图纸错误'
  | '图纸冲突'
  | '图纸缺失'
  | '现场无法施工'
  | '设计优化'
  | '深化设计'
  | '设计变更'
  | 'RFI';

export type DIRisk = '低' | '中' | '高' | '紧急';

export interface TimelineEntry {
  ts: string;                                   // ISO
  actor_id: string | null;
  actor_name: string;
  kind: 'create' | 'status' | 'edit' | 'link' | 'attach' | 'comment';
  from?: string;
  to?: string;
  note?: string;
}

export interface DrawingIssue {
  id: string;
  issue_no: string;
  drawing_id: string | null;
  drawing_no_snapshot: string;
  revision_snapshot: string;
  specialty: DrawingSpecialty;
  category: DICategory;
  risk_level: DIRisk;
  title: string;
  location: string;
  description: string;
  impact: string;
  responsible_party: string;
  waiting_on: string;
  date_raised: string;
  date_due: string | null;
  status: DIStatus;
  local_ref: string;
  attachments: Attachment[];
  timeline: TimelineEntry[];
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DrawingIssueDraft = Omit<
  DrawingIssue,
  'id' | 'issue_no' | 'created_by' | 'created_at' | 'updated_at' | 'timeline'
>;

export interface DrawingIssueFilterState {
  status: '' | DIStatus;
  specialty: '' | DrawingSpecialty;
  category: '' | DICategory;
  risk_level: '' | DIRisk;
  q: string;
}

// ─── DI Responses (官方回复) ─────────────────────────────────────

export type DIAckStatus = 'pending' | 'accepted' | 'rejected';

export interface DIResponse {
  id: string;
  drawing_issue_id: string;
  party: string;
  person: string;
  response_date: string;
  ref_no: string;
  content: string;
  attachments: Attachment[];
  ack_status: DIAckStatus;
  ack_note: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type DIResponseDraft = Omit<
  DIResponse,
  'id' | 'drawing_issue_id' | 'created_by' | 'created_at' | 'updated_at'
>;

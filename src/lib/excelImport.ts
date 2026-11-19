/**
 * Excel 导入工具:解析 drawings 工作表,自动映射列,产出 preview + warnings。
 * 用户可以在预览界面手动修正列映射,再批量入库。
 */

import * as XLSX from 'xlsx';
import { DRAWING_SPECS } from './enums';
import type { DrawingSpecialty, DrawingStatus } from './types';

export type DrawingField =
  | 'drawing_no'
  | 'title'
  | 'specialty'
  | 'building'
  | 'revision'
  | 'revision_date'
  | 'status'
  | 'notes';

export const DRAWING_FIELD_LABEL: Record<DrawingField, string> = {
  drawing_no: '图号 *',
  title: '图纸名称',
  specialty: '专业',
  building: '建筑单位',
  revision: '版本',
  revision_date: '版本日期',
  status: '状态',
  notes: '备注',
};

/** 自动识别 Excel 表头 → drawings 字段的正则。首个命中即用。 */
const HEADER_PATTERNS: Array<[DrawingField, RegExp]> = [
  ['drawing_no',    /^(图号|图纸编号|drawing[\s_-]?(no|number)|dwg[\s_-]?no|dwg[\s_-]?number)$/i],
  ['title',         /^(名称|图纸名称|标题|title|description|desc)$/i],
  ['specialty',     /^(专业|所属专业|specialty|discipline)$/i],
  ['building',      /^(建筑单位|建筑物|所属建筑|单体|部位|building|unit|structure)$/i],
  ['revision',      /^(版本|版次|rev|revision)$/i],
  ['revision_date', /^(日期|版本日期|签发日期|date|rev[\s_-]?date|revision[\s_-]?date)$/i],
  ['status',        /^(状态|status)$/i],
  ['notes',         /^(备注|说明|remark|remarks|notes|comment|comments)$/i],
];

export interface RawRow {
  [colName: string]: string | number | boolean | Date | null;
}

export interface ParsedRow {
  drawing_no: string;
  title: string;
  specialty: DrawingSpecialty;
  building: string;
  revision: string;
  revision_date: string | null;
  status: DrawingStatus;
  notes: string;
  _warnings: string[];
}

export interface ParseResult {
  columns: string[];                                // Excel 里检测到的列名
  detectedMapping: Partial<Record<DrawingField, string>>; // 字段 → 列名
  rawRows: RawRow[];
  totalRows: number;
}

export async function readExcel(file: File): Promise<ParseResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: 'array', cellDates: true });
  const first = wb.SheetNames[0];
  if (!first) throw new Error('工作簿里没有工作表');
  const sheet = wb.Sheets[first];
  const rows = XLSX.utils.sheet_to_json<RawRow>(sheet, { defval: '', raw: true });
  const columns = rows.length ? Object.keys(rows[0]).filter((c) => c && c !== '__EMPTY') : [];

  const detected: Partial<Record<DrawingField, string>> = {};
  for (const col of columns) {
    for (const [field, re] of HEADER_PATTERNS) {
      if (detected[field]) continue;
      if (re.test(col.trim())) {
        detected[field] = col;
        break;
      }
    }
  }

  return { columns, detectedMapping: detected, rawRows: rows, totalRows: rows.length };
}

/** 标准化专业:去掉多余空格,若匹配到我们的 10 类中之一则用,否则回退到"其他"并加 warning。 */
function normalizeSpecialty(raw: unknown): { value: DrawingSpecialty; warning?: string } {
  const s = String(raw ?? '').trim();
  if (!s) return { value: '其他' };
  const match = DRAWING_SPECS.find((x) => x === s || s.includes(x));
  if (match) return { value: match };
  // English fallback mapping
  const en: Record<string, DrawingSpecialty> = {
    ARC: '建筑', 'ARCHITECTURE': '建筑',
    STR: '结构', 'STRUCTURE': '结构', 'STRUCTURAL': '结构',
    MEP: '机电',
    ELE: '电气', 'ELECTRICAL': '电气',
    PLB: '给排水', 'PLUMBING': '给排水',
    HVAC: '暖通',
    CIV: '土建', 'CIVIL': '土建',
    GEO: '岩土', 'GEOTECH': '岩土', 'GEOTECHNICAL': '岩土',
    EQP: '设备', 'EQUIPMENT': '设备',
    OTH: '其他', 'OTHER': '其他',
  };
  const enHit = en[s.toUpperCase()];
  if (enHit) return { value: enHit };
  return { value: '其他', warning: `未知专业「${s}」,已归为「其他」` };
}

function normalizeStatus(raw: unknown): { value: DrawingStatus; warning?: string } {
  const s = String(raw ?? '').trim().toLowerCase();
  if (!s || s === 'current' || s === '现行' || s === '有效') return { value: 'current' };
  if (s === 'superseded' || s === '被替代' || s === '被取代') return { value: 'superseded' };
  if (s === 'obsolete' || s === '作废' || s === '废止') return { value: 'obsolete' };
  return { value: 'current', warning: `未知状态「${raw}」,已归为「current」` };
}

function normalizeDate(raw: unknown): string | null {
  if (!raw) return null;
  if (raw instanceof Date) return raw.toISOString().slice(0, 10);
  const s = String(raw).trim();
  if (!s) return null;
  // Try YYYY-MM-DD or YYYY/MM/DD or YYYY.MM.DD
  const m = s.match(/^(\d{4})[-./](\d{1,2})[-./](\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  // Try Excel serial number
  const n = Number(s);
  if (Number.isFinite(n) && n > 20_000 && n < 60_000) {
    const d = new Date(Date.UTC(1899, 11, 30) + n * 86_400_000);
    return d.toISOString().slice(0, 10);
  }
  return null;
}

export function projectRows(
  rawRows: RawRow[],
  mapping: Partial<Record<DrawingField, string>>,
): ParsedRow[] {
  return rawRows.map((r) => {
    const w: string[] = [];

    const drawing_no = String(r[mapping.drawing_no ?? ''] ?? '').trim();
    if (!drawing_no) w.push('缺失图号');

    const spec = normalizeSpecialty(r[mapping.specialty ?? '']);
    if (spec.warning) w.push(spec.warning);

    const building = String(r[mapping.building ?? ''] ?? '').trim(); // 自由文本,不校验

    const st = normalizeStatus(r[mapping.status ?? '']);
    if (st.warning) w.push(st.warning);

    const rev = String(r[mapping.revision ?? ''] ?? '').trim() || '00';
    const revision_date = normalizeDate(r[mapping.revision_date ?? '']);
    if (mapping.revision_date && r[mapping.revision_date] && !revision_date) {
      w.push(`日期「${r[mapping.revision_date]}」无法识别`);
    }

    return {
      drawing_no,
      title: String(r[mapping.title ?? ''] ?? '').trim(),
      specialty: spec.value,
      building,
      revision: rev,
      revision_date,
      status: st.value,
      notes: String(r[mapping.notes ?? ''] ?? '').trim(),
      _warnings: w,
    };
  });
}

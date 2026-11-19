import { sb } from './supabase';
import type { DrawingSpecialty } from './types';

/**
 * 生成图纸问题编号:DI-KHE-{专业中文}-{年}-{三位流水}
 * 例:DI-KHE-结构-2026-001
 * MVP 实现:查同 prefix 下最大 issue_no 再 +1。并发极端场景下可能撞号(unique 约束会兜底报错)。
 */
export async function generateIssueNo(specialty: DrawingSpecialty): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DI-KHE-${specialty}-${year}-`;
  const { data } = await sb
    .from('drawing_issues')
    .select('issue_no')
    .ilike('issue_no', `${prefix}%`)
    .order('issue_no', { ascending: false })
    .limit(1);
  const last = (data?.[0] as { issue_no?: string } | undefined)?.issue_no;
  const lastSeq = last ? parseInt(last.slice(prefix.length), 10) : 0;
  const nextSeq = Number.isFinite(lastSeq) ? lastSeq + 1 : 1;
  return `${prefix}${String(nextSeq).padStart(3, '0')}`;
}

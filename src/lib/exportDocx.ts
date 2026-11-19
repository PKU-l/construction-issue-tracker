/**
 * 图纸问题清单 .docx 导出。
 * 版式参考:施工单位“图纸问题清单”标准格式
 * 结构:抬头 → 一、问题汇总表 → 二、问题明细。
 * 附件仅列文件名(不嵌图);官方回复本轮不导(下一轮再加,先跑通主流程)。
 */

import {
  AlignmentType,
  BorderStyle,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  type IParagraphOptions,
} from 'docx';
import type { DrawingIssue } from './types';

import { BRAND } from './brand';
// 页宽约 9000 DXA(A4 减去左右页边距)。表格 3 列/4 列时的分配。
const PAGE_W = 9000;
const TABLE_COLS = [700, 1900, 4200, 2200] as const; // 序号 / 编号 / 问题概述 / 涉及建筑物·部位

function P(opts: IParagraphOptions | string): Paragraph {
  if (typeof opts === 'string') return new Paragraph({ children: [new TextRun({ text: opts })] });
  return new Paragraph(opts);
}

function R(text: string, bold = false, size = 22): TextRun {
  return new TextRun({ text, bold, size, font: 'Microsoft YaHei' });
}

function cell(children: Paragraph[], opts?: { width?: number; header?: boolean }): TableCell {
  return new TableCell({
    children,
    width: opts?.width ? { size: opts.width, type: WidthType.DXA } : undefined,
    shading: opts?.header
      ? { type: ShadingType.CLEAR, color: 'auto', fill: 'E8EEF5' }
      : undefined,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
  });
}

function headerCell(text: string, width: number): TableCell {
  return cell(
    [
      P({
        children: [R(text, true)],
        alignment: AlignmentType.CENTER,
      }),
    ],
    { width, header: true },
  );
}

function bodyCell(
  text: string,
  width: number,
  align: (typeof AlignmentType)[keyof typeof AlignmentType] = AlignmentType.LEFT,
): TableCell {
  return cell(
    [P({ children: [R(text || '')], alignment: align })],
    { width },
  );
}

/** 段落里加一个小标签 + 内容,同一行内。 */
function labeled(label: string, value: string): Paragraph {
  return P({
    children: [R(`${label}:`, true), R(` ${value || '—'}`)],
    spacing: { before: 60, after: 60 },
  });
}

function h1(text: string): Paragraph {
  return P({
    children: [R(text, true, 44)],
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    spacing: { before: 200, after: 200 },
  });
}

function h2(text: string): Paragraph {
  return P({
    children: [R(text, true, 30)],
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 200 },
  });
}

function h3(text: string): Paragraph {
  return P({
    children: [R(text, true, 26)],
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
  });
}

function centeredSub(text: string, bold = false): Paragraph {
  return P({
    children: [R(text, bold, 22)],
    alignment: AlignmentType.CENTER,
    spacing: { after: 100 },
  });
}

function paragraph(text: string): Paragraph {
  return P({
    children: [R(text || '')],
    spacing: { after: 120 },
  });
}

export interface ExportMeta {
  projectName?: string;      // 默认:环境变量 VITE_EXPORT_PROJECT_NAME
  organization?: string;     // 默认:环境变量 VITE_EXPORT_ORGANIZATION
  generatedBy?: string;      // 生成人显示名
}

const DEFAULT_META: Required<ExportMeta> = {
  projectName: BRAND.exportProjectName,
  organization: BRAND.exportOrganization,
  generatedBy: '',
};

export async function exportDrawingIssuesDocx(
  issues: DrawingIssue[],
  meta: ExportMeta = {},
): Promise<void> {
  const m = { ...DEFAULT_META, ...meta };
  const today = new Date().toISOString().slice(0, 10);

  const summaryTable = new Table({
    width: { size: PAGE_W, type: WidthType.DXA },
    columnWidths: [...TABLE_COLS],
    borders: {
      top:    { style: BorderStyle.SINGLE, size: 6, color: 'B6C2D2' },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: 'B6C2D2' },
      left:   { style: BorderStyle.SINGLE, size: 6, color: 'B6C2D2' },
      right:  { style: BorderStyle.SINGLE, size: 6, color: 'B6C2D2' },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: 'D8DEE7' },
      insideVertical:   { style: BorderStyle.SINGLE, size: 4, color: 'D8DEE7' },
    },
    rows: [
      new TableRow({
        tableHeader: true,
        children: [
          headerCell('序号', TABLE_COLS[0]),
          headerCell('编号', TABLE_COLS[1]),
          headerCell('问题概述', TABLE_COLS[2]),
          headerCell('涉及建筑物 / 部位', TABLE_COLS[3]),
        ],
      }),
      ...issues.map((r, i) =>
        new TableRow({
          children: [
            bodyCell(String(i + 1), TABLE_COLS[0], AlignmentType.CENTER),
            bodyCell(r.issue_no, TABLE_COLS[1], AlignmentType.CENTER),
            bodyCell(r.title || r.description || '(无描述)', TABLE_COLS[2]),
            bodyCell(r.location || '—', TABLE_COLS[3]),
          ],
        }),
      ),
    ],
  });

  const detailBlocks: Paragraph[] = [];
  issues.forEach((r, i) => {
    detailBlocks.push(h3(`问题${chineseNum(i + 1)}: ${r.title || '(无标题)'}`));

    // Meta line
    detailBlocks.push(
      P({
        children: [
          R('编号 ', true),
          R(`${r.issue_no}    `),
          R('专业 ', true),
          R(`${r.specialty}    `),
          R('分类 ', true),
          R(`${r.category}    `),
          R('风险 ', true),
          R(`${r.risk_level}    `),
          R('状态 ', true),
          R(r.status),
        ],
        spacing: { after: 80 },
      }),
    );

    if (r.location) detailBlocks.push(labeled('涉及建筑物 / 部位', r.location));
    if (r.drawing_no_snapshot)
      detailBlocks.push(
        labeled(
          '关联图纸',
          `${r.drawing_no_snapshot} Rev.${r.revision_snapshot || '—'}`,
        ),
      );

    if (r.description) {
      detailBlocks.push(P({ children: [R('问题描述:', true)], spacing: { before: 100 } }));
      for (const line of r.description.split(/\n+/)) {
        detailBlocks.push(paragraph(line));
      }
    }

    if (r.impact) {
      detailBlocks.push(P({ children: [R('影响评估:', true)], spacing: { before: 80 } }));
      for (const line of r.impact.split(/\n+/)) {
        detailBlocks.push(paragraph(line));
      }
    }

    if (r.responsible_party || r.waiting_on) {
      detailBlocks.push(
        P({
          children: [
            R('责任单位 ', true),
            R(`${r.responsible_party || '—'}    `),
            R('等待处理方 ', true),
            R(r.waiting_on || '—'),
          ],
          spacing: { before: 80, after: 60 },
        }),
      );
    }

    if (r.date_raised || r.date_due) {
      detailBlocks.push(
        P({
          children: [
            R('提出日期 ', true),
            R(`${r.date_raised || '—'}    `),
            R('截止日期 ', true),
            R(r.date_due || '—'),
          ],
          spacing: { after: 60 },
        }),
      );
    }

    if (r.local_ref) detailBlocks.push(labeled('本地档案', r.local_ref));

    const atts = r.attachments || [];
    if (atts.length > 0) {
      detailBlocks.push(P({ children: [R('附件:', true)], spacing: { before: 80 } }));
      atts.forEach((a) => {
        detailBlocks.push(
          P({ children: [R(`  · ${a.name}`)], spacing: { after: 40 } }),
        );
      });
    }

    // Separator
    detailBlocks.push(
      P({
        children: [R('')],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D8DEE7', space: 1 },
        },
        spacing: { before: 100, after: 200 },
      }),
    );
  });

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Microsoft YaHei', size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1000, right: 1000, bottom: 1000, left: 1000 },
          },
        },
        children: [
          h1('图纸问题清单'),
          centeredSub(m.projectName, true),
          centeredSub(m.organization),
          centeredSub(
            `生成日期 ${today}${m.generatedBy ? ` · 生成人 ${m.generatedBy}` : ''} · 共 ${issues.length} 条`,
          ),
          P({ children: [R('')], spacing: { after: 200 } }),

          h2('一、问题汇总表'),
          summaryTable,

          h2('二、问题明细'),
          ...(detailBlocks.length > 0
            ? detailBlocks
            : [paragraph('(无问题记录)')]),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `图纸问题清单_${today}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function chineseNum(n: number): string {
  const digits = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  if (n < 10) return digits[n];
  if (n < 20) return n === 10 ? '十' : `十${digits[n - 10]}`;
  if (n < 100) {
    const tens = Math.floor(n / 10);
    const ones = n % 10;
    return `${digits[tens]}十${ones ? digits[ones] : ''}`;
  }
  return String(n);
}

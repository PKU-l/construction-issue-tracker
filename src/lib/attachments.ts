/**
 * 附件工具:客户端图片压缩 + 大小校验 + Supabase Storage 上传。
 * 目标:手机相机 5-8 MB 的 JPG 压到 300-800 KB,大约 10× 空间节省,肉眼看不出质量差别。
 */

import { sb } from './supabase';
import type { Attachment } from './types';

const COMPRESSIBLE = /^image\/(jpe?g|png|webp|bmp|tiff?)$/i;
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB 单文件上限(压缩后)

export function sizeStr(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/**
 * 若是可压缩图片,缩到最长边 <= maxSide,重编码为 JPEG。
 * 其它类型(PDF / DOC / GIF / SVG)原样返回。
 */
export async function compressImage(
  file: File,
  maxSide = 2000,
  quality = 0.82,
): Promise<File> {
  if (!COMPRESSIBLE.test(file.type)) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const longest = Math.max(img.width, img.height);
    const scale = longest > maxSide ? maxSide / longest : 1;
    const w = Math.round(img.width * scale);
    const h = Math.round(img.height * scale);
    // 如果已经很小(小于 500 KB 且尺寸也在范围内),直接不压
    if (scale === 1 && file.size < 500 * 1024 && /jpe?g/i.test(file.type)) return file;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return file;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob((b) => r(b), 'image/jpeg', quality));
    if (!blob) return file;
    const newName = file.name.replace(/\.(png|webp|bmp|tiff?)$/i, '.jpg');
    return new File([blob], newName, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}

const ASCII_SAFE = /[^\w\-.]/g;
function safe(s: string, fallback: string): string {
  const clean = s.replace(/\s+/g, '_').replace(ASCII_SAFE, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '');
  return clean || fallback;
}

/**
 * 通用上传:压缩(若适用)→ 尺寸校验 → Supabase Storage → 返回 Attachment。
 * `dir` 是桶内前缀,已由调用者拼好(e.g. "IQ-042" / "STR-101/00")。
 */
export async function uploadAttachment(
  bucket: 'attachments' | 'drawings',
  dir: string,
  file: File,
): Promise<Attachment> {
  const compressed = await compressImage(file);
  if (compressed.size > MAX_BYTES) {
    throw new Error(`文件太大(${sizeStr(compressed.size)}),单文件上限 ${sizeStr(MAX_BYTES)}`);
  }
  const path = `${safe(dir, 'misc')}/${Date.now()}_${safe(compressed.name, 'file')}`;
  const { error } = await sb.storage
    .from(bucket)
    .upload(path, compressed, { cacheControl: '3600', upsert: false });
  if (error) throw new Error(`[上传] ${error.message}`);
  const { data } = sb.storage.from(bucket).getPublicUrl(path);
  return { name: file.name, url: data.publicUrl, path };
}

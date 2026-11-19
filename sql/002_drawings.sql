-- ═══════════════════════════════════════════════════════════════
-- 002_drawings.sql — 图纸库(drawings)+ Storage 桶
-- 在 Supabase → SQL Editor 里跑一次即可。幂等安全,可重复执行。
-- ═══════════════════════════════════════════════════════════════

-- 1. 图纸表
create table if not exists public.drawings (
  id            uuid primary key default gen_random_uuid(),
  drawing_no    text not null,                               -- 图号,自由填写(如 STR-101、A-3F-001)
  title         text not null default '',                    -- 图纸名称
  specialty     text not null default '其他'
                 check (specialty in
                   ('建筑','结构','机电','电气','给排水','暖通','土建','岩土','设备','其他')),
  revision      text not null default '00',                  -- 版本号,自由填写(00 / 01 / A / B 都行)
  revision_date date,                                        -- 版本日期(可空)
  status        text not null default 'current'
                 check (status in ('current','superseded','obsolete')),
  file_name     text not null default '',                    -- 原始文件名
  file_path     text not null default '',                    -- Storage 内路径
  file_url      text not null default '',                    -- 公开 URL
  uploaded_by   uuid references public.users(id) on delete set null,
  uploaded_at   timestamptz not null default now(),
  notes         text not null default '',
  unique (drawing_no, revision)                              -- 同图号 + 同版本禁止重复
);

create index if not exists drawings_drawing_no_idx on public.drawings (drawing_no);
create index if not exists drawings_specialty_idx on public.drawings (specialty);
create index if not exists drawings_status_idx    on public.drawings (status);

-- 2. RLS —— 与 issues/users 模式一致,anon key 完全读写
alter table public.drawings enable row level security;

drop policy if exists "drawings_all_anon" on public.drawings;
create policy "drawings_all_anon"
  on public.drawings
  for all
  to anon, authenticated
  using (true)
  with check (true);

-- 3. Storage 桶
insert into storage.buckets (id, name, public)
  values ('drawings', 'drawings', true)
  on conflict (id) do nothing;

-- 4. Storage RLS —— anon 可上传下载(需要下载 = 公开可读)
drop policy if exists "drawings_bucket_read"   on storage.objects;
drop policy if exists "drawings_bucket_write"  on storage.objects;
drop policy if exists "drawings_bucket_delete" on storage.objects;

create policy "drawings_bucket_read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'drawings');

create policy "drawings_bucket_write"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'drawings');

create policy "drawings_bucket_delete"
  on storage.objects for delete
  to anon, authenticated
  using (bucket_id = 'drawings');

-- 5. 验证
select column_name, data_type from information_schema.columns
  where table_schema='public' and table_name='drawings'
  order by ordinal_position;

select id, name, public from storage.buckets where id='drawings';

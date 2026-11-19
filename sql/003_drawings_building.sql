-- 003_drawings_building.sql
-- 给 drawings 表加"建筑单位"字段。8 个默认值,可后续追加。
-- 幂等,可重复执行。

alter table public.drawings
  add column if not exists building text not null default '其他'
    check (building in ('筒仓','工作塔','发放塔','变配电间','空压机房','综合楼','总平面','其他'));

create index if not exists drawings_building_idx on public.drawings (building);

-- 验证
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='drawings' and column_name='building';

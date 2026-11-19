-- 004_drawings_building_free.sql
-- 把 drawings.building 从固定枚举改成自由文本,由用户自定义。
-- 已录入的数据保留原样(其他/筒仓/工作塔等)。
-- 幂等,可重复执行。

-- 1. 去掉 check 约束(如果存在)
alter table public.drawings drop constraint if exists drawings_building_check;

-- 2. 把默认值改成空字符串(用户新增时自己填)
alter table public.drawings alter column building set default '';

-- 3. 索引保留(用于过滤)

-- 验证
select column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='drawings' and column_name='building';

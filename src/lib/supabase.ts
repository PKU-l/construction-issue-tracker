import { createClient } from '@supabase/supabase-js';

// 连接信息从环境变量读取：本地放在 .env.local，部署时在托管平台设置同名变量
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('缺少 Supabase 配置：请参照 .env.example 创建 .env.local');
}

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

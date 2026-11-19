/**
 * 项目品牌信息：全部从环境变量读取(写在本地 .env.local，不提交到仓库)。
 * 开源代码里只有通用默认值；部署到 Netlify 时在站点环境变量里设置同名变量即可。
 */
const env = import.meta.env;
const v = (k: string, d: string) => ((env[k] as string | undefined) ?? '').trim() || d;

export const BRAND = {
  /** 项目名称(登录页大标题、顶栏面包屑) */
  projectTitle: v('VITE_PROJECT_TITLE', 'Silo Project'),
  /** 侧栏短名 */
  shortTitle: v('VITE_PROJECT_SHORT', 'Silo Project'),
  /** 登录页左上角单位名称 */
  orgLine: v('VITE_ORG_LINE', 'Construction Management'),
  /** 登录页左上角徽标文字(2 个字母) */
  orgBadge: v('VITE_ORG_BADGE', 'CM'),
  /** 登录页底部地点/工法说明 */
  footer: v('VITE_PROJECT_FOOTER', 'Slipform Construction'),
  /** 登录页背景图(放在 public/ 下的文件名，如 /hero.png)；不设置时用纯色渐变 */
  heroImage: v('VITE_HERO_IMAGE', ''),
  /** 导出 Excel 文件名后缀 */
  excelSuffix: v('VITE_EXCEL_SUFFIX', ''),
  /** 导出 Word 抬头：项目名称、单位 */
  exportProjectName: v('VITE_EXPORT_PROJECT_NAME', '某粮仓工程项目'),
  exportOrganization: v('VITE_EXPORT_ORGANIZATION', ''),
};

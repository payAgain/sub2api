# Sub2API UI 重设计交付记录

## 实施范围

- 统一工作纸外壳、232px 侧栏、紧凑顶栏、内容标题与主操作。
- 重排首页及登录/注册等认证页共享框架；自定义首页、配置站名/Logo、所有认证选项照旧。
- 重做模型广场连续卡片网格，移除价格内层卡片、系列胶囊和营销英文；保留卡片/表格切换、模型复制、完整计费详情、刷新及自动重验证。
- 用户和管理员仪表盘采用分栏数据带，快捷入口与最近用量改为文字操作行；图表使用克制配色。
- API Keys、账号和分组页共用统一标题、操作、筛选与表格结构，手机筛选按两列排布；其他表格页同步接入新标题体系。
- 重做表格手机字段布局、选择器、分页、统计组件和对话框表面；设置采用下划线页签与说明/字段双栏。
- 未更改依赖、后端、认证、路由、模型名、定价或来源目录逻辑。没有虚构数据、SSH、部署、推送、暂存或提交。

## 验证

所有命令均在 `frontend/` 执行。

1. `node node_modules/vue-tsc/bin/vue-tsc.js --noEmit`：通过。
2. `node node_modules/vitest/vitest.mjs run` 加下列相关现有测试路径：97 个文件，689 项通过，0 失败。
3. `node node_modules/eslint/bin/eslint.js <本次改动的 .vue/.ts/.js 路径>`：50 个源文件通过，无警告或错误；最后两处响应式类名修改另行通过目标 ESLint。
4. `npx --yes pnpm@9 run build --outDir dist`：因 registry.npmjs.org DNS `ENOTFOUND` 失败，离线版本查询亦未命中 npm 元数据缓存。随后确认本地 npx 包缓存 pnpm **9.15.9**，直接运行它的同一 `run build --outDir dist` 脚本（把其 `.bin` 加入该子进程 PATH），构建通过。
5. `git diff --check`：通过。
6. 对比 HEAD 与工作区：Accounts、Groups、Settings、Keys、两种 Usage、Login、ModelPlazaContent、ModelPlazaView 共 9 个关键文件的 `<script>`、`v-model` 与事件绑定完全一致。

完整测试命令：

```sh
node node_modules/vitest/vitest.mjs run   src/components/modelPlaza   src/components/common/__tests__   src/components/layout/__tests__   src/components/user/dashboard/__tests__   src/components/keys/__tests__   src/components/admin/usage/__tests__/UsageStatsCards.spec.ts   src/components/charts/__tests__/TokenUsageTrend.spec.ts   src/views/__tests__/HomeView.compact.spec.ts   src/views/__tests__/ModelPlazaView.refresh.spec.ts   src/views/auth/__tests__/LoginView.spec.ts   src/views/admin/__tests__   src/views/user/__tests__/KeysView.spec.ts   src/views/user/__tests__/UsageView.spec.ts   src/router/__tests__   src/i18n/__tests__/localeKeyCompleteness.spec.ts
```

构建等效命令（本机缓存路径）：

```sh
PATH="/Users/yimingd/.npm/_npx/b459ee211a1a5fd9/node_modules/.bin:$PATH" node /Users/yimingd/.npm/_npx/b459ee211a1a5fd9/node_modules/pnpm/bin/pnpm.cjs run build --outDir dist
```

## 交接注意

- **浏览器视觉验收待父代理完成**：1440px / 768px / iPhone 宽度、浅色和深色，重点检查导航折叠、长模型 ID、密集账号列表和长设置表单。本轮没有运行截图检查，不能将类型检查或单元测试视为视觉验收。
- 默认 Vite 构建目录是 `backend/internal/web/dist`。为了严格遵守前端限定范围，本轮以 `--outDir dist` 输出到 `frontend/dist`，没有修改 Vite 配置或后端文件。
- 构建保留现有环境警告：Browserslist 数据过期、混合动态/静态导入提示、Accounts chunk 超过 500kB；未扩展到打包性能改造。
- `.gitignore` 的 `docs/*` 会忽略本目录。设计文档实际已创建，父代理后续提交时需显式纳入；本轮没有执行 git add/commit。
- 日志：`/tmp/astra-ui-tests.json`、`/tmp/astra-ui-tests.log`、`/tmp/astra-ui-build.log`。

## 精确改动文件

新增：

```text
frontend/src/components/layout/PageHeading.vue
frontend/src/composables/usePageHeading.ts
frontend/src/styles/console.css
docs/design/astra-ui-overhaul.md
docs/design/astra-ui-overhaul-validation.md
```

修改：

```text
frontend/src/components/admin/usage/UsageStatsCards.vue
frontend/src/components/charts/TokenUsageTrend.vue
frontend/src/components/common/BaseDialog.vue
frontend/src/components/common/DataTable.vue
frontend/src/components/common/Pagination.vue
frontend/src/components/common/SearchInput.vue
frontend/src/components/common/Select.vue
frontend/src/components/common/StatCard.vue
frontend/src/components/keys/EndpointPopover.vue
frontend/src/components/layout/AppHeader.vue
frontend/src/components/layout/AppLayout.vue
frontend/src/components/layout/AppSidebar.vue
frontend/src/components/layout/AuthLayout.vue
frontend/src/components/layout/TablePageLayout.vue
frontend/src/components/modelPlaza/ModelPlazaContent.vue
frontend/src/components/modelPlaza/PlazaNavBar.vue
frontend/src/components/user/dashboard/UserDashboardCharts.vue
frontend/src/components/user/dashboard/UserDashboardQuickActions.vue
frontend/src/components/user/dashboard/UserDashboardRecentUsage.vue
frontend/src/components/user/dashboard/UserDashboardStats.vue
frontend/src/i18n/locales/en/common.ts
frontend/src/i18n/locales/zh/common.ts
frontend/src/style.css
frontend/src/views/HomeView.vue
frontend/src/views/ModelPlazaView.vue
frontend/src/views/admin/AccountsView.vue
frontend/src/views/admin/AnnouncementsView.vue
frontend/src/views/admin/AuditLogView.vue
frontend/src/views/admin/ChannelMonitorView.vue
frontend/src/views/admin/ChannelsView.vue
frontend/src/views/admin/DashboardView.vue
frontend/src/views/admin/GroupsView.vue
frontend/src/views/admin/PromoCodesView.vue
frontend/src/views/admin/ProxiesView.vue
frontend/src/views/admin/RedeemView.vue
frontend/src/views/admin/RiskControlView.vue
frontend/src/views/admin/SettingsView.vue
frontend/src/views/admin/SubscriptionsView.vue
frontend/src/views/admin/UsageView.vue
frontend/src/views/admin/UsersView.vue
frontend/src/views/admin/affiliates/AdminAffiliateRecordsTable.vue
frontend/src/views/auth/LoginView.vue
frontend/src/views/user/AvailableChannelsView.vue
frontend/src/views/user/BatchImageGuideView.vue
frontend/src/views/user/ChannelStatusV2View.vue
frontend/src/views/user/DashboardView.vue
frontend/src/views/user/KeysView.vue
frontend/src/views/user/UsageView.vue
frontend/tailwind.config.js
```

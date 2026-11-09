# dsh-model-tabs

> npm 包名：`@lycorisradiatax/dsh-model-tabs`
>
> 仓库名仍是 `dsh-model-tabs`；安装时使用上面的 scoped 包名。

把 DSH Web GUI 输入框下方的模型控件换成 **按 provider 分页（tab）+ 跨渠道搜索 + 推理强度**
的弹窗。每个 tab 一个渠道、列表各自独立滚动；触发按钮显示 `provider · model · effort`。

这是对内置模型位（`conversation.input.model`）的**整位替换**：在同一 `single` 槽以
`priority: -1` 注册，遮蔽内置的 priority 0，不需要禁用内置插件。

## 功能

- **Tab**：一个 provider 一个 tab（带模型数量），tab 栏可横向滚动；切 tab 时列表回到顶部。
- **独立滚动**：每个 tab 的列表是各自的 `overflow-y:auto` + `overscroll-behavior:contain`
  容器；弹层高度按按钮上方空间在 200–460px 间自适应。
- **搜索**：打开即聚焦搜索框，输入后跨全部渠道过滤（模型名 / 模型 id / 渠道名），结果行带
  渠道徽标；搜索时 tab 栏让位给结果列表。`Esc` 先清空搜索，再按一次关闭。
- **Effort**：高亮模型若声明了 `model.reasoning.efforts`，底部出现“推理强度”chips，当前值
  高亮；点 chip 用该模型 + 该强度直接提交（模型和强度一步选完）。
- **触发按钮**：`DeepSeek 账号 · deepseek-reasoner · 高`；未选择时显示“选择模型”。
- **角标**：`badge` 经 `locale.resolveText` 解析后显示在行尾（支持本地化文本）。
- **复用内置目录**：与 `/model` 弹窗共用 `ctx.modelDirectories` 和 `session.selectModel`，
  两边切换互相同步。
- **键盘**：搜索框 `↓` 进列表、`Enter` 选高亮项；tab 上 `←/→/Home/End` 切换；列表里
  `↑/↓` 移动、`Enter` 选中；`Esc` 关闭（有搜索词时先清搜索）；点外部关闭。
- 失败（如会话被其他窗口占用）时菜单保持打开并显示错误。
- 深/浅色主题用 CSS 系统色（`Canvas` / `CanvasText` / `Highlight` / `HighlightText`）。

## 环境要求

- **Node.js ≥ 20**（`engines.node`）。
- **DSH `>=0.2.2-rc.1 <0.3.0-0`**（`engines.dsh`）。
- 运行形态：`web` 与 `desktop`（两者都是同一个 Web Client）；headless / SDK / ACP / TUI
  没有 composer，装了也不会显示。

## 从零构建

```bash
npm ci            # 按 package-lock.json 安装，跨机器可复现
npm run typecheck
npm test          # build + 离线冒烟 + jsdom 交互
npm pack          # 生成 lycorisradiatax-dsh-model-tabs-0.2.0.tgz（prepack 会先构建）
```

构建产物：

- `lib/index.js`：host 半场，ESM，由 DSH Loader 加载；
- `lib/client.js`：浏览器半场，`window.__ModuleLoader__.load({ id, factory })` 闭包工厂格式；
- `lib/types/**/*.d.ts`：两半的类型声明。

`npm pack` 只带 `lib`、`cordis.patch.yml`、`README.md`、`LICENSE`、`package.json`。

## 安装

`dsh` 在 PATH 上时：

```bash
# 已发布到 npm 后
dsh plugin --profile <profile> add @lycorisradiatax/dsh-model-tabs

# 或安装本地 tgz
dsh plugin --profile <profile> add ./lycorisradiatax-dsh-model-tabs-0.2.0.tgz
dsh --profile <profile> --dump-config | grep model-tabs
dsh --profile <profile>
```

如果只装了桌面 App、没有全局 `dsh`，用 App 自带的 CLI：

- Windows：`%LOCALAPPDATA%\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd`
- macOS / Linux：App 资源目录下的 `resources/runtime/cli/bin/dsh`

装进桌面版使用的 profile（通常是 `desktop`）后需要重启 App。卸载：

```bash
dsh plugin --profile <profile> remove @lycorisradiatax/dsh-model-tabs
```

## 项目结构

```
dsh-model-tabs/
├── package.json          # dsh.bundle + dsh.client 清单，main/types/exports
├── cordis.patch.yml      # bundle 的配置层：插入 model-tabs 行
├── tsconfig.json         # 类型检查（noEmit）
├── tsconfig.types.json   # 只生成 d.ts
├── scripts/build.mjs     # host ESM + client loader bundle + 类型
├── src/
│   ├── index.ts          # host 半场（空 apply，仅为让 Loader 扫到本包）
│   └── client/
│       ├── index.tsx     # client 入口：inject + 注册座位
│       ├── ModelTabsSeat.tsx
│       ├── slot.ts       # 唯一的本地类型补充（见下）
│       └── styles.ts
├── lib/                  # 构建产物（npm pack 只带这些）
└── test/                 # 对构建产物的离线冒烟 + jsdom 交互测试
```

### Host 为什么是空的

浏览器半场只对“已启用的 Loader entry”下发。`src/index.ts` 的作用是让这个包进入插件树，
从而让 `dsh.client` 和 `exports["./client"]` 被发现；纯 UI 插件在 Node 侧没有事可做。
官方 `@deepseek-ai/dsh-client-ui-model-selection` 的 node 半场也是
`export function apply(): void {}` 这一形态。

### 类型来自官方包

`devDependencies` 里固定了 DSH **0.2.2-rc.1** 的官方包（该版本在 npm 的 `next` tag 下，
`latest` 仍是旧版，所以这里写死精确版本，避免装到旧契约）：

- `@deepseek-ai/dsh-client-ui-slots`
- `@deepseek-ai/dsh-client-ui-model-selection`
- `@deepseek-ai/dsh-api-session-controller`
- `@deepseek-ai/dsh-client-store`
- `@deepseek-ai/dsh-client-locale`
- `@deepseek-ai/dsh-session`
- `@deepseek-ai/dsh-api-remotes`
- `@deepseek-ai/dsh-llm`
- `@deepseek-ai/dsh-typert-protocol`
- `@deepseek-ai/cordis`

（后四个主要是官方声明文件解析所需；`npm ls --depth=0` 可直接核对。）

组件 props 是 `ModelSelectInjected & { locked: boolean }`：业务注入面、目录、选择、effort、
badge 等类型全部来自官方声明。

唯一的本地类型补充是 `src/client/slot.ts`：`conversation.input.model` 在运行时由
`ui-conversation` 声明，官方包内部也有这份契约，但公开的 `/client` 类型入口没有把该声明模块
带进来。这里只镜像这一条 `SlotMap` 成员（kind/scope/owner），让
`ctx.slots.inject/register` 通过官方 slot 注册表的类型检查。它是编译期声明，没有运行时代码，
也不复制任何业务类型。

### 构建如何产出 client bundle

`scripts/build.mjs`：

1. `tsc -p tsconfig.types.json` → `lib/types/**/*.d.ts`；
2. esbuild 把 `src/index.ts` 打成 ESM → `lib/index.js`；
3. esbuild 把 `src/client/index.tsx` 打成 CJS，再包进 loader 约定的闭包工厂：

```js
window.__ModuleLoader__.load({
  id: '@lycorisradiatax/dsh-model-tabs',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    /* esbuild 产物；require('react') 等走平台共享模块表 */
    return module.exports;
  },
});
```

只有 `react`、`react-dom`、`react/jsx-runtime` 是外部依赖，由宿主平台模块表提供，不内联。
官方 monorepo 的 `packages/client/tsdown.client.ts` 预设依赖仓库内的 assets/platform/scripts，
无法作为外部依赖引用；这里用 esbuild 复现了同一份公开的 loader 契约，构建是确定性的、跨平台
（esbuild 会安装对应平台的二进制）。

## 跨设备可复现

- 没有绝对路径、没有机器相关的脚本；
- `package-lock.json` 锁定全部 devDependencies（含 DSH 官方类型包与 esbuild）；
- `engines.node >= 20`；
- CI（`.github/workflows/ci.yml`）在 Node 20/22 上跑 `npm ci`、`typecheck`、`test`、`pack --dry-run`；
- 换机器只需要：`npm ci && npm run build && npm test && npm pack`，然后按上面的安装命令装进对应 profile。

## 工作原理

- `conversation.input.model` 是 `single` + `session` 槽；single 槽按 priority 升序取最低条目
  渲染，不同 priority 共存（相同 priority 才冲突），所以 `priority: -1` 可以接管渲染，而内置
  条目（priority 0）仍然存活，`/model` 命令继续工作。
- 目录与选择来自注入的 `ctx.modelDirectories`：`directory.store` 是
  `SnapshotStore<ModelDirectoryState>`，组件用 `useSyncExternalStore` 订阅；
  `directory.select()` 走与 `/model` 相同的提交路径。
- Effort 来自 `model.reasoning.efforts` / `defaultEffort`，提交到 `reasoningEffort`。
- 弹层用 `createPortal` 挂到 `document.body`，按触发按钮的 `getBoundingClientRect()`
  计算 `position: fixed`（优先向上展开），不受输入框容器 `overflow` 影响。

## 已知限制

- 搜索词不持久：每次打开都会重置。
- 推理强度只能从目录公布的值里选，没有任意输入；没有推理元数据的模型不显示 Effort 行。
- 内置条目声明的 `conversation.input.model.label` / `.options` 子槽不能被第二个条目重复声明，
  因此其他插件往这两个槽里加的东西在本控件下不生效。
- `/model` 命令弹窗仍是内置实现，不受影响。
- provider 的 tab 顺序按目录原始顺序，没有内置的“DeepSeek 账号优先”排序。
- 面板宽度上限 460px，高度按触发按钮上方/下方空间取 200–460px。

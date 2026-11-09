# dsh-model-tabs

> npm 包名：`@lycorisradiatax/dsh-model-tabs`
>
> 仓库名仍是 `dsh-model-tabs`；安装时使用上面的 scoped 包名。

把 DSH Web GUI 输入框下方的模型选择器换成按 provider 分页的弹窗：每个 provider 一个 tab，
支持跨渠道搜索、独立滚动和推理强度选择。触发按钮显示 `provider · model · effort`。

## 功能

- 每个 provider 一个 tab，列表各自独立滚动。
- 跨渠道搜索：模型名、模型 id、渠道名都可匹配，结果带渠道徽标。
- 推理强度 chips：选模型和 effort 一步完成。
- 与内置 `/model` 共用同一份目录，两边选择互相同步。
- 支持键盘操作、点外部关闭和深浅色主题。

## 环境要求

- Node.js ≥ 20
- DSH `>=0.2.2-rc.1 <0.3.0-0`
- `web` 或 `desktop`；headless / TUI 没有 composer，不会显示

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

## 说明

- `/model` 命令弹窗仍是内置实现，样式不受本插件影响，但两者共享同一份模型选择。
- provider 的 tab 顺序按目录原始顺序。
- 推理强度只能从模型声明里选择；没有推理元数据的模型不显示 Effort。

## 开发

```bash
npm ci
npm run typecheck
npm test
npm pack
```

`npm test` 会先构建，再运行离线冒烟和 jsdom 交互测试。

## License

MIT

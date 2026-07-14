# Plugin Publishing Layout

这份文档沉淀 Forge 当前可工作的发布方案，目标是把同一套结构复用到其他项目。

## 目标

- 同一个仓库同时支持 Codex 和 Claude Code 安装
- 安装方式走正式 marketplace，不依赖本地脚本
- 发布包自包含，不能引用仓库外路径

## 结论

正式 marketplace 必须指向 `plugins/<plugin-name>`，不能指向仓库根目录。

`plugins/<plugin-name>` 必须是完整发布工件，至少包含：

- `.codex-plugin/plugin.json`
- `.claude-plugin/plugin.json`
- `skills/`

如果 marketplace 指向仓库根目录：

- Codex 可能出现 marketplace 已添加，但 `plugin add` 找不到插件

如果发布包里的 manifest 引用 `../../skills` 之类的仓库外路径：

- Claude Code 会在缓存目录里报 `skills: Invalid input`

## 推荐目录

```text
repo/
├── marketplace.json                     # 仓库根入口（zcode 等以仓库根扫描的客户端）
├── .agents/
│   └── plugins/
│       └── marketplace.json
└── plugins/
    └── your-plugin/                     # 唯一的 source of truth + 发布态
        ├── .claude-plugin/
        │   ├── marketplace.json
        │   └── plugin.json
        ├── .codex-plugin/
        │   └── plugin.json
        └── skills/
            ├── foo/
            │   └── SKILL.md
            └── bar/
                └── SKILL.md
```

## Marketplace 写法

### Codex marketplace

```json
{
  "name": "your-plugin",
  "interface": {
    "displayName": "Your Plugin Marketplace"
  },
  "plugins": [
    {
      "name": "your-plugin",
      "version": "0.1.0",
      "source": {
        "source": "local",
        "path": "./plugins/your-plugin"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Engineering"
    }
  ]
}
```

### Claude marketplace

```json
{
  "name": "your-plugin",
  "description": "Short marketplace description",
  "owner": {
    "name": "Your Team"
  },
  "homepage": "https://github.com/your-org/your-repo",
  "plugins": [
    {
      "name": "your-plugin",
      "version": "0.1.0",
      "description": "Plugin description",
      "source": "./plugins/your-plugin"
    }
  ]
}
```

## Manifest 写法

### Codex manifest

Codex manifest 引用发布包内部的 `skills/`：

```json
{
  "name": "your-plugin",
  "version": "0.1.0",
  "skills": "./skills"
}
```

### Claude manifest

Claude manifest 需要显式列出每个 skill：

```json
{
  "name": "your-plugin",
  "version": "0.1.0",
  "skills": [
    "./skills/foo",
    "./skills/bar"
  ]
}
```

不要写：

- `../../skills/foo`
- `../skills/foo`
- 仓库根目录之外的任何路径

## 发布规则

每次发版前，确认以下文件版本一致：

- `plugins/your-plugin/.claude-plugin/plugin.json`（version 字段）
- `plugins/your-plugin/.codex-plugin/plugin.json`（version 字段）
- `package.json`（version 字段）
- `marketplace.json`（`plugins[].version`）
- `plugins/your-plugin/.claude-plugin/marketplace.json`（`plugins[].version`）
- `.agents/plugins/marketplace.json`（`plugins[].version`）
- `.claude-plugin/marketplace.json`（`plugins[].version`）

manifest 的顶层 `version` 与各 marketplace 的 `plugins[].version` 必须同步更新。

marketplace 必须带 version：部分客户端（如 zcode）通过 `marketplace.json` 的 `plugins[].version`
检测更新，不写则永远检测不到新版本。zcode 以仓库根为入口扫描，因此根目录 `marketplace.json`
是它实际读取的清单，必须存在且带 version。`scripts/bump-version.mjs` 会同时更新所有这些位置，
`scripts/validate.mjs` 会在发布前校验一致性。

### npm 包内容合约

`package.json#files` 只声明允许进入发布包的根：三个仓库级 marketplace 入口和
`plugins/forge/`。`scripts/package-files.allowlist.json` 再把这个范围收紧为精确文件集合。

发布前必须执行：

```bash
npm run check:package
```

该命令以真实 `npm pack --dry-run --json --ignore-scripts` 结果与 allowlist 做集合比较；
`missing` 或 `unexpected` 任一非空即失败。新增、删除或重命名发布文件时，应在同一个变更中
更新 allowlist。不要把 `docs/`、`tests/`、`scripts/`、`evals/`、`experiments/` 或
`archive/` 放入 npm 包。

### 打包产物烟测

源码软链只能支持本地开发，不能证明 npm 产物可安装。发布候选必须从实际 `.tgz` 解包，
再在临时 `HOME` 和 `CODEX_HOME` 中完成 marketplace 安装、插件发现、Skill 清点和一次真实调用：

```bash
CODEX_BIN=/path/to/codex \
CODEX_AUTH_FILE=/path/to/auth.json \
npm run plugin:smoke:packed
```

也可以使用 `OPENAI_API_KEY`，不传认证时烟测必须失败，不能把 `debug prompt-input` 冒充模型调用。
认证文件只会以 `0600` 复制到临时 `CODEX_HOME`，结束后随隔离目录删除；默认 Codex 配置的
前后哈希必须一致。模型产生的 events、最终消息和 stderr 先保留在权限 `0700` 的临时区，
只有实际认证值扫描、调用证据和零写入检查全部通过后才复制到 `.eval-runs`。

当前发布合约是 27 个公开 Skill、28 个打包目录（额外包含内部资源 `shared`）和 24 个
可隐式发现 Skill。烟测要求：

- 安装来源必须是本次生成的 `.tgz`，不是 live source；
- 公开清单、安装缓存和模型可见清单分别精确匹配，不能有 missing/extra；
- 模型以只读、ephemeral 会话显式调用 `forge:think`；
- JSONL 事件必须显示成功读取隔离安装缓存中的 `skills/think/SKILL.md`；
- 调用事件不得访问认证文件或认证环境变量；
- 最终 marker、零文件变更、默认配置未变化和临时目录清理同时成立。

回执与原始事件保存在 gitignored 的 `.eval-runs/release-baseline/<run-id>/`。烟测只验证发布
与发现链路，不得修改 Skill frontmatter、manifest `defaultPrompt` 或默认调用策略。

## 推荐发布流程

1. 在 `plugins/your-plugin/` 下直接维护 `skills/` 和 manifest
2. bump version（同步 `package.json`、manifest 和 marketplace）
3. 确认 marketplace 指向 `./plugins/your-plugin`
4. 对最终版本跑结构校验、测试和精确包内容检查
5. 从最终版本的真实 `.tgz` 运行隔离安装与调用烟测，并保存其哈希
6. 用预发布 tag 执行 publish dry-run 后 commit and push

## 最小校验项

建议把下面这些检查写进仓库自检：

- `plugins/your-plugin/.codex-plugin/plugin.json` 存在
- `plugins/your-plugin/.claude-plugin/plugin.json` 存在
- `plugins/your-plugin/skills/` 存在
- Codex marketplace 的 `source.path === "./plugins/your-plugin"`
- Codex manifest 的 `skills === "./skills"`
- Claude manifest 的每一项 skill 都以 `"./skills/"` 开头
- 每份 marketplace 的 forge 条目都带 `version` 且与 `package.json` 一致
- `npm run check:package` 的 `missing=[]` 且 `unexpected=[]`
- `npm run plugin:smoke:packed` 从 `.tgz` 安装、发现并真实读取目标 Skill

## Forge 的当前实现

当前仓库可直接作为参考实现：

- 根目录 marketplace（zcode 等仓库根扫描客户端）: `marketplace.json`
- Codex marketplace: `.agents/plugins/marketplace.json`
- Claude marketplace: `plugins/forge/.claude-plugin/marketplace.json`
- Codex manifest: `plugins/forge/.codex-plugin/plugin.json`
- Claude manifest: `plugins/forge/.claude-plugin/plugin.json`
- 自检逻辑: `scripts/validate.mjs`

## 迁移到其他项目

迁移时按这个顺序最稳：

1. 新建 `plugins/<name>/`
2. 在 `plugins/<name>/` 下建立 `skills/`
3. 补 `.codex-plugin/plugin.json` 和 `.claude-plugin/plugin.json`
4. marketplace 全部指向 `./plugins/<name>`
5. 接入版本同步和自检

这样做的好处是：

- 单一 source of truth，不存在同步问题
- Codex 和 Claude 的差异被限制在 manifest 层
- 发布问题能在仓库自检阶段暴露，而不是等用户安装时报错

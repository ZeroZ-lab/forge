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

三个文件的 `version` 字段必须同步更新。

## 推荐发布流程

1. 在 `plugins/your-plugin/` 下直接维护 `skills/` 和 manifest
2. 确认 marketplace 指向 `./plugins/your-plugin`
3. 跑校验
4. bump version（同步 `package.json` 和两个 `plugin.json`）
5. commit and push

## 最小校验项

建议把下面这些检查写进仓库自检：

- `plugins/your-plugin/.codex-plugin/plugin.json` 存在
- `plugins/your-plugin/.claude-plugin/plugin.json` 存在
- `plugins/your-plugin/skills/` 存在
- Codex marketplace 的 `source.path === "./plugins/your-plugin"`
- Codex manifest 的 `skills === "./skills"`
- Claude manifest 的每一项 skill 都以 `"./skills/"` 开头

## Forge 的当前实现

当前仓库可直接作为参考实现：

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

# Forge

> 文档是源代码，代码是投影。模型越强，同一份文档生成的代码越好。

## 核心理念

**旧认知**：代码是源代码，文档是衍生品  
**Forge 的认知**：文档是源代码，代码是文档在某个模型能力下的投影

同一份 API 合约文档：
- 2024 + GPT-4 → Express + TypeScript
- 2025 + Claude 4 → Hono + Zod + Drizzle  
- 2027 + 更强模型 → 更好的实现，但合约不变

**代码会腐烂，但决策不会过期。**

## 目录结构

```
forge/
├── CANON.md              # 3 条宪法
├── AGENTS.md             # 本文件
├── skills/               # 决策协议（~15-20 个）
│   └── api-design/       # API 设计决策协议
├── contracts/            # 文档模板
│   └── contract-template.md
└── docs/features/        # 产出文档（每个 feature 一份 contract.md）
```

## 工作流程

```
1. 用户说"设计 API"
2. 加载 skills/api-design/SKILL.md
3. Skill 引导决策对话：
   - 呈现决策点 D1-D7
   - 每个决策点：2-3 选项 + 代价 + 推荐
   - 人类选择，AI 记录
4. 产出 docs/features/<feature>/contract.md
5. 后续模型从 contract.md 生成代码
```

## 状态

🚧 原型阶段 — 只有 api-design skill，用于验证理念。

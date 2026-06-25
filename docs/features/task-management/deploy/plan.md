---
demo: true
---

# Task Management — Deploy

> 示例 feature 的 deploy 产物（demo 豁免）：实际独立运维 owner 锚定未配置，仅作 layout 演示。依赖 `goal.md`、`modules/*.md` 和 `testing/strategy.md`。

## 决策

| # | 决策 | 选择 | 理由 | 拒绝 |
|---|------|------|------|------|
| DP1 | 运行环境 | Docker | 标准化容器化，环境一致性 | B（裸机）环境漂移；C（Serverless）冷启动 + 限制 |
| DP2 | 容器化 | Docker 单容器 | 标准容器化，适合小团队 | B（Compose）适合本地开发；C（K8s）小项目过重 |
| DP3 | CI/CD | GitHub Actions | 与 GitHub 紧集成，配置简单，社区 action 丰富 | B（GitLab CI）需要自建 Runner；C（手动）容易出错 |
| DP4 | 环境管理 | 3 环境 | dev + staging + prod，staging 验证后再上 prod | B（2 环境）缺少验证环节；C（1 环境）风险太高 |
| DP5 | 监控 | Sentry + 日志 | Sentry 追踪错误，结构化日志记录请求。够用不过度 | B（DataDog）功能强但贵；C（日志即可）缺乏错误追踪 |

---

## 技术选型

| 层 | 选择 |
|---|------|
| Runtime | Node.js 20 (Alpine) |
| Container | Docker |
| CI/CD | GitHub Actions |
| Registry | GitHub Container Registry |
| Error Tracking | Sentry |
| Logging | 结构化 JSON (pino) |
| Health Check | `/health` endpoint |

---

## 部署流程

```
PR 合并 → main
  ↓
GitHub Actions:
  1. 安装依赖 (npm ci)
  2. 类型检查 (tsc --noEmit)
  3. 运行测试 (vitest run)         ← 依赖 testing/strategy.md
  4. 构建 (tsc)
  5. Docker build
  6. Push to GHCR
  7. Deploy to staging
  8. 健康检查
  9. 人工确认后 → deploy to prod
```

---

## Deploy 专属约束

### 环境变量

- `DATABASE_URL` — PostgreSQL 连接串
- `JWT_SECRET` — JWT 签名密钥
- `SENTRY_DSN` — Sentry 上报地址
- `NODE_ENV` — 环境标识

### 健康检查

- `GET /health` → 200 `{ status: "ok", version: "1.0.0" }`
- 检查数据库连通性

### 回滚

- staging 验证失败时阻止 prod 发布。
- prod 健康检查失败时回滚到上一镜像 tag。

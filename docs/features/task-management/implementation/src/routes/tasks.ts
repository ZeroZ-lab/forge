/**
 * Task 路由定义
 *
 * 引用决策：
 * - D1: Task 是一级资源，独立 CRUD，URL /tasks
 * - D2: page/pageSize 分页
 * - D5: POST /tasks 需要 Idempotency-Key
 * - D6: PATCH /tasks/:id 需要 version 字段
 * - D7: 所有端点需要 Bearer JWT 认证
 *
 * 引用功能需求：
 * - F1: POST /tasks — 创建任务
 * - F2: GET /tasks — 查询任务列表（分页、过滤、排序）
 * - F3: GET /tasks/:id — 查看任务详情
 * - F4: PATCH /tasks/:id — 更新任务
 * - F5: DELETE /tasks/:id — 删除任务（软删除）
 *
 * 引用验收条件：
 * - AC1-AC6: 各端点的校验和业务规则在 service 层实现
 * - AC8: 错误响应由 error middleware 统一处理
 *
 * 技术选型：Hono — 轻量，TypeScript 优先
 */
import { Hono } from 'hono';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { authMiddleware, getAuthContext } from '../middleware/auth';
import { createIdempotencyMiddleware } from '../middleware/idempotency';
import { TaskService } from '../services/task.service';
import {
  CreateTaskBodySchema,
  UpdateTaskBodySchema,
} from '../schemas/task.schema';
import { TaskListQuerySchema } from '../schemas/common.schema';

/**
 * 创建 Task 路由（依赖注入 db 实例）
 *
 * 路由结构：
 * - POST   /tasks       — 创建任务（F1, D5 幂等）
 * - GET    /tasks       — 任务列表（F2, D2 分页）
 * - GET    /tasks/:id   — 任务详情（F3）
 * - PATCH  /tasks/:id   — 更新任务（F4, D6 并发控制）
 * - DELETE /tasks/:id   — 删除任务（F5, AC6 软删除）
 */
export function createTaskRoutes(db: PostgresJsDatabase): Hono {
  const app = new Hono();
  const taskService = new TaskService(db);
  const idempotencyMiddleware = createIdempotencyMiddleware(db);

  // 所有 task 路由都需要 JWT 认证（D7）
  app.use('*', authMiddleware);

  // ─── POST /tasks ─────────────────────────────────────────────────────
  // F1: 创建任务
  // D5: 需要 Idempotency-Key header
  // AC5: 重复 key + 不同 body → 409

  app.post('/', idempotencyMiddleware, async (c) => {
    const auth = getAuthContext(c);
    const body = CreateTaskBodySchema.parse(await c.req.json());
    const task = await taskService.createTask(auth, body);
    return c.json(task, 201);
  });

  // ─── GET /tasks ──────────────────────────────────────────────────────
  // F2: 查询任务列表
  // D2: page/pageSize 分页，默认 createdAt desc
  // AC3: 默认第 1 页每页 20 条
  // AC6: 不返回已删除任务

  app.get('/', async (c) => {
    const auth = getAuthContext(c);

    // 解析查询参数（包含默认值）
    const rawQuery = {
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
      status: c.req.query('status'),
      assigneeId: c.req.query('assigneeId'),
      sort: c.req.query('sort'),
      order: c.req.query('order'),
    };
    const query = TaskListQuerySchema.parse(rawQuery);

    const result = await taskService.listTasks(auth, query);
    return c.json(result, 200);
  });

  // ─── GET /tasks/:id ──────────────────────────────────────────────────
  // F3: 查看任务详情
  // AC6: 已删除 → 404
  // D4: 跨租户 → 403

  app.get('/:id', async (c) => {
    const auth = getAuthContext(c);
    const taskId = c.req.param('id');
    const task = await taskService.getTask(auth, taskId);
    return c.json(task, 200);
  });

  // ─── PATCH /tasks/:id ────────────────────────────────────────────────
  // F4: 更新任务
  // D6: 需要 version 字段，冲突 → 409
  // AC4: version 不匹配 → 409 TASK_VERSION_CONFLICT

  app.patch('/:id', async (c) => {
    const auth = getAuthContext(c);
    const taskId = c.req.param('id');
    const body = UpdateTaskBodySchema.parse(await c.req.json());
    const task = await taskService.updateTask(auth, taskId, body);
    return c.json(task, 200);
  });

  // ─── DELETE /tasks/:id ───────────────────────────────────────────────
  // F5: 删除任务（软删除）
  // AC6: 设置 deletedAt，不物理删除
  // AC7: 关联评论不删除，但不可访问

  app.delete('/:id', async (c) => {
    const auth = getAuthContext(c);
    const taskId = c.req.param('id');
    await taskService.deleteTask(auth, taskId);
    return c.body(null, 204); // 204 No Content
  });

  return app;
}

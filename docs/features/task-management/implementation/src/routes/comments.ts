/**
 * Comment 路由定义
 *
 * 引用决策：
 * - D1: Comment 是 Task 的子资源，嵌套 URL /tasks/:id/comments
 * - D2: page/pageSize 分页
 * - D5: POST /tasks/:id/comments 需要 Idempotency-Key
 * - D7: 所有端点需要 Bearer JWT 认证
 *
 * 引用功能需求：
 * - F6: POST /tasks/:id/comments — 为任务添加评论
 * - F7: GET /tasks/:id/comments — 查询任务评论列表
 *
 * 引用验收条件：
 * - AC7: 评论不能独立于任务存在，任务删除后评论不可访问
 * - AC8: 错误响应遵循 RFC 9457
 *
 * 注意：Comment 路由挂载在 /tasks 下，URL 结构为：
 * - POST /tasks/:taskId/comments
 * - GET  /tasks/:taskId/comments
 * 表达 D1 的父子资源关系
 */
import { Hono } from 'hono';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { authMiddleware, getAuthContext } from '../middleware/auth';
import { createIdempotencyMiddleware } from '../middleware/idempotency';
import { CommentService } from '../services/comment.service';
import { CreateCommentBodySchema } from '../schemas/comment.schema';
import { PaginationQuerySchema } from '../schemas/common.schema';

/**
 * 创建 Comment 路由（依赖注入 db 实例）
 *
 * 路由结构（D1: 嵌套在 Task 下）：
 * - POST /:taskId/comments — 创建评论（F6, D5 幂等）
 * - GET  /:taskId/comments — 评论列表（F7, D2 分页）
 *
 * 这些路由由 tasks.ts 路由通过 app.route('/:taskId/comments', commentRoutes)
 * 挂载，保持 D1 的父子资源 URL 结构。
 */
export function createCommentRoutes(db: PostgresJsDatabase): Hono {
  const app = new Hono();
  const commentService = new CommentService(db);
  const idempotencyMiddleware = createIdempotencyMiddleware(db);

  // 所有 comment 路由都需要 JWT 认证（D7）
  app.use('*', authMiddleware);

  // ─── POST /:taskId/comments ──────────────────────────────────────────
  // F6: 为任务添加评论
  // D1: 必须指定父 Task（URL 路径 :taskId）
  // D5: 需要 Idempotency-Key header
  // AC7: 父 Task 不存在或已删除 → 404

  app.post('/:taskId/comments', idempotencyMiddleware, async (c) => {
    const auth = getAuthContext(c);
    const taskId = c.req.param('taskId');
    const body = CreateCommentBodySchema.parse(await c.req.json());
    const comment = await commentService.createComment(auth, taskId, body);
    return c.json(comment, 201);
  });

  // ─── GET /:taskId/comments ───────────────────────────────────────────
  // F7: 查询任务的评论列表
  // D1: 必须指定父 Task
  // D2: page/pageSize 分页
  // AC7: 父 Task 不存在或已删除 → 404

  app.get('/:taskId/comments', async (c) => {
    const auth = getAuthContext(c);
    const taskId = c.req.param('taskId');

    // 解析分页参数（D2: 默认 page=1, pageSize=20）
    const rawQuery = {
      page: c.req.query('page'),
      pageSize: c.req.query('pageSize'),
    };
    const pagination = PaginationQuerySchema.parse(rawQuery);

    const result = await commentService.listComments(auth, taskId, pagination);
    return c.json(result, 200);
  });

  return app;
}

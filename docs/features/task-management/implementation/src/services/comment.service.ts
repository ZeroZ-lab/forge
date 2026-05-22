/**
 * Comment 业务逻辑层
 *
 * 引用决策：
 * - D1: Comment 是 Task 的子资源，1:N 关系，创建和查询必须指定父 Task
 * - D2: page/pageSize 分页
 * - D5: POST /tasks/:id/comments 需要幂等（幂等由中间件处理）
 * - D6: Comment 不需要并发控制（追加写入，不修改）
 *
 * 引用验收条件：
 * - AC7: 评论不能独立于任务存在，任务删除后评论不可访问
 * - F6: 为任务添加评论
 * - F7: 查询任务的评论列表
 *
 * 引用约束：
 * - 多租户隔离：查询评论前必须验证父 Task 属于当前 tenant
 * - 不暴露 tenantId
 */
import { ulid } from 'ulid';
import { eq, and, isNull, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { comments, tasks } from '../db/schema';
import type { Comment as CommentRow } from '../db/schema';
import { AppErrors } from '../middleware/error';
import type { AuthContext, PaginationQuery } from '../schemas/common.schema';
import type { CreateCommentBody } from '../schemas/comment.schema';
import {
  toCommentResponse,
  type CommentResponse,
  type CommentInternalDTO,
} from '../schemas/comment.schema';

// ─── CommentService ──────────────────────────────────────────────────────────

export class CommentService {
  constructor(private readonly db: PostgresJsDatabase) {}

  /**
   * 为任务创建评论
   *
   * 业务规则：
   * - F6: 为任务添加评论
   * - D1: 必须指定父 Task（URL 路径参数 :id）
   * - AC7: 父 Task 不存在或已删除 → 404 TASK_NOT_FOUND
   * - D6: Comment 不需要并发控制（追加写入）
   * - content: 1-2000 chars（schema 层已校验）
   *
   * @param auth - 认证上下文（D7）
   * @param taskId - 父 Task ID（D1: 从 URL 路径获取）
   * @param body - 创建评论请求体
   * @returns 创建的评论（API 响应格式）
   */
  async createComment(
    auth: AuthContext,
    taskId: string,
    body: CreateCommentBody,
  ): Promise<CommentResponse> {
    // AC7: 验证父 Task 存在且未删除（同时校验 tenantId）
    await this.validateParentTask(taskId, auth.tenantId);

    const now = new Date();
    const commentId = ulid();

    const newComment: typeof comments.$inferInsert = {
      id: commentId,
      taskId,
      authorId: auth.userId,
      content: body.content,
      tenantId: auth.tenantId, // 多租户隔离
      createdAt: now,
    };

    await this.db.insert(comments).values(newComment);

    return toCommentResponse({
      id: newComment.id,
      taskId: newComment.taskId,
      authorId: newComment.authorId,
      content: newComment.content,
      tenantId: newComment.tenantId,
      createdAt: newComment.createdAt,
    });
  }

  /**
   * 查询任务的评论列表
   *
   * 业务规则：
   * - F7: 查询任务的评论列表
   * - D1: 必须指定父 Task
   * - D2: page/pageSize 分页，默认 page=1, pageSize=20
   * - AC7: 父 Task 不存在或已删除 → 404 TASK_NOT_FOUND
   * - 按 createdAt asc 排序（评论时间线自然顺序）
   *
   * @param auth - 认证上下文
   * @param taskId - 父 Task ID
   * @param pagination - 分页参数（D2）
   */
  async listComments(
    auth: AuthContext,
    taskId: string,
    pagination: PaginationQuery,
  ): Promise<{
    data: CommentResponse[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    // AC7: 验证父 Task 存在且未删除
    await this.validateParentTask(taskId, auth.tenantId);

    const { page, pageSize } = pagination;
    const offset = (page - 1) * pageSize;

    // 查询条件：指定 task + tenant 隔离
    const whereClause = and(
      eq(comments.taskId, taskId),
      eq(comments.tenantId, auth.tenantId),
    );

    // 查询总数
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(comments)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    // 查询数据，按 createdAt asc（时间线顺序）
    const rows = await this.db
      .select()
      .from(comments)
      .where(whereClause)
      .orderBy(comments.createdAt)
      .limit(pageSize)
      .offset(offset);

    return {
      data: rows.map((row) => toCommentResponse(this.rowToDTO(row))),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  // ─── 内部方法 ────────────────────────────────────────────────────────────

  /**
   * 验证父 Task 存在且未删除（AC7）
   *
   * 同时校验 tenantId（多租户隔离）：
   * - Task 不存在 → 404 TASK_NOT_FOUND
   * - Task 已删除 → 404 TASK_NOT_FOUND（AC6 + AC7 联合效果）
   * - Task 不在当前 tenant → 404 TASK_NOT_FOUND（不暴露其他 tenant 数据）
   *
   * @throws AppError TASK_NOT_FOUND
   */
  private async validateParentTask(
    taskId: string,
    tenantId: string,
  ): Promise<void> {
    const [task] = await this.db
      .select({ id: tasks.id })
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.tenantId, tenantId),
          isNull(tasks.deletedAt), // AC6 + AC7: 已删除的 Task 评论不可访问
        ),
      )
      .limit(1);

    if (!task) {
      throw AppErrors.taskNotFound(taskId);
    }
  }

  /**
   * 数据库行 → 内部 DTO 转换
   */
  private rowToDTO(row: CommentRow): CommentInternalDTO {
    return {
      id: row.id,
      taskId: row.taskId,
      authorId: row.authorId,
      content: row.content,
      tenantId: row.tenantId,
      createdAt: row.createdAt,
    };
  }
}

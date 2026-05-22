/**
 * Comment DTO + Zod schema
 *
 * 引用决策：
 * - D1: Comment 是 Task 的子资源，创建和查询必须指定父 Task
 * - D5: POST /tasks/:id/comments 需要 Idempotency-Key header
 *
 * 引用验收条件：
 * - AC7: 评论不能独立于任务存在，任务删除后评论不可访问
 *
 * 引用约束：
 * - content: 1-2000 chars
 * - Comment 不需要并发控制（追加写入，不修改）（D6 规则）
 * - 不暴露 tenantId（安全约束）
 */
import { z } from 'zod';
import { PaginatedResponseSchema } from './common.schema';

// ─── Comment 响应 schema ────────────────────────────────────────────────────

/**
 * Comment API 响应对象
 * - 不包含 tenantId（安全约束）
 * - D6 规则：Comment 不需要并发控制（追加写入，不修改），所以没有 version 字段
 */
export const CommentResponseSchema = z.object({
  id: z.string(),
  taskId: z.string(), // D1: 归属父 Task
  authorId: z.string(),
  content: z.string().min(1).max(2000),
  createdAt: z.string(), // ISO 8601
});

export type CommentResponse = z.infer<typeof CommentResponseSchema>;

/**
 * Comment 列表响应 schema（D2: page/pageSize 分页）
 */
export const CommentListResponseSchema = PaginatedResponseSchema(
  CommentResponseSchema,
);

export type CommentListResponse = z.infer<typeof CommentListResponseSchema>;

// ─── POST /tasks/:id/comments 请求 schema（D5 幂等）─────────────────────────

/**
 * 创建评论请求体
 * - content: 1-2000 chars, required
 */
export const CreateCommentBodySchema = z.object({
  content: z
    .string({ required_error: 'content is required' })
    .min(1, 'content must not be empty')
    .max(2000, 'content must be at most 2000 characters'),
});

export type CreateCommentBody = z.infer<typeof CreateCommentBodySchema>;

// ─── Comment 内部 DTO ───────────────────────────────────────────────────────

/**
 * 内部 Comment DTO，包含 tenantId
 * 仅用于 service 层
 */
export interface CommentInternalDTO {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  tenantId: string;
  createdAt: Date;
}

/**
 * 将内部 Comment DTO 转换为 API 响应格式
 * 剥离 tenantId（安全约束）
 */
export function toCommentResponse(
  comment: CommentInternalDTO,
): CommentResponse {
  return {
    id: comment.id,
    taskId: comment.taskId,
    authorId: comment.authorId,
    content: comment.content,
    createdAt: comment.createdAt.toISOString(),
  };
}

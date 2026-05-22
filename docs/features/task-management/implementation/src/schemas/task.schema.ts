/**
 * Task DTO + Zod schema
 *
 * 引用决策：
 * - D6: version 字段并发控制，创建时为 1，每次更新 +1
 * - D5: POST /tasks 需要 Idempotency-Key header
 *
 * 引用验收条件：
 * - AC1: 标题为必填，最长 200 字符
 * - AC2: 状态只能是 todo / in_progress / done
 * - AC4: 更新任务时必须携带 version 字段
 *
 * 引用约束：
 * - 不暴露内部字段：tenantId 不出现在 API 响应中
 * - description 0-5000 chars, optional
 */
import { z } from 'zod';
import { PaginatedResponseSchema } from './common.schema';

// ─── Task 响应 schema ───────────────────────────────────────────────────────
// 注意：tenantId 不出现在响应中（安全约束）

/**
 * Task API 响应对象
 * - 不包含 tenantId（安全约束：不暴露内部字段）
 * - version 从 1 开始（D6）
 * - status 默认 'todo'（AC2）
 */
export const TaskResponseSchema = z.object({
  id: z.string(),
  title: z.string().min(1).max(200), // AC1
  description: z.string().nullable(),
  status: z.enum(['todo', 'in_progress', 'done']), // AC2
  assigneeId: z.string().nullable(),
  creatorId: z.string(),
  version: z.number().int(), // D6
  createdAt: z.string(), // ISO 8601
  updatedAt: z.string(), // ISO 8601
});

export type TaskResponse = z.infer<typeof TaskResponseSchema>;

/**
 * Task 列表响应 schema（D2: page/pageSize 分页）
 */
export const TaskListResponseSchema = PaginatedResponseSchema(
  TaskResponseSchema,
);

export type TaskListResponse = z.infer<typeof TaskListResponseSchema>;

// ─── POST /tasks 请求 schema（D5 幂等, AC1, AC2）────────────────────────────

/**
 * 创建任务请求体
 * - title: 1-200 chars, required (AC1)
 * - description: 0-5000 chars, optional
 * - assigneeId: optional, 需校验在同 tenant 内存在
 */
export const CreateTaskBodySchema = z.object({
  title: z
    .string({ required_error: 'title is required' })
    .min(1, 'title must not be empty')
    .max(200, 'title must be at most 200 characters'), // AC1
  description: z
    .string()
    .max(5000, 'description must be at most 5000 characters')
    .optional(),
  assigneeId: z.string().optional(),
});

export type CreateTaskBody = z.infer<typeof CreateTaskBodySchema>;

// ─── PATCH /tasks/:id 请求 schema（D6 并发控制, AC4）────────────────────────

/**
 * 更新任务请求体
 * - version: required，必须匹配当前版本（D6, AC4）
 * - 其他字段均为 optional
 * - assigneeId 可为 null（取消指派）
 */
export const UpdateTaskBodySchema = z.object({
  title: z
    .string()
    .min(1, 'title must not be empty')
    .max(200, 'title must be at most 200 characters')
    .optional(), // AC1
  description: z
    .string()
    .max(5000, 'description must be at most 5000 characters')
    .optional(),
  status: z.enum(['todo', 'in_progress', 'done']).optional(), // AC2
  assigneeId: z.string().nullable().optional(),
  version: z
    .number({ required_error: 'version is required for concurrency control' })
    .int('version must be an integer')
    .min(1, 'version must be at least 1'), // D6, AC4
});

export type UpdateTaskBody = z.infer<typeof UpdateTaskBodySchema>;

// ─── Task 内部 DTO（包含 tenantId，用于 service 层）──────────────────────────

/**
 * 内部 Task DTO，包含 tenantId
 * 仅用于 service 层，不暴露给 API 响应
 */
export interface TaskInternalDTO {
  id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done';
  assigneeId: string | null;
  creatorId: string;
  tenantId: string; // 内部字段，不在 API 响应中
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 将内部 Task DTO 转换为 API 响应格式
 * 剥离 tenantId 和 deletedAt（安全约束）
 */
export function toTaskResponse(task: TaskInternalDTO): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    assigneeId: task.assigneeId,
    creatorId: task.creatorId,
    version: task.version,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

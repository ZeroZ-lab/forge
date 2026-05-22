/**
 * Common Zod schemas — 分页、错误、通用类型
 *
 * 引用决策：
 * - D2: page/pageSize 分页策略，默认 page=1, pageSize=20
 * - D3: RFC 9457 Problem Details 错误格式
 *
 * 引用验收条件：
 * - AC3: 列表接口必须分页，默认第 1 页每页 20 条
 * - AC8: 所有错误响应遵循 RFC 9457 Problem Details 格式
 *
 * 引用约束：
 * - pageSize 上限 100，防止单次拉取过多数据
 */
import { z } from 'zod';

// ─── 分页请求 schema（D2, AC3）──────────────────────────────────────────────

/**
 * 分页查询参数 schema
 * - page: 默认 1，最小 1
 * - pageSize: 默认 20，最小 1，最大 100（约束：pageSize 上限 100）
 */
export const PaginationQuerySchema = z.object({
  page: z
    .string()
    .optional()
    .default('1')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1)),
  pageSize: z
    .string()
    .optional()
    .default('20')
    .transform((v) => parseInt(v, 10))
    .pipe(z.number().int().min(1).max(100)), // 约束：pageSize 上限 100
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

// ─── 分页响应 schema（D2）───────────────────────────────────────────────────

/**
 * 分页元信息
 * - total: 总记录数
 * - totalPages: 总页数 = ceil(total / pageSize)
 */
export const PaginationMetaSchema = z.object({
  page: z.number().int(),
  pageSize: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type PaginationMeta = z.infer<typeof PaginationMetaSchema>;

/**
 * 通用分页响应包装
 */
export function PaginatedResponseSchema<T extends z.ZodTypeAny>(
  itemSchema: T,
) {
  return z.object({
    data: z.array(itemSchema),
    pagination: PaginationMetaSchema,
  });
}

// ─── RFC 9457 Problem Details（D3, AC8）──────────────────────────────────────

/**
 * RFC 9457 Problem Details error response schema
 *
 * 字段约定（来自 D3）：
 * - type: 错误类型 URL，可作为文档链接
 * - title: 人类可读的错误标题
 * - status: HTTP 状态码
 * - detail: 具体错误描述
 * - instance: 请求路径
 * - extensions.code: 稳定的 UPPER_SNAKE_CASE 错误码，程序判断依据
 * - extensions.requestId: 请求追踪 ID
 */
export const ProblemDetailSchema = z.object({
  type: z.string().url(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string(),
  instance: z.string(),
  extensions: z.object({
    code: z.string(), // UPPER_SNAKE_CASE
    requestId: z.string(),
  }),
});

export type ProblemDetail = z.infer<typeof ProblemDetailSchema>;

// ─── Error code constants ───────────────────────────────────────────────────

/**
 * 稳定的 UPPER_SNAKE_CASE 错误码（D3 约定）
 * 程序判断依据，不依赖 HTTP status code
 */
export const ErrorCodes = {
  // Auth errors (401)
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',

  // Authorization errors (403, D4)
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Not found (404)
  TASK_NOT_FOUND: 'TASK_NOT_FOUND',

  // Validation (400)
  INVALID_REQUEST_BODY: 'INVALID_REQUEST_BODY',

  // Conflict (409)
  TASK_VERSION_CONFLICT: 'TASK_VERSION_CONFLICT', // D6
  IDEMPOTENCY_KEY_CONFLICT: 'IDEMPOTENCY_KEY_CONFLICT', // D5

  // Unprocessable (422)
  ASSIGNEE_NOT_FOUND: 'ASSIGNEE_NOT_FOUND',
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];

// ─── ProblemDetail 构建工具 ─────────────────────────────────────────────────

const ERROR_BASE_URL = 'https://api.example.com/errors';

/**
 * 构建 RFC 9457 Problem Details 响应体
 *
 * @param code - UPPER_SNAKE_CASE 错误码（D3）
 * @param title - 人类可读标题
 * @param status - HTTP 状态码
 * @param detail - 具体描述
 * @param instance - 请求路径
 * @param requestId - 请求追踪 ID
 */
export function buildProblemDetail(
  code: ErrorCode,
  title: string,
  status: number,
  detail: string,
  instance: string,
  requestId: string,
): ProblemDetail {
  return {
    type: `${ERROR_BASE_URL}/${code.toLowerCase().replace(/_/g, '-')}`,
    title,
    status,
    detail,
    instance,
    extensions: {
      code,
      requestId,
    },
  };
}

// ─── Auth context（D7）───────────────────────────────────────────────────────

/**
 * JWT payload 解析后的认证上下文
 * D7: JWT 包含 userId、tenantId、role
 */
export interface AuthContext {
  userId: string;
  tenantId: string;
  role: 'admin' | 'member';
}

// ─── 排序参数 schema（D2 默认排序 createdAt desc）────────────────────────────

/**
 * 排序字段白名单（约束：sort/filter 参数白名单，不允许直接透传数据库字段名）
 */
export const TaskSortFieldSchema = z.enum(['createdAt', 'updatedAt', 'title']);
export type TaskSortField = z.infer<typeof TaskSortFieldSchema>;

export const SortOrderSchema = z.enum(['asc', 'desc']);
export type SortOrder = z.infer<typeof SortOrderSchema>;

/**
 * Task 列表查询参数 schema
 */
export const TaskListQuerySchema = PaginationQuerySchema.extend({
  status: z.enum(['todo', 'in_progress', 'done']).optional(),
  assigneeId: z.string().optional(),
  sort: TaskSortFieldSchema.optional().default('createdAt'), // D2: 默认排序字段
  order: SortOrderSchema.optional().default('desc'), // D2: 默认排序方向
});

export type TaskListQuery = z.infer<typeof TaskListQuerySchema>;

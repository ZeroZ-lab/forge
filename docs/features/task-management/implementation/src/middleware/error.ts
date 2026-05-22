/**
 * 全局错误处理中间件 — RFC 9457 Problem Details
 *
 * 引用决策：
 * - D3: RFC 9457 Problem Details 错误格式
 *   - type: 错误类型 URL
 *   - title: 人类可读标题
 *   - status: HTTP 状态码
 *   - detail: 具体错误描述
 *   - extensions.code: UPPER_SNAKE_CASE 错误码
 *   - extensions.requestId: 请求追踪 ID
 *
 * 引用验收条件：
 * - AC8: 所有错误响应遵循 RFC 9457 Problem Details 格式
 *
 * 引用约束：
 * - 不暴露内部错误堆栈到生产环境
 */
import type { Context, Next } from 'hono';
import { ZodError } from 'zod';
import {
  ErrorCodes,
  buildProblemDetail,
  type ErrorCode,
} from '../schemas/common.schema';

// ─── 自定义错误类 ────────────────────────────────────────────────────────────

/**
 * 应用层业务错误
 * 在 service 层抛出，由 error middleware 统一转换为 RFC 9457 格式
 */
export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
  ) {
    super(detail);
    this.name = 'AppError';
  }
}

/**
 * 便捷工厂函数 — 常用错误类型
 */
export const AppErrors = {
  taskNotFound(taskId: string) {
    return new AppError(
      ErrorCodes.TASK_NOT_FOUND,
      404,
      'Task Not Found',
      `Task with id '${taskId}' does not exist or has been deleted.`,
    );
  },

  versionConflict(expected: number, actual: number) {
    return new AppError(
      ErrorCodes.TASK_VERSION_CONFLICT,
      409,
      'Task Version Conflict',
      `Expected version ${expected}, but current version is ${actual}. The task has been modified by another user.`,
    );
  },

  insufficientPermissions() {
    return new AppError(
      ErrorCodes.INSUFFICIENT_PERMISSIONS,
      403,
      'Insufficient Permissions',
      'You do not have permission to perform this action.',
    );
  },

  assigneeNotFound(assigneeId: string) {
    return new AppError(
      ErrorCodes.ASSIGNEE_NOT_FOUND,
      422,
      'Assignee Not Found',
      `User with id '${assigneeId}' was not found in the current tenant.`,
    );
  },

  invalidBody(detail: string) {
    return new AppError(
      ErrorCodes.INVALID_REQUEST_BODY,
      400,
      'Invalid Request Body',
      detail,
    );
  },
};

// ─── 错误处理中间件 ──────────────────────────────────────────────────────────

/**
 * 全局错误处理中间件（D3, AC8）
 *
 * 捕获所有未处理的错误，统一转换为 RFC 9457 Problem Details 格式。
 *
 * 错误类型映射：
 * - AppError → 使用其自带的 code/status/title/detail
 * - ZodError → 400 INVALID_REQUEST_BODY（参数校验失败）
 * - SyntaxError (JSON parse) → 400 INVALID_REQUEST_BODY
 * - 未知错误 → 500 INTERNAL_SERVER_ERROR（不暴露堆栈）
 */
export async function errorMiddleware(c: Context, next: Next) {
  const requestId =
    c.get('requestId') ??
    c.req.header('X-Request-Id') ??
    generateRequestId();
  c.set('requestId', requestId);

  try {
    await next();
  } catch (error: unknown) {
    const path = new URL(c.req.url).pathname;

    // ── AppError（业务错误）─────────────────────────────────────────
    if (error instanceof AppError) {
      return c.json(
        buildProblemDetail(
          error.code,
          error.title,
          error.status,
          error.detail,
          path,
          requestId,
        ),
        error.status,
      );
    }

    // ── ZodError（参数校验失败）────────────────────────────────────
    if (error instanceof ZodError) {
      const issues = error.issues
        .map((issue) => {
          const fieldPath = issue.path.join('.');
          return fieldPath ? `${fieldPath}: ${issue.message}` : issue.message;
        })
        .join('; ');

      return c.json(
        buildProblemDetail(
          ErrorCodes.INVALID_REQUEST_BODY,
          'Invalid Request Body',
          400,
          `Validation failed: ${issues}`,
          path,
          requestId,
        ),
        400,
      );
    }

    // ── JSON 解析错误 ──────────────────────────────────────────────
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      return c.json(
        buildProblemDetail(
          ErrorCodes.INVALID_REQUEST_BODY,
          'Invalid Request Body',
          400,
          'Request body contains invalid JSON.',
          path,
          requestId,
        ),
        400,
      );
    }

    // ── 未知错误（500）──────────────────────────────────────────────
    // 生产环境不暴露堆栈，仅返回通用错误信息
    console.error('[error] Unhandled error:', error);

    return c.json(
      buildProblemDetail(
        'INTERNAL_SERVER_ERROR' as ErrorCode,
        'Internal Server Error',
        500,
        'An unexpected error occurred. Please try again later.',
        path,
        requestId,
      ),
      500,
    );
  }
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

/**
 * 生成请求追踪 ID（D3: extensions.requestId）
 */
function generateRequestId(): string {
  return `req_${Math.random().toString(36).substring(2, 10)}`;
}

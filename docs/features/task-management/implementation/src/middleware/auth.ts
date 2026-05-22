/**
 * JWT 认证中间件
 *
 * 引用决策：
 * - D7: Bearer token (JWT) 认证方式
 *   - Authorization: Bearer <token> header
 *   - JWT 包含 userId、tenantId、role
 *   - token 有效期 24 小时
 *   - 过期 → 401 TOKEN_EXPIRED
 *   - 无效 → 401 TOKEN_INVALID
 *
 * 引用约束：
 * - 多租户隔离：所有查询必须带 tenantId（从 JWT 中提取）
 *
 * 技术选型：jose (JWT) — 纯 JS，无 native 依赖
 */
import type { Context, Next } from 'hono';
import { jwtVerify, type JWTPayload } from 'jose';
import type { AuthContext } from '../schemas/common.schema';
import { ErrorCodes, buildProblemDetail } from '../schemas/common.schema';

// ─── JWT payload 类型 ───────────────────────────────────────────────────────

/**
 * JWT payload 结构（D7）
 * - userId: 用户 ID
 * - tenantId: 租户 ID
 * - role: 用户角色
 */
export interface TaskJWTPayload extends JWTPayload {
  userId: string;
  tenantId: string;
  role: 'admin' | 'member';
}

// ─── 环境变量 ───────────────────────────────────────────────────────────────

/**
 * 从环境变量获取 JWT 密钥
 * 生产环境应通过密钥管理服务获取
 */
function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? 'dev-secret-do-not-use-in-prod';
  return new TextEncoder().encode(secret);
}

// ─── 中间件 ──────────────────────────────────────────────────────────────────

/**
 * Hono context key for storing auth context
 */
export const AUTH_CONTEXT_KEY = 'authContext';

/**
 * JWT 认证中间件（D7）
 *
 * 验证流程：
 * 1. 提取 Authorization header
 * 2. 校验 Bearer token 格式
 * 3. 使用 jose 验证 JWT 签名和有效期
 * 4. 提取 userId、tenantId、role 注入 context
 *
 * 错误码：
 * - 401 TOKEN_INVALID: 缺少 header、格式错误、签名无效
 * - 401 TOKEN_EXPIRED: token 已过期
 */
export async function authMiddleware(c: Context, next: Next) {
  const requestId = c.get('requestId') ?? generateRequestId();
  const path = new URL(c.req.url).pathname;

  // 1. 提取 Authorization header
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return c.json(
      buildProblemDetail(
        ErrorCodes.TOKEN_INVALID,
        'Unauthorized',
        401,
        'Missing Authorization header. Expected: Bearer <token>',
        path,
        requestId,
      ),
      401,
    );
  }

  // 2. 校验 Bearer 格式
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return c.json(
      buildProblemDetail(
        ErrorCodes.TOKEN_INVALID,
        'Unauthorized',
        401,
        'Invalid Authorization header format. Expected: Bearer <token>',
        path,
        requestId,
      ),
      401,
    );
  }

  const token = parts[1];

  // 3. 验证 JWT（D7: jose 库）
  try {
    const secret = getJWTSecret();
    const { payload } = await jwtVerify(token, secret);

    // 校验必要字段
    const jwtPayload = payload as TaskJWTPayload;
    if (!jwtPayload.userId || !jwtPayload.tenantId || !jwtPayload.role) {
      return c.json(
        buildProblemDetail(
          ErrorCodes.TOKEN_INVALID,
          'Unauthorized',
          401,
          'JWT payload missing required fields: userId, tenantId, role',
          path,
          requestId,
        ),
        401,
      );
    }

    // 4. 注入 auth context（多租户隔离基础）
    const authContext: AuthContext = {
      userId: jwtPayload.userId,
      tenantId: jwtPayload.tenantId,
      role: jwtPayload.role,
    };
    c.set(AUTH_CONTEXT_KEY, authContext);

    await next();
  } catch (error: unknown) {
    // 区分过期和无效（D7: TOKEN_EXPIRED vs TOKEN_INVALID）
    if (
      error instanceof Error &&
      error.message.includes('expired')
    ) {
      return c.json(
        buildProblemDetail(
          ErrorCodes.TOKEN_EXPIRED,
          'Token Expired',
          401,
          'The provided JWT has expired. Please refresh your token.',
          path,
          requestId,
        ),
        401,
      );
    }

    return c.json(
      buildProblemDetail(
        ErrorCodes.TOKEN_INVALID,
        'Unauthorized',
        401,
        'The provided JWT is invalid or has been tampered with.',
        path,
        requestId,
      ),
      401,
    );
  }
}

// ─── 辅助函数 ────────────────────────────────────────────────────────────────

/**
 * 从 context 获取认证上下文
 * 在路由处理器中使用
 */
export function getAuthContext(c: Context): AuthContext {
  const ctx = c.get(AUTH_CONTEXT_KEY) as AuthContext | undefined;
  if (!ctx) {
    throw new Error(
      'AuthContext not found. Ensure authMiddleware is applied before this handler.',
    );
  }
  return ctx;
}

/**
 * 生成请求追踪 ID（D3: extensions.requestId）
 * 生产环境应使用 OpenTelemetry 等追踪系统
 */
function generateRequestId(): string {
  return `req_${Math.random().toString(36).substring(2, 10)}`;
}

// ─── JWT 生成工具（用于测试和开发）───────────────────────────────────────────

/**
 * 生成 JWT token（仅用于测试和开发环境）
 * D7: token 有效期 24 小时
 */
export async function signJWT(
  payload: Omit<TaskJWTPayload, 'iat' | 'exp'>,
): Promise<string> {
  const { SignJWT } = await import('jose');
  const secret = getJWTSecret();

  return new SignJWT(payload as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // D7: 有效期 24 小时
    .sign(secret);
}

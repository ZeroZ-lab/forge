/**
 * Task 业务逻辑层
 *
 * 引用决策：
 * - D1: Task 是一级资源，独立 CRUD
 * - D2: page/pageSize 分页，默认排序 createdAt desc
 * - D4: 权限失败统一 403
 * - D6: version 字段并发控制
 *
 * 引用验收条件：
 * - AC1: 标题 1-200 chars
 * - AC2: 状态 todo | in_progress | done
 * - AC3: 列表分页，默认第 1 页每页 20 条
 * - AC4: 更新携带 version，冲突 409
 * - AC6: 软删除，已删除不出现在列表
 *
 * 引用约束：
 * - 多租户隔离：所有查询必须带 tenantId
 * - 权限：admin 可操作所有，member 只能操作自己创建或被指派的
 * - 不暴露 tenantId
 * - 列表走复合索引 (tenantId, deletedAt, createdAt)
 * - sort/filter 参数白名单
 */
import { ulid } from 'ulid';
import { eq, and, isNull, sql, count } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { tasks, users } from '../db/schema';
import type { Task as TaskRow } from '../db/schema';
import { AppErrors } from '../middleware/error';
import type { AuthContext } from '../schemas/common.schema';
import type { TaskListQuery } from '../schemas/common.schema';
import type {
  CreateTaskBody,
  UpdateTaskBody,
  TaskInternalDTO,
} from '../schemas/task.schema';
import { toTaskResponse, type TaskResponse } from '../schemas/task.schema';

// ─── 排序字段映射（约束：白名单，不透传数据库字段名）─────────────────────────

/**
 * 将 API 层排序字段映射到数据库列
 * 只允许白名单内的字段（约束：sort/filter 参数白名单）
 */
const SORT_FIELD_MAP = {
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  title: tasks.title,
} as const;

// ─── TaskService ─────────────────────────────────────────────────────────────

export class TaskService {
  constructor(private readonly db: PostgresJsDatabase) {}

  /**
   * 创建任务
   *
   * 业务规则：
   * - F1: 标题、描述、指派人
   * - AC1: 标题 1-200 chars（schema 层已校验）
   * - AC2: 初始状态为 todo
   * - D6: version 初始为 1
   * - 需校验 assigneeId 在同 tenant 内存在（422 ASSIGNEE_NOT_FOUND）
   *
   * @param auth - 认证上下文（D7: 从 JWT 提取）
   * @param body - 创建请求体
   * @returns 创建的任务（API 响应格式）
   */
  async createTask(
    auth: AuthContext,
    body: CreateTaskBody,
  ): Promise<TaskResponse> {
    // 校验 assigneeId（若提供）在同 tenant 内存在
    if (body.assigneeId) {
      await this.validateAssigneeInTenant(body.assigneeId, auth.tenantId);
    }

    const now = new Date();
    const taskId = ulid();

    const newTask: typeof tasks.$inferInsert = {
      id: taskId,
      title: body.title,
      description: body.description ?? null,
      status: 'todo', // AC2: 初始状态
      assigneeId: body.assigneeId ?? null,
      creatorId: auth.userId,
      tenantId: auth.tenantId, // 多租户隔离
      version: 1, // D6: 初始版本
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.insert(tasks).values(newTask);

    // 转换为 API 响应格式（剥离 tenantId）
    return toTaskResponse({
      id: newTask.id,
      title: newTask.title,
      description: newTask.description,
      status: newTask.status,
      assigneeId: newTask.assigneeId,
      creatorId: newTask.creatorId,
      tenantId: newTask.tenantId,
      version: newTask.version,
      createdAt: newTask.createdAt,
      updatedAt: newTask.updatedAt,
    });
  }

  /**
   * 查询任务列表
   *
   * 业务规则：
   * - F2: 分页、过滤、排序
   * - AC3: 默认分页 page=1, pageSize=20
   * - AC6: 不返回已软删除的任务（deletedAt IS NULL）
   * - D2: 默认排序 createdAt desc
   * - 只返回当前 tenant 的任务（多租户隔离）
   * - 性能：走复合索引 (tenantId, deletedAt, createdAt)
   *
   * @param auth - 认证上下文
   * @param query - 查询参数（D2: page/pageSize）
   */
  async listTasks(
    auth: AuthContext,
    query: TaskListQuery,
  ): Promise<{ data: TaskResponse[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } }> {
    const { page, pageSize, status, assigneeId, sort, order } = query;
    const offset = (page - 1) * pageSize;

    // 构建 WHERE 条件（多租户隔离 + 软删除过滤 + 可选过滤）
    const conditions = [
      eq(tasks.tenantId, auth.tenantId),
      isNull(tasks.deletedAt), // AC6: 不返回已删除
    ];

    if (status) {
      conditions.push(eq(tasks.status, status));
    }
    if (assigneeId) {
      conditions.push(eq(tasks.assigneeId, assigneeId));
    }

    const whereClause = and(...conditions);

    // 查询总数（约束：total 使用 COUNT(*)）
    const [totalResult] = await this.db
      .select({ count: count() })
      .from(tasks)
      .where(whereClause);

    const total = totalResult?.count ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    // 查询数据（排序字段白名单，D2: 默认 createdAt desc）
    const sortColumn = SORT_FIELD_MAP[sort];
    const orderFn = order === 'asc' ? sql`ASC` : sql`DESC`;

    const rows = await this.db
      .select()
      .from(tasks)
      .where(whereClause)
      .orderBy(sql`${sortColumn} ${orderFn}`)
      .limit(pageSize)
      .offset(offset);

    return {
      data: rows.map((row) => toTaskResponse(this.rowToDTO(row))),
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  /**
   * 获取单个任务详情
   *
   * 业务规则：
   * - F3: 查看单个任务
   * - AC6: 已删除任务返回 404
   * - D4: 跨租户 → 403
   * - 权限：admin 可看所有，member 只能看自己创建或被指派的
   *
   * @param auth - 认证上下文
   * @param taskId - 任务 ID
   */
  async getTask(auth: AuthContext, taskId: string): Promise<TaskResponse> {
    const task = await this.findTaskOrThrow(taskId, auth.tenantId);

    // 权限检查（D4: 统一 403）
    this.checkReadPermission(auth, task);

    return toTaskResponse(this.rowToDTO(task));
  }

  /**
   * 更新任务
   *
   * 业务规则：
   * - F4: 更新标题、描述、状态、指派人
   * - AC4: 必须携带 version，冲突 → 409 TASK_VERSION_CONFLICT
   * - D6: version 匹配才允许更新，成功后 version +1
   * - 需校验 assigneeId（若提供且非 null）在同 tenant 内存在
   * - 权限：admin 可更新所有，member 只能更新自己创建或被指派的
   *
   * @param auth - 认证上下文
   * @param taskId - 任务 ID
   * @param body - 更新请求体（含 version）
   */
  async updateTask(
    auth: AuthContext,
    taskId: string,
    body: UpdateTaskBody,
  ): Promise<TaskResponse> {
    const task = await this.findTaskOrThrow(taskId, auth.tenantId);

    // 权限检查（D4: 统一 403）
    this.checkWritePermission(auth, task);

    // D6: version 并发控制 — version 不匹配 → 409
    if (body.version !== task.version) {
      throw AppErrors.versionConflict(body.version, task.version);
    }

    // 校验 assigneeId（若提供且非 null）
    if (body.assigneeId !== undefined && body.assigneeId !== null) {
      await this.validateAssigneeInTenant(body.assigneeId, auth.tenantId);
    }

    const now = new Date();
    const updateData: Partial<typeof tasks.$inferInsert> = {
      updatedAt: now,
      version: task.version + 1, // D6: version +1
    };

    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.assigneeId !== undefined) updateData.assigneeId = body.assigneeId;

    const [updated] = await this.db
      .update(tasks)
      .set(updateData)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.tenantId, auth.tenantId),
          isNull(tasks.deletedAt),
        ),
      )
      .returning();

    if (!updated) {
      throw AppErrors.taskNotFound(taskId);
    }

    return toTaskResponse(this.rowToDTO(updated));
  }

  /**
   * 删除任务（软删除）
   *
   * 业务规则：
   * - F5: 软删除，设置 deletedAt
   * - AC6: 已删除任务不出现在列表中
   * - AC7: 关联评论不删除，但不可访问（父资源已删除）
   * - 权限：admin 可删除所有，member 只能删除自己创建的
   *
   * @param auth - 认证上下文
   * @param taskId - 任务 ID
   */
  async deleteTask(auth: AuthContext, taskId: string): Promise<void> {
    const task = await this.findTaskOrThrow(taskId, auth.tenantId);

    // 权限检查：admin 可删除所有，member 只能删除自己创建的
    if (auth.role === 'member' && task.creatorId !== auth.userId) {
      throw AppErrors.insufficientPermissions();
    }

    // AC6: 软删除 — 设置 deletedAt
    await this.db
      .update(tasks)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.tenantId, auth.tenantId),
          isNull(tasks.deletedAt),
        ),
      );

    // AC7: 评论不删除，但因为父资源已标记删除，
    // 查询评论时会先检查父 Task 是否存在且未删除，所以评论自然不可访问
  }

  // ─── 内部方法 ────────────────────────────────────────────────────────────

  /**
   * 查找任务，不存在或已删除则抛出 404
   * 同时验证 tenantId 匹配（多租户隔离）
   */
  private async findTaskOrThrow(
    taskId: string,
    tenantId: string,
  ): Promise<TaskRow> {
    const [task] = await this.db
      .select()
      .from(tasks)
      .where(
        and(
          eq(tasks.id, taskId),
          eq(tasks.tenantId, tenantId),
          isNull(tasks.deletedAt), // AC6: 已删除视为不存在
        ),
      )
      .limit(1);

    if (!task) {
      throw AppErrors.taskNotFound(taskId);
    }

    return task;
  }

  /**
   * 校验 assigneeId 在同 tenant 内存在
   * 不存在 → 422 ASSIGNEE_NOT_FOUND
   */
  private async validateAssigneeInTenant(
    assigneeId: string,
    tenantId: string,
  ): Promise<void> {
    const [user] = await this.db
      .select({ id: users.id })
      .from(users)
      .where(
        and(eq(users.id, assigneeId), eq(users.tenantId, tenantId)),
      )
      .limit(1);

    if (!user) {
      throw AppErrors.assigneeNotFound(assigneeId);
    }
  }

  /**
   * 读取权限检查（D4: 统一 403）
   * - admin: 可读取同 tenant 所有任务
   * - member: 只能读取自己创建或被指派的任务
   */
  private checkReadPermission(auth: AuthContext, task: TaskRow): void {
    if (auth.role === 'admin') return;

    // member: 只能看自己创建的或被指派给自己的
    if (task.creatorId !== auth.userId && task.assigneeId !== auth.userId) {
      throw AppErrors.insufficientPermissions();
    }
  }

  /**
   * 写入权限检查（D4: 统一 403）
   * - admin: 可操作同 tenant 所有任务
   * - member: 只能操作自己创建或被指派的任务
   */
  private checkWritePermission(auth: AuthContext, task: TaskRow): void {
    if (auth.role === 'admin') return;

    if (task.creatorId !== auth.userId && task.assigneeId !== auth.userId) {
      throw AppErrors.insufficientPermissions();
    }
  }

  /**
   * 数据库行 → 内部 DTO 转换
   */
  private rowToDTO(row: TaskRow): TaskInternalDTO {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      status: row.status,
      assigneeId: row.assigneeId,
      creatorId: row.creatorId,
      tenantId: row.tenantId,
      version: row.version,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

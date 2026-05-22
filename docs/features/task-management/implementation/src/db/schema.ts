/**
 * Drizzle schema definitions for Task Management API
 *
 * 数据模型严格按照 contract.md 定义：
 * - User: 用户表（admin | member 角色）
 * - Task: 任务表（软删除 via deletedAt，并发控制 via version）
 * - Comment: 评论表（Task 的子资源，D1 父子资源建模）
 * - IdempotencyKey: 幂等键存储（D5 幂等策略）
 *
 * 索引设计：
 * - (tenantId, deletedAt, createdAt) 复合索引 → 性能约束 p99 < 200ms
 * - (tenantId, assigneeId) 索引 → 按指派人过滤
 */
import {
  pgTable,
  text,
  integer,
  timestamp,
  index,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

// ─── User ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: varchar('id', { length: 26 }).primaryKey(), // ULID
    email: text('email').notNull(),
    name: text('name').notNull(),
    role: text('role', { enum: ['admin', 'member'] }).notNull(),
    tenantId: varchar('tenant_id', { length: 26 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    emailUniqueIdx: uniqueIndex('users_email_unique_idx').on(table.email),
    tenantIdx: index('users_tenant_idx').on(table.tenantId),
  }),
);

// ─── Task ───────────────────────────────────────────────────────────────────
// AC1: title 1-200 chars
// AC2: status enum todo | in_progress | done
// AC6: deletedAt 软删除
// D6: version 字段并发控制

export const tasks = pgTable(
  'tasks',
  {
    id: varchar('id', { length: 26 }).primaryKey(), // ULID
    title: varchar('title', { length: 200 }).notNull(), // AC1: max 200 chars
    description: text('description'), // 0-5000 chars, optional
    status: text('status', {
      enum: ['todo', 'in_progress', 'done'], // AC2
    })
      .notNull()
      .default('todo'),
    assigneeId: varchar('assignee_id', { length: 26 }), // FK → users.id, nullable
    creatorId: varchar('creator_id', { length: 26 }).notNull(), // FK → users.id
    tenantId: varchar('tenant_id', { length: 26 }).notNull(),
    version: integer('version').notNull().default(1), // D6: starts at 1
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // AC6: soft delete
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // 性能约束：列表查询走复合索引 (tenantId, deletedAt, createdAt)
    tenantDeletedCreatedIdx: index('tasks_tenant_deleted_created_idx').on(
      table.tenantId,
      table.deletedAt,
      table.createdAt,
    ),
    // 按指派人过滤
    tenantAssigneeIdx: index('tasks_tenant_assignee_idx').on(
      table.tenantId,
      table.assigneeId,
    ),
    // 按状态过滤
    tenantStatusIdx: index('tasks_tenant_status_idx').on(
      table.tenantId,
      table.status,
    ),
  }),
);

// ─── Comment ────────────────────────────────────────────────────────────────
// D1: Comment 是 Task 的子资源，1:N 关系
// AC7: 评论不能独立于任务存在

export const comments = pgTable(
  'comments',
  {
    id: varchar('id', { length: 26 }).primaryKey(), // ULID
    taskId: varchar('task_id', { length: 26 })
      .notNull()
      .references(() => tasks.id), // FK → tasks.id
    authorId: varchar('author_id', { length: 26 })
      .notNull()
      .references(() => users.id), // FK → users.id
    content: text('content').notNull(), // 1-2000 chars
    tenantId: varchar('tenant_id', { length: 26 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    taskIdx: index('comments_task_idx').on(table.taskId),
    tenantTaskIdx: index('comments_tenant_task_idx').on(
      table.tenantId,
      table.taskId,
    ),
  }),
);

// ─── IdempotencyKey ─────────────────────────────────────────────────────────
// D5: 幂等策略 — key 存储 24 小时后过期

export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    key: varchar('key', { length: 255 }).primaryKey(),
    tenantId: varchar('tenant_id', { length: 26 }).notNull(),
    requestBody: text('request_body').notNull(), // JSON stringified body hash
    responseBody: text('response_body').notNull(), // JSON stringified response
    responseStatus: integer('response_status').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  },
  (table) => ({
    expiresIdx: index('idempotency_keys_expires_idx').on(table.expiresAt),
  }),
);

// ─── Type exports ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type IdempotencyKey = typeof idempotencyKeys.$inferSelect;
export type NewIdempotencyKey = typeof idempotencyKeys.$inferInsert;

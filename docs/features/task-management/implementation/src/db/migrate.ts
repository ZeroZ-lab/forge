/**
 * Database migration script for Task Management API
 *
 * 使用 Drizzle Kit 生成迁移文件，此脚本负责：
 * 1. 创建 users、tasks、comments、idempotency_keys 表
 * 2. 创建复合索引以满足性能约束 (p99 < 200ms)
 * 3. 创建部分索引（deletedAt IS NULL）用于列表查询优化
 *
 * 运行方式：
 *   npx drizzle-kit generate    # 生成迁移 SQL
 *   npx drizzle-kit migrate     # 执行迁移
 *
 * 或编程方式执行（本文件）：
 *   tsx src/db/migrate.ts
 */
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import * as schema from './schema';

const MIGRATIONS_DIR = './drizzle'; // drizzle-kit 输出目录

async function main() {
  const connectionString =
    process.env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/task_management';

  const pool = new Pool({ connectionString });
  const db = drizzle(pool, { schema });

  console.log('[migrate] Running migrations from:', MIGRATIONS_DIR);

  try {
    await migrate(db, { migrationsFolder: MIGRATIONS_DIR });
    console.log('[migrate] Migrations completed successfully');
  } catch (error) {
    console.error('[migrate] Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// ─── Raw SQL reference ──────────────────────────────────────────────────────
// 以下 SQL 是 drizzle-kit generate 预期产出的核心 DDL，
// 放在此处便于审阅。实际执行以 Drizzle 迁移文件为准。
//
// CREATE TABLE IF NOT EXISTS "users" (
//   "id" varchar(26) PRIMARY KEY,
//   "email" text NOT NULL,
//   "name" text NOT NULL,
//   "role" text NOT NULL CHECK ("role" IN ('admin', 'member')),
//   "tenant_id" varchar(26) NOT NULL,
//   "created_at" timestamptz NOT NULL DEFAULT now(),
//   "updated_at" timestamptz NOT NULL DEFAULT now()
// );
// CREATE UNIQUE INDEX "users_email_unique_idx" ON "users" ("email");
// CREATE INDEX "users_tenant_idx" ON "users" ("tenant_id");
//
// CREATE TABLE IF NOT EXISTS "tasks" (
//   "id" varchar(26) PRIMARY KEY,
//   "title" varchar(200) NOT NULL,
//   "description" text,
//   "status" text NOT NULL DEFAULT 'todo'
//          CHECK ("status" IN ('todo', 'in_progress', 'done')),
//   "assignee_id" varchar(26),
//   "creator_id" varchar(26) NOT NULL,
//   "tenant_id" varchar(26) NOT NULL,
//   "version" integer NOT NULL DEFAULT 1,
//   "deleted_at" timestamptz,
//   "created_at" timestamptz NOT NULL DEFAULT now(),
//   "updated_at" timestamptz NOT NULL DEFAULT now()
// );
// -- 性能约束：复合索引 (tenantId, deletedAt, createdAt)
// CREATE INDEX "tasks_tenant_deleted_created_idx"
//   ON "tasks" ("tenant_id", "deleted_at", "created_at");
// CREATE INDEX "tasks_tenant_assignee_idx"
//   ON "tasks" ("tenant_id", "assignee_id");
// CREATE INDEX "tasks_tenant_status_idx"
//   ON "tasks" ("tenant_id", "status");
//
// CREATE TABLE IF NOT EXISTS "comments" (
//   "id" varchar(26) PRIMARY KEY,
//   "task_id" varchar(26) NOT NULL REFERENCES "tasks"("id"),
//   "author_id" varchar(26) NOT NULL REFERENCES "users"("id"),
//   "content" text NOT NULL,
//   "tenant_id" varchar(26) NOT NULL,
//   "created_at" timestamptz NOT NULL DEFAULT now()
// );
// CREATE INDEX "comments_task_idx" ON "comments" ("task_id");
// CREATE INDEX "comments_tenant_task_idx"
//   ON "comments" ("tenant_id", "task_id");
//
// CREATE TABLE IF NOT EXISTS "idempotency_keys" (
//   "key" varchar(255) PRIMARY KEY,
//   "tenant_id" varchar(26) NOT NULL,
//   "request_body" text NOT NULL,
//   "response_body" text NOT NULL,
//   "response_status" integer NOT NULL,
//   "created_at" timestamptz NOT NULL DEFAULT now(),
//   "expires_at" timestamptz NOT NULL
// );
// CREATE INDEX "idempotency_keys_expires_idx"
//   ON "idempotency_keys" ("expires_at");

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

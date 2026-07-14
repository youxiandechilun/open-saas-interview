import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import path from "node:path";
import process from "node:process";
import { config as loadEnv } from "dotenv";
import pg from "pg";

loadEnv({ path: path.resolve(".env.server") });

const sourceUrl = process.env.DATABASE_URL;
if (!sourceUrl) throw new Error("DATABASE_URL is required in .env.server");

const applicationUrl = new URL(sourceUrl);
if (!applicationUrl.protocol.startsWith("postgres")) {
  throw new Error("DATABASE_URL must use PostgreSQL");
}

const databaseName = `motionpress_migration_check_${randomUUID().replaceAll(
  "-",
  "",
)}`;
const adminUrl = new URL(applicationUrl);
adminUrl.pathname = "/postgres";
const testUrl = new URL(applicationUrl);
testUrl.pathname = `/${databaseName}`;
const identifier = `"${databaseName}"`;

let databaseCreated = false;

try {
  const creator = new pg.Client({ connectionString: adminUrl.href });
  await creator.connect();
  await creator.query(`CREATE DATABASE ${identifier}`);
  databaseCreated = true;
  await creator.end();

  const command = process.platform === "win32" ? "npx.cmd" : "npx";
  const migration = spawnSync(
    command,
    ["prisma", "migrate", "deploy", "--schema", ".wasp/out/db/schema.prisma"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: testUrl.href },
      encoding: "utf8",
    },
  );
  if (migration.status !== 0) {
    throw new Error(
      `Fresh database migration failed:\n${migration.stdout}\n${migration.stderr}`,
    );
  }
  const applied = migration.stdout.match(/Applying migration/g)?.length ?? 0;
  console.log(
    `Fresh database migration verification passed (${applied} applied).`,
  );
} finally {
  if (databaseCreated) {
    const cleanup = new pg.Client({ connectionString: adminUrl.href });
    await cleanup.connect();
    await cleanup.query(
      "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
      [databaseName],
    );
    await cleanup.query(`DROP DATABASE IF EXISTS ${identifier}`);
    await cleanup.end();
  }
}

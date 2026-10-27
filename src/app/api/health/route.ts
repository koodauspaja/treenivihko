import { sql } from "drizzle-orm";
import { connection } from "next/server";
import { getDatabase } from "@/lib/db/index";
import { checkHealth } from "@/lib/health/check";

/**
 * Railway's health check, asked before a deploy takes traffic. At request time
 * always, never prerendered: the build has no database. decisions/026-railway.md
 */
export async function GET(): Promise<Response> {
  await connection();
  const health = await checkHealth(
    () => getDatabase().execute(sql`select 1`),
    process.env.RAILWAY_GIT_COMMIT_SHA
  );
  return Response.json(health, {
    status: health.status === "ok" ? 200 : 503,
    headers: { "Cache-Control": "no-store" },
  });
}

import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth/server";

/**
 * Better Auth's own routes: Google's sign-in and callback, the session read and
 * signing out. The handler is made per request from the lazily made server.
 * decisions/029-sign-in.md
 */
export function GET(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).GET(request);
}

export function POST(request: Request): Promise<Response> {
  return toNextJsHandler(getAuth()).POST(request);
}

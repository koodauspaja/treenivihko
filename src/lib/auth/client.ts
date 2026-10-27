"use client";

/**
 * The browser half of Better Auth. No `baseURL`: it defaults to the origin it
 * is served from. decisions/029-sign-in.md
 */

import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();

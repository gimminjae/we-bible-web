import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase-server";

function sanitizeNextPath(next: string | null) {
  if (!next || !next.startsWith("/")) {
    return "/settings";
  }

  return next;
}

function getRedirectOrigin(request: Request, fallbackOrigin: string) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const forwardedProto = request.headers.get("x-forwarded-proto") ?? "https";

  if (process.env.NODE_ENV !== "development" && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }

  return fallbackOrigin;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const authError = requestUrl.searchParams.get("error");
  const authErrorCode = requestUrl.searchParams.get("error_code");
  const next = sanitizeNextPath(requestUrl.searchParams.get("next"));
  const redirectOrigin = getRedirectOrigin(request, requestUrl.origin);
  const redirectUrl = new URL(next, redirectOrigin);

  if (authError || authErrorCode) {
    redirectUrl.searchParams.set("auth_error", authErrorCode ?? authError ?? "oauth_callback");
    return NextResponse.redirect(redirectUrl);
  }

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(redirectUrl);
    }
  }

  redirectUrl.searchParams.set("auth_error", "oauth_callback");
  return NextResponse.redirect(redirectUrl);
}

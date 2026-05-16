import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Refresh the session — this must be called to keep the session alive
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isServerAction = request.headers.has("next-action");

  if (isServerAction) {
    return response;
  }

  // Unauthenticated users cannot access /dashboard or /admin
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users: check approval and admin status
  if (user) {
    async function signOutAndRedirect(
      error: "deactivated" | "rejected" | "revoked",
    ) {
      await supabase.auth.signOut();
      const redirectRes = NextResponse.redirect(
        new URL(`/login?error=${error}`, request.url),
      );
      response.cookies.getAll().forEach((cookie) => {
        redirectRes.cookies.set(cookie.name, cookie.value, { ...cookie });
      });
      return redirectRes;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("approval_status, is_admin, is_active")
      .eq("id", user.id)
      .single();

    // Deactivated users are signed out and redirected to login
    if (profile && !profile.is_active) {
      return signOutAndRedirect("deactivated");
    }

    if (profile?.approval_status === "rejected") {
      return signOutAndRedirect("rejected");
    }

    if (profile?.approval_status === "revoked") {
      return signOutAndRedirect("revoked");
    }

    // Pending users get redirected to /pending until an admin acts on the request.
    if (
      profile &&
      profile.approval_status === "pending" &&
      !pathname.startsWith("/pending") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/register")
    ) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    // Admin users cannot access /dashboard
    if (pathname.startsWith("/dashboard") && profile?.is_admin) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }

    // Non-admin users cannot access /admin
    if (pathname.startsWith("/admin") && (!profile || !profile.is_admin)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Authenticated users shouldn't see login/register
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      if (profile?.is_admin && profile.approval_status === "approved") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (profile?.approval_status === "approved") {
        return NextResponse.redirect(new URL("/dashboard", request.url));
      }
      return NextResponse.redirect(new URL("/pending", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/pending",
  ],
};

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

  // Unauthenticated users cannot access /dashboard or /admin
  if (!user && (pathname.startsWith("/dashboard") || pathname.startsWith("/admin"))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated users: check approval and admin status
  if (user) {
    const { data: profile } = await supabase
      .from("users")
      .select("is_approved, is_admin, is_active")
      .eq("id", user.id)
      .single();

    // Deactivated users are signed out and redirected to login
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      const redirectRes = NextResponse.redirect(
        new URL("/login?error=deactivated", request.url),
      );
      // Copy sign-out cookies to the redirect response
      response.cookies.getAll().forEach((cookie) => {
        redirectRes.cookies.set(cookie.name, cookie.value, { ...cookie });
      });
      return redirectRes;
    }

    // Unapproved users get redirected to /pending (unless already there or logging out)
    if (
      profile &&
      !profile.is_approved &&
      !pathname.startsWith("/pending") &&
      !pathname.startsWith("/login") &&
      !pathname.startsWith("/register")
    ) {
      return NextResponse.redirect(new URL("/pending", request.url));
    }

    // Non-admin users cannot access /admin
    if (pathname.startsWith("/admin") && (!profile || !profile.is_admin)) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    // Authenticated users shouldn't see login/register
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      if (profile?.is_admin) {
        return NextResponse.redirect(new URL("/admin", request.url));
      }
      if (profile?.is_approved) {
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

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ROLE_HOME } from "@/lib/constants";
import type { UserRole } from "@/lib/supabase/types";

/** Protected areas, each owned by exactly one role. */
const ROLE_AREAS: { prefix: string; role: UserRole }[] = [
  { prefix: "/dashboard", role: "researcher" },
  { prefix: "/adviser", role: "adviser" },
  { prefix: "/admin", role: "librarian" },
];

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

  const requestedArea = ROLE_AREAS.find((a) => pathname.startsWith(a.prefix));

  // Unauthenticated users cannot access any role area
  if (!user && requestedArea) {
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

    // This client is built without the Database generic, so the row comes back
    // untyped.
    const { data: profile } = (await supabase
      .from("users")
      .select("approval_status, role, is_active")
      .eq("id", user.id)
      .single()) as {
      data: {
        approval_status: string;
        role: UserRole;
        is_active: boolean;
      } | null;
    };

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

    const home = profile ? ROLE_HOME[profile.role] : "/dashboard";

    // Each role is confined to its own area
    if (requestedArea && (!profile || profile.role !== requestedArea.role)) {
      return NextResponse.redirect(new URL(home, request.url));
    }

    // Authenticated users shouldn't see login/register
    if (pathname.startsWith("/login") || pathname.startsWith("/register")) {
      if (profile?.approval_status === "approved") {
        return NextResponse.redirect(new URL(home, request.url));
      }
      return NextResponse.redirect(new URL("/pending", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/adviser/:path*",
    "/admin/:path*",
    "/login",
    "/register",
    "/pending",
  ],
};

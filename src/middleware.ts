import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = token?.role;

    // 1. Restrict /admin to ADMIN role only
    if (path.startsWith("/admin") && role !== "ADMIN") {
      if (role === "SELLER") {
        return NextResponse.redirect(new URL("/seller", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 2. Restrict /seller to SELLER and ADMIN only
    if (path.startsWith("/seller") && role !== "SELLER" && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // 3. Prevent SELLER from entering BUYER-specific pages (redirect to /seller)
    const isBuyerPage = 
      path.startsWith("/dashboard") || 
      path.startsWith("/orders") || 
      path.startsWith("/quotations") || 
      path.startsWith("/products");

    if (isBuyerPage && role === "SELLER") {
      return NextResponse.redirect(new URL("/seller", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    secret: process.env.NEXTAUTH_SECRET || "h4ck4th0n_s3cr3t_jWt_k3y_s0m3_r4nd0m_v4lu3",
  }
);

export const config = {
  matcher: [
    "/admin/:path*",
    "/seller/:path*",
    "/dashboard/:path*",
    "/orders/:path*",
    "/quotations/:path*",
    "/products/:path*",
  ],
};

import Link from "next/link";
import { getServerSession } from "next-auth/next";
import { authOptions } from "src/lib/auth";
import { ArrowRight, ShieldCheck, Scale, DollarSign, Activity, FileCheck, Layers } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Card, CardContent } from "src/components/ui/card";

export default async function LandingPage() {
  const session = await getServerSession(authOptions);
  const isLoggedIn = !!session;
  const dashboardLink = session?.user.role === "ADMIN" ? "/admin" : "/dashboard";

  return (
    <div className="relative isolate overflow-hidden min-h-[80vh] flex flex-col justify-center">
      {/* Dynamic Background Glow */}
      <div className="absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80" aria-hidden="true">
        <div className="relative left-[calc(50%-11rem)] aspect-1155/678 w-[36rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-violet-600 to-indigo-900 opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72rem]"></div>
      </div>

      <div className="mx-auto max-w-5xl text-center space-y-8">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-semibold text-primary">
          <Activity className="h-4 w-4 animate-pulse" />
          <span>Hackathon Assignment Project Edition</span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-b from-white to-slate-400 bg-clip-text text-transparent">
          Inventory & Order Management
          <span className="block bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent mt-2">
            With Zero Decimal Error.
          </span>
        </h1>

        <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
          A high-precision system using PostgreSQL <code className="text-primary font-mono text-base bg-primary/5 px-1.5 py-0.5 rounded border border-primary/10">NUMERIC(20,6)</code>,
          automated unit conversions, role-based workflows, and next-generation glassmorphism dashboards.
        </p>

        <div className="flex items-center justify-center gap-4">
          {isLoggedIn ? (
            <Link href={dashboardLink}>
              <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-primary/20 transition-all duration-300">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/login">
                <Button size="lg" className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-primary/20">
                  Login Access <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/register">
                <Button size="lg" variant="outline" className="border-border hover:bg-muted text-white">
                  Register Seller Account
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Grid of Key Features */}
      <div className="mx-auto mt-20 max-w-6xl grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="pt-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 border border-violet-500/20">
              <Scale className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">High-Precision Scaling</h3>
            <p className="text-sm text-muted-foreground">
              Quantity storage and pricing values configured with PostgreSQL NUMERIC(20,6) to prevent standard JavaScript binary float conversion inaccuracy.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="pt-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Layers className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Unit Conversion System</h3>
            <p className="text-sm text-muted-foreground">
              Standard weight and volume conversions are computed automatically: kg to grams, liters to milliliters, and items to count.
            </p>
          </CardContent>
        </Card>

        <Card className="hover:translate-y-[-4px] transition-all duration-300">
          <CardContent className="pt-6 space-y-3">
            <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 border border-cyan-500/20">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold text-white">Dual Role System</h3>
            <p className="text-sm text-muted-foreground">
              Distinct panels for Seller (Order/Quotation creators, Catalog search) and Administrator (CRUD, stock adjustment, approvals, logs).
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl sm:top-[calc(100%-30rem)]" aria-hidden="true">
        <div className="relative left-[calc(50%+3rem)] aspect-1155/678 w-[36rem] -translate-x-1/2 bg-gradient-to-tr from-cyan-600 to-indigo-900 opacity-15 sm:left-[calc(50%+36rem)] sm:w-[72rem]"></div>
      </div>
    </div>
  );
}

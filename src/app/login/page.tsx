"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { ArrowRight, Lock, Mail, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "src/components/ui/card";
import { Input } from "src/components/ui/input";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFields = z.infer<typeof loginSchema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Read error message from URL query params (e.g. NextAuth callback errors)
  const authError = searchParams.get("error");
  const displayError = error || (authError === "CredentialsSignin" ? "Invalid email or password" : authError ? "Authentication failed" : null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFields) => {
    setLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        email: data.email.toLowerCase(),
        password: data.password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error === "CredentialsSignin" || res.error === "Error: Invalid email or password" ? "Invalid email or password" : res.error);
        setLoading(false);
      } else {
        // Query database via quick API or check custom callback to see role
        // For simplicity, we can fetch session to check where to redirect
        const sessionRes = await fetch("/api/auth/session");
        const session = await sessionRes.json();
        
        if (session?.user?.role === "ADMIN") {
          router.push("/admin");
        } else {
          router.push("/dashboard");
        }
        router.refresh();
      }
    } catch (err) {
      console.error(err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[75vh] grid-cols-1 md:grid-cols-12 rounded-3xl overflow-hidden border border-border/40 bg-gradient-to-b from-card/30 to-card/10 backdrop-blur-md shadow-2xl">
      {/* Left Column: Scientific Visual Panel */}
      <div className="hidden md:flex md:col-span-6 lg:col-span-7 flex-col justify-between p-10 relative overflow-hidden">
        {/* Background Image with overlay */}
        <div className="absolute inset-0 z-0">
          <img
            src="/images/medchem_login_banner.png"
            alt="AasaMedChem Login Banner"
            className="w-full h-full object-cover opacity-40 hover:scale-102 transition-transform duration-10000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-indigo-950/20"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-background/50 to-transparent"></div>
        </div>
        
        {/* Brand identity */}
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <span className="bg-gradient-to-r from-violet-400 via-indigo-400 to-cyan-400 bg-clip-text text-2xl font-black tracking-wider text-transparent font-sans">
              AasaMedChem
            </span>
          </div>
        </div>

        {/* Catchy Scientific Tagline */}
        <div className="relative z-10 space-y-3 mt-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-violet-500/15 px-3.5 py-1 text-xs font-semibold text-violet-300 border border-violet-500/20 backdrop-blur-sm">
            Chemical Inventory & Fulfillment
          </span>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            High Precision Molecular Cataloging & Auditing
          </h1>
          <p className="text-sm text-slate-300 max-w-lg leading-relaxed font-normal">
            AasaMedChem streamlines procurement, logistics, and stock-level calculations with dynamic unit conversions and integrated seller permissions.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-border/10 mt-8">
          <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
            Secured Portal • High Precision Numeric(20,6) Checked
          </p>
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="col-span-1 md:col-span-6 lg:col-span-5 flex items-center justify-center p-8 bg-card/20 border-l border-border/20">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Welcome Back
            </h2>
            <p className="text-xs text-muted-foreground">
              Sign in with your credentials to manage inventory or place orders
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {displayError && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/15 border border-destructive/20 p-3 text-xs text-rose-400 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{displayError}</span>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground" htmlFor="email">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="pl-9 h-10 bg-background/30 border-border/50 focus:border-primary/50"
                  disabled={loading}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <span className="text-xs text-destructive font-medium block mt-1">{errors.email.message}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-10 bg-background/30 border-border/50 focus:border-primary/50"
                  disabled={loading}
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <span className="text-xs text-destructive font-medium block mt-1">{errors.password.message}</span>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 h-10 shadow-lg shadow-indigo-600/10 mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  Log In <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/register" className="text-indigo-400 hover:underline font-semibold transition-colors duration-200">
                Register here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[70vh] items-center justify-center">
        <div className="h-8 w-8 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}

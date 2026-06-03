"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import Link from "next/link";
import { ArrowRight, Lock, Mail, User, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "src/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "src/components/ui/card";
import { Input } from "src/components/ui/input";

const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password is required"),
    role: z.enum(["BUYER", "SELLER"]),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type RegisterFields = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFields>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      role: "BUYER",
    },
  });

  const onSubmit = async (data: RegisterFields) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.name,
          email: data.email,
          password: data.password,
          role: data.role,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Failed to register user");
        setLoading(false);
      } else {
        setSuccess(true);
        setLoading(false);
        // Redirect to login page after 2 seconds
        setTimeout(() => {
          router.push("/login?error=RegistrationSuccess");
        }, 2000);
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
            alt="AasaMedChem Register Banner"
            className="w-full h-full object-cover opacity-45 hover:scale-102 transition-transform duration-10000"
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
            Join the Network
          </span>
          <h1 className="text-3xl lg:text-4xl font-black tracking-tight text-white leading-tight">
            Register a Buyer or Seller Account
          </h1>
          <p className="text-sm text-slate-300 max-w-lg leading-relaxed font-normal">
            Gain access to high-precision chemical catalogs, automated calculations, inventory movement logs, and secure quotation workflows.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 pt-6 border-t border-border/10 mt-8">
          <p className="text-[10px] text-muted-foreground font-mono tracking-wider uppercase">
            Secured Portal • High Precision Numeric(20,6) Checked
          </p>
        </div>
      </div>

      {/* Right Column: Registration Card */}
      <div className="col-span-1 md:col-span-6 lg:col-span-5 flex items-center justify-center p-8 bg-card/20 border-l border-border/20">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1.5 text-center md:text-left">
            <h2 className="text-2xl font-bold tracking-tight text-white">
              Create Account
            </h2>
            <p className="text-xs text-muted-foreground">
              Register as a buyer or seller to access the system
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
            {error && (
              <div className="flex items-start gap-2 rounded-lg bg-destructive/15 border border-destructive/20 p-3 text-xs text-rose-400 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-xs text-emerald-400 font-medium animate-pulse">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Account registered successfully! Redirecting to login...</span>
              </div>
            )}

            {/* Name Field */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground" htmlFor="name">
                Full Name
              </label>
              <div className="relative">
                <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  className="pl-9 h-10 bg-background/30 border-border/50 focus:border-primary/50"
                  disabled={loading || success}
                  {...register("name")}
                />
              </div>
              {errors.name && (
                <span className="text-xs text-destructive font-medium block mt-1">{errors.name.message}</span>
              )}
            </div>

            {/* Email Field */}
            <div className="space-y-1">
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
                  disabled={loading || success}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <span className="text-xs text-destructive font-medium block mt-1">{errors.email.message}</span>
              )}
            </div>

            {/* Role Select Field */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground" htmlFor="role">
                I want to register as
              </label>
              <select
                id="role"
                disabled={loading || success}
                className="w-full rounded-lg border border-border/50 bg-background/30 text-foreground px-3.5 py-2 text-sm transition-all focus:ring-1 focus:ring-ring focus:border-primary disabled:opacity-50 h-10 select-icon-fix animate-in fade-in duration-200"
                {...register("role")}
              >
                <option value="BUYER">Buyer (Browse & Purchase Chemicals)</option>
                <option value="SELLER">Seller (Add Chemicals & Set Prices)</option>
              </select>
              {errors.role && (
                <span className="text-xs text-destructive font-medium block mt-1">{errors.role.message}</span>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
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
                  disabled={loading || success}
                  {...register("password")}
                />
              </div>
              {errors.password && (
                <span className="text-xs text-destructive font-medium block mt-1">{errors.password.message}</span>
              )}
            </div>

            {/* Confirm Password Field */}
            <div className="space-y-1">
              <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground" htmlFor="confirmPassword">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/60" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  className="pl-9 h-10 bg-background/30 border-border/50 focus:border-primary/50"
                  disabled={loading || success}
                  {...register("confirmPassword")}
                />
              </div>
              {errors.confirmPassword && (
                <span className="text-xs text-destructive font-medium block mt-1">{errors.confirmPassword.message}</span>
              )}
            </div>

            <Button
              type="submit"
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 h-10 shadow-lg shadow-indigo-600/10 mt-6"
              disabled={loading || success}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Registering...
                </>
              ) : (
                <>
                  Register <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
            
            <p className="text-xs text-center text-muted-foreground mt-4">
              Already have an account?{" "}
              <Link href="/login" className="text-indigo-400 hover:underline font-semibold transition-colors duration-200">
                Log in here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

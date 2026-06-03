"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { 
  Package, 
  ShoppingCart, 
  FileText, 
  Users, 
  History, 
  Layers, 
  LogOut, 
  Menu, 
  X,
  LayoutDashboard
} from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!session) return null;

  const role = session.user.role;
  const isAdmin = role === "ADMIN";

  const adminLinks = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products CRUD", icon: Package },
    { href: "/admin/inventory", label: "Inventory Logs", icon: Layers },
    { href: "/admin/orders", label: "Orders Manager", icon: ShoppingCart },
    { href: "/admin/quotations", label: "Quotations Manager", icon: FileText },
    { href: "/admin/users", label: "Users Panel", icon: Users },
  ];

  const sellerLinks = [
    { href: "/seller", label: "Dashboard", icon: LayoutDashboard },
    { href: "/seller/products", label: "Manage Products", icon: Package },
    { href: "/seller/inventory", label: "Stock Manager", icon: Layers },
    { href: "/seller/orders", label: "Manage Orders", icon: ShoppingCart },
  ];

  const buyerLinks = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/products", label: "Chemical Catalog", icon: Package },
    { href: "/orders", label: "My Orders", icon: History },
    { href: "/quotations", label: "My Quotations", icon: FileText },
  ];

  const links = role === "ADMIN" ? adminLinks : role === "SELLER" ? sellerLinks : buyerLinks;

  const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href={role === "ADMIN" ? "/admin" : role === "SELLER" ? "/seller" : "/dashboard"} className="flex items-center gap-2">
              <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 bg-clip-text text-xl font-bold tracking-wider text-transparent">
                AasaMedChem
              </span>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {links.map((link) => {
                const Icon = link.icon;
                const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* User Details & Sign Out */}
          <div className="hidden md:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-sm font-semibold text-foreground">
                {session.user.name}
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant={isAdmin ? "destructive" : "success"} className="px-1.5 py-0 text-[10px]">
                  {session.user.role}
                </Badge>
              </div>
            </div>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="text-muted-foreground hover:text-destructive transition-colors duration-200"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden items-center gap-2">
            <Badge variant={isAdmin ? "destructive" : "success"} className="text-[10px]">
              {session.user.role}
            </Badge>
            <button
              onClick={toggleMobileMenu}
              className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/20 bg-background px-2 pt-2 pb-4 space-y-1">
          {links.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-3 text-base font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-5 w-5" />
                {link.label}
              </Link>
            );
          })}
          <div className="border-t border-border/20 mt-4 pt-4 px-3 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-foreground">
                {session.user.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {session.user.email}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex items-center gap-2 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}

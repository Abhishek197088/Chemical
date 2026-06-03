import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import Link from "next/link";
import { 
  BarChart3, 
  ArrowRight, 
  AlertTriangle, 
  Layers, 
  Package, 
  Database 
} from "lucide-react";

export default async function SellerDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Allow sellers and admins
  if (session.user.role !== "SELLER" && session.user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  // Fetch counts and logs
  const [
    productsCount,
    categoriesCount,
    allProducts,
    recentLogs
  ] = await Promise.all([
    prisma.product.count(),
    prisma.category.count(),
    prisma.product.findMany({
      include: { category: true }
    }),
    prisma.inventoryLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        product: { select: { name: true, sku: true, baseUnit: true } }
      }
    })
  ]);

  // Filter low stock items based on internal base units
  const lowStockProducts = allProducts.filter((product) => {
    const qty = product.inventoryQuantity.toNumber();
    const unit = product.baseUnit;

    if (["g", "mL"].includes(unit)) {
      return qty < 10000; // Less than 10kg/10L
    } else if (unit === "kg" || unit === "L") {
      return qty < 10;
    } else {
      return qty < 5; // items
    }
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-primary" /> Seller Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your chemical catalog, monitor inventory stock levels, and audit stock adjustments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/seller/products">
            <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold">
              Manage Products <Package className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/seller/inventory">
            <Button size="sm" variant="outline" className="border-border text-white hover:bg-muted">
              Adjust Stock <Layers className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Products */}
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total Products
            </CardTitle>
            <Package className="h-4 w-4 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">
              {productsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Chemicals in inventory</p>
          </CardContent>
        </Card>

        {/* Low Stock alerts count */}
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Low Stock Items
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">
              {lowStockProducts.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Require replenishment</p>
          </CardContent>
        </Card>

        {/* Active categories count */}
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Chemical Categories
            </CardTitle>
            <Database className="h-4 w-4 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">
              {categoriesCount}
            </div>
            <p className="text-xs text-muted-foreground mt-1">System categories active</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Latest Activity Logs */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-white">Stock Transaction History</CardTitle>
              <CardDescription>Review the 5 latest inventory movements in the system</CardDescription>
            </div>
            <Link href="/seller/inventory">
              <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
                View Logs <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">No inventory logs available.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Qty Shift</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentLogs.map((log) => {
                    const isPositive = log.changeQuantity.toNumber() > 0;
                    const changeVal = Math.abs(log.changeQuantity.toNumber());
                    let displayQty = changeVal.toLocaleString();
                    if (["kg", "L"].includes(log.product.baseUnit)) {
                      displayQty = `${(changeVal / 1000).toLocaleString()} ${log.product.baseUnit}`;
                    } else {
                      displayQty = `${changeVal.toLocaleString()} ${log.product.baseUnit}`;
                    }

                    return (
                      <TableRow key={log.id}>
                        <TableCell className="font-semibold text-white">
                          {log.product.name}
                          <span className="block text-[10px] text-muted-foreground font-mono">
                            SKU: {log.product.sku}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={log.type === "STOCK_IN" || log.type === "RETURN" ? "success" : "destructive"}>
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell className={`font-semibold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                          {isPositive ? "+" : "-"}{displayQty}
                        </TableCell>
                        <TableCell className="max-w-[150px] truncate" title={log.notes || ""}>
                          {log.notes || "N/A"}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(log.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card className="border-border/40">
          <CardHeader className="flex flex-row items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <CardTitle className="text-lg font-semibold text-white">Low Stock Alerts</CardTitle>
              <CardDescription>Chemicals that require immediate replenishment</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {lowStockProducts.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg border-border/40">
                <p className="text-sm text-muted-foreground">All items have healthy stock levels! 🎉</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
                {lowStockProducts.map((p) => {
                  const rawQty = p.inventoryQuantity.toNumber();
                  let displayQty = rawQty.toLocaleString();
                  if (["kg", "L"].includes(p.baseUnit)) {
                    displayQty = `${(rawQty / 1000).toLocaleString()} ${p.baseUnit}`;
                  } else {
                    displayQty = `${rawQty.toLocaleString()} ${p.baseUnit}`;
                  }

                  return (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 transition-all duration-200">
                      <div>
                        <p className="text-xs font-bold text-white leading-tight">{p.name}</p>
                        <span className="text-[10px] text-muted-foreground font-mono">SKU: {p.sku}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-amber-500 uppercase block font-semibold">Remaining</span>
                        <span className="text-xs font-bold text-amber-500">{displayQty}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

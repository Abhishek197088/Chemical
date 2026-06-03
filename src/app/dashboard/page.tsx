import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "src/lib/auth";
import prisma from "src/lib/prisma";
import { formatINR } from "src/lib/utils/conversion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "src/components/ui/card";
import { Badge } from "src/components/ui/badge";
import { Button } from "src/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import Link from "next/link";
import { ShoppingCart, FileText, IndianRupee, ArrowRight, Package, ClipboardList, CheckCircle } from "lucide-react";

export default async function UserDashboard() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  // Double check role
  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  const userId = session.user.id;

  // Parallel database fetches
  const [ordersCount, quotationsCount, recentOrders, totalSpentResult] = await Promise.all([
    prisma.order.count({ where: { userId } }),
    prisma.quotation.count({ where: { userId } }),
    prisma.order.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    }),
    prisma.order.aggregate({
      where: {
        userId,
        status: { in: ["APPROVED", "COMPLETED"] },
      },
      _sum: {
        totalAmount: true,
      },
    }),
  ]);

  const totalSpent = totalSpentResult._sum.totalAmount || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">
            Hello, {session.user.name} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Welcome to your seller dashboard. Manage your product catalog, quotations, and active orders.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/products">
            <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold">
              Browse Products <Package className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          <Link href="/quotations">
            <Button variant="outline" className="border-border text-white hover:bg-muted">
              Request Quotation <FileText className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Spent Metric */}
        <Card className="relative overflow-hidden border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Total Approved Spend
            </CardTitle>
            <IndianRupee className="h-5 w-5 text-indigo-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">
              {formatINR(totalSpent)}
            </div>
            <CardDescription className="mt-1">
              Sum of approved and completed orders
            </CardDescription>
          </CardContent>
        </Card>

        {/* Orders Metric */}
        <Card className="relative overflow-hidden border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Total Orders Placed
            </CardTitle>
            <ShoppingCart className="h-5 w-5 text-violet-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">
              {ordersCount}
            </div>
            <CardDescription className="mt-1">
              Active and historical orders
            </CardDescription>
          </CardContent>
        </Card>

        {/* Quotations Metric */}
        <Card className="relative overflow-hidden border-border/40">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Quotations Requested
            </CardTitle>
            <FileText className="h-5 w-5 text-cyan-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white tracking-tight">
              {quotationsCount}
            </div>
            <CardDescription className="mt-1">
              Reviewable price quotations
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Area */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Orders Table */}
        <Card className="lg:col-span-2 border-border/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-lg font-semibold text-white">Recent Orders</CardTitle>
              <CardDescription>Review the status of your 5 most recent purchases</CardDescription>
            </div>
            <Link href="/orders">
              <Button variant="ghost" size="sm" className="text-indigo-400 hover:text-indigo-300">
                View All <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg border-border/40">
                <ClipboardList className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">You have not placed any orders yet.</p>
                <Link href="/products" className="mt-4 inline-block">
                  <Button variant="link" className="text-primary font-semibold">Place your first order</Button>
                </Link>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order ID</TableHead>
                    <TableHead>Products</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentOrders.map((order) => {
                    const productSummary = order.items
                      .map((item) => item.product.name)
                      .join(", ");
                    const orderStatus = order.status;
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs text-white">
                          #{order.id.slice(0, 8)}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={productSummary}>
                          {productSummary}
                        </TableCell>
                        <TableCell className="font-semibold text-white">
                          {formatINR(order.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              orderStatus === "COMPLETED"
                                ? "info"
                                : orderStatus === "APPROVED"
                                ? "success"
                                : orderStatus === "REJECTED"
                                ? "destructive"
                                : "warning"
                            }
                          >
                            {orderStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions / Tips */}
        <div className="space-y-6">
          <Card className="border-border/40">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-white">System Guide</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400 shrink-0">
                  1
                </div>
                <div>
                  <p className="font-semibold text-white">Browse & Conversion</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Navigate to Catalog, choose items and select quantities in weights (kg, g), volumes (L, mL), or counts (items).
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  2
                </div>
                <div>
                  <p className="font-semibold text-white">Quotation Requests</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Submit multi-item quotes when purchasing large order configurations. Admins will review and approve custom prices.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="h-6 w-6 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400 shrink-0">
                  3
                </div>
                <div>
                  <p className="font-semibold text-white">Order Confirmations</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Orders start as Pending. Once verified by Admin, stock is permanently deducted and marked as Approved or Completed.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

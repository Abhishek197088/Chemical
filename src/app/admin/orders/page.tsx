"use client";

import { useEffect, useState } from "react";
import { 
  ShoppingCart, 
  CheckCircle, 
  XCircle, 
  CheckSquare, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp,
  User
} from "lucide-react";
import { formatINR, formatINRInWords } from "src/lib/utils/conversion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";

interface OrderItem {
  id: string;
  orderedQuantity: string;
  orderedUnit: string;
  calculatedQuantityInBase: string;
  pricePerUnit: string;
  subtotal: string;
  product: {
    name: string;
    sku: string;
    baseUnit: string;
  };
}

interface Order {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
  items: OrderItem[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/orders");
      const data = await res.json();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    setActionLoadingId(`${orderId}-${newStatus}`);
    setMessage(null);

    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ success: false, text: result.error || "Failed to update status" });
      } else {
        setMessage({ success: true, text: `Order status updated to ${newStatus}!` });
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      setMessage({ success: false, text: "An unexpected error occurred" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (orderId: string) => {
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const filteredOrders = orders.filter((order) => {
    return statusFilter === "ALL" || order.status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-primary" /> Purchase Orders Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Review submitted seller orders, inspect quantity conversions, and update fulfillment states.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders} className="border-border text-white self-start">
          <RefreshCw className="mr-2 h-4 w-4" /> Sync Orders
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card/20 border border-border/40 p-4 rounded-xl backdrop-blur-md">
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED", "COMPLETED"].map((status) => (
            <Button
              key={status}
              variant={statusFilter === status ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(status)}
              className={statusFilter === status ? "" : "border-border text-white hover:bg-muted"}
            >
              {status}
            </Button>
          ))}
        </div>
        {message && (
          <div className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
            message.success 
              ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
              : "bg-destructive/10 border-destructive/20 text-destructive"
          }`}>
            {message.success ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
            <span>{message.text}</span>
          </div>
        )}
      </div>

      {/* Main orders audit board */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-8 w-8 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl border-border/40 bg-card/10">
          <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-lg font-semibold text-white">No orders found</h3>
          <p className="text-sm text-muted-foreground mt-1">There are no orders matching this status filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => {
            const isExpanded = !!expandedOrders[order.id];
            return (
              <div
                key={order.id}
                className="border border-border/40 rounded-xl overflow-hidden bg-card/20 hover:border-border transition-all duration-200"
              >
                {/* Header clickable summary */}
                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 bg-muted/5 hover:bg-muted/10 cursor-pointer" onClick={() => toggleExpand(order.id)}>
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="font-mono text-xs text-white font-semibold">
                        #{order.id.slice(0, 8)}
                      </span>
                      <Badge
                        variant={
                          order.status === "COMPLETED"
                            ? "info"
                            : order.status === "APPROVED"
                            ? "success"
                            : order.status === "REJECTED"
                            ? "destructive"
                            : "warning"
                        }
                      >
                        {order.status}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        Placed by: {order.user.name || order.user.email}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Date: {new Date(order.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right max-w-xs">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Total Amount</span>
                      <span className="text-sm font-bold text-white">
                        {formatINR(order.totalAmount)}
                      </span>
                      <span className="text-[9px] text-indigo-300 block italic font-medium leading-tight">
                        {formatINRInWords(order.totalAmount)}
                      </span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {order.status === "PENDING" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, "APPROVED")}
                            disabled={!!actionLoadingId}
                            className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 text-xs h-8 px-2.5 font-semibold"
                          >
                            {actionLoadingId === `${order.id}-APPROVED` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <CheckCircle className="mr-1 h-3.5 w-3.5" /> Approve
                              </>
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(order.id, "REJECTED")}
                            disabled={!!actionLoadingId}
                            className="bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs h-8 px-2.5 font-semibold"
                          >
                            {actionLoadingId === `${order.id}-REJECTED` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                              </>
                            )}
                          </Button>
                        </>
                      )}
                      
                      {order.status === "APPROVED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, "COMPLETED")}
                          disabled={!!actionLoadingId}
                          className="bg-sky-500/10 border-sky-500/20 text-sky-500 hover:bg-sky-500/20 text-xs h-8 px-2.5 font-semibold"
                        >
                          {actionLoadingId === `${order.id}-COMPLETED` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <>
                              <CheckSquare className="mr-1 h-3.5 w-3.5" /> Complete
                            </>
                          )}
                        </Button>
                      )}

                      {order.status === "REJECTED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(order.id, "PENDING")}
                          disabled={!!actionLoadingId}
                          className="border-border hover:bg-muted text-white text-xs h-8 px-2.5 font-semibold"
                        >
                          {actionLoadingId === `${order.id}-PENDING` ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            "Reset to Pending"
                          )}
                        </Button>
                      )}
                    </div>

                    <div className="text-muted-foreground">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded items view */}
                {isExpanded && (
                  <div className="border-t border-border/20 bg-card/45 p-4 animate-in slide-in-from-top-2 duration-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-8 py-0">Product</TableHead>
                          <TableHead className="h-8 py-0 text-center">Ordered Qty</TableHead>
                          <TableHead className="h-8 py-0 text-center">Conversion Audit</TableHead>
                          <TableHead className="h-8 py-0 text-right">Price per Unit</TableHead>
                          <TableHead className="h-8 py-0 text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {order.items.map((item) => (
                          <TableRow key={item.id} className="hover:bg-transparent">
                            <TableCell className="py-2.5 font-semibold text-white">
                              {item.product.name}
                              <span className="block text-[10px] text-muted-foreground font-mono">
                                SKU: {item.product.sku}
                              </span>
                            </TableCell>
                            <TableCell className="py-2.5 text-center">
                              {item.orderedQuantity} {item.orderedUnit}
                            </TableCell>
                            <TableCell className="py-2.5 text-center text-xs font-mono text-muted-foreground">
                              {item.calculatedQuantityInBase} {["kg", "g"].includes(item.product.baseUnit) ? "grams (g)" : ["L", "mL"].includes(item.product.baseUnit) ? "milliliters (mL)" : "items"}
                            </TableCell>
                            <TableCell className="py-2.5 text-right font-mono text-xs">
                              {formatINR(item.pricePerUnit)}
                            </TableCell>
                            <TableCell className="py-2.5 text-right font-semibold text-white">
                              {formatINR(item.subtotal)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

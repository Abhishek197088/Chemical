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
  Edit,
  X
} from "lucide-react";
import { formatINR, formatINRInWords } from "src/lib/utils/conversion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Select } from "src/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";

interface OrderItem {
  id: string;
  productId: string;
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

export default function SellerOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Modify Modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [modifyItems, setModifyItems] = useState<{ productId: string; name: string; sku: string; baseUnit: string; qty: number; unit: string }[]>([]);
  const [modifyLoading, setModifyLoading] = useState(false);

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

  const handleOpenModifyModal = (order: Order) => {
    setEditingOrder(order);
    const itemsMapped = order.items.map((item) => ({
      productId: item.productId,
      name: item.product.name,
      sku: item.product.sku,
      baseUnit: item.product.baseUnit,
      qty: Number(item.orderedQuantity),
      unit: item.orderedUnit,
    }));
    setModifyItems(itemsMapped);
    setMessage(null);
  };

  const handleQtyChange = (index: number, newQty: number) => {
    const updated = [...modifyItems];
    updated[index].qty = Math.max(0.000001, newQty);
    setModifyItems(updated);
  };

  const handleUnitChange = (index: number, newUnit: string) => {
    const updated = [...modifyItems];
    updated[index].unit = newUnit;
    setModifyItems(updated);
  };

  const handleModifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;
    setModifyLoading(true);

    const payload = {
      items: modifyItems.map((item) => ({
        productId: item.productId,
        orderedQuantity: item.qty,
        orderedUnit: item.unit,
      })),
    };

    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ success: false, text: result.error || "Failed to modify order" });
      } else {
        setMessage({ success: true, text: "Order items modified successfully!" });
        setEditingOrder(null);
        fetchOrders();
      }
    } catch (err) {
      console.error(err);
      setMessage({ success: false, text: "An unexpected error occurred" });
    } finally {
      setModifyLoading(false);
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

  const getCompatibleUnits = (baseUnit: string) => {
    if (["g", "kg"].includes(baseUnit)) return ["kg", "g"];
    if (["mL", "L"].includes(baseUnit)) return ["L", "mL"];
    return ["items"];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-primary" /> Seller Orders Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit submitted orders, modify chemical quantities/units, and approve or reject client requests.
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
          <p className="text-sm text-muted-foreground mt-1">There are no orders matching this filter.</p>
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
                            onClick={() => handleOpenModifyModal(order)}
                            className="border-border hover:bg-muted text-white text-xs h-8 px-2.5 font-semibold flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" /> Edit Order
                          </Button>
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
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenModifyModal(order)}
                            className="border-border hover:bg-muted text-white text-xs h-8 px-2.5 font-semibold flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" /> Edit Order
                          </Button>
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
                        </>
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

      {/* Modify Items Modal overlay */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-2xl w-full border-primary/20 bg-card shadow-2xl relative">
            <button
              onClick={() => setEditingOrder(null)}
              className="absolute top-4 right-4 p-1 text-muted-foreground hover:bg-muted rounded-full"
            >
              <X className="h-4.5 w-4.5" />
            </button>
            <CardHeader>
              <CardTitle className="text-xl font-bold text-white">Modify Order #{editingOrder.id.slice(0, 8)}</CardTitle>
              <CardDescription>Adjust ordered quantities, pricing, and units dynamically</CardDescription>
            </CardHeader>
            <form onSubmit={handleModifySubmit}>
              <CardContent className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {modifyItems.map((item, idx) => (
                  <div key={item.productId} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-3 rounded-lg border border-border/40 bg-card/40">
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-white">{item.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">SKU: {item.sku}</p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <div className="w-24">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Qty</label>
                        <Input
                          type="number"
                          step="0.000001"
                          min="0.000001"
                          value={item.qty}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          className="h-9 py-1"
                        />
                      </div>
                      <div className="w-24">
                        <label className="text-[9px] uppercase font-bold text-muted-foreground block mb-0.5">Unit</label>
                        <Select
                          value={item.unit}
                          onChange={(e) => handleUnitChange(idx, e.target.value)}
                          className="h-9 py-1 text-xs"
                        >
                          {getCompatibleUnits(item.baseUnit).map((u) => (
                            <option key={u} value={u}>
                              {u}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t border-border/20 pt-4 bg-muted/5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingOrder(null)}
                  disabled={modifyLoading}
                  className="border-border text-white hover:bg-muted"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={modifyLoading}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center gap-1.5"
                >
                  {modifyLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Modifications"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { 
  Layers, 
  Plus, 
  Minus, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Search,
  Filter
} from "lucide-react";
import { formatINR } from "src/lib/utils/conversion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Select } from "src/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";

interface Product {
  id: string;
  name: string;
  sku: string;
  baseUnit: string;
  inventoryQuantity: string;
}

interface InventoryLog {
  id: string;
  productId: string;
  changeQuantity: string;
  type: string;
  referenceId: string | null;
  notes: string | null;
  createdAt: string;
  product: {
    name: string;
    sku: string;
    baseUnit: string;
  };
}

export default function AdminInventoryPage() {
  const [logs, setLogs] = useState<InventoryLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  
  // Adjustment state
  const [productId, setProductId] = useState("");
  const [qtyChange, setQtyChange] = useState(100);
  const [adjustType, setAdjustType] = useState("ADJUSTMENT");
  const [notes, setNotes] = useState("");
  const [selectedLogProduct, setSelectedLogProduct] = useState("all");

  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  const selectedProduct = products.find((p) => p.id === productId);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [logRes, prodRes] = await Promise.all([
        fetch("/api/inventory"),
        fetch("/api/products"),
      ]);
      const logData = await logRes.json();
      const prodData = await prodRes.json();
      setLogs(Array.isArray(logData) ? logData : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      console.error(err);
      setLogs([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId || qtyChange === 0) return;
    setSubmitLoading(true);
    setMessage(null);

    // If STOCK_OUT, changeQuantity must be negative
    const finalChange = adjustType === "STOCK_OUT" ? -Math.abs(qtyChange) : qtyChange;

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          changeQuantity: finalChange,
          type: adjustType,
          notes,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ success: false, text: result.error || "Failed to adjust inventory" });
      } else {
        setMessage({ success: true, text: "Inventory adjusted successfully!" });
        setProductId("");
        setQtyChange(100);
        setAdjustType("ADJUSTMENT");
        setNotes("");
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setMessage({ success: false, text: "An unexpected error occurred" });
    } finally {
      setSubmitLoading(false);
    }
  };

  // Filter logs locally based on dropdown product selection
  const filteredLogs = logs.filter((log) => {
    return selectedLogProduct === "all" || log.productId === selectedLogProduct;
  });

  const formatQtyString = (qtyNum: number, unit: string) => {
    const absQty = Math.abs(qtyNum);
    if (unit === "kg" || unit === "L") {
      return `${(absQty / 1000).toLocaleString()} ${unit}`;
    }
    return `${absQty.toLocaleString()} ${unit}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Layers className="h-8 w-8 text-primary" /> Inventory Log Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Audit stock adjustments, track incoming purchases, and log restocks.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-border text-white self-start">
          <RefreshCw className="mr-2 h-4 w-4" /> Sync Logs
        </Button>
      </div>

      {/* Grid split */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left Side: logs history */}
        <Card className="lg:col-span-3 border-border/40">
          <CardHeader className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-lg font-bold text-white">Stock Movement Logs</CardTitle>
              <CardDescription>Visual audit trail of stock adjustments</CardDescription>
            </div>
            <div className="w-full md:w-60">
              <Select value={selectedLogProduct} onChange={(e) => setSelectedLogProduct(e.target.value)} className="h-9 py-1 text-xs">
                <option value="all">Filter by Product: All</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.sku})
                  </option>
                ))}
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="h-8 w-8 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-10 border border-dashed rounded-lg border-border/20">
                <p className="text-muted-foreground text-sm">No transaction logs available.</p>
              </div>
            ) : (
              <div className="max-h-[500px] overflow-y-auto pr-1">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead className="text-right">Shift</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => {
                      const qtyVal = Number(log.changeQuantity);
                      const isPositive = qtyVal > 0;
                      return (
                        <TableRow key={log.id}>
                          <TableCell className="font-semibold text-white">
                            {log.product.name}
                            <span className="block text-[10px] text-muted-foreground font-mono">
                              SKU: {log.product.sku}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                log.type === "STOCK_IN" || log.type === "RETURN"
                                  ? "success"
                                  : log.type === "SALE"
                                  ? "destructive"
                                  : "warning"
                              }
                            >
                              {log.type}
                            </Badge>
                          </TableCell>
                          <TableCell className={`text-right font-mono font-bold ${isPositive ? "text-emerald-400" : "text-rose-400"}`}>
                            {isPositive ? "+" : "-"}{formatQtyString(qtyVal, log.product.baseUnit)}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate" title={log.notes || ""}>
                            {log.notes || "—"}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(log.createdAt).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Side: stock adjustment panel form */}
        <div className="lg:col-span-2">
          <Card className="border-primary/20 bg-primary/5 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">Manual Stock adjustment</CardTitle>
              <CardDescription>Increase or decrease product stock levels</CardDescription>
            </CardHeader>
            <form onSubmit={handleAdjustSubmit}>
              <CardContent className="space-y-4">
                {message && (
                  <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs font-medium ${
                    message.success 
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                      : "bg-destructive/10 border-destructive/20 text-destructive"
                  }`}>
                    {message.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
                    <span>{message.text}</span>
                  </div>
                )}

                {/* Product Select */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Select Product</label>
                  <Select value={productId} onChange={(e) => setProductId(e.target.value)} required>
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </Select>
                </div>

                {/* Current Stock Preview */}
                {selectedProduct && (
                  <div className="p-3 bg-card/45 border border-border/40 rounded-lg grid grid-cols-2 text-xs">
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground block">
                        Base unit
                      </span>
                      <span className="font-semibold text-white">{selectedProduct.baseUnit}</span>
                    </div>
                    <div>
                      <span className="text-[9px] uppercase tracking-wider font-semibold text-muted-foreground block">
                        Current stock
                      </span>
                      <span className="font-bold text-slate-200">
                        {formatQtyString(Number(selectedProduct.inventoryQuantity), selectedProduct.baseUnit)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Shift quantity */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Adjustment Quantity (In Internal Base Unit)
                  </label>
                  <Input
                    type="number"
                    min="1"
                    value={qtyChange}
                    onChange={(e) => setQtyChange(Math.max(1, Number(e.target.value)))}
                    required
                  />
                  {selectedProduct && (
                    <span className="text-[9px] text-muted-foreground leading-normal block">
                      Note: You are adjusting the product in {selectedProduct.baseUnit === "kg" || selectedProduct.baseUnit === "g" ? "grams" : selectedProduct.baseUnit === "L" || selectedProduct.baseUnit === "mL" ? "milliliters" : "items"}. E.g. 5,000 = 5 kg/L.
                    </span>
                  )}
                </div>

                {/* Action Type */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Action Type</label>
                  <Select value={adjustType} onChange={(e) => setAdjustType(e.target.value)} required>
                    <option value="STOCK_IN">STOCK_IN (+ Stock)</option>
                    <option value="STOCK_OUT">STOCK_OUT (- Stock)</option>
                    <option value="ADJUSTMENT">ADJUSTMENT (Adjustment change)</option>
                  </Select>
                </div>

                {/* Notes */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Notes / Reason</label>
                  <textarea
                    className="w-full rounded-md border border-input bg-transparent text-foreground px-3 py-2 text-sm focus:ring-1 focus:ring-ring focus:border-primary"
                    placeholder="Enter reason for stock level change..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter className="pb-6">
                <Button
                  type="submit"
                  disabled={submitLoading || !productId}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Adjustment"
                  )}
                </Button>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
}

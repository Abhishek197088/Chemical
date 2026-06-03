"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ShoppingCart, Info, CheckCircle2, AlertTriangle, Plus, Minus, FileText } from "lucide-react";
import Link from "next/link";
import { formatINR, calculateItemPrice, convertToBase, convertToProductBase, convertFromBase, formatINRInWords } from "src/lib/utils/conversion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Select } from "src/components/ui/select";
import { Badge } from "src/components/ui/badge";

interface ProductDetailsClientProps {
  product: {
    id: string;
    name: string;
    sku: string;
    description: string | null;
    baseUnit: string;
    basePrice: number;
    inventoryQuantity: number;
    density: number | null;
    imageUrl: string | null;
    category: {
      name: string;
    };
  };
}

export default function ProductDetailsClient({ product }: ProductDetailsClientProps) {
  const router = useRouter();
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState(product.baseUnit);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderStatus, setOrderStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  // Compatible units list based on unit group + density
  const isWeight = ["g", "kg"].includes(product.baseUnit);
  const isVolume = ["mL", "L"].includes(product.baseUnit);
  const hasDensity = product.density !== null && product.density !== undefined;
  
  const compatibleUnits = hasDensity
    ? ["kg", "g", "L", "mL"]
    : isWeight 
    ? ["kg", "g"] 
    : isVolume 
    ? ["L", "mL"] 
    : ["items"];

  // Perform live calculations
  let subtotal = 0;
  let errorMsg = "";
  let isStockSufficient = true;
  let baseQtyRequired = 0;

  try {
    subtotal = calculateItemPrice(product.basePrice, product.baseUnit, quantity, unit, product.density);
    baseQtyRequired = convertToProductBase(quantity, unit, product.baseUnit, product.density);
    isStockSufficient = product.inventoryQuantity >= baseQtyRequired;
  } catch (err) {
    errorMsg = err instanceof Error ? err.message : "Calculation error";
  }

  // Stock status text formatting
  const formatStock = (qty: number, baseUnit: string) => {
    if (baseUnit === "kg" || baseUnit === "L") {
      return `${(qty / 1000).toLocaleString()} ${baseUnit}`;
    }
    return `${qty.toLocaleString()} ${baseUnit}`;
  };

  const handlePlaceOrder = async () => {
    if (!isStockSufficient) return;
    setOrderLoading(true);
    setOrderStatus(null);

    try {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: [
            {
              productId: product.id,
              orderedQuantity: quantity,
              orderedUnit: unit,
            },
          ],
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setOrderStatus({ success: false, message: result.error || "Failed to place order." });
      } else {
        setOrderStatus({ success: true, message: "Order placed successfully! Redirecting..." });
        setTimeout(() => {
          router.push("/orders");
        }, 1500);
      }
    } catch (err) {
      console.error(err);
      setOrderStatus({ success: false, message: "An unexpected error occurred." });
    } finally {
      setOrderLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-300">
      {/* Back Button */}
      <Link href="/products" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-white transition-colors duration-200">
        <ArrowLeft className="h-4 w-4" /> Back to Product Catalog
      </Link>

      <div className="grid gap-6 md:grid-cols-5">
        {/* Left Side: Product Specifications */}
        <Card className="md:col-span-3 border-border/40">
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="outline">{product.category.name}</Badge>
              <Badge variant={product.inventoryQuantity > 0 ? "success" : "destructive"}>
                {product.inventoryQuantity > 0 ? "In Stock" : "Out of Stock"}
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-white mt-3">{product.name}</CardTitle>
            <CardDescription className="font-mono text-xs">SKU: {product.sku}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {product.imageUrl && (
              <div className="relative h-64 w-full overflow-hidden rounded-lg border border-border/40 bg-muted/5 mb-4">
                <img
                  src={product.imageUrl}
                  alt={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 hover:scale-102"
                />
              </div>
            )}
            <div>
              <h3 className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">Product Description</h3>
              <p className="text-sm text-slate-200 mt-1 leading-relaxed">
                {product.description || "No description provided."}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/40">
              <div>
                <span className="text-xs font-medium text-muted-foreground">Base Reference Unit</span>
                <p className="text-base font-semibold text-white mt-0.5">{product.baseUnit}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Unit Reference Price</span>
                <p className="text-base font-semibold text-white mt-0.5">{formatINR(product.basePrice)}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-muted-foreground">Total Available Stock</span>
                <p className="text-base font-semibold text-white mt-0.5">
                  {formatStock(product.inventoryQuantity, product.baseUnit)}
                </p>
              </div>
              {product.density !== null && product.density !== undefined && (
                <div>
                  <span className="text-xs font-medium text-muted-foreground">Chemical Density</span>
                  <p className="text-base font-semibold text-white mt-0.5">{Number(product.density).toFixed(3)} g/mL (kg/L)</p>
                </div>
              )}
              <div className="col-span-2">
                <span className="text-xs font-medium text-muted-foreground">Internal Stored Representation</span>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {product.inventoryQuantity.toLocaleString()}{" "}
                  {["kg", "g"].includes(product.baseUnit) ? "grams (g)" : ["L", "mL"].includes(product.baseUnit) ? "milliliters (mL)" : "items"}
                </p>
              </div>
              <div className="col-span-2 pt-2 border-t border-border/20">
                <span className="text-xs font-medium text-muted-foreground block mb-1.5">Inventory Capacity Level</span>
                {(() => {
                  const qty = product.inventoryQuantity;
                  const unit = product.baseUnit;
                  let maxStock = 1000;
                  if (unit === "kg" || unit === "L") {
                    maxStock = 2000000; // 2,000 kg or Liters (internally stored in g/mL)
                  } else if (unit === "g" || unit === "mL") {
                    maxStock = 2000000;
                  } else {
                    maxStock = 500; // items
                  }
                  const percentage = Math.min(100, Math.max(0, (qty / maxStock) * 100));
                  
                  let barColor = "bg-emerald-500";
                  let textColor = "text-emerald-400";
                  if (qty <= 0) {
                    barColor = "bg-rose-500";
                    textColor = "text-rose-400";
                  } else if (percentage < 25) {
                    barColor = "bg-amber-500";
                    textColor = "text-amber-400";
                  }
                  
                  return (
                    <div className="space-y-1">
                      <div className="h-2 w-full bg-border/40 rounded-full overflow-hidden">
                        <div className={`h-full ${barColor} transition-all duration-500`} style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className={`text-[10px] font-bold ${textColor} block mt-1`}>
                        {qty <= 0 ? "OUT OF STOCK" : percentage < 25 ? "LOW STOCK WARNING" : "HEALTHY INVENTORY LEVELS"} ({percentage.toFixed(0)}% Capacity)
                      </span>
                    </div>
                  );
                })()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right Side: Conversion and Live Price Calculator */}
        <Card className="md:col-span-2 border-primary/20 bg-primary/5 shadow-lg shadow-primary/5 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 border-b border-border/40 bg-card/10">
              <CardTitle className="text-lg font-bold text-white">Live Price Calculator</CardTitle>
              <CardDescription>Input quantities in your desired unit</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-5">
              {/* Status Banner */}
              {orderStatus && (
                <div className={`flex items-start gap-2 rounded-lg border p-3 text-xs font-medium ${
                  orderStatus.success 
                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" 
                    : "bg-destructive/10 border-destructive/20 text-destructive"
                }`}>
                  {orderStatus.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
                  <span>{orderStatus.message}</span>
                </div>
              )}

              {/* Quantity Select Form */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Quantity
                  </label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(Math.max(0.000001, quantity - 1))}
                      disabled={quantity <= 0.000001}
                      className="border-border text-white size-10 shrink-0"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min="0.000001"
                      step="any"
                      className="text-center font-bold"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(0.000001, Number(e.target.value)))}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                      className="border-border text-white size-10 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Order Unit
                  </label>
                  <Select value={unit} onChange={(e) => setUnit(e.target.value)}>
                    {compatibleUnits.map((u) => (
                      <option key={u} value={u}>
                        {u}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Conversion Preview */}
              <div className="bg-card/40 border border-border/40 p-3 rounded-lg flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <Info className="h-3.5 w-3.5" />
                  <span>Stock Conversion Check:</span>
                </div>
                <div className="font-semibold text-right">
                  {quantity.toLocaleString()} {unit} = {baseQtyRequired.toLocaleString()}{" "}
                  {["kg", "g"].includes(product.baseUnit) ? "g" : ["L", "mL"].includes(product.baseUnit) ? "mL" : "items"}
                </div>
              </div>

              {/* Insufficient Stock Warning */}
              {!isStockSufficient && (
                <div className="flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-xs text-amber-500 font-medium">
                  <AlertTriangle className="h-4.5 w-4.5 shrink-0" />
                  <div>
                    <p className="font-bold">Insufficient Stock</p>
                    <p className="text-[10px] opacity-80 mt-0.5">Required: {formatStock(baseQtyRequired, product.baseUnit)}, Stored: {formatStock(product.inventoryQuantity, product.baseUnit)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </div>

          <CardFooter className="flex flex-col gap-3 pb-6 border-t border-border/40 pt-4 bg-card/5">
            <div className="flex flex-col gap-1 w-full">
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-semibold text-muted-foreground uppercase">Estimated Cost</span>
                <span className="text-xl font-black text-white tracking-tight">{formatINR(subtotal)}</span>
              </div>
              <div className="text-[11px] text-indigo-300 text-right font-medium italic">
                {formatINRInWords(subtotal)}
              </div>
            </div>
            
            <Button
              onClick={handlePlaceOrder}
              disabled={!isStockSufficient || orderLoading || orderStatus?.success}
              className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 py-5"
            >
              {orderLoading ? (
                "Processing Order..."
              ) : (
                <>
                  <ShoppingCart className="h-4.5 w-4.5" /> Instant Purchase Order
                </>
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

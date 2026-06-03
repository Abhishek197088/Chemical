"use client";

import { useEffect, useState } from "react";
import { 
  FileText, 
  Plus, 
  Trash2, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { formatINR, calculateItemPrice, areUnitsCompatible, formatINRInWords } from "src/lib/utils/conversion";
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
  basePrice: string;
}

interface QuotationItem {
  id: string;
  quantity: string;
  unit: string;
  pricePerUnit: string;
  subtotal: string;
  product: {
    name: string;
    sku: string;
  };
}

interface Quotation {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  items: QuotationItem[];
}

interface QuoteDraftItem {
  productId: string;
  productName: string;
  productSku: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  subtotal: number;
}

export default function UserQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  // Draft builder states
  const [draft, setDraft] = useState<QuoteDraftItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [selectedUnit, setSelectedUnit] = useState("");
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const getCompatibleUnits = (product: Product | undefined) => {
    if (!product) return [];
    if (["g", "kg"].includes(product.baseUnit)) return ["kg", "g"];
    if (["mL", "L"].includes(product.baseUnit)) return ["L", "mL"];
    return ["items"];
  };

  const fetchQuotationsAndProducts = async () => {
    setLoading(true);
    try {
      const [qotRes, prodRes] = await Promise.all([
        fetch("/api/quotations"),
        fetch("/api/products"),
      ]);
      const qotData = await qotRes.json();
      const prodData = await prodRes.json();
      setQuotations(Array.isArray(qotData) ? qotData : []);
      setProducts(Array.isArray(prodData) ? prodData : []);
    } catch (err) {
      console.error("Error loading quotation page data:", err);
      setQuotations([]);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotationsAndProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      setSelectedUnit(selectedProduct.baseUnit);
    } else {
      setSelectedUnit("");
    }
  }, [selectedProductId, selectedProduct]);

  const handleAddToDraft = () => {
    if (!selectedProduct || quantity <= 0 || !selectedUnit) return;

    if (!areUnitsCompatible(selectedProduct.baseUnit, selectedUnit)) {
      setMessage({ success: false, text: "Incompatible unit selected for this product" });
      return;
    }

    const existingIndex = draft.findIndex(
      (item) => item.productId === selectedProductId && item.unit === selectedUnit
    );

    let price = 0;
    try {
      price = calculateItemPrice(
        selectedProduct.basePrice,
        selectedProduct.baseUnit,
        quantity,
        selectedUnit
      );
    } catch (e) {
      setMessage({ success: false, text: "Price calculation error" });
      return;
    }

    if (existingIndex > -1) {
      const updatedDraft = [...draft];
      const newQty = updatedDraft[existingIndex].quantity + quantity;
      const newPriceTotal = calculateItemPrice(
        selectedProduct.basePrice,
        selectedProduct.baseUnit,
        newQty,
        selectedUnit
      );
      updatedDraft[existingIndex] = {
        ...updatedDraft[existingIndex],
        quantity: newQty,
        subtotal: newPriceTotal,
      };
      setDraft(updatedDraft);
    } else {
      const newItem: QuoteDraftItem = {
        productId: selectedProductId,
        productName: selectedProduct.name,
        productSku: selectedProduct.sku,
        quantity: quantity,
        unit: selectedUnit,
        pricePerUnit: price / quantity,
        subtotal: price,
      };
      setDraft([...draft, newItem]);
    }

    setQuantity(1);
    setMessage(null);
  };

  const handleRemoveFromDraft = (index: number) => {
    const updatedDraft = [...draft];
    updatedDraft.splice(index, 1);
    setDraft(updatedDraft);
  };

  const handleSubmitQuotation = async () => {
    if (draft.length === 0) return;
    setSubmitLoading(true);
    setMessage(null);

    try {
      const response = await fetch("/api/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: draft.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unit: item.unit,
          })),
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage({ success: false, text: result.error || "Failed to submit quotation" });
      } else {
        setMessage({ success: true, text: "Quotation submitted successfully!" });
        setDraft([]);
        fetchQuotationsAndProducts();
      }
    } catch (err) {
      console.error(err);
      setMessage({ success: false, text: "An unexpected error occurred." });
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleExpandQuote = (quoteId: string) => {
    setExpandedQuotes((prev) => ({
      ...prev,
      [quoteId]: !prev[quoteId],
    }));
  };

  const draftTotal = draft.reduce((sum, item) => sum + item.subtotal, 0);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" /> Price Quotations
          </h1>
          <p className="text-muted-foreground mt-1">
            Build and submit quotations. Receive administrative approvals and lock in prices.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuotationsAndProducts} className="border-border text-white self-start">
          <RefreshCw className="mr-2 h-4 w-4" /> Refresh Lists
        </Button>
      </div>

      {/* Main split dashboard layout */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left Side: Quotation Builder */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/20 bg-primary/5 shadow-lg shadow-primary/5">
            <CardHeader>
              <CardTitle className="text-lg font-bold text-white">Quotation Request Draft</CardTitle>
              <CardDescription>Request custom pricing review on products</CardDescription>
            </CardHeader>
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

              {/* Add product select block */}
              <div className="space-y-3 p-3 rounded-lg border border-border/40 bg-card/20">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Select Product</label>
                  <Select value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)}>
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </Select>
                </div>

                {selectedProduct && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Qty</label>
                      <Input
                        type="number"
                        min="0.000001"
                        step="any"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(0.000001, Number(e.target.value)))}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Unit</label>
                      <Select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
                        {getCompatibleUnits(selectedProduct).map((u) => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>
                )}

                {selectedProduct && (
                  <div className="flex flex-col gap-0.5 pt-1 border-t border-border/20 w-full">
                    <div className="flex justify-between items-center text-xs px-1 text-muted-foreground">
                      <span>Reference Subtotal:</span>
                      <span className="font-semibold text-slate-200">
                        {formatINR(
                          calculateItemPrice(
                            selectedProduct.basePrice,
                            selectedProduct.baseUnit,
                            quantity,
                            selectedUnit || selectedProduct.baseUnit
                          )
                        )}
                      </span>
                    </div>
                    <div className="text-[10px] text-indigo-300 text-right font-medium italic px-1">
                      {formatINRInWords(
                        calculateItemPrice(
                          selectedProduct.basePrice,
                          selectedProduct.baseUnit,
                          quantity,
                          selectedUnit || selectedProduct.baseUnit
                        )
                      )}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAddToDraft}
                  disabled={!selectedProductId}
                  className="w-full mt-2 bg-secondary hover:bg-secondary/80 text-white font-semibold flex justify-center items-center gap-1.5"
                >
                  <Plus className="h-4 w-4" /> Add Item to Draft
                </Button>
              </div>

              {/* Draft List */}
              <div className="space-y-2 pt-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">Draft Items list</span>
                {draft.length === 0 ? (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg border-border/20">
                    Your quotation draft is empty. Add products above.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                    {draft.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-card/40 hover:border-primary/20 transition-all duration-200">
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-white line-clamp-1">{item.productName}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">
                            {item.quantity} {item.unit} @ {formatINR(item.pricePerUnit)}/{item.unit}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{formatINR(item.subtotal)}</span>
                          <button
                            onClick={() => handleRemoveFromDraft(idx)}
                            className="p-1 rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
            {draft.length > 0 && (
              <CardFooter className="flex flex-col gap-3 pb-6 border-t border-border/40 pt-4 bg-card/5">
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-semibold text-muted-foreground uppercase">Quotation Total</span>
                    <span className="text-lg font-black text-white tracking-tight">{formatINR(draftTotal)}</span>
                  </div>
                  <div className="text-[10px] text-indigo-300 text-right font-medium italic">
                    {formatINRInWords(draftTotal)}
                  </div>
                </div>
                <Button
                  onClick={handleSubmitQuotation}
                  disabled={submitLoading}
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2"
                >
                  {submitLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Submitting...
                    </>
                  ) : (
                    "Submit Quotation Request"
                  )}
                </Button>
              </CardFooter>
            )}
          </Card>
        </div>

        {/* Right Side: Quotation History */}
        <Card className="lg:col-span-3 border-border/40">
          <CardHeader>
            <CardTitle className="text-lg font-bold text-white">Quotation History</CardTitle>
            <CardDescription>Track the review states of custom price requests</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center py-20">
                <div className="h-8 w-8 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
              </div>
            ) : quotations.length === 0 ? (
              <div className="text-center py-20 border border-dashed rounded-lg border-border/40">
                <p className="text-muted-foreground text-sm">No historical quotations found.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-1">
                {quotations.map((quote) => {
                  const isExpanded = !!expandedQuotes[quote.id];
                  return (
                    <div
                      key={quote.id}
                      className="border border-border/40 rounded-xl overflow-hidden bg-card/20 hover:border-border transition-all duration-200"
                    >
                      {/* Summary item clickable */}
                      <div
                        onClick={() => toggleExpandQuote(quote.id)}
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-muted/10 transition-all duration-200"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-white font-semibold">
                              #{quote.id.slice(0, 8)}
                            </span>
                            <Badge
                              variant={
                                quote.status === "APPROVED"
                                  ? "success"
                                  : quote.status === "REJECTED"
                                  ? "destructive"
                                  : "warning"
                              }
                            >
                              {quote.status}
                            </Badge>
                          </div>
                          <span className="text-[10px] text-muted-foreground block">
                            Date: {new Date(quote.createdAt).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Quote Value</span>
                            <span className="text-sm font-bold text-white">
                              {formatINR(quote.totalAmount)}
                            </span>
                          </div>
                          {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                        </div>
                      </div>

                      {/* Expanded Quote details */}
                      {isExpanded && (
                        <div className="border-t border-border/20 bg-card/40 p-4 animate-in slide-in-from-top-2 duration-200">
                          <Table>
                            <TableHeader>
                              <TableRow className="hover:bg-transparent">
                                <TableHead className="h-8 py-0">Product</TableHead>
                                <TableHead className="h-8 py-0 text-center">Qty Requested</TableHead>
                                <TableHead className="h-8 py-0 text-right">Price per Unit</TableHead>
                                <TableHead className="h-8 py-0 text-right">Subtotal</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {quote.items.map((item) => (
                                <TableRow key={item.id} className="hover:bg-transparent">
                                  <TableCell className="py-2.5 font-semibold text-white">
                                    {item.product.name}
                                    <span className="block text-[10px] text-muted-foreground font-mono">
                                      SKU: {item.product.sku}
                                    </span>
                                  </TableCell>
                                  <TableCell className="py-2.5 text-center">
                                    {item.quantity} {item.unit}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-right font-mono">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

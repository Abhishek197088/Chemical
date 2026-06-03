"use client";

import { useEffect, useState } from "react";
import { 
  FileText, 
  CheckCircle, 
  XCircle, 
  Loader2, 
  AlertCircle, 
  RefreshCw, 
  ChevronDown, 
  ChevronUp 
} from "lucide-react";
import { formatINR } from "src/lib/utils/conversion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";

interface QuotationItem {
  id: string;
  quantity: string;
  unit: string;
  calculatedQuantityInBase: string;
  pricePerUnit: string;
  subtotal: string;
  product: {
    name: string;
    sku: string;
    baseUnit: string;
  };
}

interface Quotation {
  id: string;
  status: string;
  totalAmount: string;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
  };
  items: QuotationItem[];
}

export default function AdminQuotationsPage() {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [expandedQuotes, setExpandedQuotes] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchQuotations = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotations");
      const data = await res.json();
      setQuotations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, []);

  const handleUpdateStatus = async (quoteId: string, newStatus: string) => {
    setActionLoadingId(`${quoteId}-${newStatus}`);
    setMessage(null);

    try {
      const res = await fetch(`/api/quotations/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ success: false, text: result.error || "Failed to update status" });
      } else {
        setMessage({ success: true, text: `Quotation status updated to ${newStatus}!` });
        fetchQuotations();
      }
    } catch (err) {
      console.error(err);
      setMessage({ success: false, text: "An unexpected error occurred" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const toggleExpand = (quoteId: string) => {
    setExpandedQuotes((prev) => ({
      ...prev,
      [quoteId]: !prev[quoteId],
    }));
  };

  const filteredQuotes = quotations.filter((quote) => {
    return statusFilter === "ALL" || quote.status === statusFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileText className="h-8 w-8 text-primary" /> Price Quotations Manager
          </h1>
          <p className="text-muted-foreground mt-1">
            Review custom pricing proposals, audit calculations, and approve or reject submissions.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchQuotations} className="border-border text-white self-start">
          <RefreshCw className="mr-2 h-4 w-4" /> Sync Quotations
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center bg-card/20 border border-border/40 p-4 rounded-xl backdrop-blur-md">
        <div className="flex flex-wrap gap-2">
          {["ALL", "PENDING", "APPROVED", "REJECTED"].map((status) => (
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

      {/* Audit cards list */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-8 w-8 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
        </div>
      ) : filteredQuotes.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl border-border/40 bg-card/10">
          <FileText className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-lg font-semibold text-white">No quotations found</h3>
          <p className="text-sm text-muted-foreground mt-1">There are no quotations matching this status filter.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredQuotes.map((quote) => {
            const isExpanded = !!expandedQuotes[quote.id];
            return (
              <div
                key={quote.id}
                className="border border-border/40 rounded-xl overflow-hidden bg-card/20 hover:border-border transition-all duration-200"
              >
                {/* Header item */}
                <div
                  onClick={() => toggleExpand(quote.id)}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 gap-4 bg-muted/5 hover:bg-muted/10 cursor-pointer"
                >
                  <div className="space-y-1">
                    <div className="flex items-center flex-wrap gap-2">
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
                      <span className="text-[10px] text-muted-foreground">
                        Requested by: {quote.user.name || quote.user.email}
                      </span>
                    </div>
                    <span className="text-[10px] text-muted-foreground block">
                      Date: {new Date(quote.createdAt).toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6">
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Quote Value</span>
                      <span className="text-sm font-bold text-white">
                        {formatINR(quote.totalAmount)}
                      </span>
                    </div>
                    
                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      {quote.status === "PENDING" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUpdateStatus(quote.id, "APPROVED")}
                            disabled={!!actionLoadingId}
                            className="bg-emerald-500/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-500/20 text-xs h-8 px-2.5 font-semibold"
                          >
                            {actionLoadingId === `${quote.id}-APPROVED` ? (
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
                            onClick={() => handleUpdateStatus(quote.id, "REJECTED")}
                            disabled={!!actionLoadingId}
                            className="bg-rose-500/10 border-rose-500/20 text-rose-500 hover:bg-rose-500/20 text-xs h-8 px-2.5 font-semibold"
                          >
                            {actionLoadingId === `${quote.id}-REJECTED` ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <XCircle className="mr-1 h-3.5 w-3.5" /> Reject
                              </>
                            )}
                          </Button>
                        </>
                      )}

                      {quote.status !== "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUpdateStatus(quote.id, "PENDING")}
                          disabled={!!actionLoadingId}
                          className="border-border hover:bg-muted text-white text-xs h-8 px-2.5 font-semibold"
                        >
                          {actionLoadingId === `${quote.id}-PENDING` ? (
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

                {/* Expanded quote detail products */}
                {isExpanded && (
                  <div className="border-t border-border/20 bg-card/45 p-4 animate-in slide-in-from-top-2 duration-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="h-8 py-0">Product</TableHead>
                          <TableHead className="h-8 py-0 text-center">Requested Qty</TableHead>
                          <TableHead className="h-8 py-0 text-center">Conversion Audit</TableHead>
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

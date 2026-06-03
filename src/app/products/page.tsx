"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Package, Search, Filter, RefreshCw, Layers } from "lucide-react";
import { formatINR } from "src/lib/utils/conversion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Select } from "src/components/ui/select";
import { Badge } from "src/components/ui/badge";

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  baseUnit: string;
  basePrice: string;
  inventoryQuantity: string;
  categoryId: string;
  imageUrl: string | null;
  category: {
    id: string;
    name: string;
  };
}

interface Category {
  id: string;
  name: string;
}

export default function ProductCatalog() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedUnit, setSelectedUnit] = useState("all");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, catRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);
      const prodData = await prodRes.json();
      const catData = await catRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);
      setCategories(Array.isArray(catData) ? catData : []);
    } catch (err) {
      console.error("Error fetching catalog data:", err);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter products based on search query, category, and base unit
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase());

    const matchesCategory =
      selectedCategory === "all" || product.categoryId === selectedCategory;

    const matchesUnit =
      selectedUnit === "all" ||
      (selectedUnit === "weight" && ["g", "kg"].includes(product.baseUnit)) ||
      (selectedUnit === "volume" && ["mL", "L"].includes(product.baseUnit)) ||
      (selectedUnit === "count" && product.baseUnit === "items");

    return matchesSearch && matchesCategory && matchesUnit;
  });

  // Helpers to render stock status
  const getStockBadge = (quantity: number, unit: string) => {
    if (quantity <= 0) {
      return <Badge variant="destructive">Out of Stock</Badge>;
    }

    // Determine thresholds based on unit types
    let isLow = false;
    if (["g", "mL"].includes(unit)) {
      isLow = quantity < 10000; // less than 10kg/10L
    } else if (unit === "kg" || unit === "L") {
      isLow = quantity < 10;
    } else {
      isLow = quantity < 5; // items
    }

    if (isLow) {
      return <Badge variant="warning">Low Stock</Badge>;
    }

    return <Badge variant="success">In Stock</Badge>;
  };

  // Convert internal base units back to display units for readability
  const formatStockQty = (qtyStr: string, baseUnit: string) => {
    const qty = Number(qtyStr);
    if (baseUnit === "kg" || baseUnit === "L") {
      // Stock is stored in standard g/mL
      const displayQty = qty / 1000;
      return `${displayQty.toLocaleString()} ${baseUnit}`;
    }
    if (baseUnit === "g" || baseUnit === "mL" || baseUnit === "items") {
      return `${qty.toLocaleString()} ${baseUnit}`;
    }
    return `${qty} ${baseUnit}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" /> Product Catalog
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse through items, verify current stock levels, and perform live unit price checks.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-border text-white self-start">
          <RefreshCw className="mr-2 h-4 w-4" /> Sync Catalog
        </Button>
      </div>

      {/* Filter Toolbar */}
      <div className="grid gap-4 md:grid-cols-12 items-center bg-card/20 border border-border/40 p-4 rounded-xl backdrop-blur-md">
        <div className="relative md:col-span-6">
          <Search className="absolute left-3 top-3 h-4.5 w-4.5 text-muted-foreground/60" />
          <Input
            placeholder="Search by Name or SKU..."
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="md:col-span-3">
          <Select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="md:col-span-3">
          <Select value={selectedUnit} onChange={(e) => setSelectedUnit(e.target.value)}>
            <option value="all">All Unit Groups</option>
            <option value="weight">Weight (kg / g)</option>
            <option value="volume">Volume (L / mL)</option>
            <option value="count">Count (items)</option>
          </Select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="h-10 w-10 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
          <span className="text-muted-foreground text-sm">Loading product catalog...</span>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-20 border border-dashed rounded-xl border-border/40 bg-card/10">
          <Package className="mx-auto h-12 w-12 text-muted-foreground/60 mb-3" />
          <h3 className="text-lg font-semibold text-white">No products found</h3>
          <p className="text-sm text-muted-foreground mt-1">Try tweaking your search keywords or active filters.</p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((product) => {
            const stockVal = Number(product.inventoryQuantity);
            return (
              <Card key={product.id} className="group flex flex-col justify-between hover:translate-y-[-4px] transition-all duration-300 overflow-hidden border-border/40 hover:border-primary/30">
                {product.imageUrl && (
                  <div className="relative h-48 w-full overflow-hidden border-b border-border/40 bg-muted/5">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                )}
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <Badge variant="outline" className="text-xs">
                      {product.category.name}
                    </Badge>
                    {getStockBadge(stockVal, product.baseUnit)}
                  </div>
                  <CardTitle className="text-lg font-bold text-white mt-2 leading-tight">
                    {product.name}
                  </CardTitle>
                  <CardDescription className="font-mono text-xs text-muted-foreground">
                    SKU: {product.sku}
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="py-2 flex-1">
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description || "No description provided."}
                  </p>
                  
                  <div className="mt-4 pt-4 border-t border-border/40 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Base Price</span>
                      <p className="text-base font-bold text-white tracking-tight">
                        {formatINR(product.basePrice)}
                        <span className="text-xs font-normal text-muted-foreground">/{product.baseUnit}</span>
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Stock Available</span>
                      <p className="text-sm font-semibold text-slate-200">
                        {formatStockQty(product.inventoryQuantity, product.baseUnit)}
                      </p>
                    </div>
                  </div>
                </CardContent>

                <CardFooter className="pt-4 border-t border-border/40 bg-card/5 rounded-b-xl">
                  <Link href={`/products/${product.id}`} className="w-full">
                    <Button className="w-full bg-secondary hover:bg-secondary/80 text-white font-medium flex items-center justify-center gap-2">
                      View Details & Calculate
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

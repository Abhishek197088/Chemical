"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Package, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  X
} from "lucide-react";
import { formatINR } from "src/lib/utils/conversion";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "src/components/ui/card";
import { Button } from "src/components/ui/button";
import { Input } from "src/components/ui/input";
import { Select } from "src/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "src/components/ui/table";
import { Badge } from "src/components/ui/badge";

// Form schema
const productFormSchema = z.object({
  name: z.string().min(2, "Product name must be at least 2 characters"),
  sku: z.string().min(3, "SKU must be at least 3 characters").transform((val) => val.toUpperCase().trim()),
  description: z.string().optional(),
  categoryId: z.string().uuid("Please select a valid category"),
  baseUnit: z.enum(["g", "kg", "mL", "L", "items"]),
  basePrice: z.number().positive("Price must be a positive number"),
  inventoryQuantity: z.number().nonnegative("Inventory level must be 0 or greater"),
  imageUrl: z.string().optional(),
});

type ProductFields = z.infer<typeof productFormSchema>;

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  description: string | null;
  baseUnit: string;
  basePrice: string;
  inventoryQuantity: string;
  imageUrl: string | null;
  categoryId: string;
  category: {
    id: string;
    name: string;
  };
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState<{ success: boolean; text: string } | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<ProductFields>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      baseUnit: "items",
      basePrice: 1,
      inventoryQuantity: 0,
      imageUrl: "",
    },
  });

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
      console.error(err);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEditClick = (product: Product) => {
    setEditingProduct(product);
    setValue("name", product.name);
    setValue("sku", product.sku);
    setValue("description", product.description || "");
    setValue("categoryId", product.categoryId);
    setValue("baseUnit", product.baseUnit as any);
    setValue("basePrice", Number(product.basePrice));
    setValue("inventoryQuantity", Number(product.inventoryQuantity));
    setValue("imageUrl", product.imageUrl || "");
    setMessage(null);
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    reset({
      name: "",
      sku: "",
      description: "",
      categoryId: "",
      baseUnit: "items",
      basePrice: 1,
      inventoryQuantity: 0,
      imageUrl: "",
    });
    setMessage(null);
  };

  const onSubmit = async (data: ProductFields) => {
    setFormLoading(true);
    setMessage(null);

    const isEdit = !!editingProduct;
    const url = isEdit ? `/api/products/${editingProduct.id}` : "/api/products";
    const method = isEdit ? "PUT" : "POST";

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ success: false, text: result.error || "Failed to save product" });
      } else {
        setMessage({
          success: true,
          text: `Product ${isEdit ? "updated" : "created"} successfully!`,
        });
        reset({
          name: "",
          sku: "",
          description: "",
          categoryId: "",
          baseUnit: "items",
          basePrice: 1,
          inventoryQuantity: 0,
          imageUrl: "",
        });
        setEditingProduct(null);
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setMessage({ success: false, text: "An unexpected error occurred" });
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return;
    setMessage(null);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });

      const result = await res.json();

      if (!res.ok) {
        setMessage({ success: false, text: result.error || "Failed to delete product" });
      } else {
        setMessage({ success: true, text: "Product deleted successfully!" });
        if (editingProduct?.id === productId) {
          handleCancelEdit();
        }
        fetchData();
      }
    } catch (err) {
      console.error(err);
      setMessage({ success: false, text: "An unexpected error occurred" });
    }
  };

  // Filter products locally for instantaneous response
  const filteredProducts = products.filter((product) => {
    return (
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()) ||
      product.category.name.toLowerCase().includes(search.toLowerCase())
    );
  });

  const formatStock = (qtyStr: string, baseUnit: string) => {
    const qty = Number(qtyStr);
    if (baseUnit === "kg" || baseUnit === "L") {
      return `${(qty / 1000).toLocaleString()} ${baseUnit}`;
    }
    return `${qty.toLocaleString()} ${baseUnit}`;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-2">
            <Package className="h-8 w-8 text-primary" /> Product Inventory CRUD
          </h1>
          <p className="text-muted-foreground mt-1">
            Create, update, and remove products. Adjust standard pricing details.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} className="border-border text-white self-start">
          <RefreshCw className="mr-2 h-4 w-4" /> Sync Products
        </Button>
      </div>

      {/* Main split dashboard layout */}
      <div className="grid gap-8 lg:grid-cols-5">
        {/* Left Side: Products Listing Table */}
        <Card className="lg:col-span-3 border-border/40 flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle className="text-lg font-bold text-white">Products Catalog</CardTitle>
                <CardDescription>Visual register of all stored products</CardDescription>
              </div>
              <div className="relative w-full md:w-60">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground/60" />
                <Input
                  placeholder="Filter name or SKU..."
                  className="pl-8 h-9 text-xs"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-20">
                  <div className="h-8 w-8 border-4 border-t-primary border-r-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-10 border border-dashed rounded-lg border-border/20">
                  <p className="text-muted-foreground text-sm">No products found.</p>
                </div>
              ) : (
                <div className="max-h-[500px] overflow-y-auto pr-1">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU / Product</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right font-semibold text-white">Price/Unit</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-semibold text-white max-w-[150px] truncate">
                            <div className="flex items-center gap-2.5">
                              {p.imageUrl && (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="h-8 w-8 rounded-md object-cover border border-border/40 shrink-0 bg-muted/20"
                                />
                              )}
                              <div className="truncate">
                                <span className="font-mono text-[10px] text-muted-foreground block">
                                  {p.sku}
                                </span>
                                {p.name}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-slate-300">
                            {p.category.name}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-white">
                            {formatINR(p.basePrice)}
                            <span className="text-[10px] text-muted-foreground font-normal">
                              /{p.baseUnit}
                            </span>
                          </TableCell>
                          <TableCell className="text-right text-xs">
                            {formatStock(p.inventoryQuantity, p.baseUnit)}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center items-center gap-1.5">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-border hover:bg-muted text-white"
                                onClick={() => handleEditClick(p)}
                                title="Edit Product"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 border-destructive/20 text-destructive hover:bg-destructive/10"
                                onClick={() => handleDelete(p.id)}
                                title="Delete Product"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </div>
        </Card>

        {/* Right Side: Product Add/Edit Form */}
        <div className="lg:col-span-2">
          <Card className={`border-border/40 shadow-xl ${editingProduct ? "border-violet-500/30 bg-violet-500/5" : "bg-card"}`}>
            <CardHeader className="flex flex-row justify-between items-start">
              <div>
                <CardTitle className="text-lg font-bold text-white">
                  {editingProduct ? "Edit Product Details" : "Create New Product"}
                </CardTitle>
                <CardDescription>
                  {editingProduct ? "Updating product details and stock overrides" : "Fill details to save and seed stock"}
                </CardDescription>
              </div>
              {editingProduct && (
                <button
                  onClick={handleCancelEdit}
                  className="p-1 rounded text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
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

                {/* Name */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Product Name</label>
                  <Input {...register("name")} placeholder="Enter product name..." disabled={formLoading} />
                  {errors.name && <span className="text-xs text-destructive">{errors.name.message}</span>}
                </div>

                {/* SKU */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Product SKU</label>
                  <Input {...register("sku")} placeholder="E.g. LAP-ULT-001" disabled={formLoading} />
                  {errors.sku && <span className="text-xs text-destructive">{errors.sku.message}</span>}
                </div>

                {/* Category Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Category</label>
                  <Select {...register("categoryId")} disabled={formLoading}>
                    <option value="">-- Choose Category --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                  {errors.categoryId && <span className="text-xs text-destructive">{errors.categoryId.message}</span>}
                </div>

                {/* Base Unit */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Base Unit</label>
                  <Select {...register("baseUnit")} disabled={formLoading}>
                    <option value="items">items (Count)</option>
                    <option value="kg">kilograms (kg) (Weight)</option>
                    <option value="g">grams (g) (Weight)</option>
                    <option value="L">liters (L) (Volume)</option>
                    <option value="mL">milliliters (mL) (Volume)</option>
                  </Select>
                  {errors.baseUnit && <span className="text-xs text-destructive">{errors.baseUnit.message}</span>}
                </div>

                {/* Base Price */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Base Price (INR)</label>
                  <Input
                    type="number"
                    step="0.000001"
                    {...register("basePrice", { valueAsNumber: true })}
                    placeholder="E.g., 60.00"
                    disabled={formLoading}
                  />
                  {errors.basePrice && <span className="text-xs text-destructive">{errors.basePrice.message}</span>}
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                    Initial Stock Level (In Base Units)
                  </label>
                  <Input
                    type="number"
                    step="0.000001"
                    {...register("inventoryQuantity", { valueAsNumber: true })}
                    placeholder="E.g., 500000 (meaning 500,000 g / mL / items)"
                    disabled={formLoading}
                  />
                  <span className="text-[9px] text-muted-foreground leading-normal block">
                    Important: Stored internally in base units: Grams (g) for Weight, Milliliters (mL) for Volume, and Count (items). E.g. input 500,000 for 500kg basmati rice.
                  </span>
                  {errors.inventoryQuantity && (
                    <span className="text-xs text-destructive">{errors.inventoryQuantity.message}</span>
                  )}
                </div>

                {/* Image URL */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Product Image URL</label>
                  <Input {...register("imageUrl")} placeholder="E.g. /images/pure_sulphur_powder.png" disabled={formLoading} />
                  <span className="text-[9px] text-muted-foreground leading-normal block">
                    Define an absolute web link or standard local image asset reference.
                  </span>
                  {errors.imageUrl && <span className="text-xs text-destructive">{errors.imageUrl.message}</span>}
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Description</label>
                  <textarea
                    {...register("description")}
                    className="w-full rounded-md border border-input bg-transparent text-foreground px-3 py-2 text-sm transition-all focus:ring-1 focus:ring-ring focus:border-primary disabled:opacity-50"
                    placeholder="Describe product details..."
                    disabled={formLoading}
                    rows={3}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                {editingProduct && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancelEdit}
                    disabled={formLoading}
                    className="flex-1 border-border text-white hover:bg-muted"
                  >
                    Cancel
                  </Button>
                )}
                <Button
                  type="submit"
                  disabled={formLoading}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-1.5"
                >
                  {formLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                    </>
                  ) : (
                    "Save Product"
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
